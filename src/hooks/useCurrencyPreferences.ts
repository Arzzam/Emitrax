import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { IRootState } from '@/store/types/store.types';
import { formatCurrencyAmount as formatCurrencyAmountWithPrefs, getCurrencyMeta } from '@/utils/numberFormat';
import { formatAmountForInput, parseLocaleAmount } from '@/utils/parseAmount';

/**
 * Returns currency preferences from the Redux store and a formatter that uses them.
 * Use this instead of passing prefs through props; preferences are hydrated on app load
 * and updated when account settings are saved.
 */
export function useCurrencyPreferences() {
    const { locale, currency, numberFormat } = useSelector((state: IRootState) => state.currencyPreferencesModel);

    const {
        symbol: currencySymbol,
        fractionDigits,
        symbolPosition,
    } = useMemo(() => getCurrencyMeta(currency, locale), [currency, locale]);

    const formatCurrencyAmount = useCallback(
        (value: number) => formatCurrencyAmountWithPrefs(value, { locale, currency, numberFormat }),
        [locale, currency, numberFormat]
    );

    /** Reads typed or pasted amount text: a number, `null` when empty, `undefined` when not an amount. */
    const parseAmountInput = useCallback(
        (raw: string) => parseLocaleAmount(raw, { locale, fractionDigits }),
        [locale, fractionDigits]
    );

    /** An amount as editable input text: grouped, no symbol, no `.00` on whole amounts. */
    const formatAmountInput = useCallback(
        (value: number | null | undefined) => formatAmountForInput(value, { locale, fractionDigits }),
        [locale, fractionDigits]
    );

    return {
        locale,
        currency,
        numberFormat,
        currencySymbol,
        fractionDigits,
        symbolPosition,
        formatCurrencyAmount,
        parseAmountInput,
        formatAmountInput,
    };
}
