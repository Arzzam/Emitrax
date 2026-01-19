import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
    CalendarIcon,
    CreditCard,
    IndianRupee,
    Percent,
    Clock,
    Calculator,
    Receipt,
    Tag,
    Wallet,
    ArchiveIcon,
    ArchiveRestoreIcon,
    Trash2,
    Share2,
    Users,
    Split,
} from 'lucide-react';

import { formatAmount } from '@/utils/utils';
import { useDeleteEmi, useEmis } from '@/hooks/useEmi';
import { errorToast, successToast } from '@/utils/toast.utils';
import { EmiService } from '@/utils/EMIService';
import { useQueryClient } from '@tanstack/react-query';

import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import FormModal from '@/components/emi/AddButton';
import ShareEMIModal from '@/components/emi/ShareEMIModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import NotFound from '@/components/common/NotFound';
import LoadingDetails from '@/components/common/LoadingDetails';

const EMIDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data, isFetching } = useEmis();
    const { mutate } = useDeleteEmi();
    const currentData = useMemo(() => data?.find((emi) => emi.id === id) || null, [data, id]);
    const [open, setOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    useEffect(() => {
        if (!isFetching && data && !currentData) {
            setNotFound(true);
            const redirectTimer = setTimeout(() => {
                navigate('/');
            }, 3000);

            return () => clearTimeout(redirectTimer);
        }
    }, [isFetching, data, currentData, navigate]);

    const handleArchiveToggle = async () => {
        if (!currentData || !id) return;

        setIsArchiving(true);
        try {
            if (currentData.isArchived) {
                await EmiService.unarchiveEmi(id);
                successToast('EMI unarchived successfully');
            } else {
                await EmiService.archiveEmi(id);
                successToast('EMI archived successfully');
            }
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        } catch (error) {
            console.error('Failed to toggle archive status:', error);
            errorToast('Failed to update archive status');
        } finally {
            setIsArchiving(false);
        }
    };

    if (isFetching) {
        return (
            <LoadingDetails
                title="EMI Details"
                description="Loading EMI details..."
                description2="Please wait while we fetch your EMI information."
            />
        );
    }

    if (notFound || !currentData) {
        return (
            <NotFound
                title="EMI Not Found"
                description="We couldn't find the EMI you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    const {
        itemName,
        principal,
        interestRate,
        tenure,
        billDate,
        emi,
        totalLoan,
        totalInterest,
        totalPaidEMIs,
        remainingBalance,
        remainingTenure,
        endDate,
        isCompleted,
        totalGST,
        gst,
        interestDiscount,
        interestDiscountType,
        tag,
        amortizationSchedules,
        isOwner,
        permission,
        sharedWith,
        isSplit,
        splits,
        mySplit,
        mySplitAmount,
    } = currentData;

    const canEdit = isOwner || permission === 'write';
    const isShared = sharedWith && sharedWith.length > 0;
    const splitCount = splits?.length || 0;
    const hasMySplit = !!mySplit && !!mySplitAmount;
    const splitPercentage = mySplit?.splitPercentage || 0;

    // Calculate user's portion of EMI details if they have a split
    const myPrincipal = hasMySplit ? (principal * splitPercentage) / 100 : principal;
    const myTotalLoan = hasMySplit ? (totalLoan * splitPercentage) / 100 : totalLoan;
    const myEMI = hasMySplit ? mySplitAmount! : emi;
    const myTotalInterest = hasMySplit ? (totalInterest * splitPercentage) / 100 : totalInterest;
    const myTotalGST = hasMySplit ? (totalGST * splitPercentage) / 100 : totalGST;
    const myRemainingBalance = hasMySplit ? (remainingBalance * splitPercentage) / 100 : remainingBalance;

    const formattedBillDate = new Date(billDate).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
    });

    const calculateNextBillDate = (billDate: Date | string) => {
        const currentDate = new Date();
        const billDateObj = new Date(billDate);
        const billDay = billDateObj.getDate();

        // Create a date for this month with the bill day
        const thisMonthBillDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), billDay);

        // If current date is before this month's bill date, next bill is this month
        if (currentDate.getDate() < billDay) {
            return thisMonthBillDate;
        } else {
            // If current date is on or after this month's bill date, next bill is next month
            const nextMonthBillDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, billDay);
            return nextMonthBillDate;
        }
    };

    const nextBillDate = calculateNextBillDate(billDate);
    const formattedNextBillDate = nextBillDate.toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
    });

    console.log(nextBillDate);

    const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
    });

    const handleConfirmDelete = () => {
        mutate(currentData.id, {
            onSuccess: () => {
                successToast('EMI deleted successfully');
                navigate('/');
            },
            onError: () => {
                errorToast('Failed to delete EMI');
            },
        });
    };

    const emiWithGST = emi + amortizationSchedules[tenure - remainingTenure]?.gst || 0;

    return (
        <>
            <Header title="EMI Details" />
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[{ label: 'Dashboard', link: '/' }, { label: `EMI Details (${itemName})` }]}
            />
            <MainContainer className="h-[calc(100vh-100px)]">
                <div className="flex flex-col space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-3xl font-bold">{itemName}</h1>
                                    <Badge variant={isCompleted ? 'success' : 'info'}>
                                        {isCompleted ? 'Completed' : 'Active'}
                                    </Badge>
                                </div>
                                {tag && (
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                        <Tag className="h-3 w-3" />
                                        <span>{tag}</span>
                                    </Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                                    <Link to={`/emi/${id}/amortization`} className="flex items-center gap-2">
                                        <Calculator className="h-4 w-4" />
                                        View Amortization
                                    </Link>
                                </Button>
                                {canEdit && <FormModal data={currentData} />}
                                {isOwner && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => setShareModalOpen(true)}
                                        >
                                            <Share2 className="h-4 w-4 mr-2" />
                                            {isShared ? (
                                                <>
                                                    <Users className="h-4 w-4 mr-1" />
                                                    {sharedWith.length}
                                                </>
                                            ) : (
                                                'Share'
                                            )}
                                        </Button>
                                        <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                                            <Link to={`/emi/${id}/split`} className="flex items-center gap-2">
                                                <Split className="h-4 w-4" />
                                                {isSplit ? (
                                                    <>
                                                        {splitCount} {splitCount === 1 ? 'Split' : 'Splits'}
                                                    </>
                                                ) : (
                                                    'Split EMI'
                                                )}
                                            </Link>
                                        </Button>
                                    </>
                                )}
                                {/* Show archive button for completed EMIs or if already archived - only for owner */}
                                {isOwner && (currentData.isCompleted || currentData.isArchived) && (
                                    <Button
                                        variant={currentData.isArchived ? 'default' : 'outline'}
                                        className="flex-1 sm:flex-none"
                                        onClick={handleArchiveToggle}
                                        disabled={isArchiving}
                                    >
                                        {currentData.isArchived ? (
                                            <>
                                                <ArchiveRestoreIcon className="h-4 w-4" />
                                                Unarchive EMI
                                            </>
                                        ) : (
                                            <>
                                                <ArchiveIcon className="h-4 w-4" />
                                                Archive EMI
                                            </>
                                        )}
                                    </Button>
                                )}
                                {isOwner && (
                                    <Button
                                        variant="destructive"
                                        className="flex-1 sm:flex-none"
                                        onClick={() => setOpen(true)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete EMI
                                    </Button>
                                )}
                                {!isOwner && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Shared with you ({permission === 'write' ? 'Can edit' : 'View only'})
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Split Information Banner for Registered Users */}
                    {hasMySplit && !isOwner && (
                        <Card className="border-primary/50 bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-1">Your Split Portion</h3>
                                        <p className="text-sm text-muted-foreground">
                                            You are responsible for {splitPercentage.toFixed(2)}% of this EMI
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Your Monthly Payment</p>
                                        <p className="text-2xl font-bold text-primary">₹{formatAmount(myEMI)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ₹{formatAmount(hasMySplit && !isOwner ? myEMI : emiWithGST)}
                                </div>
                                {hasMySplit && !isOwner ? (
                                    <p className="text-xs text-muted-foreground">
                                        Full EMI: ₹{formatAmount(emiWithGST)} • {splitPercentage.toFixed(2)}%
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Next bill date on {formattedNextBillDate}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Loan</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ₹{formatAmount(hasMySplit && !isOwner ? myTotalLoan : totalLoan)}
                                </div>
                                {hasMySplit && !isOwner ? (
                                    <p className="text-xs text-muted-foreground">
                                        Full Loan: ₹{formatAmount(totalLoan)} • Principal: ₹{formatAmount(myPrincipal)}{' '}
                                        of ₹{formatAmount(principal)}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Principal: ₹{formatAmount(principal)}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Interest Rate</CardTitle>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{interestRate}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Total Interest: ₹
                                    {formatAmount(hasMySplit && !isOwner ? myTotalInterest : totalInterest)}
                                    {hasMySplit && !isOwner && ` (of ₹${formatAmount(totalInterest)})`}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tenure Progress</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {totalPaidEMIs}/{tenure}
                                </div>
                                <div className="mt-2 h-2 w-full bg-secondary rounded-full">
                                    <div
                                        className="h-2 bg-primary rounded-full"
                                        style={{ width: `${(totalPaidEMIs / tenure) * 100}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    Payment Details
                                    {hasMySplit && !isOwner && (
                                        <Badge variant="outline" className="text-xs ml-auto">
                                            Your Portion
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Principal Amount</span>
                                    <div className="text-right">
                                        <span className="font-medium">
                                            ₹{formatAmount(hasMySplit && !isOwner ? myPrincipal : principal)}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(principal)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Loan Amount</span>
                                    <div className="text-right">
                                        <span className="font-medium">
                                            ₹{formatAmount(hasMySplit && !isOwner ? myTotalLoan : totalLoan)}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(totalLoan)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Monthly EMI</span>
                                    <div className="text-right">
                                        <span className="font-medium text-lg">
                                            ₹{formatAmount(hasMySplit && !isOwner ? myEMI : emi)}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(emi)} ({splitPercentage.toFixed(2)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Interest</span>
                                    <div className="text-right">
                                        <span className="font-medium">
                                            ₹{formatAmount(hasMySplit && !isOwner ? myTotalInterest : totalInterest)}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(totalInterest)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Balance Information
                                    {hasMySplit && !isOwner && (
                                        <Badge variant="outline" className="text-xs ml-auto">
                                            Your Portion
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Remaining Balance</span>
                                    <div className="text-right">
                                        <span className="font-medium">
                                            ₹
                                            {formatAmount(
                                                hasMySplit && !isOwner ? myRemainingBalance : remainingBalance
                                            )}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(remainingBalance)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Paid EMIs</span>
                                    <span className="font-medium">{totalPaidEMIs}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Remaining Tenure</span>
                                    <span className="font-medium">{remainingTenure} months</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Tenure</span>
                                    <span className="font-medium">{tenure} months</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Tag className="h-5 w-5" />
                                    Additional Details
                                    {hasMySplit && !isOwner && (
                                        <Badge variant="outline" className="text-xs ml-auto">
                                            Your Portion
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Category</span>
                                    <span className="font-medium">{tag || 'Personal'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">GST Rate</span>
                                    <span className="font-medium">{gst}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total GST</span>
                                    <div className="text-right">
                                        <span className="font-medium">
                                            ₹{formatAmount(hasMySplit && !isOwner ? myTotalGST : totalGST)}
                                        </span>
                                        {hasMySplit && !isOwner && (
                                            <span className="text-xs text-muted-foreground block">
                                                of ₹{formatAmount(totalGST)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {interestDiscount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Interest Discount</span>
                                        <span className="font-medium">
                                            {interestDiscount} {interestDiscountType === 'percent' ? '%' : '₹'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge variant={isCompleted ? 'success' : 'info'}>
                                        {isCompleted ? 'Completed' : 'Active'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Split Breakdown Section - Full Width */}
                    {isSplit && splits && splits.length > 0 && (
                        <Card className="border-primary/20">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Split className="h-5 w-5" />
                                        Split Breakdown
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                        {splitCount} {splitCount === 1 ? 'Participant' : 'Participants'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {splits.map((split) => {
                                        const splitEmiAmount = split.splitAmount || (emi * split.splitPercentage) / 100;
                                        const isCurrentUser = mySplit?.id === split.id;

                                        return (
                                            <div
                                                key={split.id}
                                                className={`p-4 rounded-lg border transition-colors ${
                                                    isCurrentUser
                                                        ? 'border-primary/50 bg-primary/5'
                                                        : 'border-border bg-card'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-sm truncate">
                                                                {split.participantName ||
                                                                    split.displayName ||
                                                                    'Unknown'}
                                                            </span>
                                                            {isCurrentUser && (
                                                                <Badge variant="default" className="text-xs shrink-0">
                                                                    You
                                                                </Badge>
                                                            )}
                                                            {split.isExternal && (
                                                                <Badge variant="outline" className="text-xs shrink-0">
                                                                    External
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {split.participantEmail || split.displayEmail || 'No email'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 pt-2 border-t">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-muted-foreground">Share</span>
                                                        <span className="font-medium text-sm">
                                                            {split.splitPercentage.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-muted-foreground">
                                                            Monthly Amount
                                                        </span>
                                                        <span className="font-semibold">
                                                            ₹{formatAmount(splitEmiAmount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {mySplit && mySplitAmount && (
                                    <div className="mt-6 pt-6 border-t">
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                                            <div>
                                                <p className="text-sm font-medium mb-1">Your Total Responsibility</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Based on your {mySplit.splitPercentage.toFixed(2)}% share
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary">
                                                    ₹{formatAmount(mySplitAmount)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">per month</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Important Dates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <CalendarIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Start Date</p>
                                    <p className="font-medium text-lg">{formattedBillDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <CalendarIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">End Date</p>
                                    <p className="font-medium text-lg">{formattedEndDate}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationModal
                    title="Are you sure you want to delete this EMI?"
                    description="This action cannot be undone."
                    open={open}
                    setOpen={setOpen}
                    onCancel={() => setOpen(false)}
                    onConfirm={handleConfirmDelete}
                />

                {id && <ShareEMIModal emiId={id} open={shareModalOpen} onOpenChange={setShareModalOpen} />}
            </MainContainer>
        </>
    );
};

export default EMIDetails;
