import { addMonths, differenceInCalendarDays, isBefore, isEqual, startOfDay } from 'date-fns';

import { IEmi } from '@/types/emi.types';
import {
    BaselineContinuationSummary,
    ForeclosureAssumptions,
    ForeclosureScenarioResult,
    LoanPositionAtDate,
    ScenarioBreakdownItem,
    ScenarioScheduleRow,
} from '@/types/scenario.types';
import { calculateProcessingFeeCharges, calculateRemainingTenure, coerceOptionalNumber } from '@/utils/calculation';

const roundMoney = (value: number): number => Number(value.toFixed(2));

const clampNonNegative = (value: number): number => (value < 0 ? 0 : value);

const toDate = (value: Date | string): Date => startOfDay(new Date(value));

const sortSchedule = (schedule: ScenarioScheduleRow[]): ScenarioScheduleRow[] =>
    [...schedule].sort((a, b) => a.month - b.month);

export const getOneTimeOriginationCharges = (emi: Pick<IEmi, 'processingFee' | 'processingFeeGst'>): number => {
    const processingFee = coerceOptionalNumber(emi.processingFee);
    const processingFeeGst = coerceOptionalNumber(emi.processingFeeGst);
    const { processingFeeGstAmount } = calculateProcessingFeeCharges(processingFee, processingFeeGst);
    return roundMoney(processingFee + processingFeeGstAmount);
};

/**
 * Derives outstanding principal and paid/remaining totals from the amortization schedule
 * as of a simulation date (calendar-derived installment progress).
 */
export const getLoanPositionAtDate = (
    emi: Pick<IEmi, 'principal' | 'tenure' | 'billDate' | 'amortizationSchedules'>,
    asOfDate: Date
): LoanPositionAtDate => {
    const billStart = toDate(emi.billDate);
    const simulationDate = toDate(asOfDate);
    const schedule = sortSchedule(emi.amortizationSchedules ?? []);
    const { completedMonths, remainingMonths } = calculateRemainingTenure(billStart, emi.tenure, simulationDate);

    const paidRows = schedule.slice(0, completedMonths);
    const remainingRows = schedule.slice(completedMonths);

    const sumField = (rows: ScenarioScheduleRow[], field: keyof ScenarioScheduleRow): number =>
        rows.reduce((acc, row) => acc + coerceOptionalNumber(row[field]), 0);

    const interestPaidToDate = roundMoney(sumField(paidRows, 'interest'));
    const gstPaidToDate = roundMoney(sumField(paidRows, 'gst'));
    const principalPaidToDate = roundMoney(sumField(paidRows, 'principalPaid'));
    const emiPaidToDate = roundMoney(sumField(paidRows, 'emi'));
    const paidToDate = roundMoney(emiPaidToDate + gstPaidToDate);

    const outstandingPrincipal =
        completedMonths <= 0
            ? roundMoney(coerceOptionalNumber(emi.principal))
            : roundMoney(clampNonNegative(coerceOptionalNumber(paidRows[paidRows.length - 1]?.balance)));

    const remainingInterest = roundMoney(sumField(remainingRows, 'interest'));
    const remainingGst = roundMoney(sumField(remainingRows, 'gst'));
    const remainingEmiOutflow = roundMoney(sumField(remainingRows, 'emi') + remainingGst);

    const nextRow = remainingRows[0];
    const nextInstallmentInterest = nextRow ? coerceOptionalNumber(nextRow.interest) : 0;
    const nextInstallmentGst = nextRow ? coerceOptionalNumber(nextRow.gst) : 0;

    // Accrual window runs from the last due installment date to the next due date.
    // When no installment is completed yet, there is no accrued interest (loan start day).
    const cycleStart = completedMonths <= 0 ? billStart : addMonths(billStart, completedMonths - 1);
    const cycleEnd = addMonths(cycleStart, 1);
    const daysInCurrentCycle = Math.max(differenceInCalendarDays(cycleEnd, cycleStart), 1);
    const rawDaysIntoCycle = differenceInCalendarDays(simulationDate, cycleStart);
    const daysIntoCurrentCycle = clampNonNegative(Math.min(Math.max(rawDaysIntoCycle, 0), daysInCurrentCycle));
    const cycleProgress = completedMonths <= 0 ? 0 : daysIntoCurrentCycle / daysInCurrentCycle;

    return {
        completedMonths,
        remainingMonths,
        outstandingPrincipal,
        paidToDate,
        interestPaidToDate,
        gstPaidToDate,
        principalPaidToDate,
        remainingInterest,
        remainingGst,
        remainingEmiOutflow,
        nextInstallmentInterest,
        nextInstallmentGst,
        daysIntoCurrentCycle,
        daysInCurrentCycle,
        cycleProgress,
    };
};

