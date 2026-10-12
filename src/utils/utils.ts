import { supabase } from '@/supabase/supabase';

export const exchange = async (token: string) => {
    const { data } = await supabase.auth.getUser(token);

    return data?.user;
};

export const getFormattedDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};
