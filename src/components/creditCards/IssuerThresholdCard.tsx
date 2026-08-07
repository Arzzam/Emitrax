import { Banknote, Landmark } from 'lucide-react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IssuerAggregate, ThresholdStatus } from '@/types/creditCard.types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import ThresholdGauge from './ThresholdGauge';

const STATUS_BADGE: Record<ThresholdStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
    safe: { label: 'Safe', variant: 'success' },
    watch: { label: 'Watch', variant: 'warning' },
    risk: { label: 'At risk', variant: 'destructive' },
    breached: { label: 'Reportable', variant: 'destructive' },
};

const IssuerThresholdCard = ({
    aggregate,
    threshold,
    cashThreshold,
    elapsedMonths,
}: {
    aggregate: IssuerAggregate;
    threshold: number;
    cashThreshold: number;
    elapsedMonths: number;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const badge = STATUS_BADGE[aggregate.status];

    const percent = threshold > 0 ? (aggregate.totalPaid / threshold) * 100 : 0;
    const headroom = threshold - aggregate.totalPaid;
    const cashPercent = cashThreshold > 0 ? (aggregate.cashPaid / cashThreshold) * 100 : 0;
    const isInactive = aggregate.cardCount > 0 && aggregate.activeCardCount === 0;

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pt-4 pb-1.5">
                <div className="min-w-0">
                    <CardTitle className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-tight">
                        <Landmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                        <span className="truncate">{aggregate.name}</span>
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {aggregate.cardCount} {aggregate.cardCount === 1 ? 'card' : 'cards'}
                        {isInactive ? ' · inactive' : ''}
                    </p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
            </CardHeader>

            <CardContent className="pb-4">
                <p className="text-xl font-semibold tabular-nums">{formatCurrencyAmount(aggregate.totalPaid)}</p>

                <div className="mt-2">
                    <ThresholdGauge
                        value={aggregate.totalPaid}
                        threshold={threshold}
                        status={aggregate.status}
                        label={`${aggregate.name} paid against the reporting threshold`}
                    />
                    <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                            {percent.toFixed(1)}% of {formatCurrencyAmount(threshold)}
                        </span>
                        <span className="tabular-nums">
                            {headroom >= 0
                                ? `${formatCurrencyAmount(headroom)} left`
                                : `${formatCurrencyAmount(Math.abs(headroom))} over`}
                        </span>
                    </div>
                </div>

                <p className="mt-2.5 text-xs text-muted-foreground">
                    Projected year-end{' '}
                    <span className="font-medium tabular-nums text-foreground">
                        {formatCurrencyAmount(aggregate.projectedTotal)}
                    </span>{' '}
                    · based on {elapsedMonths} {elapsedMonths === 1 ? 'month' : 'months'}
                </p>

                {aggregate.cashPaid > 0 && (
                    <div className="mt-3 border-t pt-2.5">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Banknote className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                                Paid in cash
                            </span>
                            <span className="font-medium tabular-nums">{formatCurrencyAmount(aggregate.cashPaid)}</span>
                        </div>
                        <ThresholdGauge
                            thin
                            className="mt-1.5"
                            value={aggregate.cashPaid}
                            threshold={cashThreshold}
                            status={aggregate.cashStatus}
                            label={`${aggregate.name} cash paid against the cash reporting threshold`}
                        />
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            {cashPercent.toFixed(1)}% of the {formatCurrencyAmount(cashThreshold)} cash limit
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default IssuerThresholdCard;
