import { ForeclosureScenarioResult, ILoanScenario, ScenarioBreakdownItem } from '@/types/scenario.types';

export const breakdownFromScenario = (scenario: ILoanScenario): ScenarioBreakdownItem[] => {
    if (scenario.breakdowns && scenario.breakdowns.length > 0) {
        return scenario.breakdowns;
    }

    const interestLabel = scenario.includeNextInstallmentInterest ? 'Next installment interest' : 'Accrued interest';
    const interestGstLabel = scenario.includeNextInstallmentInterest
        ? 'GST on next installment interest'
        : 'GST on accrued interest';

    return [
        {
            component: 'outstanding_principal',
            label: 'Outstanding principal',
            amount: scenario.outstandingPrincipal,
            sortOrder: 1,
        },
        {
            component: 'accrued_interest',
            label: interestLabel,
            amount: scenario.accruedInterest,
            sortOrder: 2,
        },
        {
            component: 'accrued_gst',
            label: interestGstLabel,
            amount: scenario.accruedGst,
            sortOrder: 3,
        },
        {
            component: 'foreclosure_charges',
            label: 'Foreclosure charges (%)',
            amount: scenario.foreclosureCharges,
            sortOrder: 4,
        },
        {
            component: 'foreclosure_charge_gst',
            label: 'GST on foreclosure charges',
            amount: scenario.foreclosureChargeGst,
            sortOrder: 5,
        },
        {
            component: 'flat_charges',
            label: 'Flat charges',
            amount: scenario.foreclosureChargeAmount,
            sortOrder: 6,
        },
        {
            component: 'total_payoff',
            label: 'Total payoff',
            amount: scenario.totalPayoff,
            sortOrder: 7,
        },
    ];
};

export const breakdownFromResult = (result: ForeclosureScenarioResult): ScenarioBreakdownItem[] => result.breakdown;

export const comparisonPropsFromResult = (result: ForeclosureScenarioResult) => ({
    baselineTotalOutflow: result.baseline.totalOutflow,
    foreclosureTotalOutflow: result.foreclosureTotalOutflow,
    interestSaved: result.interestSaved,
    gstSaved: result.gstSaved,
    netSavings: result.netSavings,
    monthsSaved: result.monthsSaved,
    confidence: result.confidence,
    assumptionNotes: result.assumptionNotes,
});

export const comparisonPropsFromSaved = (scenario: ILoanScenario) => ({
    baselineTotalOutflow: scenario.baselineTotalOutflow,
    foreclosureTotalOutflow: scenario.foreclosureTotalOutflow,
    interestSaved: scenario.interestSaved,
    gstSaved: scenario.gstSaved,
    netSavings: scenario.netSavings,
    monthsSaved: scenario.monthsSaved,
    confidence: scenario.confidence,
    assumptionNotes: [
        'Saved scenario snapshot based on amortization schedule at calculation time.',
        scenario.includeNextInstallmentInterest
            ? 'This quote included full next installment interest and GST.'
            : 'This quote used prorated accrued interest.',
        'Re-run a fresh preview if loan terms or payments have changed.',
    ],
});
