import type { IAdvancedFilterState } from '@/modules/filter/filter.types';

export type NumberFormatMode = 'exact' | 'compact_short' | 'compact_long';

export type AccountPreferences = {
    phone: string | null;
    avatarUrl: string | null;
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
    /** Saved advanced filter state; null when not set or after reset. */
    filterConfig: IAdvancedFilterState | null;
};

export type AccountProfile = {
    id: string;
    email: string;
    displayName: string | null;
};

export type AccountDetails = AccountProfile & {
    preferences: AccountPreferences;
};

export type AccountUpdatePayload = {
    displayName: string;
    phone: string;
    avatarUrl: string;
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
    phone: null,
    avatarUrl: null,
    locale: 'en-IN',
    currency: 'INR',
    numberFormat: 'exact',
    filterConfig: null,
};
