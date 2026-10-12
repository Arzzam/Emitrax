import { ReactNode } from 'react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { ICreditCard, ICreditCardIssuer } from '@/types/creditCard.types';
import { FinancialYearMonth, getPeriodMonthKey } from '@/utils/financialYear';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * One tracked series - payments or bills - reduced to what the grid needs.
 * The page decides which editor a cell renders; the grid only lays out.
 */
export interface TrackerGridSeries {
    id: 'payments' | 'bills' | 'utilisation';
    /** Sub-column header shown only when two series are displayed together. */
    label: string;
    /**
     * Absent keys mean "no figure", which is NOT the same as zero. Money series
     * render both as an em dash; a ratio series must not, because 0% against a
     * real limit is a genuine reading.
     */
    monthTotals: Map<string, number>;
    monthIssuerTotals: Map<string, Map<string, number>>;
    cardTotals: Map<string, number>;
    grandTotal: number | undefined;
    renderCell: (card: ICreditCard, month: FinancialYearMonth) => ReactNode;
    /** Subtotal and grand-total cells inside the month rows. */
    formatValue?: (value: number | undefined) => string;
    /** The footer row. Money shows a real zero here where the body shows a dash. */
    formatTotal?: (value: number | undefined) => string;
    /** Defaults to summing the issuer's cards - wrong for a ratio, which peaks instead. */
    getIssuerTotal?: (issuerId: string, cardIds: string[]) => number | undefined;
    /** Footer row label. Defaults to the financial-year sum. */
    footerLabel?: string;
    /**
     * A card total of 0 is a real figure (0% utilisation), so any key in
     * `cardTotals` counts as holding data. Money series leave this off, since a
     * zero total there means nothing was entered.
     */
    zeroIsFigure?: boolean;
}

/**
 * Month rows x card columns, grouped under each issuer.
 *
 * With one series each issuer also gets a subtotal column. With two, those are
 * dropped - six cards doubled plus subtotals is 21 columns, and the subtotals
 * are the least load-bearing of them.
 *
 * Totals are always per series and are NEVER summed across series: a bill and a
 * payment are different things, and a revolved balance is billed again next
 * month, so adding them produces a number that means nothing.
 *
 * A series may override how its figures are formatted and rolled up, which is
 * what lets the derived utilisation view - percentages, peaks rather than sums -
 * reuse this layout rather than fork it. Every override defaults to the money
 * behaviour, so the payments and bills views are unaffected by their existence.
 */
