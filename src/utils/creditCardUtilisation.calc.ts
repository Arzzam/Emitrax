import { parseISO } from 'date-fns';

import {
    BalanceBasis,
    BureauCardContribution,
    BureauMonth,
    BureauUtilisation,
    ICardLimitChange,
    ICreditCard,
    ICreditCardBillEntry,
    ICreditCardIssuer,
    IssuerUtilisationAggregate,
    ThresholdStatus,
    UtilisationCell,
    UtilisationMatrix,
    UtilisationPeak,
} from '@/types/creditCard.types';
import { isoDayInMonth } from '@/utils/creditCardBills.calc';
import { FinancialYearMonth } from '@/utils/financialYear';

/**
 * Credit-limit utilisation for the card tracker.
 *
 * Utilisation is the statement balance a bank printed, measured against the
 * limit that was in force when it printed it. Both halves already exist:
 * `cc_bill_entries."totalDue"` and the dated `cc_card_limit_changes` history.
 *
 * Three rules run through everything below, and each of them is a correctness
 * rule rather than a presentation choice:
 *
 * 1. A per-card figure EXISTS only when both halves are real. "Not entered" and
 *    "no limit recorded" produce nothing - never a zero, which would be
 *    indistinguishable from a genuine zero-balance statement.
 * 2. Combined utilisation is a RATIO OF SUMS, never a mean of per-card ratios.
 * 3. Every combined figure states its own coverage, so a partial one is never
 *    read as complete.
 *
 * There are TWO combined figures here and they answer different questions:
 *
 * - `buildUtilisationMatrix` is the strict reading. It measures only what was
 *   actually entered, and a card with nothing entered that month is left out of
 *   both sides.
 * - `buildBureauUtilisation` is the CIBIL-style reading, and is what the app
 *   headlines. Every open card's limit sits in the denominator whether or not
 *   it carried a balance - which is exactly why closing an unused card RAISES
 *   your utilisation - and an unentered card is assumed nil and flagged.
 *
 * Deliberately NOT modelled: utilisation from payments, and "available credit".
 * Both need a dated running balance, and this app stores monthly buckets. See
 * `context/plan/credit-card-management-and-utilisation-plan.md` §8.
 */

/** Conventional credit-health bands, not the SFT ratios in `getThresholdStatus`. */
export const UTILISATION_WATCH_RATIO = 0.3;
export const UTILISATION_RISK_RATIO = 0.5;
export const UTILISATION_HIGH_RATIO = 0.8;

/**
 * Bands a utilisation ratio for display, reusing `ThresholdStatus` so
 * `ThresholdGauge` serves this view unchanged.
 *
 * `breached` here means "in the top band", NOT "over the limit" - the two are
 * different questions and 80% is not 100%. Genuine over-limit is carried
 * separately as `UtilisationCell.overLimit`.
 *
 * A negative ratio (credit-balance statement) is the healthiest state there is,
 * so it bands as `safe`.
 */
export function getUtilisationStatus(ratio: number): ThresholdStatus {
    if (ratio >= UTILISATION_HIGH_RATIO) {
        return 'breached';
    }
    if (ratio >= UTILISATION_RISK_RATIO) {
        return 'risk';
    }
    if (ratio >= UTILISATION_WATCH_RATIO) {
        return 'watch';
    }
    return 'safe';
}

/**
 * A ratio as a percentage string, matching the house `toFixed(1)%` form used by
 * the split shares and the threshold cards.
 *
 * Shared so the grid, the summary cards and the card page can never disagree
 * about rounding - a cell reading 49.9% while its card page reads 50% would
 * straddle a band boundary and look like a bug.
 */
export function formatUtilisationPercent(ratio: number, decimals = 1): string {
    return `${(ratio * 100).toFixed(decimals)}%`;
}

/** How the limit for a statement month was arrived at, for display and debugging. */
export type LimitBasis = 'dated' | 'card' | 'assumed';

export interface ResolvedLimit {
    limit: number | null;
    basis: LimitBasis;
}

