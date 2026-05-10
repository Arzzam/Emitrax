import { User } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/supabase/supabase';

import { useAccountDetails } from './useAccount';

export interface IDisplayUser {
    user: User | null;
    displayName: string | null;
}

export const useUser = () => {
    return useQuery({
        queryKey: ['user'],
        queryFn: () => getUser(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useDisplayUser = (): IDisplayUser => {
    const { data: userData } = useUser();
    const userId = userData?.user?.id;
    const { data: accountDetails } = useAccountDetails({ enabled: !!userId });
    return {
        user: userData?.user ?? null,
        displayName: accountDetails?.displayName ?? null,
    };
};

const getUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        throw error;
    }
    return data;
};

export const useLogin = () => {
    return useMutation({
        mutationFn: async () => {
            const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL;
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });
            if (error) throw error;
            return data;
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.resetQueries({ queryKey: ['user'] });
        },
    });
};
