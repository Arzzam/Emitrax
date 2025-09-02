import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { IEmi } from '@/types/emi.types';
import { useEmis } from '@/hooks/useEmi';
import { formatAmount, getFormattedDate } from '@/utils/utils';

import { Table, TableCell, TableBody, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import NotFound from '@/components/common/NotFound';
import LoadingDetails from '@/components/common/LoadingDetails';

const AmortizationSchedule = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isFetching } = useEmis();
    const currentData = useMemo(() => data?.find((emi: IEmi) => emi.id === id) || null, [data, id]);
    const { amortizationSchedules } = currentData || {};
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
                title="Amortization Schedule"
                description="Loading amortization schedule..."
                description2="Please wait while we fetch your amortization schedule."
            />
        );
    }

    if (notFound || !amortizationSchedules) {
        return (
            <NotFound
                title="Amortization Schedule"
                description="We couldn't find the amortization schedule you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    const today = new Date();
    const isSameMonth = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();

    // Totals (computed defensively)
    const totals = amortizationSchedules.reduce(
        (acc, r) => {
            acc.emi += Number(r.emi) || 0;
            acc.interest += Number(r.interest) || 0;
            acc.principal += Number(r.principalPaid) || 0;
            acc.gst += Number(r.gst) || 0;
            return acc;
        },
        { emi: 0, interest: 0, principal: 0, gst: 0 }
    );

    return (
        <>
            <Header title="Amortization Schedule" />
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[
                    { label: 'Dashboard', link: '/' },
                    { label: `EMI Details (${currentData?.itemName})`, link: `/emi/${id}` },
                    { label: 'Amortization Schedule' },
                ]}
            />
            <MainContainer>
                <h3 className="text-lg font-bold pl-2">Amortization Schedule</h3>
                <div className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Bill Date</TableHead>
                                <TableHead>EMI</TableHead>
                                <TableHead>Interest</TableHead>
                                <TableHead>Principal Paid</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>GST</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {amortizationSchedules.map((item, idx) => {
                                const bill = new Date(item.billDate);
                                const isCurrent = isSameMonth(bill);
                                return (
                                    <TableRow
                                        key={item.month ?? idx}
                                        className={`tabular-nums ${
                                            isCurrent
                                                ? 'bg-primary/5 hover:bg-primary/10'
                                                : idx % 2 === 0
                                                  ? 'bg-muted/30'
                                                  : ''
                                        }`}
                                    >
                                        <TableCell>{item.month}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {getFormattedDate(item.billDate)}
                                        </TableCell>
                                        <TableCell>₹{formatAmount(Number(item.emi))}</TableCell>
                                        <TableCell>₹{formatAmount(Number(item.interest))}</TableCell>
                                        <TableCell>₹{formatAmount(Number(item.principalPaid))}</TableCell>
                                        <TableCell>₹{formatAmount(Number(item.balance))}</TableCell>
                                        <TableCell>₹{formatAmount(item.gst)}</TableCell>
                                    </TableRow>
                                );
                            })}

                            {/* Totals row */}
                            <TableRow className="font-semibold">
                                <TableCell colSpan={2}>Totals</TableCell>
                                <TableCell>₹{formatAmount(totals.emi)}</TableCell>
                                <TableCell>₹{formatAmount(totals.interest)}</TableCell>
                                <TableCell>₹{formatAmount(totals.principal)}</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>₹{formatAmount(totals.gst)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </MainContainer>
        </>
    );
};

export default AmortizationSchedule;
