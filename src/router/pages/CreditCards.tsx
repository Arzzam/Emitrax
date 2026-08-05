import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { CreditCard, Info } from 'lucide-react';

import {
    useAvailableFinancialYears,
    useCreditCardEntries,
    useCreditCardIssuers,
    useCreditCardTrackerYear,
    useSavePaymentEntry,
} from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IRootState } from '@/store/types/store.types';
import { SFT_CASH_THRESHOLD, SFT_TOTAL_THRESHOLD } from '@/types/creditCard.types';
import { aggregateByIssuer, buildTrackerMatrix } from '@/utils/creditCardTracker.calc';
import {
    getCurrentFinancialYear,
    getElapsedMonthCount,
    getFinancialYearMonths,
    parseFinancialYearKey,
} from '@/utils/financialYear';

import LoginCard from '@/components/cards/LoginCard';
import MainContainer from '@/components/common/Container';
import AddCardDialog from '@/components/creditCards/AddCardDialog';
import CreditCardGrid from '@/components/creditCards/CreditCardGrid';
import FinancialYearSelector from '@/components/creditCards/FinancialYearSelector';
import IssuerCardManager from '@/components/creditCards/IssuerCardManager';
import IssuerThresholdCard from '@/components/creditCards/IssuerThresholdCard';
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

const CreditCards = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { id: userId } = useSelector((state: IRootState) => state.userModel);
    const { formatCurrencyAmount } = useCurrencyPreferences();

    // The FY lives in the URL so refresh, back and sharing all preserve the view.
    const requestedYear = searchParams.get('fy');
    const financialYear = (requestedYear && parseFinancialYearKey(requestedYear)?.key) || getCurrentFinancialYear().key;

    const setFinancialYear = (next: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('fy', next);
        setSearchParams(params, { replace: false });
    };

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
    const { data: trackerYear } = useCreditCardTrackerYear(financialYear);
    const { data: yearsWithData = [] } = useAvailableFinancialYears();
    const { mutate: savePaymentEntry } = useSavePaymentEntry(financialYear);

    const months = useMemo(() => getFinancialYearMonths(financialYear), [financialYear]);
    const elapsedMonths = useMemo(() => getElapsedMonthCount(financialYear), [financialYear]);

    const allCards = useMemo(() => issuers.flatMap((issuer) => issuer.cards), [issuers]);
    const matrix = useMemo(() => buildTrackerMatrix(allCards, entries, months), [allCards, entries, months]);

    const threshold = trackerYear?.thresholdAmount ?? SFT_TOTAL_THRESHOLD;
    const cashThreshold = trackerYear?.cashThresholdAmount ?? SFT_CASH_THRESHOLD;

    const aggregates = useMemo(
        () => aggregateByIssuer(issuers, entries, elapsedMonths, { total: threshold, cash: cashThreshold }),
        [issuers, entries, elapsedMonths, threshold, cashThreshold]
    );

    if (!userId) {
        return (
            <MainContainer>
                <LoginCard />
            </MainContainer>
        );
    }

    if (issuersError || entriesError) {
        return (
            <MainContainer>
                <Alert variant="destructive">
                    <AlertTitle>Could not load your credit card tracker</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>Something went wrong fetching your issuers or payments.</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                refetchIssuers();
                                refetchEntries();
                            }}
                        >
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </MainContainer>
        );
    }

    const isLoading = issuersLoading || entriesLoading;

    return (
        <MainContainer className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">Annual payment tracker</h2>
                    <p className="text-sm text-muted-foreground">
                        What you paid toward each card bill, against the reporting threshold.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <FinancialYearSelector
                        value={financialYear}
                        onChange={setFinancialYear}
                        yearsWithData={yearsWithData}
                    />
                    {issuers.length > 0 && <IssuerCardManager issuers={issuers} />}
                    <AddCardDialog issuers={issuers} />
                </div>
            </div>

            <Alert>
                <Info className="size-4" aria-hidden />
                <AlertTitle>The {formatCurrencyAmount(threshold)} limit is per issuer</AlertTitle>
                <AlertDescription>
                    Each bank files its own SFT return covering only its own cards, so two cards from the same bank
                    combine toward one limit while a different bank starts from zero. Cash bill payments count
                    separately, against {formatCurrencyAmount(cashThreshold)}.
                </AlertDescription>
            </Alert>

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

                    {allCards.length === 0 ? (
                        <Card className="border-border/80 shadow-sm">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                Add a card to start logging payments.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            <CreditCardGrid
                                issuers={issuers}
                                months={months}
                                matrix={matrix}
                                onSaveEntry={savePaymentEntry}
                            />
                            <p className="text-xs text-muted-foreground">
                                {matrix.grandTotal === 0
                                    ? 'Click any cell to log what you paid. Enter saves, Escape reverts.'
                                    : 'Enter saves, Escape reverts. Use the note icon in a cell to record a cash portion.'}
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
