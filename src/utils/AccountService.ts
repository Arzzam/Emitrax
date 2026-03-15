import { ADVANCED_FILTER_DEFAULTS, type IAdvancedFilterState } from '@/modules/filter/filter.types';
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
    filter_config: string | null;
};

function parseFilterConfig(raw: Record<string, unknown> | null): IAdvancedFilterState | null {
    if (!raw || typeof raw !== 'object') return null;
    try {
        return {
            ...ADVANCED_FILTER_DEFAULTS,
            ...raw,
            searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery : ADVANCED_FILTER_DEFAULTS.searchQuery,
            status:
                raw.status === 'all' ||
                raw.status === 'active' ||
                raw.status === 'completed' ||
                raw.status === 'archived'
                    ? raw.status
                    : ADVANCED_FILTER_DEFAULTS.status,
            tag: typeof raw.tag === 'string' ? raw.tag : ADVANCED_FILTER_DEFAULTS.tag,
            sortBy:
                typeof raw.sortBy === 'string' &&
                [
                    'name',
                    'balance',
                    'dateAdded',
                    'updated',
                    'principal',
                    'totalLoan',
                    'emi',
                    'tenure',
                    'endDate',
                    'billDate',
                ].includes(raw.sortBy)
                    ? (raw.sortBy as IAdvancedFilterState['sortBy'])
                    : ADVANCED_FILTER_DEFAULTS.sortBy,
            sortOrder:
                raw.sortOrder === 'asc' || raw.sortOrder === 'desc'
                    ? raw.sortOrder
                    : ADVANCED_FILTER_DEFAULTS.sortOrder,
            principalMin:
                typeof raw.principalMin === 'number'
                    ? raw.principalMin
                    : raw.principalMin === null
                      ? null
                      : ADVANCED_FILTER_DEFAULTS.principalMin,
            principalMax:
                typeof raw.principalMax === 'number'
                    ? raw.principalMax
                    : raw.principalMax === null
                      ? null
                      : ADVANCED_FILTER_DEFAULTS.principalMax,
            totalLoanMin:
                typeof raw.totalLoanMin === 'number'
                    ? raw.totalLoanMin
                    : raw.totalLoanMin === null
                      ? null
                      : ADVANCED_FILTER_DEFAULTS.totalLoanMin,
            totalLoanMax:
                typeof raw.totalLoanMax === 'number'
                    ? raw.totalLoanMax
                    : raw.totalLoanMax === null
                      ? null
                      : ADVANCED_FILTER_DEFAULTS.totalLoanMax,
            billDateFrom:
                typeof raw.billDateFrom === 'string' || raw.billDateFrom === null
                    ? raw.billDateFrom
                    : ADVANCED_FILTER_DEFAULTS.billDateFrom,
            billDateTo:
                typeof raw.billDateTo === 'string' || raw.billDateTo === null
                    ? raw.billDateTo
                    : ADVANCED_FILTER_DEFAULTS.billDateTo,
            endDateFrom:
                typeof raw.endDateFrom === 'string' || raw.endDateFrom === null
                    ? raw.endDateFrom
                    : ADVANCED_FILTER_DEFAULTS.endDateFrom,
            endDateTo:
                typeof raw.endDateTo === 'string' || raw.endDateTo === null
                    ? raw.endDateTo
                    : ADVANCED_FILTER_DEFAULTS.endDateTo,
            createdAtFrom:
                typeof raw.createdAtFrom === 'string' || raw.createdAtFrom === null
                    ? raw.createdAtFrom
                    : ADVANCED_FILTER_DEFAULTS.createdAtFrom,
            createdAtTo:
                typeof raw.createdAtTo === 'string' || raw.createdAtTo === null
                    ? raw.createdAtTo
                    : ADVANCED_FILTER_DEFAULTS.createdAtTo,
            shareFilter:
                raw.shareFilter === 'all' ||
                raw.shareFilter === 'owned' ||
                raw.shareFilter === 'shared' ||
                raw.shareFilter === 'sharedWithMe'
                    ? raw.shareFilter
                    : ADVANCED_FILTER_DEFAULTS.shareFilter,
            sharedWithUserIds: Array.isArray(raw.sharedWithUserIds)
                ? (raw.sharedWithUserIds as unknown[]).filter((x): x is string => typeof x === 'string')
                : ADVANCED_FILTER_DEFAULTS.sharedWithUserIds,
            splitWithParticipantKeys: Array.isArray(raw.splitWithParticipantKeys)
                ? (raw.splitWithParticipantKeys as unknown[])
                      .filter((x): x is string => typeof x === 'string')
                      .filter((x) => x !== '__me__')
                : ADVANCED_FILTER_DEFAULTS.splitWithParticipantKeys,
        };
    } catch {
        return null;
    }
}

/** Parse filter_config column (JSON string) into typed state. */
function parseFilterConfigFromString(json: string | null): IAdvancedFilterState | null {
    if (json == null || json.trim() === '') return null;
    try {
        const raw = JSON.parse(json) as unknown;
        return parseFilterConfig(typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null);
    } catch {
        return null;
    }
}

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
            .select('user_id, phone, avatar_url, locale, currency, number_format, filter_config')
            .eq('user_id', userId)
            .maybeSingle<UserAccountPreferenceRow>();

        if (preferencesError) {
            throw new Error('Unable to load your account details.');
        }

        const filterConfig = parseFilterConfigFromString(preferences?.filter_config ?? null);

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
                filterConfig: filterConfig ?? DEFAULT_ACCOUNT_PREFERENCES.filterConfig,
            },
        };
    }

    static async saveFilterConfig(filterConfig: IAdvancedFilterState): Promise<void> {
        const userId = await AccountService.getCurrentUserId();

        const { error } = await supabase
            .from('user_account_preferences')
            .update({ filter_config: JSON.stringify(filterConfig) })
            .eq('user_id', userId);

        if (error) {
            throw new Error('Unable to save filter preferences.');
        }
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
