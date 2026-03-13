import type { NumberFormatMode } from '@/types/account.types';

export type CurrencyFormatPreferences = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

const EMPTY_FALLBACK = 'N/A';

function isInvalidNumber(value: number): boolean {
    return typeof value !== 'number' || !Number.isFinite(value);
}

function getIntlOptions(_locale: string, currency: string, numberFormat: NumberFormatMode): Intl.NumberFormatOptions {
    const base: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    switch (numberFormat) {
        case 'compact_short':
            return { ...base, notation: 'compact', compactDisplay: 'short' };
        case 'compact_long':
            return { ...base, notation: 'compact', compactDisplay: 'long' };
        case 'exact':
        default:
            return { ...base, notation: 'standard', minimumFractionDigits: 2, maximumFractionDigits: 2 };
    }
}

/**
 * Formats a numeric amount as currency using the user's locale, currency, and number-format preference.
 * Use for all currency/amount display across the app so behaviour stays consistent.
 */
export function formatCurrencyAmount(value: number, prefs: CurrencyFormatPreferences): string {
    if (isInvalidNumber(value)) {
        return EMPTY_FALLBACK;
    }
    const options = getIntlOptions(prefs.locale, prefs.currency, prefs.numberFormat);
    try {
        return new Intl.NumberFormat(prefs.locale, options).format(value);
    } catch {
        return EMPTY_FALLBACK;
    }
}
