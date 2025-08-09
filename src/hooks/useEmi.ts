import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { isEqual, omit } from 'lodash';

import { IEmi } from '@/types/emi.types';
import { EmiService } from '@/utils/EMIService';
import { calculateEMI } from '@/utils/calculation';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { useRematchDispatch } from '@/store/store';

// Helper function to strip comparison fields for EMI comparison
const stripComparisonFields = (emi: IEmi) => {
    return omit(emi, ['userId', 'createdAt', 'updatedAt', 'endDate']);
};

export const useEmis = (): UseQueryResult<IEmi[], Error> => {
    const { id } = useSelector((state: IRootState) => state.userModel);

    return useQuery({
        queryKey: ['emis'],
        enabled: !!id,
        queryFn: () => EmiService.getEmis(),
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreateEmi = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (emi: Omit<IEmi, 'id'>) => EmiService.createEmi(emi),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        },
    });
};

export const useUpdateEmi = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (emi: IEmi) => EmiService.updateEmi(emi),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        },
    });
};

export const useDeleteEmi = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => EmiService.deleteEmi(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        },
    });
};

export const useUpdateEmiList = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (emiList: IEmi[]) => EmiService.updateEmiList(emiList),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        },
    });
};

/**
 * Hook to automatically recalculate EMIs when the date changes
 * This runs a daily check to update EMI calculations if needed
 */
export const useAutoRecalculateEmis = () => {
    const { data: emiData, isLoading } = useEmis();
    const { mutate } = useUpdateEmiList();
    const lastCheckDate = useSelector((state: IRootState) => state.lastUpdateAt);
    const { setLastUpdateAt } = useRematchDispatch((state: IDispatch) => state.lastUpdateAt);

    useEffect(() => {
        if (isLoading || !emiData || !emiData.length) return;

        const today = new Date().toDateString();

        if (lastCheckDate && lastCheckDate === today) return;

        setLastUpdateAt(today);

        const recalculatedEmis = (emiData as IEmi[]).map((emi) => calculateEMI(emi, emi.id));

        if (!isEqual(emiData.map(stripComparisonFields), recalculatedEmis.map(stripComparisonFields))) {
            mutate(recalculatedEmis);
        }
    }, [emiData]);

    const recalculateNow = () => {
        if (!emiData || !emiData.length) return;

        const recalculatedEmis = (emiData as IEmi[]).map((emi) => calculateEMI(emi, emi.id));

        if (!isEqual(emiData.map(stripComparisonFields), recalculatedEmis.map(stripComparisonFields))) {
            mutate(recalculatedEmis);
        }
    };

    return { recalculateNow };
};
