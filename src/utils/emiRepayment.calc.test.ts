import { describe, expect, it } from 'vitest';

import { IEmi, IEmiSplit } from '@/types/emi.types';
import { calculateEMI, calculateTotalLoanOutflow } from '@/utils/calculation';
import {
    getParticipantRepaymentBreakdown,
    getRepaymentProgress,
    prorateRepaymentProgress,
    RepaymentComponents,
} from '@/utils/emiRepayment.calc';

// A 12-month loan starting 2025-01-15. Six installments are due by the
// reference date, so paid/remaining are both non-trivial.
const REFERENCE = new Date(2025, 6, 1); // 2025-07-01

const buildEmi = (overrides?: Partial<IEmi>): IEmi => {
    const base = calculateEMI(
        {
            itemName: 'Test Loan',
            principal: 120000,
            interestRate: 12,
            tenure: 12,
            billDate: new Date('2025-01-15'),
            interestDiscount: 0,
            interestDiscountType: 'percent',
            gst: 18,
            processingFee: 1000,
            processingFeeGst: 18,
            tag: 'Personal',
        } as IEmi,
        'test-emi-id'
    );

    return {
        ...base,
        ...overrides,
        amortizationSchedules: overrides?.amortizationSchedules ?? base.amortizationSchedules,
    };
};

const buildSplit = (splitPercentage: number, overrides?: Partial<IEmiSplit>): IEmiSplit => ({
    id: `split-${splitPercentage}`,
    emiId: 'test-emi-id',
    userId: 'user-1',
    splitPercentage,
    splitAmount: 0,
    isExternal: false,
    createdBy: 'owner-1',
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
    ...overrides,
});

const foots = (components: RepaymentComponents): number =>
    Number(
        (
            components.principal +
            components.interest +
            components.gst +
            components.processingFee +
            components.processingFeeGst
        ).toFixed(2)
    );

