import type { NumberFormatMode } from '@/types/account.types';

export type CurrencyFormatPreferences = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

export type CurrencyMeta = {
    symbol: string;
    /** The currency's minor units as Intl resolves them: 2 for INR, 0 for JPY. */
    fractionDigits: number;
    symbolPosition: 'prefix' | 'suffix';
};

const EMPTY_FALLBACK = 'N/A';
const COMPACT_MAX_FRACTION_DIGITS = 2;

function isInvalidNumber(value: number): boolean {
    return typeof value !== 'number' || !Number.isFinite(value);
}

/**
 * Constructing an Intl.NumberFormat is the expensive part, and the
 * credit-card grid formats hundreds of cells per render. A construction that
 * throws (unknown locale/currency) is never cached, so it keeps throwing.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getCachedFormatter(key: string, locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
    let formatter = formatterCache.get(key);
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale, options);
        formatterCache.set(key, formatter);
    }
    return formatter;
}

/** No fraction overrides: Intl applies the currency's own minor units (INR 2, JPY 0). */
function getExactFormatter(locale: string, currency: string): Intl.NumberFormat {
    return getCachedFormatter(`exact|${locale}|${currency}`, locale, { style: 'currency', currency });
}

function getCompactShortFormatter(locale: string, currency: string): Intl.NumberFormat {
    return getCachedFormatter(`compact_short|${locale}|${currency}`, locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: COMPACT_MAX_FRACTION_DIGITS,
    });
}

/** Decimal style on purpose - see formatCompactLong. */
function getCompactLongNumberFormatter(locale: string): Intl.NumberFormat {
    return getCachedFormatter(`compact_long_number|${locale}`, locale, {
        notation: 'compact',
        compactDisplay: 'long',
        minimumFractionDigits: 0,
        maximumFractionDigits: COMPACT_MAX_FRACTION_DIGITS,
    });
}

const NUMBER_PART_TYPES = new Set<Intl.NumberFormatPartTypes>(['integer', 'group', 'decimal', 'fraction']);

/**
 * Intl ignores `compactDisplay: 'long'` under `style: 'currency'` - both
 * modes print `₹12.35L`. So the number is compacted in decimal style
 * (`12.35 lakh`, `1,23 Millionen`) and wrapped in the sign and symbol taken
 * from the exact currency format, which keeps the locale's symbol position
 * and spacing (`-₹12.35 lakh`, `1,23 Millionen €`).
 */
function formatCompactLong(value: number, locale: string, currency: string): string {
    const parts = getExactFormatter(locale, currency).formatToParts(value);
    const firstNumberIndex = parts.findIndex((part) => NUMBER_PART_TYPES.has(part.type));
    let lastNumberIndex = parts.length - 1;
    while (lastNumberIndex > 0 && !NUMBER_PART_TYPES.has(parts[lastNumberIndex].type)) {
        lastNumberIndex -= 1;
    }

    const prefix = parts
        .slice(0, firstNumberIndex)
        .map((part) => part.value)
        .join('');
    const suffix = parts
        .slice(lastNumberIndex + 1)
        .map((part) => part.value)
        .join('');
    const compactNumber = getCompactLongNumberFormatter(locale).format(Math.abs(value));

    return `${prefix}${compactNumber}${suffix}`;
}

/**
 * Formats a numeric amount as currency using the user's locale, currency, and number-format preference.
 * Use for all currency/amount display across the app so behaviour stays consistent.
 */
export function formatCurrencyAmount(value: number, prefs: CurrencyFormatPreferences): string {
    if (isInvalidNumber(value)) {
        return EMPTY_FALLBACK;
    }
    try {
        switch (prefs.numberFormat) {
            case 'compact_short':
                return getCompactShortFormatter(prefs.locale, prefs.currency).format(value);
            case 'compact_long':
                return formatCompactLong(value, prefs.locale, prefs.currency);
            case 'exact':
            default:
                return getExactFormatter(prefs.locale, prefs.currency).format(value);
        }
    } catch {
        return EMPTY_FALLBACK;
    }
}

/**
 * Symbol, symbol position and decimal places for a currency in a locale.
 * Falls back to the ISO code, 2 decimals and a prefix when Intl rejects the pair.
 */
export function getCurrencyMeta(currency: string, locale: string): CurrencyMeta {
    try {
        const formatter = getExactFormatter(locale, currency);
        const parts = formatter.formatToParts(1);
        const currencyIndex = parts.findIndex((part) => part.type === 'currency');
        const integerIndex = parts.findIndex((part) => part.type === 'integer');

        return {
            symbol: parts[currencyIndex]?.value ?? currency,
            fractionDigits: formatter.resolvedOptions().maximumFractionDigits ?? 2,
            symbolPosition: currencyIndex > integerIndex ? 'suffix' : 'prefix',
        };
    } catch {
        return { symbol: currency, fractionDigits: 2, symbolPosition: 'prefix' };
    }
}
