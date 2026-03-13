import type { NumberFormatMode } from '@/types/account.types';
import { DEFAULT_ACCOUNT_PREFERENCES } from '@/types/account.types';

export type CurrencyPreferencesState = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
    isHydrated: boolean;
};

const initialState: CurrencyPreferencesState = {
    locale: DEFAULT_ACCOUNT_PREFERENCES.locale,
    currency: DEFAULT_ACCOUNT_PREFERENCES.currency,
    numberFormat: DEFAULT_ACCOUNT_PREFERENCES.numberFormat,
    isHydrated: false,
};

export type SetCurrencyPreferencesPayload = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

const currencyPreferencesModel = {
    state: initialState,
    reducers: {
        setPreferences: (_state: CurrencyPreferencesState, payload: SetCurrencyPreferencesPayload) => {
            return {
                locale: payload.locale,
                currency: payload.currency,
                numberFormat: payload.numberFormat,
                isHydrated: true,
            };
        },
        resetPreferences: () => {
            return initialState;
        },
    },
};

export default currencyPreferencesModel;
