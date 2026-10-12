import { Info, TriangleAlert } from 'lucide-react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { BalanceBasis, BureauUtilisation } from '@/types/creditCard.types';
import {
    formatUtilisationPercent,
    getUtilisationStatus,
    UTILISATION_WATCH_RATIO,
} from '@/utils/creditCardUtilisation.calc';
import { FinancialYearMonth } from '@/utils/financialYear';

import ThresholdGauge from '@/components/creditCards/ThresholdGauge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** What the figure for a card rests on, said plainly. */
const BASIS_LABEL: Record<BalanceBasis, string> = {
    issued: '',
    no_statement: 'no statement',
    assumed_nil: 'assumed nil',
};

/**
 * Twelve bars, one per month, doubling as the month picker.
 *
 * Selecting a month from the trend is faster than the dropdown for the thing
 * people actually do with it - jumping to the spike.
 */
const Sparkline = ({
    bureau,
    months,
    selected,
    onSelect,
}: {
    bureau: BureauUtilisation;
    months: FinancialYearMonth[];
    selected: string | null;
    onSelect: (statementMonth: string) => void;
}) => (
    <div className="flex items-end gap-1">
        {months.map((month) => {
            const figure = bureau.months.get(month.periodMonth);
            const isSelected = month.periodMonth === selected;
            // Height is the only inline style - the sanctioned dynamic-value
            // exception, same as ThresholdGauge.
            const height = figure ? Math.max(4, Math.min(100, figure.ratio * 100)) : 0;

            return (
                <button
                    key={month.periodMonth}
                    type="button"
                    onClick={() => onSelect(month.periodMonth)}
                    aria-pressed={isSelected}
                    aria-label={
                        figure
                            ? `${month.label}: ${formatUtilisationPercent(figure.ratio)}`
                            : `${month.label}: no figure`
                    }
                    title={
                        figure
                            ? `${month.label}: ${formatUtilisationPercent(figure.ratio)}`
                            : `${month.label}: no figure`
                    }
                    className={cn(
                        'flex h-10 flex-1 items-end rounded-sm bg-muted transition-colors hover:bg-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        isSelected && 'ring-2 ring-ring'
                    )}
                >
                    {figure && (
                        <div
                            className={cn(
                                'w-full rounded-sm',
                                figure.overLimit ? 'bg-destructive' : 'bg-primary/70',
                                figure.isPartial && 'opacity-50',
                                !isSelected && selected !== null && 'opacity-60'
                            )}
                            style={{ height: `${height}%` }}
                        />
                    )}
                </button>
            );
        })}
    </div>
);

/**
 * Overall credit utilisation, the way a credit bureau computes it, for one
 * month of the financial year.
 *
 * Defaults to the most recent month carrying a figure - a bureau scores what
 * was most recently reported - but any month can be selected, because the
 * question "what did this look like in June" is not answerable from a single
 * headline number.
 */
