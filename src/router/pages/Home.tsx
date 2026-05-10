import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';

import { useAdvancedFilter } from '@/hooks/useAdvancedFilter';
import { useAutoRecalculateEmis, useEmis, useUpdateEmiList } from '@/hooks/useEmi';
import { useUser } from '@/hooks/useUser';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { IEmi } from '@/types/emi.types';

import EMILoadingAndError from '@/components/cards/EMILoadingAndError';
import LoginCard from '@/components/cards/LoginCard';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import EMICard from '@/components/emi/EMICard';
import AdvancedFilterBar from '@/components/filter/AdvancedFilterBar';
import StatsSection from '@/components/stats/StatsSection';
import { Card } from '@/components/ui/card';

const Home = () => {
    const { data: user, isError: userError } = useUser();
    const { data, isLoading: isEMILoading, isError: isEmisError } = useEmis();
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

    const advancedFilter = useAdvancedFilter(emiData);
    const { filteredEmiData, filterTag, statistics, filteredStatistics, tagStatistics, uniqueTags, splitContext } =
        advancedFilter;

    const searchQuery = useSelector((state: IRootState) => state.advancedFilterModel.searchQuery);
    const setAdvancedTag = useRematchDispatch((d: IDispatch) => d.advancedFilterModel.setTag);

    const hasUser = user && !userError;

    const statsOverride = useMemo(
        () => ({
            statistics,
            filteredStatistics,
            tagStatistics,
            uniqueTags,
            filterTag,
            onSetTag: setAdvancedTag,
            splitContext,
        }),
        [statistics, filteredStatistics, tagStatistics, uniqueTags, filterTag, setAdvancedTag, splitContext]
    );

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
                                <StatsSection emiData={emiData} statsOverride={statsOverride} />
                                <AdvancedFilterBar
                                    emiData={emiData}
                                    setOpenConfirmationModal={setOpenConfirmationModal}
                                />

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
