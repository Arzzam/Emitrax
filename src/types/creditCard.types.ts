/**
 * Credit card annual payment tracker (SFT / AIS).
 *
 * The INR 10,00,000 SFT-006 limit applies per reporting entity - i.e. per card
 * issuer, aggregating that issuer's cards. It is NOT a per-card limit and NOT a
 * total across banks. Cash payments carry a separate INR 1,00,000 limit.
 */

/** Statutory aggregate limit per issuer per financial year. */
export const SFT_TOTAL_THRESHOLD = 1_000_000;

/** Statutory limit on cash payments toward card bills, per issuer per financial year. */
export const SFT_CASH_THRESHOLD = 100_000;

export const ISSUER_COLOR_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;
export type IssuerColorToken = (typeof ISSUER_COLOR_TOKENS)[number];

export interface ICreditCard {
    id: string;
    userId: string;
    issuerId: string;
    name: string;
    last4: string | null;
    isActive: boolean;
    sortOrder: number;
    /** Day of month the statement is generated (1-31). Pre-fills a bill row's dates. */
    statementDay: number | null;
    /** Day of month the payment is due (1-31). */
    dueDay: number | null;
    creditLimit: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ICreditCardIssuer {
    id: string;
    userId: string;
    name: string;
    color: IssuerColorToken | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    /** Populated by `getIssuersWithCards`, ordered by sortOrder then name. */
    cards: ICreditCard[];
}

export interface ICreditCardPaymentEntry {
    id: string;
    userId: string;
    cardId: string;
    /** First day of the month, 'yyyy-MM-dd'. */
    periodMonth: string;
    amount: number;
    /** Portion of `amount` paid in cash. Non-cash is `amount - cashAmount`. */
    cashAmount: number;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * One dated credit-limit change for a card.
 *
 * A limit is a property of a card AT A TIME - banks raise them routinely, and
 * `ICreditCard.creditLimit` holds only the latest. Utilisation for a past month
 * must resolve the limit that was actually in force, or a limit increase
 * silently restates history downward.
 */
export interface ICardLimitChange {
    id: string;
    userId: string;
    cardId: string;
    /** 'yyyy-MM-dd'. A real date, NOT a first-of-month bucket. */
    effectiveFrom: string;
    /** Always > 0, enforced by a DB CHECK. */
    creditLimit: number;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ICreditCardTrackerYear {
    id: string;
    userId: string;
    /** Financial year key, e.g. '2026-27'. */
    financialYear: string;
    notes: string | null;
    thresholdAmount: number;
    cashThresholdAmount: number;
    createdAt: string;
    updatedAt: string;
}

// --- Mutation inputs --------------------------------------------------------

export interface CreateIssuerInput {
    name: string;
    color?: IssuerColorToken | null;
    sortOrder?: number;
}

export interface UpdateIssuerInput {
    id: string;
    name?: string;
    color?: IssuerColorToken | null;
    sortOrder?: number;
}

export interface CreateCardInput {
    issuerId: string;
    name: string;
    last4?: string | null;
    sortOrder?: number;
    statementDay?: number | null;
    dueDay?: number | null;
    /** Opening limit. Seeds the first `cc_card_limit_changes` row, effective today. */
    creditLimit?: number | null;
}

/**
 * `creditLimit` is deliberately ABSENT.
 *
 * The current limit on `cc_cards` is a cache of the latest row in
 * `cc_card_limit_changes`, restated by the service after every history write.
 * A direct update here would be silently overwritten by the next one, and would
 * skip the dated record that keeps past months from being restated. Limits are
 * changed through `SaveLimitChangeInput`; leaving the field off makes any other
 * route a compile error.
 */
export interface UpdateCardInput {
    id: string;
    issuerId?: string;
    name?: string;
    last4?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    statementDay?: number | null;
    dueDay?: number | null;
}

export interface SavePaymentEntryInput {
    cardId: string;
    /** First day of the month, 'yyyy-MM-dd'. */
    periodMonth: string;
    amount: number;
    cashAmount: number;
    note?: string | null;
}

export type BillEntryStatus = 'issued' | 'no_statement';

export interface ICreditCardBillEntry {
    id: string;
    userId: string;
    cardId: string;
    /**
     * First day of the month the STATEMENT WAS GENERATED, 'yyyy-MM-dd'.
     * Offset by one month from a payment's periodMonth in the general case.
     */
    statementMonth: string;
    status: BillEntryStatus;
    /** null only when status is 'no_statement'. May be negative (credit balance). */
    totalDue: number | null;
    minimumDue: number | null;
    statementDate: string | null;
    dueDate: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SaveBillEntryInput {
    cardId: string;
    /** First day of the statement month, 'yyyy-MM-dd'. */
    statementMonth: string;
    status: BillEntryStatus;
    totalDue: number | null;
    minimumDue?: number | null;
    statementDate?: string | null;
    dueDate?: string | null;
    note?: string | null;
}

export interface SaveLimitChangeInput {
    cardId: string;
    /** 'yyyy-MM-dd'. Upsert conflict target together with `cardId`. */
    effectiveFrom: string;
    creditLimit: number;
    note?: string | null;
}

// --- Derived view models ----------------------------------------------------

export type ThresholdStatus = 'safe' | 'watch' | 'risk' | 'breached';

export interface IssuerAggregate {
    issuerId: string;
    name: string;
    color: IssuerColorToken | null;
    cardCount: number;
    activeCardCount: number;
    totalPaid: number;
    cashPaid: number;
    nonCashPaid: number;
    /** Straight-line extrapolation of totalPaid across the full 12 months. */
    projectedTotal: number;
    status: ThresholdStatus;
    cashStatus: ThresholdStatus;
}

/** Per-card, per-month lookup: cardId -> month key -> entry. */
export type TrackerEntryMatrix<T> = Map<string, Map<string, T>>;

/**
 * Generic over the entry type so one grid serves both series. No default type
 * argument: every call site should declare which series it means.
 */
export interface TrackerMatrix<T> {
    entries: TrackerEntryMatrix<T>;
    /** periodMonth -> row total across all cards. */
    monthTotals: Map<string, number>;
    /** periodMonth -> issuerId -> subtotal. */
    monthIssuerTotals: Map<string, Map<string, number>>;
    /** cardId -> financial-year total. */
    cardTotals: Map<string, number>;
    grandTotal: number;
}

export interface IssuerBillAggregate {
    issuerId: string;
    name: string;
    color: IssuerColorToken | null;
    cardCount: number;
    activeCardCount: number;
    /** Sum of totalDue over 'issued' rows. Can be reduced by a credit balance. */
    totalBilled: number;
    /** Months with at least one issued statement - the divisor for averageBill. */
    monthsWithStatement: number;
    monthsWithNoStatement: number;
    monthsNotEntered: number;
    averageBill: number;
    peakBill: number;
    /** periodMonth of peakBill, or null when nothing is billed. */
    peakMonth: string | null;
    projectedTotal: number;
    /** Sum of creditLimit across the issuer's cards, or null when any card lacks one. */
    combinedLimit: number | null;
    /** Band of peakBill against combinedLimit; null when combinedLimit is null. */
    peakStatus: ThresholdStatus | null;
}

// --- Credit-limit utilisation ----------------------------------------------

/** How a card's balance for one month became known. */
export type BalanceBasis = 'issued' | 'no_statement' | 'assumed_nil';

/**
 * One card's share of a month's bureau figure.
 *
 * Carried so a month can be inspected rather than merely read: the headline
 * ratio is meaningless for checking unless you can see which card put the
 * balance there, and which cards were assumed nil rather than entered.
 */
export interface BureauCardContribution {
    cardId: string;
    cardName: string;
    last4: string | null;
    /** Floored at 0, as it enters the sum. */
    balance: number;
    limit: number;
    /** This card's own ratio, for context beside the aggregate. */
    ratio: number;
    basis: BalanceBasis;
}

export interface BureauMonth {
    statementMonth: string;
    /** Sum of per-card balances, each floored at 0. */
    balance: number;
    /** Sum of the limits in force across every counted card. */
    limit: number;
    ratio: number;
    overLimit: boolean;
    /** Cards in the denominator. */
    cardCount: number;
    /** Of those, how many had nothing entered and were assumed nil. */
    assumedCount: number;
    /** True when anything was assumed - the ratio can then only be understated. */
    isPartial: boolean;
    /** The cards behind the figure, largest balance first. */
    contributions: BureauCardContribution[];
}

export interface BureauUtilisation {
    /** statementMonth -> overall figure. Months with nothing known are absent. */
    months: Map<string, BureauMonth>;
    /** statementMonth -> issuerId -> the same rule, scoped to one issuer. */
    issuerMonths: Map<string, Map<string, BureauMonth>>;
    /** Most recent month carrying a figure. */
    latest: BureauMonth | null;
    peak: BureauMonth | null;
    issuerPeak: Map<string, BureauMonth>;
    /** Mean of the monthly ratios over months that produced one. */
    averageRatio: number | null;
    monthsWithData: number;
    /** Cards contributing a limit to the denominator. */
    cardsCounted: number;
    /** Cards excluded because no limit has ever been recorded for them. */
    cardsWithoutLimit: number;
    /** issuerId -> `cardsCounted`, scoped to that issuer. */
    issuerCardsCounted: Map<string, number>;
    /** issuerId -> `cardsWithoutLimit`, scoped to that issuer. */
    issuerCardsWithoutLimit: Map<string, number>;
}

/**
 * One defensible utilisation figure: a statement balance against the limit that
 * was in force when it was printed.
 *
 * A cell EXISTS only when both halves are real. Not entered, 'no_statement',
 * and "this card has no limit" all produce no cell at all - never a zero, which
 * would be indistinguishable from a genuine zero-balance statement.
 */
export interface UtilisationCell {
    /** Sum of statement totals. Signed - a credit balance is negative. */
    billed: number;
    /** Sum of the limits in force. Always > 0. */
    limit: number;
    /** `billed / limit`, signed and uncapped. */
    ratio: number;
    /** At or above the full limit. Rendered distinctly; never silently capped. */
    overLimit: boolean;
    /** Cards behind this figure. Always 1 for a per-card cell. */
    cardCount: number;
}

export interface UtilisationPeak {
    cell: UtilisationCell;
    statementMonth: string;
}

/**
 * Per-card utilisation across one financial year - the strict reading.
 *
 * Deliberately carries NO combined figures. Every combined percentage in the
 * app comes from `buildBureauUtilisation`, which uses a different and larger
 * denominator; a second combining implementation living here would be one that
 * quietly drifts from it.
 */
export interface UtilisationMatrix {
    /** cardId -> statementMonth -> cell. */
    cells: Map<string, Map<string, UtilisationCell>>;
    cardPeak: Map<string, UtilisationPeak>;
    /** Ids of cards contributing at least one cell this year. */
    cardsWithLimit: string[];
    /** Ids of cards that billed but had no limit to measure against. */
    cardsWithoutLimit: string[];
}

export interface IssuerUtilisationAggregate {
    issuerId: string;
    name: string;
    color: IssuerColorToken | null;
    cardCount: number;
    /** Cards contributing a limit to the denominator. */
    cardsCountedCount: number;
    /** Cards excluded because no limit has ever been recorded for them. */
    cardsWithoutLimitCount: number;
    /** Highest monthly ratio, on the bureau rule. */
    peak: BureauMonth | null;
    /**
     * Mean of the monthly ratios over months that produced one.
     *
     * Averaging across MONTHS is legitimate - each month is already a properly
     * weighted ratio of sums, and they are comparable point-in-time snapshots.
     * Averaging across CARDS within a month is not, and never happens.
     */
    averageRatio: number | null;
    monthsWithData: number;
    /** Months of the year that have happened, so could carry a figure. */
    monthsMeasurable: number;
    /** Most recent month holding a figure, for the "as of" line. */
    latest: BureauMonth | null;
    /** True when any month behind these figures assumed a card was nil. */
    hasPartialMonths: boolean;
    status: ThresholdStatus | null;
}