const BureauUtilisationCard = ({
    bureau,
    months,
    selectedMonth,
    onSelectMonth,
    financialYear,
}: {
    bureau: BureauUtilisation;
    months: FinancialYearMonth[];
    /** Null before any month has been resolved, e.g. an empty year. */
    selectedMonth: string | null;
    onSelectMonth: (statementMonth: string) => void;
    financialYear: string;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    const figure = selectedMonth === null ? null : (bureau.months.get(selectedMonth) ?? null);
    const selectedLabel = months.find((month) => month.periodMonth === selectedMonth)?.label ?? selectedMonth;
    const isLatest = selectedMonth !== null && bureau.latest?.statementMonth === selectedMonth;

    return (
        <Card className="border-border/80 shadow-sm">
            <CardContent className="space-y-3 py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-sm font-medium">Overall credit utilisation</p>
                        <p className="text-xs text-muted-foreground">
                            {bureau.cardsCounted} card{bureau.cardsCounted === 1 ? '' : 's'} counted
                            {bureau.cardsWithoutLimit > 0 && ` · ${bureau.cardsWithoutLimit} without a limit`}
                        </p>
                    </div>

                    {bureau.cardsCounted > 0 && (
                        <Select value={selectedMonth ?? undefined} onValueChange={onSelectMonth}>
                            <SelectTrigger className="w-[160px]" aria-label="Month">
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => {
                                    const monthFigure = bureau.months.get(month.periodMonth);
                                    return (
                                        <SelectItem key={month.periodMonth} value={month.periodMonth}>
                                            {month.label}
                                            <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                                                {monthFigure ? formatUtilisationPercent(monthFigure.ratio) : '—'}
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {figure === null ? (
                    <>
                        <p className="text-[28px] leading-none font-semibold tabular-nums text-muted-foreground">—</p>
                        <p className="text-xs text-muted-foreground">
                            {bureau.cardsCounted === 0
                                ? 'Record a credit limit on at least one card to measure utilisation.'
                                : selectedMonth === null
                                  ? `No statements entered for ${financialYear} yet.`
                                  : `Nothing entered for ${selectedLabel} on any card with a limit, so there is nothing to measure.`}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <p
                                className={cn(
                                    'text-[28px] leading-none font-semibold tabular-nums',
                                    figure.overLimit && 'text-destructive'
                                )}
                            >
                                {formatUtilisationPercent(figure.ratio)}
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {selectedLabel}
                                {isLatest && ' · most recent'}
                            </span>
                            {figure.ratio < UTILISATION_WATCH_RATIO && (
                                <Badge variant="success" className="text-[10px]">
                                    Under 30%
                                </Badge>
                            )}
                        </div>

                        <ThresholdGauge
                            value={figure.balance}
                            threshold={figure.limit}
                            status={getUtilisationStatus(figure.ratio)}
                            label={`Overall credit utilisation in ${selectedLabel}`}
                        />

                        <p className="text-xs text-muted-foreground">
                            {formatCurrencyAmount(figure.balance)} outstanding across{' '}
                            {formatCurrencyAmount(figure.limit)} of limits
                            {bureau.peak && ` · peak ${formatUtilisationPercent(bureau.peak.ratio)} this year`}
                            {bureau.averageRatio !== null &&
                                ` · ${formatUtilisationPercent(bureau.averageRatio)} average`}
                        </p>
                    </>
                )}

                <Sparkline bureau={bureau} months={months} selected={selectedMonth} onSelect={onSelectMonth} />

                {figure && (
                    <ul className="space-y-1 border-t pt-2">
                        {figure.contributions.map((contribution) => (
                            <li key={contribution.cardId} className="flex items-baseline justify-between gap-2 text-xs">
                                <span className="min-w-0 truncate">
                                    <span
                                        className={cn(contribution.basis === 'assumed_nil' && 'text-muted-foreground')}
                                    >
                                        {contribution.cardName}
                                    </span>
                                    {contribution.last4 && (
                                        <span className="ml-1 tabular-nums text-muted-foreground">
                                            •••• {contribution.last4}
                                        </span>
                                    )}
                                    {BASIS_LABEL[contribution.basis] && (
                                        <span className="ml-1.5 text-muted-foreground">
                                            ({BASIS_LABEL[contribution.basis]})
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                    {formatCurrencyAmount(contribution.balance)} /{' '}
                                    {formatCurrencyAmount(contribution.limit)}
                                    <span
                                        className={cn(
                                            'ml-2 inline-block w-12 text-right',
                                            contribution.ratio >= 1 ? 'text-destructive' : 'text-foreground'
                                        )}
                                    >
                                        {formatUtilisationPercent(contribution.ratio)}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* The direction of the error matters more than its size:
                    an assumed card can only make this look better. */}
                {figure?.isPartial && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span>
                            {figure.assumedCount} of {figure.cardCount} cards had nothing entered for {selectedLabel}{' '}
                            and were assumed nil, so the real figure can only be higher.
                        </span>
                    </p>
                )}

                <p className="flex items-start gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span>
                        Every card's limit counts toward the total whether or not it carried a balance — which is why
                        closing an unused card raises this figure. An estimate of what a bureau would see, not the
                        reported number: banks report on their own schedule, and this only knows what you have entered.
                    </span>
                </p>
            </CardContent>
        </Card>
    );
};

export default BureauUtilisationCard;