describe('getRepaymentProgress', () => {
    it('reports nothing paid but the upfront charges before the first installment falls due', () => {
        const progress = getRepaymentProgress(buildEmi(), new Date(2025, 0, 1));

        expect(progress.paidInstallments).toBe(0);
        expect(progress.paid.principal).toBe(0);
        expect(progress.paid.interest).toBe(0);
        expect(progress.paid.processingFee).toBe(1000);
        expect(progress.remaining.principal).toBe(120000);
    });

    it('takes outstanding principal from the balance of the last paid schedule row', () => {
        const emi = buildEmi();
        const progress = getRepaymentProgress(emi, REFERENCE);

        const expected = Number(emi.amortizationSchedules[progress.paidInstallments - 1].balance);
        expect(progress.remaining.principal).toBe(Number(expected.toFixed(2)));
    });

    it('splits principal so that paid and remaining sum to the loan principal exactly', () => {
        const progress = getRepaymentProgress(buildEmi(), REFERENCE);

        expect(progress.paid.principal + progress.remaining.principal).toBe(120000);
    });

    it('puts the processing fee and its gst entirely on the paid side', () => {
        const progress = getRepaymentProgress(buildEmi(), REFERENCE);

        expect(progress.paid.processingFee).toBe(1000);
        expect(progress.paid.processingFeeGst).toBe(180);
    });

    it('leaves both origination fields at zero on the remaining side', () => {
        const progress = getRepaymentProgress(buildEmi(), REFERENCE);

        expect(progress.remaining.processingFee).toBe(0);
        expect(progress.remaining.processingFeeGst).toBe(0);
    });

    it('reports no origination charges when the loan has none', () => {
        const emi = buildEmi({ processingFee: undefined, processingFeeGst: undefined });
        const progress = getRepaymentProgress(emi, REFERENCE);

        expect(progress.paid.processingFee).toBe(0);
        expect(progress.paid.processingFeeGst).toBe(0);
    });

    it('nets a percent interest discount across both sides so they sum to totalInterest', () => {
        const emi = buildEmi({ interestDiscount: 25, interestDiscountType: 'percent' });
        const rebuilt = calculateEMI(emi, emi.id);
        const progress = getRepaymentProgress(rebuilt, REFERENCE);

        expect(progress.paid.interest + progress.remaining.interest).toBeCloseTo(rebuilt.totalInterest, 2);
        expect(progress.interestDiscountApplied).toBeGreaterThan(0);
    });

    it('nets an amount interest discount the same way', () => {
        const emi = buildEmi({ interestDiscount: 2000, interestDiscountType: 'amount' });
        const rebuilt = calculateEMI(emi, emi.id);
        const progress = getRepaymentProgress(rebuilt, REFERENCE);

        expect(progress.paid.interest + progress.remaining.interest).toBeCloseTo(rebuilt.totalInterest, 2);
        expect(progress.interestDiscountApplied).toBeCloseTo(2000, 2);
    });

    it('clamps a discount larger than the gross interest to zero interest on both sides', () => {
        const emi = buildEmi({ interestDiscount: 999999, interestDiscountType: 'amount' });
        const rebuilt = calculateEMI(emi, emi.id);
        const progress = getRepaymentProgress(rebuilt, REFERENCE);

        expect(rebuilt.totalInterest).toBe(0);
        expect(progress.paid.interest).toBe(0);
        expect(progress.remaining.interest).toBe(0);
    });

    it('keeps gst gross so paid and remaining gst sum to totalGST', () => {
        const emi = buildEmi();
        const progress = getRepaymentProgress(emi, REFERENCE);

        expect(progress.paid.gst + progress.remaining.gst).toBeCloseTo(emi.totalGST, 1);
    });

    it('returns finite figures for a zero-interest loan', () => {
        const emi = buildEmi({ interestRate: 0 });
        const rebuilt = calculateEMI(emi, emi.id);
        const progress = getRepaymentProgress(rebuilt, REFERENCE);

        expect(Number.isFinite(progress.paid.interest)).toBe(true);
        expect(Number.isFinite(progress.completionRatio)).toBe(true);
        expect(progress.paid.interest).toBe(0);
        expect(progress.remaining.interest).toBe(0);
    });

    it('reports a fully repaid loan as all-zero remaining with a completion ratio of one', () => {
        const progress = getRepaymentProgress(buildEmi(), new Date(2030, 0, 1));

        expect(progress.remainingInstallments).toBe(0);
        expect(progress.remaining.principal).toBe(0);
        expect(progress.remaining.total).toBe(0);
        expect(progress.completionRatio).toBe(1);
    });

    it('clamps the installment count to the schedule length when the date is past the end', () => {
        const progress = getRepaymentProgress(buildEmi(), new Date(2040, 0, 1));

        expect(progress.paidInstallments).toBe(12);
        expect(progress.remainingInstallments).toBe(0);
    });

    it('clamps the installment count to zero for a date before the loan started', () => {
        const progress = getRepaymentProgress(buildEmi(), new Date(2020, 0, 1));

        expect(progress.paidInstallments).toBe(0);
        expect(progress.remainingInstallments).toBe(12);
    });

    it('falls back to aggregate totals when the amortization schedule is empty', () => {
        const progress = getRepaymentProgress(buildEmi({ amortizationSchedules: [] }), REFERENCE);

        expect(progress.isScheduleDerived).toBe(false);
        expect(progress.remaining.principal).toBe(120000);
        expect(progress.paid.processingFee).toBe(1000);
    });

    it('reconciles the lifetime total to calculateTotalLoanOutflow', () => {
        const emi = buildEmi();
        const progress = getRepaymentProgress(emi, REFERENCE);

        expect(progress.lifetime.total).toBeCloseTo(
            calculateTotalLoanOutflow({
                principal: emi.principal,
                totalInterest: emi.totalInterest,
                totalGST: emi.totalGST,
                processingFee: emi.processingFee,
                processingFeeGst: emi.processingFeeGst,
            }),
            1
        );
    });

    it('keeps every column footing to its own subtotal', () => {
        const progress = getRepaymentProgress(buildEmi(), REFERENCE);

        expect(foots(progress.paid)).toBe(progress.paid.total);
        expect(foots(progress.remaining)).toBe(progress.remaining.total);
        expect(foots(progress.lifetime)).toBe(progress.lifetime.total);
    });
});

describe('prorateRepaymentProgress', () => {
    const progress = getRepaymentProgress(buildEmi(), REFERENCE);

    it('scales every money component by the percentage', () => {
        const share = prorateRepaymentProgress(progress, 40);

        expect(share.paid.principal).toBeCloseTo(progress.paid.principal * 0.4, 2);
        expect(share.remaining.interest).toBeCloseTo(progress.remaining.interest * 0.4, 2);
        expect(share.paid.processingFee).toBeCloseTo(progress.paid.processingFee * 0.4, 2);
    });

    it('returns the whole-loan figures unchanged at one hundred percent', () => {
        const share = prorateRepaymentProgress(progress, 100);

        expect(share.paid).toEqual(progress.paid);
        expect(share.remaining).toEqual(progress.remaining);
    });

    it('returns all-zero money at zero percent', () => {
        const share = prorateRepaymentProgress(progress, 0);

        expect(share.paid.total).toBe(0);
        expect(share.remaining.total).toBe(0);
    });

    it('leaves the installment counts and completion ratio unscaled', () => {
        const share = prorateRepaymentProgress(progress, 30);

        expect(share.paidInstallments).toBe(progress.paidInstallments);
        expect(share.remainingInstallments).toBe(progress.remainingInstallments);
        expect(share.totalInstallments).toBe(progress.totalInstallments);
        expect(share.completionRatio).toBe(progress.completionRatio);
    });

    it('keeps each prorated column footing to its own subtotal', () => {
        const share = prorateRepaymentProgress(progress, 33.33);

        expect(foots(share.paid)).toBe(share.paid.total);
        expect(foots(share.remaining)).toBe(share.remaining.total);
    });

    it('clamps a percentage above one hundred and below zero', () => {
        expect(prorateRepaymentProgress(progress, 250).paid).toEqual(progress.paid);
        expect(prorateRepaymentProgress(progress, -50).paid.total).toBe(0);
    });
});

