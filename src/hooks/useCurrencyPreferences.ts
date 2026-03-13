import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { IRootState } from '@/store/types/store.types';
import { formatCurrencyAmount as formatCurrencyAmountWithPrefs } from '@/utils/numberFormat';

/**
 * Returns currency preferences from the Redux store and a formatter that uses them.
 * Use this instead of passing prefs through props; preferences are hydrated on app load
 * and updated when account settings are saved.
 */
export function useCurrencyPreferences() {
    const { locale, currency, numberFormat } = useSelector((state: IRootState) => state.currencyPreferencesModel);

    const formatCurrencyAmount = useCallback(
        (value: number) => formatCurrencyAmountWithPrefs(value, { locale, currency, numberFormat }),
        [locale, currency, numberFormat]
    );

    return {
        locale,
        currency,
        numberFormat,
        formatCurrencyAmount,
    };
}
