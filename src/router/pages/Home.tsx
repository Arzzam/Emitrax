import { useEffect, useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';

import { useUser } from '@/hooks/useUser';
import useStats from '@/hooks/useStats';
import { useEmis, useAutoRecalculateEmis, useUpdateEmiList } from '@/hooks/useEmi';
import { useRematchDispatch } from '@/store/store';
import { IEmi } from '@/types/emi.types';
import { IDispatch, IRootState } from '@/store/types/store.types';

import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import EMICard from '@/components/emi/EMICard';
import { Card } from '@/components/ui/card';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import FilterSection from '@/components/filter/FilterSection';
import LoginCard from '@/components/cards/LoginCard';
import EMILoadingAndError from '@/components/cards/EMILoadingAndError';
import StatsSection from '@/components/stats/StatsSection';

const Home = () => {
    const { data: user, isError: userError } = useUser();
    const { data, isLoading: isEMILoading, isError: isEmisError } = useEmis();
    const { searchQuery } = useSelector((state: IRootState) => state.filterModel);
    const { setUser } = useRematchDispatch((state: IDispatch) => state.userModel);
    const { recalculateNow } = useAutoRecalculateEmis();
    const { isPending: isUpdatingEmis } = useUpdateEmiList();
    const [openConfirmationModal, setOpenConfirmationModal] = useState(false);

    useEffect(() => {
        if (user) {
            setUser({
                id: user.user?.id || '',
                email: user.user?.email || '',
                rawData: user.user?.user_metadata || {},
                metadata: user.user?.app_metadata || {},
            });
        }
    }, [user, setUser]);

    const emiData = useMemo(() => (data || []) as IEmi[], [data]);

    const { filteredEmiData } = useStats(emiData);
    const hasUser = user && !userError;

    return (
        <>
            <Header title="Dashboard" />
            <MainContainer>
                {!hasUser ? (
                    <LoginCard />
                ) : (
                    <>
                        {isEMILoading || isEmisError ? (
                            <EMILoadingAndError />
                        ) : (
                            <>
                                {/* Stats Section */}
                                <StatsSection emiData={emiData} />
                                {/* Filter Section */}
                                <FilterSection emiData={emiData} setOpenConfirmationModal={setOpenConfirmationModal} />

                                {/* EMI Cards Grid */}
                                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                                    {filteredEmiData.length === 0 ? (
                                        <Card className="col-span-full p-8">
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                                                <h3 className="font-semibold">No EMIs Found</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {searchQuery
                                                        ? 'No EMIs match your search criteria'
                                                        : 'Start by adding your first EMI'}
                                                </p>
                                            </div>
                                        </Card>
                                    ) : (
                                        filteredEmiData.map((emi) => <EMICard key={emi.id} {...emi} />)
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
                <ConfirmationModal
                    title="Recalculate EMIs"
                    description="The recalculation will happen every day automatically. Do you want to manually recalculate now?"
                    onConfirm={() => {
                        recalculateNow();
                        setOpenConfirmationModal(false);
                    }}
                    onCancel={() => setOpenConfirmationModal(false)}
                    open={openConfirmationModal}
                    setOpen={setOpenConfirmationModal}
                    isLoading={isUpdatingEmis}
                />
            </MainContainer>
        </>
    );
};

export default Home;
