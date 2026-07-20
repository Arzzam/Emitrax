import { addMonths } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { IEmi } from '@/types/emi.types';
import { calculateEMI } from '@/utils/calculation';
import {
    buildBaselineContinuationSummary,
    buildForeclosureBreakdown,
    calculateForeclosureScenario,
    getLoanPositionAtDate,
} from '@/utils/scenarioCalculation';

const buildSampleEmi = (overrides?: Partial<IEmi>): IEmi => {
    const billDate = new Date('2025-01-15');
    const base = calculateEMI(
        {
            itemName: 'Test Loan',
            principal: 120000,
            interestRate: 12,
            tenure: 12,
            billDate,
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

const baseAssumptions = {
    foreclosureChargeRate: 0,
    foreclosureChargeAmount: 0,
    foreclosureChargeGstRate: 0,
    includeNextInstallmentInterest: false,
};

describe('getLoanPositionAtDate', () => {
    it('returns full principal before first bill cycle completes', () => {
        const emi = buildSampleEmi();
        const position = getLoanPositionAtDate(emi, new Date('2025-01-15'));

        expect(position.completedMonths).toBe(0);
        expect(position.outstandingPrincipal).toBe(120000);
        expect(position.remainingMonths).toBe(12);
        expect(position.paidToDate).toBe(0);
    });

    it('reduces outstanding principal after completed installments', () => {
        const emi = buildSampleEmi();
        // Bill dates Jan/Feb/Mar/Apr 15 are all before Apr 16 → 4 completed months
        const position = getLoanPositionAtDate(emi, new Date('2025-04-16'));

        expect(position.completedMonths).toBe(4);
        expect(position.outstandingPrincipal).toBeLessThan(120000);
        expect(position.outstandingPrincipal).toBeGreaterThan(0);
        expect(position.paidToDate).toBeGreaterThan(0);
        expect(position.remainingMonths).toBe(8);
    });
});

describe('buildForeclosureBreakdown', () => {
    it('keeps percent and flat charges as separate rows', () => {
        const breakdown = buildForeclosureBreakdown({
            outstandingPrincipal: 100000,
            accruedInterest: 500,
            accruedGst: 90,
            foreclosureCharges: 2000,
            foreclosureChargeGst: 360,
            flatCharges: 500,
            totalPayoff: 103450,
            includeNextInstallmentInterest: false,
        });

        expect(breakdown).toHaveLength(7);
        expect(breakdown[0].component).toBe('outstanding_principal');
        expect(breakdown.find((item) => item.component === 'flat_charges')?.amount).toBe(500);
        expect(breakdown.find((item) => item.component === 'foreclosure_charges')?.amount).toBe(2000);
        expect(breakdown[6].component).toBe('total_payoff');
        expect(breakdown[6].amount).toBe(103450);
    });
});

describe('calculateForeclosureScenario', () => {
    it('rejects foreclosure before loan start', () => {
        const emi = buildSampleEmi();

        expect(() =>
            calculateForeclosureScenario(emi, {
                simulationDate: new Date('2024-12-01'),
                ...baseAssumptions,
            })
        ).toThrow(/before the loan start date/i);
    });

    it('computes payoff with zero charges on bill date', () => {
        const emi = buildSampleEmi();
        const result = calculateForeclosureScenario(emi, {
            simulationDate: new Date('2025-01-15'),
            ...baseAssumptions,
        });

        expect(result.outstandingPrincipal).toBe(120000);
        expect(result.accruedInterest).toBe(0);
        expect(result.foreclosureCharges).toBe(0);
        expect(result.flatCharges).toBe(0);
        expect(result.totalPayoff).toBe(120000);
        expect(result.monthsSaved).toBe(12);
        expect(result.confidence).toBe('exact');
        expect(result.baseline.remainingMonths).toBe(12);
        expect(result.netSavings).toBeGreaterThan(0);
        expect(result.interestSaved).toBeGreaterThan(0);
    });

    it('keeps percent and flat foreclosure charges separate with GST only on percent', () => {
        const emi = buildSampleEmi();
        const result = calculateForeclosureScenario(emi, {
            simulationDate: new Date('2025-01-15'),
            foreclosureChargeRate: 2,
            foreclosureChargeAmount: 500,
            foreclosureChargeGstRate: 18,
            includeNextInstallmentInterest: false,
        });

        // 2% of 120000 = 2400; GST 18% of 2400 = 432; flat remains 500
        expect(result.foreclosureCharges).toBe(2400);
        expect(result.foreclosureChargeGst).toBe(432);
        expect(result.flatCharges).toBe(500);
        expect(result.totalPayoff).toBe(123332);
        expect(result.breakdown.find((item) => item.component === 'flat_charges')?.amount).toBe(500);
        expect(result.confidence).toBe('estimated');
    });

    it('prorates accrued interest mid-cycle by default', () => {
        const emi = buildSampleEmi();
        const result = calculateForeclosureScenario(emi, {
            simulationDate: new Date('2025-01-30'),
            ...baseAssumptions,
        });

        expect(result.position.completedMonths).toBe(1);
        expect(result.position.cycleProgress).toBeGreaterThan(0);
        expect(result.assumptions.includeNextInstallmentInterest).toBe(false);
        expect(result.accruedInterest).toBeGreaterThan(0);
        expect(result.accruedInterest).toBeLessThan(result.position.nextInstallmentInterest);
        expect(result.accruedGst).toBeGreaterThan(0);
        expect(result.totalPayoff).toBeGreaterThan(result.outstandingPrincipal);
        expect(result.confidence).toBe('estimated');
    });

    it('can include full next installment interest and GST', () => {
        const emi = buildSampleEmi();
        const result = calculateForeclosureScenario(emi, {
            simulationDate: new Date('2025-01-30'),
            foreclosureChargeRate: 0,
            foreclosureChargeAmount: 0,
            foreclosureChargeGstRate: 0,
            includeNextInstallmentInterest: true,
        });

        expect(result.assumptions.includeNextInstallmentInterest).toBe(true);
        expect(result.accruedInterest).toBe(roundish(result.position.nextInstallmentInterest));
        expect(result.accruedGst).toBe(roundish(result.position.nextInstallmentGst));
        expect(result.breakdown.find((item) => item.component === 'accrued_interest')?.label).toBe(
            'Next installment interest'
        );
        expect(result.totalPayoff).toBe(
            roundish(result.outstandingPrincipal + result.accruedInterest + result.accruedGst)
        );
    });

    it('handles near-end tenure foreclosure', () => {
        const emi = buildSampleEmi();
        const nearEnd = addMonths(new Date(emi.billDate), 11);
        const result = calculateForeclosureScenario(emi, {
            simulationDate: nearEnd,
            ...baseAssumptions,
        });

        expect(result.position.completedMonths).toBe(11);
        expect(result.monthsSaved).toBe(1);
        expect(result.outstandingPrincipal).toBeGreaterThan(0);
        expect(result.outstandingPrincipal).toBeLessThan(20000);
        expect(result.breakdown.length).toBe(7);
    });

    it('handles fully completed loan with only residual flat charges', () => {
        const emi = buildSampleEmi();
        const afterEnd = addMonths(new Date(emi.billDate), 12);
        const result = calculateForeclosureScenario(emi, {
            simulationDate: afterEnd,
            foreclosureChargeRate: 2,
            foreclosureChargeAmount: 250,
            foreclosureChargeGstRate: 18,
            includeNextInstallmentInterest: true,
        });

        expect(result.position.remainingMonths).toBe(0);
        expect(result.outstandingPrincipal).toBe(0);
        expect(result.accruedInterest).toBe(0);
        expect(result.foreclosureCharges).toBe(0);
        expect(result.foreclosureChargeGst).toBe(0);
        expect(result.flatCharges).toBe(250);
        expect(result.totalPayoff).toBe(250);
        expect(result.monthsSaved).toBe(0);
    });

    it('keeps baseline and foreclosure totals accounting for one-time fees', () => {
        const emi = buildSampleEmi();
        const position = getLoanPositionAtDate(emi, new Date('2025-01-15'));
        const baseline = buildBaselineContinuationSummary(emi, position);

        // Processing fee 1000 + 18% GST = 1180
        expect(baseline.oneTimeChargesPaid).toBe(1180);
        expect(baseline.paidToDate).toBe(1180);
        expect(baseline.totalOutflow).toBe(roundish(baseline.paidToDate + baseline.remainingOutflow));

        const result = calculateForeclosureScenario(emi, {
            simulationDate: new Date('2025-01-15'),
            ...baseAssumptions,
        });

        expect(result.paidToDate).toBe(1180);
        expect(result.foreclosureTotalOutflow).toBe(roundish(1180 + result.totalPayoff));
        expect(result.netSavings).toBe(roundish(result.baseline.totalOutflow - result.foreclosureTotalOutflow));
    });
});

const roundish = (value: number): number => Number(value.toFixed(2));
