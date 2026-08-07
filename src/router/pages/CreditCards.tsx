import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { CreditCard, Info } from 'lucide-react';

import {
    useAvailableFinancialYears,
    useCreditCardBillEntries,
    useCreditCardEntries,
    useCreditCardIssuers,
    useCreditCardTrackerYear,
    useSaveBillEntry,
    useSavePaymentEntry,
} from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IRootState } from '@/store/types/store.types';
import { SFT_CASH_THRESHOLD, SFT_TOTAL_THRESHOLD } from '@/types/creditCard.types';
import { aggregateBillsByIssuer, BILL_SERIES } from '@/utils/creditCardBills.calc';
import { aggregateByIssuer, buildTrackerMatrix, PAYMENT_SERIES } from '@/utils/creditCardTracker.calc';
import {
    getCurrentFinancialYear,
    getElapsedMonthCount,
    getFinancialYearMonths,
    parseFinancialYearKey,
} from '@/utils/financialYear';

import LoginCard from '@/components/cards/LoginCard';
import MainContainer from '@/components/common/Container';
import AddCardDialog from '@/components/creditCards/AddCardDialog';
import BillCellEditor from '@/components/creditCards/BillCellEditor';
import CreditCardGrid, { TrackerGridSeries } from '@/components/creditCards/CreditCardGrid';
import FinancialYearSelector from '@/components/creditCards/FinancialYearSelector';
import IssuerBillSummaryCard from '@/components/creditCards/IssuerBillSummaryCard';
import IssuerCardManager from '@/components/creditCards/IssuerCardManager';
import IssuerThresholdCard from '@/components/creditCards/IssuerThresholdCard';
import PaymentCellEditor from '@/components/creditCards/PaymentCellEditor';
import TrackerViewSelector, { parseTrackerView, TrackerView } from '@/components/creditCards/TrackerViewSelector';
import TrackerYearNotes from '@/components/creditCards/TrackerYearNotes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const GaugesSkeleton = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
            <Card key={index} className="border-border/80 shadow-sm">
                <CardContent className="space-y-2 py-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-1.5 w-full" />
                    <Skeleton className="h-3 w-40" />
                </CardContent>
            </Card>
        ))}
    </div>
);

const HEADINGS: Record<TrackerView, { title: string; description: string }> = {
    payments: {
        title: 'Annual payment tracker',
        description: 'What you paid toward each card bill, against the reporting threshold.',
    },
    bills: {
        title: 'Monthly bill tracker',
        description: 'What each card billed you, month by month.',
    },
    both: {
        title: 'Bills and payments',
        description: 'What each card billed, next to what you paid.',
    },
};

