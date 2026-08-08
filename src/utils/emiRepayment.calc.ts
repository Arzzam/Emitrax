import { startOfDay } from 'date-fns';

import { IEmi, IEmiSplit, ScheduleData } from '@/types/emi.types';
import { calculateProcessingFeeCharges, calculateRemainingTenure, coerceOptionalNumber } from '@/utils/calculation';

const roundMoney = (value: number): number => Number(value.toFixed(2));

const clampNonNegative = (value: number): number => (value < 0 ? 0 : value);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const toDate = (value: Date | string): Date => startOfDay(new Date(value));

const sumField = (rows: ScheduleData[], field: keyof ScheduleData): number =>
    rows.reduce((acc, row) => acc + coerceOptionalNumber(row[field]), 0);

/** Splits may sum to 100 with float slop; matches EmiSplitService.validateSplits. */
const COVERAGE_TOLERANCE = 0.01;

const ZERO_PARTS = {
    principal: 0,
    interest: 0,
    gst: 0,
    processingFee: 0,
    processingFeeGst: 0,
};

/**
 * One side of the repayment ledger. All figures are rupees at 2dp.
 *
 * `total` is summed from the already-rounded fields rather than rounded at the
 * end, so a rendered column always foots to its own subtotal.
 */
export interface RepaymentComponents {
    principal: number;
    interest: number;
    gst: number;
    /** Origination charge. Always 0 on the remaining side — see buildComponents. */
    processingFee: number;
    /** GST on the origination charge. Always 0 on the remaining side. */
    processingFeeGst: number;
    total: number;
}

export interface RepaymentProgress {
    paid: RepaymentComponents;
    remaining: RepaymentComponents;
    /** paid + remaining. Reconciles to calculateTotalLoanOutflow() to the rupee. */
    lifetime: RepaymentComponents;
    paidInstallments: number;
    remainingInstallments: number;
    totalInstallments: number;
    /** 0-1 share of lifetime outflow settled. 0 when there is nothing to settle. */
    completionRatio: number;
    /** Interest waived by interestDiscount, already netted out of both interest figures. */
    interestDiscountApplied: number;
    /** False when the amortization schedule was missing and aggregates were used instead. */
    isScheduleDerived: boolean;
}

export interface ParticipantRepayment {
    splitId: string;
    splitPercentage: number;
    monthlyShare: number;
    isCurrentUser: boolean;
    progress: RepaymentProgress;
}

export interface ParticipantRepaymentBreakdown {
    participants: ParticipantRepayment[];
    /** Sum of visible splitPercentage values. 100 for an owner; one share under RLS. */
    coveredPercentage: number;
    /** True when the caller cannot see every participant of the split. */
    isPartialView: boolean;
    /** Whole-loan minus the visible participants. Null when the view is complete. */
    unaccounted: RepaymentProgress | null;
}

const buildComponents = (parts: Omit<RepaymentComponents, 'total'>): RepaymentComponents => {
    const principal = roundMoney(parts.principal);
    const interest = roundMoney(parts.interest);
    const gst = roundMoney(parts.gst);
    const processingFee = roundMoney(parts.processingFee);
    const processingFeeGst = roundMoney(parts.processingFeeGst);

    return {
        principal,
        interest,
        gst,
        processingFee,
        processingFeeGst,
        total: roundMoney(principal + interest + gst + processingFee + processingFeeGst),
    };
};

const addComponents = (a: RepaymentComponents, b: RepaymentComponents): RepaymentComponents =>
    buildComponents({
        principal: a.principal + b.principal,
        interest: a.interest + b.interest,
        gst: a.gst + b.gst,
        processingFee: a.processingFee + b.processingFee,
        processingFeeGst: a.processingFeeGst + b.processingFeeGst,
    });

const subtractComponents = (a: RepaymentComponents, b: RepaymentComponents): RepaymentComponents =>
    buildComponents({
        principal: a.principal - b.principal,
        interest: a.interest - b.interest,
        gst: a.gst - b.gst,
        processingFee: a.processingFee - b.processingFee,
        processingFeeGst: a.processingFeeGst - b.processingFeeGst,
    });

const scaleComponents = (components: RepaymentComponents, factor: number): RepaymentComponents =>
    buildComponents({
        principal: components.principal * factor,
        interest: components.interest * factor,
        gst: components.gst * factor,
        processingFee: components.processingFee * factor,
        processingFeeGst: components.processingFeeGst * factor,
    });

