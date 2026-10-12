import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IssuerUtilisationAggregate } from '@/types/creditCard.types';
import { formatUtilisationPercent } from '@/utils/creditCardUtilisation.calc';

import ThresholdGauge from '@/components/creditCards/ThresholdGauge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Per-issuer utilisation summary.
 *
 * Headlines the PEAK rather than the average, because a limit is breached at a
 * point in time - a wallet that sat at 90% for one month and 10% for eleven is
 * not a 17% wallet, and the bureau that scores it will have seen the 90%.
 *
 * The coverage line is not decoration. Combined figures cover only the cards
 * that had both a statement and a limit, so a card missing either must be
 * visible or the headline reads as complete when it is not.
 */
const IssuerUtilisationCard = ({
    aggregate,
    monthLabelFor,
}: {
    aggregate: IssuerUtilisationAggregate;
    /** Renders a periodMonth as a human label, e.g. '2026-05-01' -> 'May 2026'. */
    monthLabelFor: (periodMonth: string) => string;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    const coverage = [
        `${aggregate.monthsWithData} of ${aggregate.monthsMeasurable} months measured`,
        aggregate.cardsWithoutLimitCount > 0
            ? `${aggregate.cardsWithoutLimitCount} card${aggregate.cardsWithoutLimitCount === 1 ? '' : 's'} without a limit`
            : null,
        aggregate.hasPartialMonths ? 'some months assumed nil' : null,
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

                {aggregate.peak === null || aggregate.status === null ? (
                    <>
                        <p className="text-xl font-semibold tabular-nums text-muted-foreground">—</p>
                        <p className="text-xs text-muted-foreground">
                            {aggregate.cardCount === 0
                                ? 'No cards under this bank yet.'
                                : 'Needs a credit limit and at least one statement before utilisation can be measured.'}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-xl font-semibold tabular-nums">
                            {formatUtilisationPercent(aggregate.peak.ratio)}
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">peak</span>
                        </p>

                        <ThresholdGauge
                            value={aggregate.peak.balance}
                            threshold={aggregate.peak.limit}
                            status={aggregate.status}
                            label={`${aggregate.name} peak monthly utilisation`}
                            thin
                        />

                        <p className="text-xs text-muted-foreground">
                            {formatCurrencyAmount(aggregate.peak.balance)} of{' '}
                            {formatCurrencyAmount(aggregate.peak.limit)} in{' '}
                            {monthLabelFor(aggregate.peak.statementMonth)}
                            {aggregate.peak.overLimit && ' — over the limit'}
                        </p>

                        {aggregate.averageRatio !== null && (
                            <p className="text-xs text-muted-foreground">
                                {formatUtilisationPercent(aggregate.averageRatio)} average across measured months
                                {aggregate.latest &&
                                    ` · ${formatUtilisationPercent(aggregate.latest.ratio)} in ${monthLabelFor(
                                        aggregate.latest.statementMonth
                                    )}`}
                            </p>
                        )}
                    </>
                )}

                <p className="text-xs text-muted-foreground">{coverage}</p>

                <p className="border-t pt-2 text-[11px] text-muted-foreground">
                    Every card under this bank counts toward the total, balance or not — the same rule the overall
                    figure uses.
                </p>
            </CardContent>
        </Card>
    );
};

export default IssuerUtilisationCard;