export const buildBaselineContinuationSummary = (
    emi: Pick<IEmi, 'processingFee' | 'processingFeeGst'>,
    position: LoanPositionAtDate
): BaselineContinuationSummary => {
    const oneTimeChargesPaid = getOneTimeOriginationCharges(emi);
    const remainingOutflow = position.remainingEmiOutflow;
    const paidToDate = roundMoney(position.paidToDate + oneTimeChargesPaid);
    const totalOutflow = roundMoney(paidToDate + remainingOutflow);

    return {
        paidToDate,
        remainingOutflow,
        totalOutflow,
        remainingInterest: position.remainingInterest,
        remainingGst: position.remainingGst,
        remainingMonths: position.remainingMonths,
        oneTimeChargesPaid,
    };
};

export const buildForeclosureBreakdown = (params: {
    outstandingPrincipal: number;
    accruedInterest: number;
    accruedGst: number;
    foreclosureCharges: number;
    foreclosureChargeGst: number;
    flatCharges: number;
    totalPayoff: number;
    includeNextInstallmentInterest: boolean;
}): ScenarioBreakdownItem[] => {
    const interestLabel = params.includeNextInstallmentInterest ? 'Next installment interest' : 'Accrued interest';
    const interestGstLabel = params.includeNextInstallmentInterest
        ? 'GST on next installment interest'
        : 'GST on accrued interest';

    return [
        {
            component: 'outstanding_principal',
            label: 'Outstanding principal',
            amount: params.outstandingPrincipal,
            sortOrder: 1,
        },
        {
            component: 'accrued_interest',
            label: interestLabel,
            amount: params.accruedInterest,
            sortOrder: 2,
        },
        {
            component: 'accrued_gst',
            label: interestGstLabel,
            amount: params.accruedGst,
            sortOrder: 3,
        },
        {
            component: 'foreclosure_charges',
            label: 'Foreclosure charges (%)',
            amount: params.foreclosureCharges,
            sortOrder: 4,
        },
        {
            component: 'foreclosure_charge_gst',
            label: 'GST on foreclosure charges',
            amount: params.foreclosureChargeGst,
            sortOrder: 5,
        },
        {
            component: 'flat_charges',
            label: 'Flat charges',
            amount: params.flatCharges,
            sortOrder: 6,
        },
        {
            component: 'total_payoff',
            label: 'Total payoff',
            amount: params.totalPayoff,
            sortOrder: 7,
        },
    ];
};

const validateAssumptions = (
    emi: Pick<IEmi, 'billDate' | 'endDate' | 'tenure'>,
    assumptions: ForeclosureAssumptions
): void => {
    const simulationDate = toDate(assumptions.simulationDate);
    const billStart = toDate(emi.billDate);
    const endDate = toDate(emi.endDate ?? addMonths(billStart, Math.max(emi.tenure - 1, 0)));

    if (isBefore(simulationDate, billStart) && !isEqual(simulationDate, billStart)) {
        throw new Error('Foreclosure date cannot be before the loan start date.');
    }

    if (isBefore(endDate, simulationDate) && !isEqual(simulationDate, endDate)) {
        const graceEnd = addMonths(endDate, 1);
        if (isBefore(graceEnd, simulationDate)) {
            throw new Error('Foreclosure date is outside the loan tenure.');
        }
    }

    if (assumptions.foreclosureChargeRate < 0 || assumptions.foreclosureChargeRate > 100) {
        throw new Error('Foreclosure charge rate must be between 0 and 100.');
    }

    if (assumptions.foreclosureChargeAmount < 0) {
        throw new Error('Flat charge amount cannot be negative.');
    }

    if (assumptions.foreclosureChargeGstRate < 0 || assumptions.foreclosureChargeGstRate > 100) {
        throw new Error('Foreclosure charge GST must be between 0 and 100.');
    }
};

/**
 * Calculates a foreclosure quote vs continuing the current EMI schedule.
 * Interest can be either prorated accrual or full next-installment interest + GST.
 * Percent foreclosure charges and flat charges are kept separate.
 */