/**
 * Splits a loan into what has been settled and what is still owed, as of a date.
 *
 * Installment progress is recomputed from the calendar rather than read off the
 * persisted `totalPaidEMIs`, which is frozen at the last write and drifts stale
 * for any EMI that has not been edited in months. `totalPaidEMIs` and
 * `remainingBalance` are deliberately absent from the accepted shape so neither
 * can be reintroduced by accident.
 *
 * Three domain rules the arithmetic encodes:
 *
 * 1. Origination charges (processing fee and its GST) are collected upfront at
 *    disbursal, so they sit wholly on the paid side and are zero on the
 *    remaining side no matter how many installments are outstanding.
 * 2. An interest discount is a loan-level concession applied to the aggregate,
 *    with no ground truth about which installment it attaches to. It is
 *    attributed proportionally, so paid + remaining interest equals the
 *    `totalInterest` shown everywhere else in the app.
 * 3. GST is deliberately NOT discounted. It accrues on the undiscounted per-row
 *    interest, and `emi.totalGST` — rendered in the cost breakdown — is that
 *    gross figure. Netting it here would make this card disagree with that one.
 */
export function getRepaymentProgress(
    emi: Pick<
        IEmi,
        | 'principal'
        | 'tenure'
        | 'billDate'
        | 'totalInterest'
        | 'totalGST'
        | 'processingFee'
        | 'processingFeeGst'
        | 'amortizationSchedules'
    >,
    asOfDate: Date = new Date()
): RepaymentProgress {
    const principal = coerceOptionalNumber(emi.principal);
    const totalInterest = coerceOptionalNumber(emi.totalInterest);
    const totalGST = coerceOptionalNumber(emi.totalGST);
    const processingFee = coerceOptionalNumber(emi.processingFee);
    const { processingFeeGstAmount } = calculateProcessingFeeCharges(processingFee, emi.processingFeeGst);

    const schedule = [...(emi.amortizationSchedules ?? [])].sort((a, b) => a.month - b.month);
    const totalInstallments = schedule.length > 0 ? schedule.length : Math.max(coerceOptionalNumber(emi.tenure), 0);

    const { completedMonths } = calculateRemainingTenure(toDate(emi.billDate), totalInstallments, toDate(asOfDate));
    const paidInstallments = clamp(completedMonths, 0, totalInstallments);
    const remainingInstallments = totalInstallments - paidInstallments;

    // Legacy rows persisted before schedules were stored: fall back to aggregates.
    // Nothing is knowably paid in that case beyond the upfront charges.
    if (schedule.length === 0) {
        const paid = buildComponents({
            principal: 0,
            interest: 0,
            gst: 0,
            processingFee,
            processingFeeGst: processingFeeGstAmount,
        });
        const remaining = buildComponents({
            principal,
            interest: totalInterest,
            gst: totalGST,
            processingFee: 0,
            processingFeeGst: 0,
        });
        const lifetime = addComponents(paid, remaining);

        return {
            paid,
            remaining,
            lifetime,
            paidInstallments,
            remainingInstallments,
            totalInstallments,
            completionRatio: lifetime.total > 0 ? clamp(paid.total / lifetime.total, 0, 1) : 0,
            interestDiscountApplied: 0,
            isScheduleDerived: false,
        };
    }

    const paidRows = schedule.slice(0, paidInstallments);
    const remainingRows = schedule.slice(paidInstallments);

    // Outstanding principal comes from the schedule balance. Paid principal is
    // then the complement, so the two always sum to the loan principal —
    // summing the rounded per-row principalPaid strings instead would drift by
    // cents and the columns would visibly fail to foot.
    //
    // Once every installment is behind us the loan is closed, so the balance is
    // zero by definition. The final schedule row does not quite reach zero
    // (calculateAmortizationSchedule amortizes off an EMI already rounded to
    // 2dp, leaving a few paise), and that residue must not surface as an
    // outstanding balance on a settled loan.
    let remainingPrincipal: number;
    if (remainingRows.length === 0) {
        remainingPrincipal = 0;
    } else if (paidInstallments === 0) {
        remainingPrincipal = principal;
    } else {
        remainingPrincipal = clampNonNegative(coerceOptionalNumber(paidRows[paidRows.length - 1]?.balance));
    }
    const paidPrincipal = clampNonNegative(principal - remainingPrincipal);

    const grossInterest = sumField(schedule, 'interest');
    const discountRatio = grossInterest > 0 ? Math.min(totalInterest / grossInterest, 1) : 1;
    const paidInterest = roundMoney(sumField(paidRows, 'interest') * discountRatio);
    // Subtraction rather than scaling the remaining rows, so the two sides
    // reconcile exactly to totalInterest and the residual lands in one place.
    const remainingInterest = clampNonNegative(roundMoney(totalInterest - paidInterest));

    const paid = buildComponents({
        principal: paidPrincipal,
        interest: paidInterest,
        gst: sumField(paidRows, 'gst'),
        processingFee,
        processingFeeGst: processingFeeGstAmount,
    });

    const remaining = buildComponents({
        principal: remainingPrincipal,
        interest: remainingInterest,
        gst: sumField(remainingRows, 'gst'),
        processingFee: 0,
        processingFeeGst: 0,
    });

    const lifetime = addComponents(paid, remaining);

    return {
        paid,
        remaining,
        lifetime,
        paidInstallments,
        remainingInstallments,
        totalInstallments,
        completionRatio: lifetime.total > 0 ? clamp(paid.total / lifetime.total, 0, 1) : 0,
        interestDiscountApplied: roundMoney(clampNonNegative(grossInterest - totalInterest)),
        isScheduleDerived: true,
    };
}

