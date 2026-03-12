import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AccountUpdatePayload } from '@/types/account.types';
import { AccountService } from '@/utils/AccountService';

export const ACCOUNT_QUERY_KEY = ['account'];

export const useAccountDetails = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery({
        queryKey: ACCOUNT_QUERY_KEY,
        enabled,
        queryFn: () => AccountService.getAccountDetails(),
        staleTime: 1000 * 60 * 5,
    });
};

export const useUpsertAccountDetails = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: AccountUpdatePayload) => AccountService.upsertAccountDetails(payload),
        onSuccess: (data) => {
            queryClient.setQueryData(ACCOUNT_QUERY_KEY, data);
            queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
        },
    });
};
