import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { isEqual, omit } from 'lodash';

import { IEmi } from '@/types/emi.types';
import { EmiService } from '@/utils/EMIService';
import { EmiShareService } from '@/utils/EmiShareService';
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
        staleTime: 1000 * 60 * 5, // 5 minutes
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
    }, [emiData, isLoading, lastCheckDate, mutate, setLastUpdateAt]);

    const recalculateNow = () => {
        if (!emiData || !emiData.length) return;

        const recalculatedEmis = (emiData as IEmi[]).map((emi) => calculateEMI(emi, emi.id));

        if (!isEqual(emiData.map(stripComparisonFields), recalculatedEmis.map(stripComparisonFields))) {
            mutate(recalculatedEmis);
        }
    };

    return { recalculateNow };
};

export const useShareEmi = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ emiId, email, permission }: { emiId: string; email: string; permission: 'read' | 'write' }) =>
            EmiShareService.shareEmi(emiId, email, permission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
            queryClient.invalidateQueries({ queryKey: ['emiShares'] });
        },
    });
};

export const useShareEmiByUserId = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ emiId, userId, permission }: { emiId: string; userId: string; permission: 'read' | 'write' }) =>
            EmiShareService.shareEmiByUserId(emiId, userId, permission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
            queryClient.invalidateQueries({ queryKey: ['emiShares'] });
        },
    });
};

export const useUnshareEmi = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ emiId, sharedWithUserId }: { emiId: string; sharedWithUserId: string }) =>
            EmiShareService.unshareEmi(emiId, sharedWithUserId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
            queryClient.invalidateQueries({ queryKey: ['emiShares'] });
        },
    });
};

export const useUpdateSharePermission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            emiId,
            sharedWithUserId,
            permission,
        }: {
            emiId: string;
            sharedWithUserId: string;
            permission: 'read' | 'write';
        }) => EmiShareService.updateSharePermission(emiId, sharedWithUserId, permission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emis'] });
            queryClient.invalidateQueries({ queryKey: ['emiShares'] });
        },
    });
};

export const useEmiShares = (emiId: string) => {
    return useQuery({
        queryKey: ['emiShares', emiId],
        queryFn: () => EmiShareService.getEmiShares(emiId),
        enabled: !!emiId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
