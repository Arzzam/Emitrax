import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { CalendarClock, ChevronLeft, Power, Trash2, TrendingUp } from 'lucide-react';

import { usePageTitle } from '@/context/PageTitleProvider/pageTitleProvider';
import {
    useAvailableFinancialYears,
    useCard,
    useCardLimitChanges,
    useCreditCardBillEntries,
    useCreditCardEntries,
    useDeleteCard,
    useUpdateCard,
} from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { IRootState } from '@/store/types/store.types';
import { getBillAmount } from '@/utils/creditCardBills.calc';
import {
    buildUtilisationMatrix,
    formatUtilisationPercent,
    getUtilisationStatus,
} from '@/utils/creditCardUtilisation.calc';
import { getCurrentFinancialYear, getFinancialYearMonths, parseFinancialYearKey } from '@/utils/financialYear';

import LoginCard from '@/components/cards/LoginCard';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import MainContainer from '@/components/common/Container';
import LoadingDetails from '@/components/common/LoadingDetails';
import NotFound from '@/components/common/NotFound';
import BillingCycleSheet from '@/components/creditCards/BillingCycleSheet';
import CardLimitHistorySheet from '@/components/creditCards/CardLimitHistorySheet';
import FinancialYearSelector from '@/components/creditCards/FinancialYearSelector';
import ThresholdGauge from '@/components/creditCards/ThresholdGauge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-1 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </CardContent>
    </Card>
);

/**
 * One card, in full.
 *
 * Bills and payments sit in separate columns and are never differenced. This is
 * the page where that temptation is strongest - they are right next to each
 * other - but a revolved balance is billed again next month with interest, so
 * the difference between the two columns is not a variance, it is noise.
 */
const CreditCardDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { id: userId } = useSelector((state: IRootState) => state.userModel);
    const { formatCurrencyAmount } = useCurrencyPreferences();

    const [limitsOpen, setLimitsOpen] = useState(false);
    const [cycleOpen, setCycleOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const requestedYear = searchParams.get('fy');
    const financialYear = (requestedYear && parseFinancialYearKey(requestedYear)?.key) || getCurrentFinancialYear().key;

    const { data: cardResult, isLoading: cardLoading, isError: cardError } = useCard(id);
    const { data: limitChanges = [] } = useCardLimitChanges(id);
    const { data: bills = [] } = useCreditCardBillEntries(financialYear);
    const { data: payments = [] } = useCreditCardEntries(financialYear);
    const { data: yearsWithData = [] } = useAvailableFinancialYears();
    const { mutate: updateCard } = useUpdateCard();
    const { mutate: deleteCard } = useDeleteCard();

    const card = cardResult?.card ?? null;

    usePageTitle(card ? `Card · ${card.name}` : 'Card');

    const months = useMemo(() => getFinancialYearMonths(financialYear), [financialYear]);

    // A one-card, one-issuer matrix. Reusing the shared builder rather than a
    // bespoke per-card calculation is what keeps this page and the tracker grid
    // from ever disagreeing about a figure.
    const matrix = useMemo(() => {
        if (!card) {
            return null;
        }
        const issuer = {
            id: card.issuerId,
            userId: card.userId,
            name: cardResult?.issuerName ?? '',
            color: null,
            sortOrder: 0,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
            cards: [card],
        };
        const cardBills = bills.filter((bill) => bill.cardId === card.id);
        return buildUtilisationMatrix([issuer], cardBills, limitChanges, months);
    }, [card, cardResult?.issuerName, bills, limitChanges, months]);

    const billByMonth = useMemo(() => {
        const map = new Map<string, number>();
        bills
            .filter((bill) => bill.cardId === id && bill.status === 'issued')
            .forEach((bill) => map.set(bill.statementMonth, getBillAmount(bill)));
        return map;
    }, [bills, id]);

    const noStatementMonths = useMemo(
        () =>
            new Set(
                bills
                    .filter((bill) => bill.cardId === id && bill.status === 'no_statement')
                    .map((bill) => bill.statementMonth)
            ),
        [bills, id]
    );

    const paymentByMonth = useMemo(() => {
        const map = new Map<string, number>();
        payments.filter((entry) => entry.cardId === id).forEach((entry) => map.set(entry.periodMonth, entry.amount));
        return map;
    }, [payments, id]);

    const setFinancialYear = (next: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('fy', next);
        setSearchParams(params, { replace: false });
    };

    if (!userId) {
        return (
            <MainContainer>
                <LoginCard />
            </MainContainer>
        );
    }

    if (cardLoading) {
        return <LoadingDetails title="Loading card" description="Fetching this card's limits and statements." />;
    }

    if (cardError || !card) {
        return (
            <NotFound
                title="Card not found"
                description="This card may have been deleted, or it belongs to another account."
                redirectTo="/credit-cards/cards"
                redirectText="Back to all cards"
            />
        );
    }

    const peak = matrix?.cardPeak.get(card.id) ?? null;
    const latestChange = limitChanges.length > 0 ? limitChanges[limitChanges.length - 1] : null;
    const cycleText =
        card.statementDay == null && card.dueDay == null
            ? 'Not set'
            : `${card.statementDay ?? '—'} → ${card.dueDay ?? '—'}`;

    return (
        <MainContainer className="space-y-6 pb-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2" asChild>
                        <Link to={`/credit-cards/cards?fy=${financialYear}`}>
                            <ChevronLeft /> All cards
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{card.name}</h2>
                        {card.last4 && (
                            <span className="text-sm tabular-nums text-muted-foreground">•••• {card.last4}</span>
                        )}
                        {!card.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{cardResult?.issuerName}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <FinancialYearSelector
                        value={financialYear}
                        onChange={setFinancialYear}
                        yearsWithData={yearsWithData}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setLimitsOpen(true)}>
                        <TrendingUp /> Credit limit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCycleOpen(true)}>
                        <CalendarClock /> Billing cycle
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateCard({ id: card.id, isActive: !card.isActive })}
                    >
                        <Power /> {card.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                        <Trash2 /> Delete
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Stat
                    label="Current credit limit"
                    value={card.creditLimit == null ? '—' : formatCurrencyAmount(card.creditLimit)}
                    hint={
                        latestChange
                            ? `${limitChanges.length} recorded change${limitChanges.length === 1 ? '' : 's'} · latest from ${format(
                                  new Date(latestChange.effectiveFrom + 'T00:00:00'),
                                  'd MMM yyyy'
                              )}`
                            : 'No limit recorded — utilisation cannot be measured.'
                    }
                />
                <Stat
                    label="Statement → due day"
                    value={cycleText}
                    hint="Pre-fills a bill's dates. Each bill keeps its own once entered."
                />
                <Card className="border-border/80 shadow-sm">
                    <CardContent className="space-y-1 py-4">
                        <p className="text-xs text-muted-foreground">Peak utilisation in {financialYear}</p>
                        {peak === null ? (
                            <>
                                <p className="text-xl font-semibold tabular-nums text-muted-foreground">—</p>
                                <p className="text-xs text-muted-foreground">
                                    Needs a credit limit and at least one statement.
                                </p>
                            </>
                        ) : (
                            <>
                                <p
                                    className={cn(
                                        'text-xl font-semibold tabular-nums',
                                        peak.cell.overLimit && 'text-destructive'
                                    )}
                                >
                                    {formatUtilisationPercent(peak.cell.ratio)}
                                </p>
                                <ThresholdGauge
                                    value={peak.cell.billed}
                                    threshold={peak.cell.limit}
                                    status={getUtilisationStatus(peak.cell.ratio)}
                                    label={`${card.name} peak utilisation`}
                                    thin
                                />
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrencyAmount(peak.cell.billed)} of {formatCurrencyAmount(peak.cell.limit)}{' '}
                                    in{' '}
                                    {months.find((month) => month.periodMonth === peak.statementMonth)?.label ??
                                        peak.statementMonth}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium">{financialYear} month by month</h3>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="whitespace-nowrap">Month</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Billed</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Paid</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Utilisation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {months.map((month) => {
                                const billed = billByMonth.get(month.periodMonth);
                                const paid = paymentByMonth.get(month.periodMonth);
                                const cell = matrix?.cells.get(card.id)?.get(month.periodMonth);
                                const noStatement = noStatementMonths.has(month.periodMonth);

                                return (
                                    <TableRow
                                        key={month.periodMonth}
                                        className={cn('tabular-nums', month.isFuture && 'text-muted-foreground')}
                                    >
                                        <TableCell className="font-medium whitespace-nowrap">{month.label}</TableCell>
                                        <TableCell className="text-right">
                                            {noStatement ? (
                                                <span className="text-xs text-muted-foreground">No statement</span>
                                            ) : billed == null ? (
                                                '—'
                                            ) : (
                                                formatCurrencyAmount(billed)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {paid == null ? '—' : formatCurrencyAmount(paid)}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                'text-right',
                                                cell?.overLimit && 'font-semibold text-destructive'
                                            )}
                                        >
                                            {cell ? formatUtilisationPercent(cell.ratio) : '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                    A bill is filed under the month its statement was generated; a payment under the month it left your
                    account, normally the month after. The two columns are deliberately never differenced — a revolved
                    balance is billed again next month with interest, so the gap between them is not a shortfall.
                </p>
            </div>

            <CardLimitHistorySheet card={card} open={limitsOpen} onOpenChange={setLimitsOpen} />
            <BillingCycleSheet card={card} open={cycleOpen} onOpenChange={setCycleOpen} />

            <ConfirmationModal
                open={deleteOpen}
                setOpen={setDeleteOpen}
                title={`Delete ${card.name}?`}
                description="This permanently deletes every bill, payment and limit change logged against this card, across every financial year. To keep the history, deactivate instead."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={(setOpen) => {
                    deleteCard(card.id, { onSuccess: () => navigate('/credit-cards/cards') });
                    setOpen(false);
                }}
                onCancel={() => setDeleteOpen(false)}
            />
        </MainContainer>
    );
};

export default CreditCardDetails;
