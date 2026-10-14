import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { usePageTitle } from '@/context/PageTitleProvider/pageTitleProvider';
import { useEmis } from '@/hooks/useEmi';
import { IEmi } from '@/types/emi.types';

import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import MainContainer from '@/components/common/Container';
import LoadingDetails from '@/components/common/LoadingDetails';
import NotFound from '@/components/common/NotFound';
import AmortizationTable from '@/components/emi/AmortizationTable';

const AmortizationSchedule = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isFetching } = useEmis();
    const currentData = useMemo(() => data?.find((emi: IEmi) => emi.id === id) || null, [data, id]);
    const { amortizationSchedules } = currentData || {};
    const [notFound, setNotFound] = useState(false);

    usePageTitle(currentData?.itemName ? `Amortization · ${currentData.itemName}` : 'Amortization Schedule');

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

    if (notFound || !currentData || !amortizationSchedules) {
        return (
            <NotFound
                title="Amortization Schedule"
                description="We couldn't find the amortization schedule you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    return (
        <>
            <BreadcrumbContainer
                className="py-4 px-8"
                items={[
                    { label: 'Dashboard', link: '/' },
                    { label: `EMI Details (${currentData?.itemName})`, link: `/emi/${id}` },
                    { label: 'Amortization Schedule' },
                ]}
            />
            <MainContainer>
                <h3 className="text-lg font-bold pl-2">Amortization Schedule</h3>
                <div className="p-4">
                    <AmortizationTable schedules={amortizationSchedules} currency={currentData.currency} />
                </div>
            </MainContainer>
        </>
    );
};

export default AmortizationSchedule;
