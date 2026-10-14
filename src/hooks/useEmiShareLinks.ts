import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { IRootState } from '@/store/types/store.types';
import { IEmiShareLink, IPublicEmi } from '@/types/emi.types';
import { EmiShareLinkService } from '@/utils/EmiShareLinkService';
import { errorToast, successToast } from '@/utils/toast.utils';

export const emiShareLinkKeys = {
    all: ['emiShareLinks'] as const,
    active: (emiId: string) => [...emiShareLinkKeys.all, 'active', emiId] as const,
    publicEmi: (token: string) => [...emiShareLinkKeys.all, 'public', token] as const,
};

/** Builds the URL a recipient opens. */
export const buildShareLinkUrl = (token: string): string => `${window.location.origin}/s/${token}`;

export const useActiveShareLink = (emiId: string): UseQueryResult<IEmiShareLink | null, Error> => {
    const { id: userId } = useSelector((state: IRootState) => state.userModel);

    return useQuery({
        queryKey: emiShareLinkKeys.active(emiId),
        queryFn: () => EmiShareLinkService.getActiveLink(emiId),
        enabled: !!userId && !!emiId,
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreateShareLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (emiId: string) => EmiShareLinkService.createLink(emiId),
        onSuccess: (link) => {
            queryClient.setQueryData(emiShareLinkKeys.active(link.emiId), link);
            successToast('Share link created');
        },
        onError: (error: Error) => {
            errorToast(error.message || 'Failed to create share link');
        },
    });
};

export const useRevokeShareLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ linkId }: { linkId: string; emiId: string }) => EmiShareLinkService.revokeLink(linkId),
        onSuccess: (_data, { emiId }) => {
            queryClient.invalidateQueries({ queryKey: emiShareLinkKeys.active(emiId) });
            successToast('Share link revoked');
        },
        onError: (error: Error) => {
            errorToast(error.message || 'Failed to revoke share link');
        },
    });
};

/** Anonymous: deliberately not gated on a signed-in user. */
export const usePublicEmi = (token: string): UseQueryResult<IPublicEmi | null, Error> =>
    useQuery({
        queryKey: emiShareLinkKeys.publicEmi(token),
        queryFn: () => EmiShareLinkService.fetchPublicEmi(token),
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
