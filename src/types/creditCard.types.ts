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
    creditLimit?: number | null;
}

export interface UpdateCardInput {
    id: string;
    issuerId?: string;
    name?: string;
    last4?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    statementDay?: number | null;
    dueDay?: number | null;
    creditLimit?: number | null;
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
