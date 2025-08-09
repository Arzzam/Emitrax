import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CalendarIcon, CreditCard, IndianRupee, Percent, Clock, Calculator, Receipt, Tag, Wallet } from 'lucide-react';

import { formatAmount } from '@/utils/utils';
import { useDeleteEmi, useEmis } from '@/hooks/useEmi';

import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import FormModal from '@/components/emi/AddButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import NotFound from '@/components/common/NotFound';
import LoadingDetails from '@/components/common/LoadingDetails';

const EMIDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isFetching } = useEmis();
    const { mutate } = useDeleteEmi();
    const currentData = data?.find((emi) => emi.id === id) || null;
    const [open, setOpen] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!isFetching && data && !currentData) {
            setNotFound(true);
            const redirectTimer = setTimeout(() => {
                navigate('/');
            }, 3000);

            return () => clearTimeout(redirectTimer);
        }
    }, [isFetching, data, currentData, navigate]);

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
    } = currentData;

    const formattedBillDate = new Date(billDate).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
    });

    const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
    });

    const handleConfirmDelete = () => {
        mutate(currentData.id);
        navigate('/');
    };

    const emiWithGST = emi + amortizationSchedules[tenure - remainingTenure]?.gst || 0;

    return (
        <>
            <Header title="EMI Details" />
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[{ label: 'Dashboard', link: '/' }, { label: `EMI Details (${itemName})` }]}
            />
            <MainContainer>
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
                                <Button variant="outline" className="flex-1 sm:flex-none">
                                    <Link to={`/emi/${id}/amortization`} className="flex items-center gap-2">
                                        <Calculator className="h-4 w-4" />
                                        View Amortization
                                    </Link>
                                </Button>
                                <FormModal data={currentData} />
                                <Button
                                    variant="destructive"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => setOpen(true)}
                                >
                                    Delete EMI
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{formatAmount(emiWithGST)}</div>
                                <p className="text-xs text-muted-foreground">Next due on {formattedBillDate}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Loan</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{formatAmount(totalLoan)}</div>
                                <p className="text-xs text-muted-foreground">Principal: ₹{formatAmount(principal)}</p>
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
                                    Total Interest: ₹{formatAmount(totalInterest)}
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
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Principal Amount</span>
                                    <span className="font-medium">₹{formatAmount(principal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Loan Amount</span>
                                    <span className="font-medium">₹{formatAmount(totalLoan)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Monthly EMI</span>
                                    <span className="font-medium">₹{formatAmount(emi)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Interest</span>
                                    <span className="font-medium">₹{formatAmount(totalInterest)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Balance Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Remaining Balance</span>
                                    <span className="font-medium">₹{formatAmount(remainingBalance)}</span>
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
                                    <span className="font-medium">₹{formatAmount(totalGST)}</span>
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
            </MainContainer>
        </>
    );
};

export default EMIDetails;
