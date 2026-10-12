import type { NumberFormatMode } from '@/types/account.types';
import type { BillEntryStatus, IssuerColorToken } from '@/types/creditCard.types';
import type { ILoanScenario } from '@/types/scenario.types';
import type { EmiOwnershipMode, IEmiOwnership } from '@/utils/emiOwnership.calc';
import type { RepaymentProgress } from '@/utils/emiRepayment.calc';

/**
 * Bump when a consumer would read an existing field differently. Adding a field
 * is not a break; changing what one means is.
 */
/** 2: per-EMI `currency`; `summary` became `summaryByCurrency` (amounts never summed across currencies). */
export const DATA_EXPORT_SCHEMA_VERSION = 2;

export type DataExportScope = 'all' | 'emi';

export interface ExportedAccount {
    userId: string;
    email: string;
    displayName: string | null;
    currency: string;
    locale: string;
    numberFormat: NumberFormatMode;
}

export interface ExportedEmiTerms {
    principal: number;
    interestRatePercent: number;
    tenureMonths: number;
    billDate: string;
    endDate: string;
    gstRatePercent: number;
    interestDiscount: number;
    interestDiscountType: 'percent' | 'amount';
    processingFee: number;
    processingFeeGstPercent: number;
}

export interface ExportedEmiTotals {
    monthlyEmi: number;
    totalInterest: number;
    totalGst: number;
    /** Principal + interest + GST + origination charges. The true cost of the loan. */
    totalOutflow: number;
}

export interface ExportedScheduleRow {
    month: number;
    billDate: string;
    emi: number;
    interest: number;
    principalPaid: number;
    balance: number;
    gst: number;
    /** Derived from the calendar, not from the stored paid flag. */
    isPaid: boolean;
}

export interface ExportedParticipant {
    /** Stable across EMIs: the user id, or `ext:<email|name>` for a name-only participant. */
    key: string;
    name: string;
    email: string | null;
    isExternal: boolean;
    isCurrentUser: boolean;
    percentage: number;
    monthlyShare: number;
    /** This participant's prorated slice of the loan. */
    share: RepaymentProgress;
}

export interface ExportedEmiOwnership extends IEmiOwnership {
    /** Plain-language reading of `mode`, so a consumer need not infer it. */
    summary: string;
    /** The signed-in user's prorated slice. All zeroes for `on_behalf` and `observer`. */
    myShare: RepaymentProgress;
    myMonthlyShare: number;
    /** Everyone else's slice of a loan the user owns. The amount fronted for others. */
    othersShare: RepaymentProgress;
    othersMonthlyShare: number;
    participants: ExportedParticipant[];
}

export interface ExportedShare {
    email: string | null;
    permission: 'read' | 'write';
}

export interface ExportedEmi {
    id: string;
    itemName: string;
    /** ISO 4217 code every amount in this node is in. */
    currency: string;
    tag: string | null;
    notes: string | null;
    isCompleted: boolean;
    isArchived: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    terms: ExportedEmiTerms;
    totals: ExportedEmiTotals;
    /** Whole-loan ledger, regardless of who carries it. */
    progress: RepaymentProgress;
    ownership: ExportedEmiOwnership;
    sharedWith: ExportedShare[];
    amortizationSchedule: ExportedScheduleRow[];
    scenarios: ILoanScenario[];
}

export interface ExportedOutflowTotals {
    emiCount: number;
    /** Excludes completed and archived loans — what actually leaves an account each month. */
    monthlyOutflow: number;
    paid: number;
    remaining: number;
    lifetime: number;
}

export interface ExportedParticipantRollup {
    key: string;
    name: string;
    email: string | null;
    isExternal: boolean;
    isCurrentUser: boolean;
    emiCount: number;
    monthlyShare: number;
    paid: number;
    remaining: number;
    lifetime: number;
}

export interface DataExportSummary {
    emiCount: number;
    activeCount: number;
    completedCount: number;
    archivedCount: number;
    countByOwnership: Record<EmiOwnershipMode, number>;
    /** The user's own liability, prorated across every loan they carry a share of. */
    mine: ExportedOutflowTotals;
    /** Loans the user owns but others carry — money fronted on their card for family and friends. */
    financedForOthers: ExportedOutflowTotals;
    /** Loans owned by someone else, visible through a share. Counted in neither bucket above. */
    observed: ExportedOutflowTotals;
    /** Whole-loan totals across every loan the user owns, before any split attribution. */
    ownedGross: ExportedOutflowTotals;
    /** Per-person roll-up across all loans, so a consumer can answer "who owes what". */
    participants: ExportedParticipantRollup[];
}

export interface ExportedCreditCard {
    id: string;
    name: string;
    last4: string | null;
    isActive: boolean;
    statementDay: number | null;
    dueDay: number | null;
    creditLimit: number | null;
}

export interface ExportedCreditCardIssuer {
    id: string;
    name: string;
    color: IssuerColorToken | null;
    cards: ExportedCreditCard[];
}

export interface ExportedCreditCardPayment {
    cardId: string;
    cardName: string;
    issuerName: string;
    /** First day of the month the payment was made, 'yyyy-MM-dd'. */
    periodMonth: string;
    financialYear: string;
    amount: number;
    cashAmount: number;
    nonCashAmount: number;
    note: string | null;
}

export interface ExportedCreditCardBill {
    cardId: string;
    cardName: string;
    issuerName: string;
    /** First day of the month the STATEMENT was generated — offset by one month from a payment. */
    statementMonth: string;
    financialYear: string;
    status: BillEntryStatus;
    totalDue: number | null;
    minimumDue: number | null;
    statementDate: string | null;
    dueDate: string | null;
    note: string | null;
}

export interface ExportedCreditCardYear {
    financialYear: string;
    notes: string | null;
    thresholdAmount: number;
    cashThresholdAmount: number;
}

export interface ExportedCreditCards {
    issuers: ExportedCreditCardIssuer[];
    trackerYears: ExportedCreditCardYear[];
    payments: ExportedCreditCardPayment[];
    bills: ExportedCreditCardBill[];
}

export interface DataExportDocument {
    schemaVersion: number;
    generatedAt: string;
    scope: DataExportScope;
    source: { app: string; url: string };
    account: ExportedAccount;
    /** Field semantics that are not self-evident, for whoever reads this file. */
    glossary: Record<string, string>;
    /** One summary per currency, keyed by ISO code. Amounts are never added across currencies. */
    summaryByCurrency: Record<string, DataExportSummary>;
    emis: ExportedEmi[];
    /** Omitted on a single-EMI export. */
    creditCards?: ExportedCreditCards;
}
