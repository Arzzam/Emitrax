import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { AlertCircle, CalendarIcon, Clock, Coins, CreditCard, Eye, Loader2, Percent, Tag } from 'lucide-react';

import { NumberStyleProvider } from '@/context/NumberStyleProvider/numberStyleProvider';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { usePublicEmi } from '@/hooks/useEmiShareLinks';
import { PublicEmiData } from '@/types/emi.types';
import { calculateProcessingFeeCharges, calculateTotalLoanOutflow } from '@/utils/calculation';
import { getRepaymentProgress } from '@/utils/emiRepayment.calc';

import MainContainer from '@/components/common/Container';
import AmortizationTable from '@/components/emi/AmortizationTable';
import RepaymentProgressCard from '@/components/emi/RepaymentProgressCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatLongDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

const PublicEmiView = ({ emi }: { emi: PublicEmiData }) => {
    const { formatCurrencyAmount, amountTitle, formatPercent } = useCurrencyPreferences(emi.currency);

    // Same derivations as EMIDetails, so the viewer sees the owner's figures.
    const progress = useMemo(() => getRepaymentProgress(emi), [emi]);
    const effectiveTotalLoan = calculateTotalLoanOutflow(emi);
    const { processingFeeGstAmount } = calculateProcessingFeeCharges(emi.processingFee, emi.processingFeeGst);
    const oneTimeCharges = (emi.processingFee ?? 0) + processingFeeGstAmount;
    const emiWithGST = emi.emi + (emi.amortizationSchedules[progress.paidInstallments]?.gst ?? 0);
    const tenurePercent =
        progress.totalInstallments > 0 ? (progress.paidInstallments / progress.totalInstallments) * 100 : 0;

    return (
        <div className="flex flex-col space-y-6">
            <Card>
                <CardHeader className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-3xl font-bold">{emi.itemName}</h1>
                        <Badge variant={emi.isCompleted ? 'success' : 'info'}>
                            {emi.isCompleted ? 'Completed' : 'Active'}
                        </Badge>
                    </div>
                    {emi.tag && (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Tag className="h-3 w-3" />
                            <span>{emi.tag}</span>
                        </Badge>
                    )}
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums" title={amountTitle(emiWithGST)}>
                            {formatCurrencyAmount(emiWithGST)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Loan</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums" title={amountTitle(effectiveTotalLoan)}>
                            {formatCurrencyAmount(effectiveTotalLoan)}
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            Principal: {formatCurrencyAmount(emi.principal)}
                            {oneTimeCharges > 0 && ` · incl. ${formatCurrencyAmount(oneTimeCharges)} one-time`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interest Rate</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{formatPercent(emi.interestRate)}</div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            Total Interest: {formatCurrencyAmount(emi.totalInterest)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tenure Progress</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                            {progress.paidInstallments}/{progress.totalInstallments}
                        </div>
                        <div className="mt-2 h-2 w-full bg-secondary rounded-full">
                            <div className="h-2 bg-primary rounded-full" style={{ width: `${tenurePercent}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <RepaymentProgressCard emi={emi} />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Loan Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="font-medium">{formatLongDate(emi.billDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <p className="font-medium">{formatLongDate(emi.endDate)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Amortization Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <AmortizationTable schedules={emi.amortizationSchedules} currency={emi.currency} />
                </CardContent>
            </Card>
        </div>
    );
};

const CenteredMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">{children}</div>
);

/**
 * /s/:token - a read-only EMI anyone with the link can open, without logging
 * in. Rendered outside the app shell; reads only through get_public_emi().
 */
const PublicEMI = () => {
    const { token = '' } = useParams();
    const { data, isLoading, isError } = usePublicEmi(token);

    useEffect(() => {
        document.title = data ? `${data.emi.itemName} · Emitrax` : 'Shared EMI · Emitrax';
    }, [data]);

    return (
        <div className="min-h-svh bg-background">
            <header className="border-b">
                <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
                    <Link to="/" className="text-lg font-semibold">
                        Emitrax
                    </Link>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Read-only
                    </Badge>
                </div>
            </header>
            <MainContainer>
                {isLoading ? (
                    <CenteredMessage>
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading shared EMI...</p>
                    </CenteredMessage>
                ) : isError || !data ? (
                    <CenteredMessage>
                        <div className="rounded-full bg-primary/10 p-6">
                            <AlertCircle className="h-12 w-12 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">
                            {isError ? 'Something went wrong' : 'This link is no longer available'}
                        </h2>
                        <p className="max-w-md text-muted-foreground">
                            {isError
                                ? "We couldn't load this EMI. Please try again in a moment."
                                : 'The owner may have revoked it, or the EMI was deleted.'}
                        </p>
                        <Button asChild>
                            <Link to="/">Go to Emitrax</Link>
                        </Button>
                    </CenteredMessage>
                ) : (
                    <NumberStyleProvider value={data.format}>
                        <PublicEmiView emi={data.emi} />
                    </NumberStyleProvider>
                )}
            </MainContainer>
        </div>
    );
};

export default PublicEMI;
