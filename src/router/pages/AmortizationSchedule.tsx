import { useEffect, useState } from 'react';
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
    const currentData = data?.find((emi: IEmi) => emi.id === id) || null;
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
                            {amortizationSchedules.map((item) => (
                                <TableRow key={item.month}>
                                    <TableCell>{item.month}</TableCell>
                                    <TableCell>{getFormattedDate(item.billDate)}</TableCell>
                                    <TableCell>{item.emi}</TableCell>
                                    <TableCell>{item.interest}</TableCell>
                                    <TableCell>{item.principalPaid}</TableCell>
                                    <TableCell>{item.balance}</TableCell>
                                    <TableCell>{formatAmount(item.gst)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </MainContainer>
        </>
    );
};

export default AmortizationSchedule;
