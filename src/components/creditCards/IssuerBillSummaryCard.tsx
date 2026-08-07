import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IssuerBillAggregate } from '@/types/creditCard.types';

import ThresholdGauge from '@/components/creditCards/ThresholdGauge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Per-issuer bill summary.
 *
 * Unlike payments there is no statutory threshold here - nothing about a bill is
 * reportable - so this replaces IssuerThresholdCard rather than reusing it.
 */
const IssuerBillSummaryCard = ({
    aggregate,
    monthLabelFor,
}: {
    aggregate: IssuerBillAggregate;
    /** Renders a periodMonth as a human label, e.g. '2026-05-01' -> 'May 2026'. */
    monthLabelFor: (periodMonth: string) => string;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    const coverage = [
        `${aggregate.monthsWithStatement} of 12 months entered`,
        aggregate.monthsWithNoStatement > 0 ? `${aggregate.monthsWithNoStatement} no statement` : null,
        aggregate.monthsNotEntered > 0 ? `${aggregate.monthsNotEntered} not entered` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Card className="border-border/80 shadow-sm">
            <CardContent className="space-y-2 py-4">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{aggregate.name}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                        {aggregate.cardCount} {aggregate.cardCount === 1 ? 'card' : 'cards'}
                    </p>
                </div>

                <p className="text-xl font-semibold tabular-nums">{formatCurrencyAmount(aggregate.totalBilled)}</p>

                <p className="text-xs text-muted-foreground">
                    {aggregate.monthsWithStatement > 0
                        ? `${formatCurrencyAmount(aggregate.averageBill)} average · peak ${formatCurrencyAmount(
                              aggregate.peakBill
                          )}${aggregate.peakMonth ? ` in ${monthLabelFor(aggregate.peakMonth)}` : ''}`
                        : 'No statements entered yet.'}
                </p>

                {/* Only a peak-vs-limit comparison is meaningful: a credit limit
                    constrains outstanding at a point in time, never a year's total. */}
                {aggregate.combinedLimit != null && aggregate.peakStatus != null && (
                    <div className="space-y-1 pt-1">
                        <ThresholdGauge
                            value={aggregate.peakBill}
                            threshold={aggregate.combinedLimit}
                            status={aggregate.peakStatus}
                            label={`${aggregate.name} peak monthly bill against the combined credit limit`}
                            thin
                        />
                        <p className="text-xs text-muted-foreground">
                            Peak month is {formatCurrencyAmount(aggregate.peakBill)} of a{' '}
                            {formatCurrencyAmount(aggregate.combinedLimit)} combined limit.
                        </p>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">{coverage}</p>

                <p className="border-t pt-2 text-[11px] text-muted-foreground">
                    Bills and payments are not directly comparable — a revolved balance is billed again next month with
                    interest.
                </p>
            </CardContent>
        </Card>
    );
};

export default IssuerBillSummaryCard;
