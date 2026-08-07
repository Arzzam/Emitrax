import {
    ICreditCard,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    IssuerAggregate,
    SFT_CASH_THRESHOLD,
    SFT_TOTAL_THRESHOLD,
    ThresholdStatus,
    TrackerEntryMatrix,
    TrackerMatrix,
} from '@/types/creditCard.types';
import { FinancialYearMonth } from '@/utils/financialYear';

const WATCH_RATIO = 0.6;
const RISK_RATIO = 0.85;
const MONTHS_IN_YEAR = 12;

/**
 * How to read a month, a card and a signed amount off one series' entry type.
 *
 * This is the seam that lets one grid serve payments and bills - and the seam
 * Casheq uses to feed the same grid from its derived+override cells, which is
 * why Emitrax's entries carry no speculative `derived*` fields.
 */
export interface TrackerSeriesAccessors<T> {
    /** First-of-month key the entry belongs to. */
    getMonth: (entry: T) => string;
    getCardId: (entry: T) => string;
    /** Signed amount flowing into every total. An entry contributing nothing returns 0. */
    getAmount: (entry: T) => number;
}

export const PAYMENT_SERIES: TrackerSeriesAccessors<ICreditCardPaymentEntry> = {
    getMonth: (entry) => entry.periodMonth,
    getCardId: (entry) => entry.cardId,
    getAmount: (entry) => entry.amount,
};

/**
 * Indexes entries by card and month and precomputes the totals the grid needs.
 * Entries outside the supplied months, or for a card we do not know about, are
 * ignored - a stale query result must never leak into a total.
 */
export function buildTrackerMatrix<T>(
    cards: ICreditCard[],
    entries: T[],
    months: FinancialYearMonth[],
    accessors: TrackerSeriesAccessors<T>
): TrackerMatrix<T> {
    const cardIssuer = new Map(cards.map((card) => [card.id, card.issuerId]));
    const monthKeys = new Set(months.map((month) => month.periodMonth));

    const matrix: TrackerEntryMatrix<T> = new Map();
    const monthTotals = new Map<string, number>();
    const monthIssuerTotals = new Map<string, Map<string, number>>();
    const cardTotals = new Map<string, number>();
    let grandTotal = 0;

    months.forEach((month) => {
        monthTotals.set(month.periodMonth, 0);
        monthIssuerTotals.set(month.periodMonth, new Map());
    });

    entries.forEach((entry) => {
        const monthKey = accessors.getMonth(entry);
        const cardId = accessors.getCardId(entry);

        if (!monthKeys.has(monthKey) || !cardIssuer.has(cardId)) {
            return;
        }

        const byMonth = matrix.get(cardId) ?? new Map<string, T>();
        byMonth.set(monthKey, entry);
        matrix.set(cardId, byMonth);

        const amount = accessors.getAmount(entry);

        monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + amount);

        const issuerId = cardIssuer.get(cardId)!;
        const issuerTotals = monthIssuerTotals.get(monthKey)!;
        issuerTotals.set(issuerId, (issuerTotals.get(issuerId) ?? 0) + amount);

        cardTotals.set(cardId, (cardTotals.get(cardId) ?? 0) + amount);
        grandTotal += amount;
    });

    return { entries: matrix, monthTotals, monthIssuerTotals, cardTotals, grandTotal };
}

/**
 * Straight-line projection of a full financial year from what has been logged
 * so far. Returns the amount unchanged once all twelve months have elapsed.
 */
export function projectYearEnd(totalSoFar: number, elapsedMonths: number): number {
    if (elapsedMonths <= 0) {
        return 0;
    }
    if (elapsedMonths >= MONTHS_IN_YEAR) {
        return totalSoFar;
    }
    return (totalSoFar / elapsedMonths) * MONTHS_IN_YEAR;
}

/**
 * Bands an issuer against its threshold. `breached` means the limit is already
 * crossed and the bank will report it; the softer bands look at whichever is
 * larger of the actual and the projected total.
 */
export function getThresholdStatus(actual: number, projected: number, threshold: number): ThresholdStatus {
    if (threshold <= 0) {
        return 'safe';
    }
    if (actual >= threshold) {
        return 'breached';
    }

    const ratio = Math.max(actual, projected) / threshold;
    if (ratio >= RISK_RATIO) {
        return 'risk';
    }
    if (ratio >= WATCH_RATIO) {
        return 'watch';
    }
    return 'safe';
}

/**
 * Rolls per-card entries up to the issuer, which is the unit the SFT threshold
 * actually applies to. Issuers with no cards still appear, at zero.
 */
export function aggregateByIssuer(
    issuers: ICreditCardIssuer[],
    entries: ICreditCardPaymentEntry[],
    elapsedMonths: number,
    thresholds: { total: number; cash: number } = { total: SFT_TOTAL_THRESHOLD, cash: SFT_CASH_THRESHOLD }
): IssuerAggregate[] {
    const cardIssuer = new Map<string, string>();
    issuers.forEach((issuer) => issuer.cards.forEach((card) => cardIssuer.set(card.id, issuer.id)));

    const totals = new Map<string, { total: number; cash: number }>();
    entries.forEach((entry) => {
        const issuerId = cardIssuer.get(entry.cardId);
        if (!issuerId) {
            return;
        }
        const bucket = totals.get(issuerId) ?? { total: 0, cash: 0 };
        bucket.total += entry.amount;
        bucket.cash += entry.cashAmount;
        totals.set(issuerId, bucket);
    });

    return issuers.map((issuer) => {
        const { total = 0, cash = 0 } = totals.get(issuer.id) ?? {};
        const projectedTotal = projectYearEnd(total, elapsedMonths);
        const projectedCash = projectYearEnd(cash, elapsedMonths);

        return {
            issuerId: issuer.id,
            name: issuer.name,
            color: issuer.color,
            cardCount: issuer.cards.length,
            activeCardCount: issuer.cards.filter((card) => card.isActive).length,
            totalPaid: total,
            cashPaid: cash,
            nonCashPaid: total - cash,
            projectedTotal,
            status: getThresholdStatus(total, projectedTotal, thresholds.total),
            cashStatus: getThresholdStatus(cash, projectedCash, thresholds.cash),
        };
    });
}

/**
 * True when a payment entry carries no information and its row should be
 * deleted rather than stored as a zero.
 *
 * Lives here so the service and the optimistic hook cannot drift apart.
 */
export function isEmptyPaymentEntry(input: { amount: number; cashAmount: number; note?: string | null }): boolean {
    return input.amount === 0 && input.cashAmount === 0 && !input.note?.trim();
}
