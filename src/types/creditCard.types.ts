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
}

export interface UpdateCardInput {
    id: string;
    issuerId?: string;
    name?: string;
    last4?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}

export interface SavePaymentEntryInput {
    cardId: string;
    /** First day of the month, 'yyyy-MM-dd'. */
    periodMonth: string;
    amount: number;
    cashAmount: number;
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

/** Per-card, per-month lookup: cardId -> periodMonth -> entry. */
export type TrackerEntryMatrix = Map<string, Map<string, ICreditCardPaymentEntry>>;

export interface TrackerMatrix {
    entries: TrackerEntryMatrix;
    /** periodMonth -> row total across all cards. */
    monthTotals: Map<string, number>;
    /** periodMonth -> issuerId -> subtotal. */
    monthIssuerTotals: Map<string, Map<string, number>>;
    /** cardId -> financial-year total. */
    cardTotals: Map<string, number>;
    grandTotal: number;
}