export const calculateForeclosureScenario = (
    emi: IEmi,
    assumptions: ForeclosureAssumptions
): ForeclosureScenarioResult => {
    validateAssumptions(emi, assumptions);

    const simulationDate = toDate(assumptions.simulationDate);
    const chargeRate = coerceOptionalNumber(assumptions.foreclosureChargeRate);
    const flatCharges = coerceOptionalNumber(assumptions.foreclosureChargeAmount);
    const chargeGstRate = coerceOptionalNumber(assumptions.foreclosureChargeGstRate);
    const includeNextInstallmentInterest = !!assumptions.includeNextInstallmentInterest;
    const interestGstRate = coerceOptionalNumber(emi.gst);

    const position = getLoanPositionAtDate(emi, simulationDate);
    const baseline = buildBaselineContinuationSummary(emi, position);

    const outstandingPrincipal = position.outstandingPrincipal;
    const isFullyPaid = position.remainingMonths === 0 || outstandingPrincipal <= 0;

    let accruedInterest = 0;
    let accruedGst = 0;

    if (!isFullyPaid) {
        if (includeNextInstallmentInterest) {
            accruedInterest = roundMoney(clampNonNegative(position.nextInstallmentInterest));
            accruedGst =
                position.nextInstallmentGst > 0
                    ? roundMoney(clampNonNegative(position.nextInstallmentGst))
                    : roundMoney((accruedInterest * interestGstRate) / 100);
        } else {
            accruedInterest = roundMoney(clampNonNegative(position.nextInstallmentInterest * position.cycleProgress));
            accruedGst = roundMoney((accruedInterest * interestGstRate) / 100);
        }
    }

    const foreclosureCharges = isFullyPaid ? 0 : roundMoney((outstandingPrincipal * chargeRate) / 100);
    const foreclosureChargeGst = roundMoney((foreclosureCharges * chargeGstRate) / 100);
    const flatChargeAmount = roundMoney(flatCharges);

    const totalPayoff = roundMoney(
        (isFullyPaid ? 0 : outstandingPrincipal) +
            accruedInterest +
            accruedGst +
            foreclosureCharges +
            foreclosureChargeGst +
            flatChargeAmount
    );

    const paidToDate = baseline.paidToDate;
    const foreclosureTotalOutflow = roundMoney(paidToDate + totalPayoff);

    const interestSaved = roundMoney(clampNonNegative(position.remainingInterest - accruedInterest));
    const gstSaved = roundMoney(clampNonNegative(position.remainingGst - accruedGst));
    const netSavings = roundMoney(baseline.totalOutflow - foreclosureTotalOutflow);
    const monthsSaved = isFullyPaid ? 0 : position.remainingMonths;

    const breakdown = buildForeclosureBreakdown({
        outstandingPrincipal: isFullyPaid ? 0 : outstandingPrincipal,
        accruedInterest,
        accruedGst,
        foreclosureCharges,
        foreclosureChargeGst,
        flatCharges: flatChargeAmount,
        totalPayoff,
        includeNextInstallmentInterest,
    });

    const assumptionNotes: string[] = [
        'Payoff is estimated from your amortization schedule and selected foreclosure date.',
        includeNextInstallmentInterest
            ? 'Closing interest includes the full next installment interest and its GST.'
            : 'Accrued interest is prorated from the next scheduled installment interest.',
        'Percent foreclosure charges and flat charges are calculated and shown separately.',
        'GST on foreclosure charges applies only to the percent-based charge.',
        'Processing fee and its GST are treated as already paid (sunk) in both paths.',
        'Lender-specific lock-in rules or negotiated waivers are not applied automatically.',
    ];

    if (chargeRate > 0 || flatChargeAmount > 0) {
        assumptionNotes.push('Foreclosure charges use your entered rate/amount and may differ from the lender quote.');
    }

    const confidence: ForeclosureScenarioResult['confidence'] =
        chargeRate === 0 &&
        flatChargeAmount === 0 &&
        (includeNextInstallmentInterest || position.daysIntoCurrentCycle === 0)
            ? 'exact'
            : 'estimated';

    return {
        scenarioType: 'foreclosure',
        simulationDate,
        assumptions: {
            foreclosureChargeRate: chargeRate,
            foreclosureChargeAmount: flatChargeAmount,
            foreclosureChargeGstRate: chargeGstRate,
            includeNextInstallmentInterest,
        },
        position,
        baseline,
        outstandingPrincipal: isFullyPaid ? 0 : outstandingPrincipal,
        accruedInterest,
        accruedGst,
        foreclosureCharges,
        foreclosureChargeGst,
        flatCharges: flatChargeAmount,
        totalPayoff,
        paidToDate,
        foreclosureTotalOutflow,
        interestSaved,
        gstSaved,
        netSavings,
        monthsSaved,
        breakdown,
        confidence,
        assumptionNotes,
    };
};