/**
 * Scales a repayment ledger down to one participant's share of a split EMI.
 *
 * Installment counts and the completion ratio are NOT scaled — a participant on
 * 30% still faces the same 12-of-36 schedule as everyone else on the loan.
 *
 * The sub-rupee residual from rounding each share independently is not
 * redistributed. Callers must not render a "sum of participants" total; the
 * whole-loan figure is available for that, which keeps the residual invisible.
 */
export function prorateRepaymentProgress(progress: RepaymentProgress, splitPercentage: number): RepaymentProgress {
    const factor = clamp(coerceOptionalNumber(splitPercentage), 0, 100) / 100;

    const paid = scaleComponents(progress.paid, factor);
    const remaining = scaleComponents(progress.remaining, factor);

    return {
        ...progress,
        paid,
        remaining,
        lifetime: addComponents(paid, remaining),
        interestDiscountApplied: roundMoney(progress.interestDiscountApplied * factor),
    };
}

/**
 * Builds the per-participant ledger for a split EMI.
 *
 * Returns figures only — participant names and emails are resolved by the UI,
 * which owns display concerns.
 *
 * Row-level RLS lets an EMI owner read every split row but a registered
 * participant only their own. So `splits` arriving here may cover the whole
 * loan or a single share, and callers must branch on `isPartialView` rather
 * than on ownership: a splits set that fails to reach 100% for any reason then
 * degrades the same way instead of rendering a table that does not add up.
 */
export function getParticipantRepaymentBreakdown(
    emi: Pick<IEmi, 'emi' | 'splits' | 'mySplit'>,
    progress: RepaymentProgress
): ParticipantRepaymentBreakdown {
    const splits: IEmiSplit[] = emi.splits ?? [];
    const monthlyEmi = coerceOptionalNumber(emi.emi);

    const participants: ParticipantRepayment[] = splits.map((split) => {
        const splitPercentage = coerceOptionalNumber(split.splitPercentage);

        return {
            splitId: split.id,
            splitPercentage,
            // The persisted splitAmount is written by a DB trigger off emis.emi
            // and is not refreshed when the EMI changes, so fall back to the
            // live product when it is missing.
            monthlyShare: roundMoney(split.splitAmount ?? (monthlyEmi * splitPercentage) / 100),
            isCurrentUser: !!emi.mySplit && emi.mySplit.id === split.id,
            progress: prorateRepaymentProgress(progress, splitPercentage),
        };
    });

    const coveredPercentage = participants.reduce((acc, participant) => acc + participant.splitPercentage, 0);
    const isPartialView = participants.length > 0 && coveredPercentage < 100 - COVERAGE_TOLERANCE;

    let unaccounted: RepaymentProgress | null = null;
    if (isPartialView) {
        const zero = buildComponents(ZERO_PARTS);
        const claimedPaid = participants.reduce((acc, p) => addComponents(acc, p.progress.paid), zero);
        const claimedRemaining = participants.reduce((acc, p) => addComponents(acc, p.progress.remaining), zero);
        const paid = subtractComponents(progress.paid, claimedPaid);
        const remaining = subtractComponents(progress.remaining, claimedRemaining);

        unaccounted = { ...progress, paid, remaining, lifetime: addComponents(paid, remaining) };
    }

    return {
        participants,
        coveredPercentage: roundMoney(coveredPercentage),
        isPartialView,
        unaccounted,
    };
}
