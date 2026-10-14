import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useNumberStyleOverride } from '@/context/NumberStyleProvider/numberStyleProvider';
import { IRootState } from '@/store/types/store.types';
import { getTaxLabels } from '@/utils/currencyRegistry';
import {
    formatCurrencyAmount as formatCurrencyAmountWithPrefs,
    formatPercent as formatPercentWithLocale,
    getCurrencyMeta,
} from '@/utils/numberFormat';
import { formatAmountForInput, parseLocaleAmount } from '@/utils/parseAmount';

/**
 * Returns currency preferences from the Redux store and a formatter that uses them.
 * Use this instead of passing prefs through props; preferences are hydrated on app load
 * and updated when account settings are saved.
 */
export function useCurrencyPreferences(currencyOverride?: string | null) {
    const stored = useSelector((state: IRootState) => state.currencyPreferencesModel);
    // A NumberStyleProvider (the public share page) replaces the stored style.
    const styleOverride = useNumberStyleOverride();
    const accountCurrency = stored.currency;
    const locale = styleOverride?.locale ?? stored.locale;
    const numberFormat = styleOverride?.numberFormat ?? stored.numberFormat;
    // An EMI-scoped screen passes the loan's own currency: it decides the
    // symbol, decimals and tax label. The number style stays the account's.
    const currency = currencyOverride || accountCurrency;

    const {
        symbol: currencySymbol,
        fractionDigits,
        symbolPosition,
    } = useMemo(() => getCurrencyMeta(currency, locale), [currency, locale]);

    const taxLabels = useMemo(() => getTaxLabels(currency), [currency]);

    const formatCurrencyAmount = useCallback(
        (value: number) => formatCurrencyAmountWithPrefs(value, { locale, currency, numberFormat }),
        [locale, currency, numberFormat]
    );

    /**
     * Hover text for a headline amount: the exact figure when a compact format
     * is active (`₹12.35L` -> `₹12,34,567.89`), otherwise undefined (no title).
     */
    const amountTitle = useCallback(
        (value: number) =>
            numberFormat === 'exact'
                ? undefined
                : formatCurrencyAmountWithPrefs(value, { locale, currency, numberFormat: 'exact' }),
        [locale, currency, numberFormat]
    );

    /** A 0-100 percentage in the user's locale; `decimals` fixes the places like `toFixed`. */
    const formatPercent = useCallback(
        (value: number, decimals?: number) => formatPercentWithLocale(value, locale, decimals),
        [locale]
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
        /** The account default, even when `currency` is an EMI override. */
        accountCurrency,
        numberFormat,
        currencySymbol,
        fractionDigits,
        symbolPosition,
        taxLabels,
        formatCurrencyAmount,
        amountTitle,
        formatPercent,
        parseAmountInput,
        formatAmountInput,
    };
}