/** Ascending by effectiveFrom. Every resolver below assumes this order. */
export function sortLimitChanges(changes: ICardLimitChange[]): ICardLimitChange[] {
    return [...changes].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

/** cardId -> that card's changes, ascending. */
export function groupLimitChangesByCard(changes: ICardLimitChange[]): Map<string, ICardLimitChange[]> {
    const grouped = new Map<string, ICardLimitChange[]>();
    changes.forEach((change) => {
        const existing = grouped.get(change.cardId);
        if (existing) {
            existing.push(change);
        } else {
            grouped.set(change.cardId, [change]);
        }
    });

    grouped.forEach((list, cardId) => grouped.set(cardId, sortLimitChanges(list)));
    return grouped;
}

/**
 * The limit in force on a date.
 *
 * `changes` MUST be ascending - use `sortLimitChanges` or
 * `groupLimitChangesByCard`.
 *
 * When no change is dated at or before `isoDate`, the EARLIEST change is
 * returned rather than null. That backwards extension is load-bearing: a user
 * who records only "raised to 4L on 1 Sep" would otherwise blank Apr-Aug
 * entirely, and the migration's backfill makes the earliest row genuinely mean
 * "the limit since tracking began" for every pre-existing card.
 *
 * ISO dates compare correctly as strings, so no parsing is needed here.
 */
export function resolveLimitOn(changes: ICardLimitChange[], isoDate: string): number | null {
    if (changes.length === 0) {
        return null;
    }

    let resolved: number | null = null;
    for (const change of changes) {
        if (change.effectiveFrom > isoDate) {
            break;
        }
        resolved = change.creditLimit;
    }

    return resolved ?? changes[0].creditLimit;
}

/** Last calendar day of the month a first-of-month key points at. */
function endOfMonthIso(statementMonth: string): string {
    const anchor = parseISO(statementMonth);
    return isoDayInMonth(statementMonth, new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate());
}

/**
 * The limit that applied to one statement month, and how that was decided.
 *
 * Same precedence shape as `getExpectedPaymentMonth`, for the same reason: the
 * row's own record of what happened beats the card's configured default.
 *
 * 1. `dated`    the row has a statementDate -> the limit in force on it
 * 2. `card`     card.statementDay known     -> that day, clamped to the month
 * 3. `assumed`  otherwise                   -> the month's last day
 *
 * `changes` MUST be ascending.
 */
export function resolveLimitForStatementMonth(
    statementMonth: string,
    card: Pick<ICreditCard, 'statementDay'>,
    changes: ICardLimitChange[],
    entry?: Pick<ICreditCardBillEntry, 'statementDate'> | null
): ResolvedLimit {
    if (entry?.statementDate) {
        return { limit: resolveLimitOn(changes, entry.statementDate), basis: 'dated' };
    }

    if (card.statementDay != null) {
        return { limit: resolveLimitOn(changes, isoDayInMonth(statementMonth, card.statementDay)), basis: 'card' };
    }

    return { limit: resolveLimitOn(changes, endOfMonthIso(statementMonth)), basis: 'assumed' };
}

/**
 * A cell, or null when the limit cannot carry one. A limit of 0 or below never
 * produces a cell - the DB CHECK forbids storing one, and this guards the
 * divide regardless.
 */
function buildCell(billed: number, limit: number, cardCount: number): UtilisationCell | null {
    if (!(limit > 0)) {
        return null;
    }

    const ratio = billed / limit;
    return { billed, limit, ratio, overLimit: ratio >= 1, cardCount };
}

/** Keeps the larger of two peaks, preferring the earlier month on a tie. */
function pickPeak(current: UtilisationPeak | null, candidate: UtilisationPeak): UtilisationPeak {
    return current === null || candidate.cell.ratio > current.cell.ratio ? candidate : current;
}

/**
 * Per-card utilisation across one financial year.
 *
 * Entries outside `months`, or for a card we do not know about, are ignored -
 * a stale query result must never leak into a figure.
 *
 * Combined figures are NOT computed here; see `buildBureauUtilisation`.
 */
export function buildUtilisationMatrix(
    issuers: ICreditCardIssuer[],
    bills: ICreditCardBillEntry[],
    limitChanges: ICardLimitChange[],
    months: FinancialYearMonth[]
): UtilisationMatrix {
    const monthKeys = new Set(months.map((month) => month.periodMonth));
    const cardById = new Map<string, ICreditCard>();
    issuers.forEach((issuer) => issuer.cards.forEach((card) => cardById.set(card.id, card)));

    const changesByCard = groupLimitChangesByCard(limitChanges);

    const cells: UtilisationMatrix['cells'] = new Map();
    const cardPeak = new Map<string, UtilisationPeak>();
    const cardsWithLimit = new Set<string>();
    const cardsWithoutLimit = new Set<string>();

    bills.forEach((entry) => {
        const card = cardById.get(entry.cardId);
        if (!card || !monthKeys.has(entry.statementMonth)) {
            return;
        }

        const { limit } = resolveLimitForStatementMonth(
            entry.statementMonth,
            card,
            changesByCard.get(card.id) ?? [],
            entry
        );

        // A month the bank issued no statement for is a month nothing was owed,
        // so it reads 0% rather than blank. That is narrower than the bill
        // series, where 'no statement' and a 0 statement are genuinely different
        // events - for utilisation both mean the same thing.
        const billed = entry.status === 'issued' ? (entry.totalDue ?? 0) : 0;
        const cell = limit == null ? null : buildCell(billed, limit, 1);

        if (cell === null) {
            // The card billed but there is nothing to measure it against.
            cardsWithoutLimit.add(card.id);
            return;
        }

        cardsWithLimit.add(card.id);

        const byMonth = cells.get(card.id) ?? new Map<string, UtilisationCell>();
        byMonth.set(entry.statementMonth, cell);
        cells.set(card.id, byMonth);

        cardPeak.set(card.id, pickPeak(cardPeak.get(card.id) ?? null, { cell, statementMonth: entry.statementMonth }));
    });

    return {
        cells,
        cardPeak,
        cardsWithLimit: Array.from(cardsWithLimit),
        cardsWithoutLimit: Array.from(cardsWithoutLimit),
    };
}

/**
 * Rolls the bureau figures up per issuer for the summary cards.
 *
 * Reads `BureauUtilisation` rather than the strict matrix so that a summary
 * card, the grid's issuer subtotal column and its overall column all state the
 * same method. Two combined percentages on one screen that quietly disagree
 * about their denominator would be worse than either on its own.
 */
export function aggregateUtilisationByIssuer(
    issuers: ICreditCardIssuer[],
    bureau: BureauUtilisation,
    months: FinancialYearMonth[]
): IssuerUtilisationAggregate[] {
    return issuers.map((issuer) => {
        let ratioSum = 0;
        let monthsWithData = 0;
        let hasPartialMonths = false;
        let latest: BureauMonth | null = null;

        months.forEach((month) => {
            const figure = bureau.issuerMonths.get(month.periodMonth)?.get(issuer.id);
            if (!figure) {
                return;
            }
            ratioSum += figure.ratio;
            monthsWithData += 1;
            hasPartialMonths = hasPartialMonths || figure.isPartial;
            latest = figure;
        });

        const peak = bureau.issuerPeak.get(issuer.id) ?? null;

        return {
            issuerId: issuer.id,
            name: issuer.name,
            color: issuer.color,
            cardCount: issuer.cards.length,
            cardsCountedCount: bureau.issuerCardsCounted.get(issuer.id) ?? 0,
            cardsWithoutLimitCount: bureau.issuerCardsWithoutLimit.get(issuer.id) ?? 0,
            peak,
            averageRatio: monthsWithData > 0 ? ratioSum / monthsWithData : null,
            monthsWithData,
            // Future months are never measured, so "of 12" would read as missing
            // data for every month that simply has not happened yet.
            monthsMeasurable: months.filter((month) => !month.isFuture).length,
            latest,
            hasPartialMonths,
            status: peak ? getUtilisationStatus(peak.ratio) : null,
        };
    });
}

// --- Bureau-style overall utilisation ---------------------------------------

/**
 * Overall credit utilisation the way a credit bureau computes it.
 *
 * CIBIL and its peers take TOTAL OUTSTANDING across every revolving account
 * divided by TOTAL CREDIT LIMIT across those same accounts. Two consequences
 * that separate this from the strict per-card reading above:
 *
 * - **An unused card still counts.** Its limit sits in the denominator with a
 *   nil balance, which is why closing an unused card RAISES utilisation. The
 *   strict matrix drops such a card from both sides; a bureau never does.
 * - **Balances floor at zero.** A credit-balance statement reports as nil, so
 *   it cannot drag the aggregate negative.
 *
 * Issuers are irrelevant here - a bureau aggregates the whole wallet - but the
 * same rule is applied per issuer as well, so the grid's issuer subtotals and
 * its overall column can never disagree about method.
 *
 * This is an ESTIMATE of what a bureau would see, never the reported figure:
 * the app does not know each bank's reporting date, and a statement entered
 * here is only as current as the user's typing. Same standing as the SFT
 * tracker - a self-reported early-warning view, not an official record.
 */

type CountedCard = {
    card: ICreditCard;
    issuerId: string;
    changes: ICardLimitChange[];
    /** Earliest recorded limit date - the card's opening as far as the app knows. */
    openedOn: string;
};

/** Keeps the larger ratio, preferring the earlier month on a tie. */
function pickBureauPeak(current: BureauMonth | null, candidate: BureauMonth): BureauMonth {
    return current === null || candidate.ratio > current.ratio ? candidate : current;
}

export function buildBureauUtilisation(
    issuers: ICreditCardIssuer[],
    bills: ICreditCardBillEntry[],
    limitChanges: ICardLimitChange[],
    months: FinancialYearMonth[]
): BureauUtilisation {
    const monthKeys = new Set(months.map((month) => month.periodMonth));
    const changesByCard = groupLimitChangesByCard(limitChanges);

    // cardId -> statementMonth -> the row, so a missing key means "not entered"
    // rather than "nothing owed".
    const billByCard = new Map<string, Map<string, ICreditCardBillEntry>>();
    bills.forEach((entry) => {
        if (!monthKeys.has(entry.statementMonth)) {
            return;
        }
        const byMonth = billByCard.get(entry.cardId) ?? new Map<string, ICreditCardBillEntry>();
        byMonth.set(entry.statementMonth, entry);
        billByCard.set(entry.cardId, byMonth);
    });

    const counted: CountedCard[] = [];
    let cardsWithoutLimit = 0;
    const issuerCardsCounted = new Map<string, number>();
    const issuerCardsWithoutLimit = new Map<string, number>();
    const bump = (map: Map<string, number>, issuerId: string) => map.set(issuerId, (map.get(issuerId) ?? 0) + 1);

    issuers.forEach((issuer) =>
        issuer.cards.forEach((card) => {
            // A deactivated card keeps counting for as long as it holds data in
            // this year. Dropping it the moment it is deactivated would restate
            // every past month upward, which is the silent-history problem the
            // dated limit table exists to prevent. Once a year contains none of
            // its data, it is simply gone.
            const holdsData = (billByCard.get(card.id)?.size ?? 0) > 0;
            if (!card.isActive && !holdsData) {
                return;
            }

            const changes = changesByCard.get(card.id) ?? [];
            if (changes.length === 0) {
                cardsWithoutLimit += 1;
                bump(issuerCardsWithoutLimit, issuer.id);
                return;
            }

            bump(issuerCardsCounted, issuer.id);
            counted.push({ card, issuerId: issuer.id, changes, openedOn: changes[0].effectiveFrom });
        })
    );

    /**
     * One month's figure over a set of cards, or null when nothing about that
     * month is known.
     *
     * A month where EVERY card was assumed nil produces no figure at all. It
     * would otherwise render a confident 0% for every month the user simply has
     * not filled in yet.
     */
    const measure = (statementMonth: string, subset: CountedCard[]): BureauMonth | null => {
        let balance = 0;
        let limit = 0;
        let assumedCount = 0;
        const contributions: BureauCardContribution[] = [];

        subset.forEach(({ card, changes, openedOn }) => {
            const entry = billByCard.get(card.id)?.get(statementMonth) ?? null;

            // A card opened mid-year is absent from the months before it, not an
            // open card at nil. Counting it would put its limit into every earlier
            // denominator and restate those months downward. The backwards
            // extension in `resolveLimitOn` is for limit VALUES on a card that
            // existed, so an entered statement still counts. Dropping an unknown
            // card can only raise the figure, never flatter it.
            if (entry === null && openedOn > endOfMonthIso(statementMonth)) {
                return;
            }
            const { limit: cardLimit } = resolveLimitForStatementMonth(statementMonth, card, changes, entry);

            if (cardLimit == null || !(cardLimit > 0)) {
                return;
            }

            const basis: BalanceBasis =
                entry === null ? 'assumed_nil' : entry.status === 'issued' ? 'issued' : 'no_statement';

            if (basis === 'assumed_nil') {
                assumedCount += 1;
            }

            // 'no_statement' is a known nil. A credit balance reports as nil too.
            const cardBalance = basis === 'issued' ? Math.max(entry?.totalDue ?? 0, 0) : 0;

            balance += cardBalance;
            limit += cardLimit;
            contributions.push({
                cardId: card.id,
                cardName: card.name,
                last4: card.last4,
                balance: cardBalance,
                limit: cardLimit,
                ratio: cardBalance / cardLimit,
                basis,
            });
        });

        const cardCount = contributions.length;

        if (cardCount === 0 || !(limit > 0) || assumedCount === cardCount) {
            return null;
        }

        const ratio = balance / limit;

        // Largest balance first: this list exists to explain the aggregate, and
        // the aggregate is driven by the numerator. Among equals - typically a
        // row of nil balances - what was actually entered sorts above what was
        // assumed, so the cards still needing data cluster at the bottom.
        const assumedLast = (entry: BureauCardContribution) => (entry.basis === 'assumed_nil' ? 1 : 0);
        contributions.sort(
            (a, b) => b.balance - a.balance || assumedLast(a) - assumedLast(b) || a.cardName.localeCompare(b.cardName)
        );

        return {
            statementMonth,
            balance,
            limit,
            ratio,
            overLimit: ratio >= 1,
            cardCount,
            assumedCount,
            isPartial: assumedCount > 0,
            contributions,
        };
    };

    const byIssuer = new Map<string, CountedCard[]>();
    counted.forEach((entry) => {
        const list = byIssuer.get(entry.issuerId);
        if (list) {
            list.push(entry);
        } else {
            byIssuer.set(entry.issuerId, [entry]);
        }
    });

    const monthsMap = new Map<string, BureauMonth>();
    const issuerMonths = new Map<string, Map<string, BureauMonth>>();
    const issuerPeak = new Map<string, BureauMonth>();
    let latest: BureauMonth | null = null;
    let peak: BureauMonth | null = null;
    let ratioSum = 0;

    months.forEach((month) => {
        // A month that has not happened yet has nothing to report, and would
        // otherwise read as a fully-assumed 0%.
        if (month.isFuture) {
            return;
        }

        const overall = measure(month.periodMonth, counted);
        if (overall) {
            monthsMap.set(month.periodMonth, overall);
            latest = overall;
            peak = pickBureauPeak(peak, overall);
            ratioSum += overall.ratio;
        }

        const perIssuer = new Map<string, BureauMonth>();
        byIssuer.forEach((subset, issuerId) => {
            const figure = measure(month.periodMonth, subset);
            if (!figure) {
                return;
            }
            perIssuer.set(issuerId, figure);
            issuerPeak.set(issuerId, pickBureauPeak(issuerPeak.get(issuerId) ?? null, figure));
        });

        if (perIssuer.size > 0) {
            issuerMonths.set(month.periodMonth, perIssuer);
        }
    });

    return {
        months: monthsMap,
        issuerMonths,
        latest,
        peak,
        issuerPeak,
        averageRatio: monthsMap.size > 0 ? ratioSum / monthsMap.size : null,
        monthsWithData: monthsMap.size,
        cardsCounted: counted.length,
        cardsWithoutLimit,
        issuerCardsCounted,
        issuerCardsWithoutLimit,
    };
}