describe('getParticipantRepaymentBreakdown', () => {
    const progress = getRepaymentProgress(buildEmi(), REFERENCE);

    it('returns one row per split, preserving input order', () => {
        const emi = buildEmi({ splits: [buildSplit(60, { id: 'a' }), buildSplit(40, { id: 'b' })] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants.map((p) => p.splitId)).toEqual(['a', 'b']);
    });

    it('flags the current user row via mySplit', () => {
        const mine = buildSplit(40, { id: 'b' });
        const emi = buildEmi({ splits: [buildSplit(60, { id: 'a' }), mine], mySplit: mine });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants.map((p) => p.isCurrentUser)).toEqual([false, true]);
    });

    it('prefers the persisted split amount over the recomputed monthly share', () => {
        const emi = buildEmi({ splits: [buildSplit(100, { splitAmount: 4242 })] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants[0].monthlyShare).toBe(4242);
    });

    it('falls back to the live product when the persisted split amount is missing', () => {
        const emi = buildEmi({ splits: [buildSplit(50, { splitAmount: undefined as unknown as number })] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants[0].monthlyShare).toBe(Number((emi.emi * 0.5).toFixed(2)));
    });

    it('sums participant totals back to the whole loan when splits cover one hundred percent', () => {
        const emi = buildEmi({ splits: [buildSplit(60, { id: 'a' }), buildSplit(40, { id: 'b' })] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        const paid = breakdown.participants.reduce((acc, p) => acc + p.progress.paid.total, 0);
        const remaining = breakdown.participants.reduce((acc, p) => acc + p.progress.remaining.total, 0);

        expect(paid).toBeCloseTo(progress.paid.total, 0);
        expect(remaining).toBeCloseTo(progress.remaining.total, 0);
        expect(breakdown.isPartialView).toBe(false);
        expect(breakdown.unaccounted).toBeNull();
    });

    it('reports a partial view with the unaccounted remainder when only one split of a multi-way emi is visible', () => {
        const mine = buildSplit(30);
        const emi = buildEmi({ splits: [mine], mySplit: mine });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.coveredPercentage).toBe(30);
        expect(breakdown.isPartialView).toBe(true);
        expect(breakdown.unaccounted?.remaining.total).toBeCloseTo(progress.remaining.total * 0.7, 0);
    });

    it('treats a total a hundredth over one hundred percent as complete', () => {
        const emi = buildEmi({ splits: [buildSplit(50, { id: 'a' }), buildSplit(50.01, { id: 'b' })] });

        expect(getParticipantRepaymentBreakdown(emi, progress).isPartialView).toBe(false);
    });

    it('returns no participants and a complete view for a non-split emi', () => {
        const breakdown = getParticipantRepaymentBreakdown(buildEmi(), progress);

        expect(breakdown.participants).toEqual([]);
        expect(breakdown.isPartialView).toBe(false);
        expect(breakdown.unaccounted).toBeNull();
    });

    it('handles a single participant holding the whole loan', () => {
        const emi = buildEmi({ splits: [buildSplit(100)] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants[0].progress.remaining.total).toBe(progress.remaining.total);
        expect(breakdown.isPartialView).toBe(false);
    });

    it('distributes three thirds without losing more than a rupee', () => {
        const emi = buildEmi({
            splits: [buildSplit(33.33, { id: 'a' }), buildSplit(33.33, { id: 'b' }), buildSplit(33.34, { id: 'c' })],
        });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        const total = breakdown.participants.reduce((acc, p) => acc + p.progress.lifetime.total, 0);
        expect(Math.abs(total - progress.lifetime.total)).toBeLessThan(1);
    });

    it('handles an external participant carrying neither email nor user id', () => {
        const external = buildSplit(100, {
            userId: undefined,
            isExternal: true,
            participantName: 'Roommate',
        });
        const emi = buildEmi({ splits: [external] });
        const breakdown = getParticipantRepaymentBreakdown(emi, progress);

        expect(breakdown.participants[0].splitPercentage).toBe(100);
        expect(breakdown.isPartialView).toBe(false);
    });
});
