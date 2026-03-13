import { supabase } from '@/supabase/supabase';
import {
    AccountDetails,
    AccountUpdatePayload,
    DEFAULT_ACCOUNT_PREFERENCES,
    NumberFormatMode,
} from '@/types/account.types';

type UserProfileRow = {
    id: string;
    email: string | null;
    display_name: string | null;
    number_format: NumberFormatMode;
};

type UserAccountPreferenceRow = {
    user_id: string;
    phone: string | null;
    avatar_url: string | null;
    locale: string;
    currency: string;
    number_format: NumberFormatMode;
};

const trimToNull = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export class AccountService {
    private static async getCurrentUserId(): Promise<string> {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            throw new Error('Unable to verify your account session.');
        }

        const userId = data.user?.id;
        if (!userId) {
            throw new Error('Please login to manage account settings.');
        }

        return userId;
    }

    static async getAccountDetails(): Promise<AccountDetails> {
        const userId = await AccountService.getCurrentUserId();

        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, email, display_name')
            .eq('id', userId)
            .single<UserProfileRow>();

        if (profileError || !profile) {
            throw new Error('Unable to load your profile details.');
        }

        const { data: preferences, error: preferencesError } = await supabase
            .from('user_account_preferences')
            .select('user_id, phone, avatar_url, locale, currency, number_format')
            .eq('user_id', userId)
            .maybeSingle<UserAccountPreferenceRow>();

        if (preferencesError) {
            throw new Error('Unable to load your account details.');
        }

        return {
            id: profile.id,
            email: profile.email || '',
            displayName: profile.display_name,
            preferences: {
                phone: preferences?.phone ?? DEFAULT_ACCOUNT_PREFERENCES.phone,
                avatarUrl: preferences?.avatar_url ?? DEFAULT_ACCOUNT_PREFERENCES.avatarUrl,
                locale: preferences?.locale ?? DEFAULT_ACCOUNT_PREFERENCES.locale,
                currency: preferences?.currency ?? DEFAULT_ACCOUNT_PREFERENCES.currency,
                numberFormat: preferences?.number_format ?? DEFAULT_ACCOUNT_PREFERENCES.numberFormat,
            },
        };
    }

    static async upsertAccountDetails(payload: AccountUpdatePayload): Promise<AccountDetails> {
        const userId = await AccountService.getCurrentUserId();

        const profileUpdate = {
            id: userId,
            display_name: trimToNull(payload.displayName),
        };

        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert(profileUpdate, { onConflict: 'id' });

        if (profileError) {
            throw new Error('Unable to save your profile details.');
        }

        const preferencesUpdate = {
            user_id: userId,
            phone: trimToNull(payload.phone),
            avatar_url: trimToNull(payload.avatarUrl),
            locale: payload.locale.trim() || DEFAULT_ACCOUNT_PREFERENCES.locale,
            currency: payload.currency.trim().toUpperCase() || DEFAULT_ACCOUNT_PREFERENCES.currency,
            number_format: payload.numberFormat,
        };

        const { error: preferencesError } = await supabase
            .from('user_account_preferences')
            .upsert(preferencesUpdate, { onConflict: 'user_id' });

        if (preferencesError) {
            throw new Error('Unable to save your account details.');
        }

        return AccountService.getAccountDetails();
    }
}
