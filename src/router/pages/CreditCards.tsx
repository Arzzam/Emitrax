import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router';
import { CreditCard, Info, WalletCards } from 'lucide-react';

import {
    useAllLimitChanges,
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
    aggregateUtilisationByIssuer,
    buildBureauUtilisation,
    buildUtilisationMatrix,
    formatUtilisationPercent,
} from '@/utils/creditCardUtilisation.calc';
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
import BureauUtilisationCard from '@/components/creditCards/BureauUtilisationCard';
import CreditCardGrid, { TrackerGridSeries } from '@/components/creditCards/CreditCardGrid';
import FinancialYearSelector from '@/components/creditCards/FinancialYearSelector';
import IssuerBillSummaryCard from '@/components/creditCards/IssuerBillSummaryCard';
import IssuerCardManager from '@/components/creditCards/IssuerCardManager';
import IssuerThresholdCard from '@/components/creditCards/IssuerThresholdCard';
import IssuerUtilisationCard from '@/components/creditCards/IssuerUtilisationCard';
import PaymentCellEditor from '@/components/creditCards/PaymentCellEditor';
import TrackerViewSelector, { parseTrackerView, TrackerView } from '@/components/creditCards/TrackerViewSelector';
import TrackerYearNotes from '@/components/creditCards/TrackerYearNotes';
import UtilisationCellValue from '@/components/creditCards/UtilisationCellValue';
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
    utilisation: {
        title: 'Credit limit utilisation',
        description: 'Each statement balance against the limit that was in force when it was printed.',
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

    // Changing the year drops the picked month with it - carrying it over would
    // leave a stale key in the URL that no longer names a month on screen.
    const setFinancialYear = (next: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('fy', next);
        params.delete('month');
        setSearchParams(params, { replace: false });
    };
    const setView = (next: TrackerView) => setParam('view', next, next === 'payments');
    const setUtilisationMonth = (next: string) => setParam('month', next, false);

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
    const {
        data: limitChanges = [],
        isLoading: limitsLoading,
        isError: limitsError,
        refetch: refetchLimits,
    } = useAllLimitChanges();
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
    const utilisationMatrix = useMemo(
        () => buildUtilisationMatrix(issuers, bills, limitChanges, months),
        [issuers, bills, limitChanges, months]
    );
    // The bureau reading drives every COMBINED figure - the grid's issuer
    // subtotals, its overall column and the summary cards. The matrix above
    // stays the source for per-card cells only.
    const bureau = useMemo(
        () => buildBureauUtilisation(issuers, bills, limitChanges, months),
        [issuers, bills, limitChanges, months]
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
    const utilisationAggregates = useMemo(
        () => aggregateUtilisationByIssuer(issuers, bureau, months),
        [issuers, bureau, months]
    );

    const cardById = useMemo(() => new Map(allCards.map((card) => [card.id, card])), [allCards]);

    // A month explicitly picked wins, but only while it belongs to the year being
    // viewed - otherwise changing the financial year would leave the card
    // pointing at a month that is no longer on screen. Falling back to the most
    // recent month with a figure keeps the default a bureau would recognise.
    const requestedMonth = searchParams.get('month');
    const utilisationMonth =
        (requestedMonth && months.some((month) => month.periodMonth === requestedMonth) ? requestedMonth : null) ??
        bureau.latest?.statementMonth ??
        null;

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

    // Ratios, not money: a subtotal is a peak rather than a sum, and an absent
    // reading must stay absent rather than collapsing into a zero.
    const ratioOrDash = (value: number | undefined) => (value == null ? '—' : formatUtilisationPercent(value));

    const utilisationSeries: TrackerGridSeries = {
        id: 'utilisation',
        label: 'Utilisation',
        monthTotals: new Map(Array.from(bureau.months, ([month, figure]) => [month, figure.ratio])),
        monthIssuerTotals: new Map(
            Array.from(bureau.issuerMonths, ([month, byIssuer]) => [
                month,
                new Map(Array.from(byIssuer, ([issuerId, figure]) => [issuerId, figure.ratio])),
            ])
        ),
        // Per-card footer stays the card's own peak; the combined columns are
        // the bureau rule, which counts every open limit whether used or not.
        cardTotals: new Map(Array.from(utilisationMatrix.cardPeak, ([cardId, peak]) => [cardId, peak.cell.ratio])),
        grandTotal: bureau.peak?.ratio,
        formatValue: ratioOrDash,
        formatTotal: ratioOrDash,
        getIssuerTotal: (issuerId) => bureau.issuerPeak.get(issuerId)?.ratio,
        footerLabel: 'Peak',
        zeroIsFigure: true,
        renderCell: (card, month) => (
            <UtilisationCellValue
                cell={utilisationMatrix.cells.get(card.id)?.get(month.periodMonth)}
                cardId={card.id}
                cardName={card.name}
                monthLabel={month.label}
                financialYear={financialYear}
            />
        ),
    };

    const gridSeries =
        view === 'payments'
            ? [paymentSeries]
            : view === 'bills'
              ? [billSeries]
              : view === 'utilisation'
                ? [utilisationSeries]
                : [billSeries, paymentSeries];

    if (!userId) {
        return (
            <MainContainer>
                <LoginCard />
            </MainContainer>
        );
    }

    if (issuersError || entriesError || billsError || limitsError) {
        return (
            <MainContainer>
                <Alert variant="destructive">
                    <AlertTitle>Could not load your credit card tracker</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>Something went wrong fetching your issuers, payments, bills or credit limits.</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                refetchIssuers();
                                refetchEntries();
                                refetchBills();
                                refetchLimits();
                            }}
                        >
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </MainContainer>
        );
    }

    // Every query mounts unconditionally so switching views is instant, but the
    // skeleton only waits on the series actually on screen.
    const seriesLoading =
        view === 'payments'
            ? entriesLoading
            : view === 'bills'
              ? billsLoading
              : view === 'utilisation'
                ? billsLoading || limitsLoading
                : entriesLoading || billsLoading;
    const isLoading = issuersLoading || seriesLoading;

    const heading = HEADINGS[view];
    const showsUtilisation = view === 'utilisation';
    const showsPayments = view === 'payments' || view === 'both';
    const showsBills = view === 'bills' || view === 'both';

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
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/credit-cards/cards?fy=${financialYear}`}>
                            <WalletCards /> Cards
                        </Link>
                    </Button>
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

            {showsUtilisation && (
                <Alert>
                    <Info className="size-4" aria-hidden />
                    <AlertTitle>Combined figures follow the credit-bureau rule</AlertTitle>
                    <AlertDescription>
                        A card column is that card's own statement balance against the limit in force when it was
                        printed, so raising a limit never restates earlier months. The overall and per-bank columns
                        instead work the way CIBIL does: every card's limit counts toward the total whether or not it
                        carried a balance, balances floor at zero, and a card you have not entered is assumed nil and
                        flagged — which means a partial month can only ever read lower than the truth.
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

                    {showsUtilisation && (
                        <BureauUtilisationCard
                            bureau={bureau}
                            months={months}
                            selectedMonth={utilisationMonth}
                            onSelectMonth={setUtilisationMonth}
                            financialYear={financialYear}
                        />
                    )}

                    {showsUtilisation && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {utilisationAggregates.map((aggregate) => (
                                <IssuerUtilisationCard
                                    key={aggregate.issuerId}
                                    aggregate={aggregate}
                                    monthLabelFor={monthLabelFor}
                                />
                            ))}
                        </div>
                    )}

                    {allCards.length === 0 ? (
                        <Card className="border-border/80 shadow-sm">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                Add a card to start logging{' '}
                                {showsUtilisation
                                    ? 'bills and credit limits'
                                    : showsBills && !showsPayments
                                      ? 'bills'
                                      : 'payments'}
                                .
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            <CreditCardGrid issuers={issuers} months={months} series={gridSeries} />
                            {showsUtilisation ? (
                                <p className="text-xs text-muted-foreground">
                                    Every cell here is derived — select one to open the card, where its limit history
                                    and statements are edited. Combined columns are a ratio of sums, never an average of
                                    per-card percentages, and the footer is each column's peak rather than a total. A
                                    card cell is blank when nothing was entered; a month the bank issued no statement
                                    reads 0%, because nothing was owed.
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Enter saves, Escape reverts.{' '}
                                    {showsBills
                                        ? 'Use the note icon in a bill cell for the minimum due, dates, or to mark a month as having no statement.'
                                        : 'Use the note icon in a cell to record a cash portion.'}
                                </p>
                            )}
                        </div>
                    )}

                    <TrackerYearNotes financialYear={financialYear} notes={trackerYear?.notes ?? null} />
                </>
            )}
        </MainContainer>
    );
};

export default CreditCards;
