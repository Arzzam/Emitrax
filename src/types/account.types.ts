export type AccountPreferences = {
    phone: string | null;
    avatarUrl: string | null;
    locale: string;
    currency: string;
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
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
    phone: null,
    avatarUrl: null,
    locale: 'en-IN',
    currency: 'INR',
};
