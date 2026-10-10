import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router';
import { CreditCard, Landmark, LayoutGrid } from 'lucide-react';

import { usePageTitle } from '@/context/PageTitleProvider/pageTitleProvider';
import {
    useAllLimitChanges,
    useAvailableFinancialYears,
    useCreditCardBillEntries,
    useCreditCardIssuers,
} from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IRootState } from '@/store/types/store.types';
import { buildUtilisationMatrix } from '@/utils/creditCardUtilisation.calc';
import { getCurrentFinancialYear, getFinancialYearMonths, parseFinancialYearKey } from '@/utils/financialYear';

import LoginCard from '@/components/cards/LoginCard';
import MainContainer from '@/components/common/Container';
import AddCardDialog from '@/components/creditCards/AddCardDialog';
import CardSummaryRow from '@/components/creditCards/CardSummaryRow';
import FinancialYearSelector from '@/components/creditCards/FinancialYearSelector';
import IssuerCardManager from '@/components/creditCards/IssuerCardManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Every card, grouped by the bank that issued it.
 *
 * The tracker answers "what happened this month"; this page answers "what do I
 * hold". Utilisation appears as a peak per card so the list doubles as the
 * at-a-glance health view, with the month-by-month detail one click away.
 */
const CreditCardList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { id: userId } = useSelector((state: IRootState) => state.userModel);
    const { formatCurrencyAmount } = useCurrencyPreferences();

    usePageTitle('Cards');

    const requestedYear = searchParams.get('fy');
    const financialYear = (requestedYear && parseFinancialYearKey(requestedYear)?.key) || getCurrentFinancialYear().key;

    const {
        data: issuers = [],
        isLoading: issuersLoading,
        isError: issuersError,
        refetch: refetchIssuers,
    } = useCreditCardIssuers();
    const { data: bills = [], isLoading: billsLoading } = useCreditCardBillEntries(financialYear);
    const { data: limitChanges = [], isLoading: limitsLoading } = useAllLimitChanges();
    const { data: yearsWithData = [] } = useAvailableFinancialYears();

    const months = useMemo(() => getFinancialYearMonths(financialYear), [financialYear]);
    const matrix = useMemo(
        () => buildUtilisationMatrix(issuers, bills, limitChanges, months),
        [issuers, bills, limitChanges, months]
    );

    // Same URL contract as the tracker, so moving between the two keeps the year.
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

    if (issuersError) {
        return (
            <MainContainer>
                <Alert variant="destructive">
                    <AlertTitle>Could not load your cards</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>Something went wrong fetching your banks and cards.</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => refetchIssuers()}>
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </MainContainer>
        );
    }

    const isLoading = issuersLoading || billsLoading || limitsLoading;

    return (
        <MainContainer className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">Cards</h2>
                    <p className="text-sm text-muted-foreground">
                        Every card you track, with its limit and how hard it was pushed in {financialYear}.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/credit-cards?fy=${financialYear}`}>
                            <LayoutGrid /> Tracker
                        </Link>
                    </Button>
                    <FinancialYearSelector
                        value={financialYear}
                        onChange={setFinancialYear}
                        yearsWithData={yearsWithData}
                    />
                    {issuers.length > 0 && <IssuerCardManager issuers={issuers} />}
                    <AddCardDialog issuers={issuers} />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </div>
            ) : issuers.length === 0 ? (
                <Card className="border-border/80 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <div className="rounded-full bg-primary/10 p-4">
                            <CreditCard className="size-8 text-primary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold">Add your first card</h3>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Name the bank that issued it and the card itself. Record a credit limit and its
                                statements start reporting utilisation.
                            </p>
                        </div>
                        <AddCardDialog issuers={issuers} />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {issuers.map((issuer) => {
                        // Only cards that actually have a limit are summed - a
                        // partial total presented as complete would understate
                        // how much credit the bank has extended.
                        const withLimit = issuer.cards.filter((card) => card.creditLimit != null);
                        const combinedLimit = withLimit.reduce((sum, card) => sum + (card.creditLimit ?? 0), 0);

                        return (
                            <section key={issuer.id} className="rounded-lg border">
                                <header className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                                    <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                    <h3 className="truncate text-sm font-semibold">{issuer.name}</h3>
                                    <span className="text-xs text-muted-foreground">
                                        {issuer.cards.length} {issuer.cards.length === 1 ? 'card' : 'cards'}
                                    </span>
                                    {withLimit.length > 0 && (
                                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                            {formatCurrencyAmount(combinedLimit)} combined limit
                                            {withLimit.length < issuer.cards.length &&
                                                ` · across ${withLimit.length} of ${issuer.cards.length}`}
                                        </span>
                                    )}
                                </header>

                                <div className="p-1.5">
                                    {issuer.cards.length === 0 ? (
                                        <p className="px-2 py-3 text-sm text-muted-foreground">No cards yet.</p>
                                    ) : (
                                        issuer.cards.map((card) => (
                                            <CardSummaryRow
                                                key={card.id}
                                                card={card}
                                                peak={matrix.cardPeak.get(card.id) ?? null}
                                                financialYear={financialYear}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}

                    <p className="text-xs text-muted-foreground">
                        Peak utilisation is the highest statement balance in {financialYear} against the limit in force
                        that month. A card with no limit recorded, or no statements entered, shows none.
                    </p>
                </div>
            )}
        </MainContainer>
    );
};

export default CreditCardList;