const CreditCards = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { id: userId } = useSelector((state: IRootState) => state.userModel);
    const { formatCurrencyAmount } = useCurrencyPreferences();

    // The FY and view live in the URL so refresh, back and sharing all preserve
    // the screen. Defaults are omitted from the URL rather than written into it.
    const requestedYear = searchParams.get('fy');
    const financialYear = (requestedYear && parseFinancialYearKey(requestedYear)?.key) || getCurrentFinancialYear().key;
    const view = parseTrackerView(searchParams.get('view'));

    const setParam = (key: string, value: string, isDefault: boolean) => {
        const params = new URLSearchParams(searchParams);
        if (isDefault) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        setSearchParams(params, { replace: false });
    };

    const setFinancialYear = (next: string) => setParam('fy', next, false);
    const setView = (next: TrackerView) => setParam('view', next, next === 'payments');

    const {
        data: issuers = [],
        isLoading: issuersLoading,
        isError: issuersError,
        refetch: refetchIssuers,
    } = useCreditCardIssuers();
    const {
        data: entries = [],
        isLoading: entriesLoading,
        isError: entriesError,
        refetch: refetchEntries,
    } = useCreditCardEntries(financialYear);
    const {
        data: bills = [],
        isLoading: billsLoading,
        isError: billsError,
        refetch: refetchBills,
    } = useCreditCardBillEntries(financialYear);
    const { data: trackerYear } = useCreditCardTrackerYear(financialYear);
    const { data: yearsWithData = [] } = useAvailableFinancialYears();
    const { mutate: savePaymentEntry } = useSavePaymentEntry(financialYear);
    const { mutate: saveBillEntry } = useSaveBillEntry(financialYear);

    const months = useMemo(() => getFinancialYearMonths(financialYear), [financialYear]);
    const elapsedMonths = useMemo(() => getElapsedMonthCount(financialYear), [financialYear]);
    const monthLabelFor = useMemo(() => {
        const labels = new Map(months.map((month) => [month.periodMonth, month.label]));
        return (periodMonth: string) => labels.get(periodMonth) ?? periodMonth;
    }, [months]);

    const allCards = useMemo(() => issuers.flatMap((issuer) => issuer.cards), [issuers]);

    const paymentMatrix = useMemo(
        () => buildTrackerMatrix(allCards, entries, months, PAYMENT_SERIES),
        [allCards, entries, months]
    );
    const billMatrix = useMemo(
        () => buildTrackerMatrix(allCards, bills, months, BILL_SERIES),
        [allCards, bills, months]
    );

    const threshold = trackerYear?.thresholdAmount ?? SFT_TOTAL_THRESHOLD;
    const cashThreshold = trackerYear?.cashThresholdAmount ?? SFT_CASH_THRESHOLD;

    const aggregates = useMemo(
        () => aggregateByIssuer(issuers, entries, elapsedMonths, { total: threshold, cash: cashThreshold }),
        [issuers, entries, elapsedMonths, threshold, cashThreshold]
    );
    const billAggregates = useMemo(
        () => aggregateBillsByIssuer(issuers, bills, months, elapsedMonths),
        [issuers, bills, months, elapsedMonths]
    );

    const cardById = useMemo(() => new Map(allCards.map((card) => [card.id, card])), [allCards]);

    const paymentSeries: TrackerGridSeries = {
        id: 'payments',
        label: 'Paid',
        monthTotals: paymentMatrix.monthTotals,
        monthIssuerTotals: paymentMatrix.monthIssuerTotals,
        cardTotals: paymentMatrix.cardTotals,
        grandTotal: paymentMatrix.grandTotal,
        renderCell: (card, month) => (
            <PaymentCellEditor
                entry={paymentMatrix.entries.get(card.id)?.get(month.periodMonth)}
                cardId={card.id}
                periodMonth={month.periodMonth}
                onSave={savePaymentEntry}
            />
        ),
    };

    const billSeries: TrackerGridSeries = {
        id: 'bills',
        label: 'Billed',
        monthTotals: billMatrix.monthTotals,
        monthIssuerTotals: billMatrix.monthIssuerTotals,
        cardTotals: billMatrix.cardTotals,
        grandTotal: billMatrix.grandTotal,
        renderCell: (card, month) => (
            <BillCellEditor
                entry={billMatrix.entries.get(card.id)?.get(month.periodMonth)}
                card={cardById.get(card.id) ?? card}
                statementMonth={month.periodMonth}
                onSave={saveBillEntry}
            />
        ),
    };

    const gridSeries =
        view === 'payments' ? [paymentSeries] : view === 'bills' ? [billSeries] : [billSeries, paymentSeries];

    if (!userId) {
        return (
            <MainContainer>
                <LoginCard />
            </MainContainer>
        );
    }

    if (issuersError || entriesError || billsError) {
        return (
            <MainContainer>
                <Alert variant="destructive">
                    <AlertTitle>Could not load your credit card tracker</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>Something went wrong fetching your issuers, payments or bills.</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                refetchIssuers();
                                refetchEntries();
                                refetchBills();
                            }}
                        >
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </MainContainer>
        );
    }

    // Both queries mount unconditionally so switching views is instant, but the
    // skeleton only waits on the series actually on screen.
    const seriesLoading =
        view === 'payments' ? entriesLoading : view === 'bills' ? billsLoading : entriesLoading || billsLoading;
    const isLoading = issuersLoading || seriesLoading;

    const heading = HEADINGS[view];
    const showsPayments = view !== 'bills';
    const showsBills = view !== 'payments';

    return (
        <MainContainer className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">{heading.title}</h2>
                    <p className="text-sm text-muted-foreground">{heading.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <TrackerViewSelector value={view} onChange={setView} />
                    <FinancialYearSelector
                        value={financialYear}
                        onChange={setFinancialYear}
                        yearsWithData={yearsWithData}
                    />
                    {issuers.length > 0 && <IssuerCardManager issuers={issuers} />}
                    <AddCardDialog issuers={issuers} />
                </div>
            </div>

            {showsPayments && (
                <Alert>
                    <Info className="size-4" aria-hidden />
                    <AlertTitle>The {formatCurrencyAmount(threshold)} limit is per issuer</AlertTitle>
                    <AlertDescription>
                        Each bank files its own SFT return covering only its own cards, so two cards from the same bank
                        combine toward one limit while a different bank starts from zero. Cash bill payments count
                        separately, against {formatCurrencyAmount(cashThreshold)}.
                    </AlertDescription>
                </Alert>
            )}

            {/* Load-bearing: without it the grid is ambiguous about what a row means. */}
            {showsBills && (
                <Alert>
                    <Info className="size-4" aria-hidden />
                    <AlertTitle>A bill is filed under the month its statement was generated</AlertTitle>
                    <AlertDescription>
                        A statement generated 15 Aug covering 16 Jul – 15 Aug belongs to Aug, and is normally paid in
                        Sep. Bills and payments are not directly comparable: a revolved balance is billed again the next
                        month with interest, so twelve bills do not sum to a year's spending.
                    </AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <>
                    <GaugesSkeleton />
                    <Skeleton className="h-80 w-full rounded-md" />
                </>
            ) : issuers.length === 0 ? (
                <Card className="border-border/80 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <div className="rounded-full bg-primary/10 p-4">
                            <CreditCard className="size-8 text-primary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold">Add your first card</h3>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Name the bank that issued it and the card itself — cards from the same bank
                                automatically combine toward that bank's threshold.
                            </p>
                        </div>
                        <AddCardDialog issuers={issuers} />
                    </CardContent>
                </Card>
            ) : (
                <>
                    {showsPayments && (
                        <div className="space-y-2">
                            {view === 'both' && <h3 className="text-sm font-medium">Payments</h3>}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {aggregates.map((aggregate) => (
                                    <IssuerThresholdCard
                                        key={aggregate.issuerId}
                                        aggregate={aggregate}
                                        threshold={threshold}
                                        cashThreshold={cashThreshold}
                                        elapsedMonths={elapsedMonths}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {showsBills && (
                        <div className="space-y-2">
                            {view === 'both' && <h3 className="text-sm font-medium">Bills</h3>}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {billAggregates.map((aggregate) => (
                                    <IssuerBillSummaryCard
                                        key={aggregate.issuerId}
                                        aggregate={aggregate}
                                        monthLabelFor={monthLabelFor}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {allCards.length === 0 ? (
                        <Card className="border-border/80 shadow-sm">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                Add a card to start logging {showsBills && !showsPayments ? 'bills' : 'payments'}.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            <CreditCardGrid issuers={issuers} months={months} series={gridSeries} />
                            <p className="text-xs text-muted-foreground">
                                Enter saves, Escape reverts.{' '}
                                {showsBills
                                    ? 'Use the note icon in a bill cell for the minimum due, dates, or to mark a month as having no statement.'
                                    : 'Use the note icon in a cell to record a cash portion.'}
                            </p>
                        </div>
                    )}

                    <TrackerYearNotes financialYear={financialYear} notes={trackerYear?.notes ?? null} />
                </>
            )}
        </MainContainer>
    );
};

export default CreditCards;