const CreditCardGrid = ({
    issuers,
    months,
    series,
}: {
    issuers: ICreditCardIssuer[];
    months: FinancialYearMonth[];
    series: TrackerGridSeries[];
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const currentPeriodMonth = getPeriodMonthKey(new Date());

    const isCombined = series.length > 1;
    const showIssuerSubtotals = !isCombined;
    // With two series the label has to hold for both, so only a single series
    // may rename it.
    const footerLabel = (series.length === 1 && series[0].footerLabel) || 'FY total';

    // Deactivated cards stay visible when they hold data for this year in any
    // series, so history never silently disappears from the grid.
    const holdsData = (entry: TrackerGridSeries, cardId: string) =>
        entry.zeroIsFigure ? entry.cardTotals.has(cardId) : (entry.cardTotals.get(cardId) ?? 0) !== 0;

    const visibleCards = new Map<string, ICreditCard[]>(
        issuers.map((issuer) => [
            issuer.id,
            issuer.cards.filter((card) => card.isActive || series.some((entry) => holdsData(entry, card.id))),
        ])
    );

    const cardsOf = (issuerId: string) => visibleCards.get(issuerId) ?? [];

    const amountOrDash = (value: number | undefined) =>
        value == null || value === 0 ? '—' : formatCurrencyAmount(value);

    const formatValue = (entry: TrackerGridSeries, value: number | undefined) =>
        (entry.formatValue ?? amountOrDash)(value);

    const formatTotal = (entry: TrackerGridSeries, value: number | undefined) =>
        (entry.formatTotal ?? ((amount) => formatCurrencyAmount(amount ?? 0)))(value);

    const issuerTotal = (issuerId: string, entry: TrackerGridSeries) => {
        const cardIds = cardsOf(issuerId).map((card) => card.id);
        if (entry.getIssuerTotal) {
            return entry.getIssuerTotal(issuerId, cardIds);
        }
        return cardIds.reduce((sum, cardId) => sum + (entry.cardTotals.get(cardId) ?? 0), 0);
    };

    /** Columns an issuer spans: one per card per series, plus its subtotals. */
    const issuerSpan = (issuerId: string) =>
        cardsOf(issuerId).length * series.length + (showIssuerSubtotals ? series.length : 0);

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead
                            rowSpan={isCombined ? 3 : 2}
                            className="sticky left-0 z-10 bg-background align-bottom whitespace-nowrap"
                        >
                            Month
                        </TableHead>
                        {issuers.map((issuer) => (
                            <TableHead
                                key={issuer.id}
                                colSpan={issuerSpan(issuer.id)}
                                className="border-l text-center whitespace-nowrap"
                            >
                                {issuer.name}
                            </TableHead>
                        ))}
                        <TableHead
                            colSpan={series.length}
                            rowSpan={isCombined ? 2 : 1}
                            className="border-l text-right align-bottom whitespace-nowrap"
                        >
                            Grand total
                        </TableHead>
                    </TableRow>

                    <TableRow className="hover:bg-transparent">
                        {issuers.flatMap((issuer) => {
                            const cards = cardsOf(issuer.id);
                            return [
                                ...cards.map((card, index) => (
                                    <TableHead
                                        key={card.id}
                                        colSpan={series.length}
                                        className={cn(
                                            'whitespace-nowrap',
                                            isCombined ? 'text-center' : 'text-right',
                                            index === 0 && 'border-l'
                                        )}
                                    >
                                        <span className={cn(!card.isActive && 'text-muted-foreground/70')}>
                                            {card.name}
                                        </span>
                                        {card.last4 && (
                                            <span className="block text-[11px] font-normal text-muted-foreground">
                                                •••• {card.last4}
                                            </span>
                                        )}
                                    </TableHead>
                                )),
                                ...(showIssuerSubtotals
                                    ? [
                                          <TableHead
                                              key={`${issuer.id}-total`}
                                              className={cn(
                                                  'text-right font-semibold whitespace-nowrap',
                                                  cards.length === 0 && 'border-l'
                                              )}
                                          >
                                              Total
                                          </TableHead>,
                                      ]
                                    : []),
                            ];
                        })}
                    </TableRow>

                    {/* Third header row names the series under each card. */}
                    {isCombined && (
                        <TableRow className="hover:bg-transparent">
                            {issuers.flatMap((issuer) =>
                                cardsOf(issuer.id).flatMap((card, cardIndex) =>
                                    series.map((entry, seriesIndex) => (
                                        <TableHead
                                            key={`${card.id}-${entry.id}`}
                                            className={cn(
                                                'text-right text-[11px] font-normal whitespace-nowrap',
                                                cardIndex === 0 && seriesIndex === 0 && 'border-l',
                                                entry.id === 'bills' && 'bg-muted/20'
                                            )}
                                        >
                                            {entry.label}
                                        </TableHead>
                                    ))
                                )
                            )}
                            {series.map((entry) => (
                                <TableHead
                                    key={`grand-${entry.id}`}
                                    className={cn(
                                        'border-l text-right text-[11px] font-normal whitespace-nowrap',
                                        entry.id === 'bills' && 'bg-muted/20'
                                    )}
                                >
                                    {entry.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    )}
                </TableHeader>

                <TableBody>
                    {months.map((month, index) => {
                        const isCurrent = month.periodMonth === currentPeriodMonth;
                        const isEven = index % 2 === 0;
                        // Row tint stays translucent, but the frozen Month cell repaints it over an
                        // opaque base so horizontally scrolled columns never bleed through the overlap.
                        const rowStripe = isCurrent ? 'bg-primary/5' : isEven ? 'bg-muted/30' : '';
                        const stickyStripe = isCurrent ? 'before:bg-primary/5' : isEven ? 'before:bg-muted/30' : '';

                        return (
                            <TableRow
                                key={month.periodMonth}
                                className={cn(
                                    'tabular-nums',
                                    isCurrent ? 'bg-primary/5 hover:bg-primary/10' : rowStripe,
                                    month.isFuture && 'text-muted-foreground'
                                )}
                            >
                                <TableCell
                                    className={cn(
                                        'sticky left-0 z-10 bg-background font-medium whitespace-nowrap',
                                        stickyStripe &&
                                            cn(
                                                'before:absolute before:inset-0 before:-z-10 before:content-[""]',
                                                stickyStripe
                                            )
                                    )}
                                >
                                    {month.label}
                                </TableCell>

                                {issuers.flatMap((issuer) => {
                                    const cards = cardsOf(issuer.id);

                                    return [
                                        ...cards.flatMap((card, cardIndex) =>
                                            series.map((entry, seriesIndex) => (
                                                <TableCell
                                                    key={`${card.id}-${entry.id}`}
                                                    className={cn(
                                                        'p-1',
                                                        cardIndex === 0 && seriesIndex === 0 && 'border-l',
                                                        isCombined && entry.id === 'bills' && 'bg-muted/20'
                                                    )}
                                                >
                                                    {entry.renderCell(card, month)}
                                                </TableCell>
                                            ))
                                        ),
                                        ...(showIssuerSubtotals
                                            ? series.map((entry) => (
                                                  <TableCell
                                                      key={`${issuer.id}-${month.periodMonth}-${entry.id}`}
                                                      className={cn(
                                                          'text-right font-medium',
                                                          cards.length === 0 && 'border-l'
                                                      )}
                                                  >
                                                      {formatValue(
                                                          entry,
                                                          entry.monthIssuerTotals.get(month.periodMonth)?.get(issuer.id)
                                                      )}
                                                  </TableCell>
                                              ))
                                            : []),
                                    ];
                                })}

                                {series.map((entry) => (
                                    <TableCell
                                        key={`grand-${entry.id}`}
                                        className={cn(
                                            'border-l text-right font-medium',
                                            isCombined && entry.id === 'bills' && 'bg-muted/20'
                                        )}
                                    >
                                        {formatValue(entry, entry.monthTotals.get(month.periodMonth))}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}

                    <TableRow className="font-semibold tabular-nums hover:bg-transparent">
                        <TableCell className="sticky left-0 z-10 bg-background whitespace-nowrap">
                            {footerLabel}
                        </TableCell>

                        {issuers.flatMap((issuer) => {
                            const cards = cardsOf(issuer.id);

                            return [
                                ...cards.flatMap((card, cardIndex) =>
                                    series.map((entry, seriesIndex) => (
                                        <TableCell
                                            key={`${card.id}-${entry.id}-total`}
                                            className={cn(
                                                'text-right',
                                                cardIndex === 0 && seriesIndex === 0 && 'border-l',
                                                isCombined && entry.id === 'bills' && 'bg-muted/20'
                                            )}
                                        >
                                            {formatTotal(entry, entry.cardTotals.get(card.id))}
                                        </TableCell>
                                    ))
                                ),
                                ...(showIssuerSubtotals
                                    ? series.map((entry) => (
                                          <TableCell
                                              key={`${issuer.id}-fy-${entry.id}`}
                                              className={cn('text-right', cards.length === 0 && 'border-l')}
                                          >
                                              {formatTotal(entry, issuerTotal(issuer.id, entry))}
                                          </TableCell>
                                      ))
                                    : []),
                            ];
                        })}

                        {series.map((entry) => (
                            <TableCell
                                key={`grand-fy-${entry.id}`}
                                className={cn(
                                    'border-l text-right',
                                    isCombined && entry.id === 'bills' && 'bg-muted/20'
                                )}
                            >
                                {formatTotal(entry, entry.grandTotal)}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
};

export default CreditCardGrid;
