import { ScheduleData } from '@/types/emi.types';

export type ScenarioType = 'foreclosure';
export type ScenarioConfidence = 'exact' | 'estimated';

export type ForeclosureBreakdownComponent =
    | 'outstanding_principal'
    | 'accrued_interest'
    | 'accrued_gst'
    | 'foreclosure_charges'
    | 'foreclosure_charge_gst'
    | 'flat_charges'
    | 'total_payoff';

export interface ForeclosureAssumptions {
    simulationDate: Date;
    foreclosureChargeRate: number;
    foreclosureChargeAmount: number;
    foreclosureChargeGstRate: number;
    /** When true, include full next installment interest + GST instead of prorated accrual. */
    includeNextInstallmentInterest: boolean;
    name?: string;
    notes?: string;
}

export interface ScenarioBreakdownItem {
    component: ForeclosureBreakdownComponent;
    label: string;
    amount: number;
    sortOrder: number;
}

export interface LoanPositionAtDate {
    completedMonths: number;
    remainingMonths: number;
    outstandingPrincipal: number;
    paidToDate: number;
    interestPaidToDate: number;
    gstPaidToDate: number;
    principalPaidToDate: number;
    remainingInterest: number;
    remainingGst: number;
    remainingEmiOutflow: number;
    nextInstallmentInterest: number;
    nextInstallmentGst: number;
    daysIntoCurrentCycle: number;
    daysInCurrentCycle: number;
    cycleProgress: number;
}

export interface BaselineContinuationSummary {
    paidToDate: number;
    remainingOutflow: number;
    totalOutflow: number;
    remainingInterest: number;
    remainingGst: number;
    remainingMonths: number;
    oneTimeChargesPaid: number;
}

export interface ForeclosureScenarioResult {
    scenarioType: ScenarioType;
    simulationDate: Date;
    assumptions: Omit<ForeclosureAssumptions, 'simulationDate' | 'name' | 'notes'>;
    position: LoanPositionAtDate;
    baseline: BaselineContinuationSummary;
    outstandingPrincipal: number;
    accruedInterest: number;
    accruedGst: number;
    /** Percent-based foreclosure charge only (excludes flat charges). */
    foreclosureCharges: number;
    foreclosureChargeGst: number;
    /** Flat foreclosure / closing charges, kept separate from percent charges. */
    flatCharges: number;
    totalPayoff: number;
    paidToDate: number;
    foreclosureTotalOutflow: number;
    interestSaved: number;
    gstSaved: number;
    netSavings: number;
    monthsSaved: number;
    breakdown: ScenarioBreakdownItem[];
    confidence: ScenarioConfidence;
    assumptionNotes: string[];
}

export interface ILoanScenario {
    id: string;
    emiId: string;
    userId: string;
    name: string;
    scenarioType: ScenarioType;
    simulationDate: string;
    foreclosureChargeRate: number;
    foreclosureChargeAmount: number;
    foreclosureChargeGstRate: number;
    includeNextInstallmentInterest: boolean;
    outstandingPrincipal: number;
    accruedInterest: number;
    accruedGst: number;
    foreclosureCharges: number;
    foreclosureChargeGst: number;
    totalPayoff: number;
    paidToDate: number;
    baselineRemainingOutflow: number;
    baselineTotalOutflow: number;
    foreclosureTotalOutflow: number;
    interestSaved: number;
    gstSaved: number;
    netSavings: number;
    monthsSaved: number;
    confidence: ScenarioConfidence;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    breakdowns?: ScenarioBreakdownItem[];
}

export interface CreateLoanScenarioInput {
    emiId: string;
    name: string;
    notes?: string;
    result: ForeclosureScenarioResult;
}

export interface UpdateLoanScenarioInput {
    scenarioId: string;
    name: string;
    notes?: string;
    result: ForeclosureScenarioResult;
}

/** Schedule rows used by scenario engine (compatible with persisted amortization). */
export type ScenarioScheduleRow = Pick<
    ScheduleData,
    'month' | 'billDate' | 'emi' | 'interest' | 'principalPaid' | 'balance' | 'gst'
>;
