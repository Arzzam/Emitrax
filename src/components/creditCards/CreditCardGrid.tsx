import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { ICreditCard, ICreditCardIssuer, SavePaymentEntryInput, TrackerMatrix } from '@/types/creditCard.types';
import { FinancialYearMonth, getPeriodMonthKey } from '@/utils/financialYear';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import PaymentCellEditor from './PaymentCellEditor';

/** Month rows x card columns, grouped under each issuer with a subtotal column. */
const CreditCardGrid = ({
    issuers,
    months,
    matrix,
    onSaveEntry,
    readOnly = false,
}: {
    issuers: ICreditCardIssuer[];
    months: FinancialYearMonth[];
    matrix: TrackerMatrix;
    onSaveEntry: (input: SavePaymentEntryInput) => void;
    readOnly?: boolean;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const currentPeriodMonth = getPeriodMonthKey(new Date());

    // Deactivated cards stay visible when they hold data for this year, so
    // history never silently disappears from the grid.
    const visibleCards = new Map<string, ICreditCard[]>(
        issuers.map((issuer) => [
            issuer.id,
            issuer.cards.filter((card) => card.isActive || (matrix.cardTotals.get(card.id) ?? 0) !== 0),
        ])
    );

    const issuerTotal = (issuerId: string) =>
        (visibleCards.get(issuerId) ?? []).reduce((sum, card) => sum + (matrix.cardTotals.get(card.id) ?? 0), 0);

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead
                            rowSpan={2}
                            className="sticky left-0 z-10 bg-background align-bottom whitespace-nowrap"
                        >
                            Month
                        </TableHead>
                        {issuers.map((issuer) => (
                            <TableHead
                                key={issuer.id}
                                colSpan={(visibleCards.get(issuer.id)?.length ?? 0) + 1}
                                className="border-l text-center whitespace-nowrap"
                            >
                                {issuer.name}
                            </TableHead>
                        ))}
                        <TableHead rowSpan={2} className="border-l text-right align-bottom whitespace-nowrap">
                            Grand total
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        {issuers.flatMap((issuer) => {
                            const cards = visibleCards.get(issuer.id) ?? [];
                            return [
                                ...cards.map((card, index) => (
                                    <TableHead
                                        key={card.id}
                                        className={cn('text-right whitespace-nowrap', index === 0 && 'border-l')}
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
                                <TableHead
                                    key={`${issuer.id}-total`}
                                    className={cn(
                                        'text-right font-semibold whitespace-nowrap',
                                        cards.length === 0 && 'border-l'
                                    )}
                                >
                                    Total
                                </TableHead>,
                            ];
                        })}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {months.map((month, index) => {
                        const isCurrent = month.periodMonth === currentPeriodMonth;

                        return (
                            <TableRow
                                key={month.periodMonth}
                                className={cn(
                                    'tabular-nums',
                                    isCurrent
                                        ? 'bg-primary/5 hover:bg-primary/10'
                                        : index % 2 === 0
                                          ? 'bg-muted/30'
                                          : '',
                                    month.isFuture && 'text-muted-foreground'
                                )}
                            >
                                <TableCell
                                    className={cn(
                                        'sticky left-0 z-10 font-medium whitespace-nowrap',
                                        isCurrent ? 'bg-primary/5' : index % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                                    )}
                                >
                                    {month.label}
                                </TableCell>

                                {issuers.flatMap((issuer) => {
                                    const cards = visibleCards.get(issuer.id) ?? [];
                                    const subtotal =
                                        matrix.monthIssuerTotals.get(month.periodMonth)?.get(issuer.id) ?? 0;

                                    return [
                                        ...cards.map((card, cardIndex) => (
                                            <TableCell
                                                key={card.id}
                                                className={cn('p-1', cardIndex === 0 && 'border-l')}
                                            >
                                                <PaymentCellEditor
                                                    entry={matrix.entries.get(card.id)?.get(month.periodMonth)}
                                                    cardId={card.id}
                                                    periodMonth={month.periodMonth}
                                                    disabled={readOnly}
                                                    onSave={onSaveEntry}
                                                />
                                            </TableCell>
                                        )),
                                        <TableCell
                                            key={`${issuer.id}-${month.periodMonth}-total`}
                                            className={cn('text-right font-medium', cards.length === 0 && 'border-l')}
                                        >
                                            {subtotal === 0 ? '—' : formatCurrencyAmount(subtotal)}
                                        </TableCell>,
                                    ];
                                })}

                                <TableCell className="border-l text-right font-medium">
                                    {(matrix.monthTotals.get(month.periodMonth) ?? 0) === 0
                                        ? '—'
                                        : formatCurrencyAmount(matrix.monthTotals.get(month.periodMonth) ?? 0)}
                                </TableCell>
                            </TableRow>
                        );
                    })}

                    <TableRow className="font-semibold tabular-nums hover:bg-transparent">
                        <TableCell className="sticky left-0 z-10 bg-background whitespace-nowrap">FY total</TableCell>
                        {issuers.flatMap((issuer) => {
                            const cards = visibleCards.get(issuer.id) ?? [];
                            return [
                                ...cards.map((card, cardIndex) => (
                                    <TableCell
                                        key={`${card.id}-total`}
                                        className={cn('text-right', cardIndex === 0 && 'border-l')}
                                    >
                                        {formatCurrencyAmount(matrix.cardTotals.get(card.id) ?? 0)}
                                    </TableCell>
                                )),
                                <TableCell
                                    key={`${issuer.id}-fy-total`}
                                    className={cn('text-right', cards.length === 0 && 'border-l')}
                                >
                                    {formatCurrencyAmount(issuerTotal(issuer.id))}
                                </TableCell>,
                            ];
                        })}
                        <TableCell className="border-l text-right">{formatCurrencyAmount(matrix.grandTotal)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
};

export default CreditCardGrid;
