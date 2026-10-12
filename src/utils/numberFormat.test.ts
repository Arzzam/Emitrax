import { describe, expect, it } from 'vitest';

import type { NumberFormatMode } from '@/types/account.types';
import { CURRENCIES, getCurrencyDefinition, NUMBER_STYLE_LOCALES } from '@/utils/currencyRegistry';
import { formatCurrencyAmount, formatPercent, getCurrencyMeta } from '@/utils/numberFormat';

// Intl separates number and symbol with U+00A0 / U+202F; compare on plain spaces.
const normalizeSpaces = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ');

const format = (value: number, locale: string, currency: string, numberFormat: NumberFormatMode) =>
    normalizeSpaces(formatCurrencyAmount(value, { locale, currency, numberFormat }));

describe('formatCurrencyAmount - exact', () => {
    it('uses Indian grouping for en-IN', () => {
        expect(format(1234567.891, 'en-IN', 'INR', 'exact')).toBe('₹12,34,567.89');
    });

    it('takes decimal places from the currency, not a fixed 2', () => {
        expect(format(1234567.891, 'en-JP', 'JPY', 'exact')).toBe('¥1,234,568');
        expect(format(1234567.891, 'en-KR', 'KRW', 'exact')).toBe('₩1,234,568');
        expect(format(1234567.891, 'id-ID', 'IDR', 'exact')).toBe('Rp 1.234.568');
    });

    it('lets the locale place the symbol and choose separators', () => {
        expect(format(1234567.891, 'de-DE', 'EUR', 'exact')).toBe('1.234.567,89 €');
        expect(format(1234567.891, 'de-CH', 'CHF', 'exact')).toBe("CHF 1'234'567.89");
    });

    it('keeps two decimals on whole amounts', () => {
        expect(format(500, 'en-IN', 'INR', 'exact')).toBe('₹500.00');
    });
});

describe('formatCurrencyAmount - compact_short', () => {
    it('abbreviates with the locale short form', () => {
        expect(format(1234567.891, 'en-IN', 'INR', 'compact_short')).toBe('₹12.35L');
        expect(format(1234567.891, 'en-US', 'USD', 'compact_short')).toBe('$1.23M');
    });
});

describe('formatCurrencyAmount - compact_long', () => {
    it('spells out the unit, unlike compact_short', () => {
        expect(format(1234567.891, 'en-IN', 'INR', 'compact_long')).toBe('₹12.35 lakh');
        expect(format(123456789, 'en-IN', 'INR', 'compact_long')).toBe('₹12.35 crore');
        expect(format(1234567.891, 'en-US', 'USD', 'compact_long')).toBe('$1.23 million');
    });

    it('keeps a suffixed symbol after the number', () => {
        expect(format(1234567.891, 'de-DE', 'EUR', 'compact_long')).toBe('1,23 Millionen €');
    });

    it('keeps the sign in front of the symbol', () => {
        expect(format(-1234567.891, 'en-IN', 'INR', 'compact_long')).toBe('-₹12.35 lakh');
    });

    it('leaves amounts below a thousand unabbreviated', () => {
        expect(format(500, 'en-IN', 'INR', 'compact_long')).toBe('₹500');
    });
});

describe('formatCurrencyAmount - fallbacks', () => {
    it('returns N/A for non-finite values', () => {
        expect(format(Number.NaN, 'en-IN', 'INR', 'exact')).toBe('N/A');
        expect(format(Number.POSITIVE_INFINITY, 'en-IN', 'INR', 'compact_long')).toBe('N/A');
    });

    it('returns N/A for a currency Intl rejects', () => {
        expect(format(100, 'en-IN', 'RUPEES', 'exact')).toBe('N/A');
    });
});

describe('getCurrencyMeta', () => {
    it('reports symbol, decimals and position', () => {
        expect(getCurrencyMeta('INR', 'en-IN')).toEqual({ symbol: '₹', fractionDigits: 2, symbolPosition: 'prefix' });
        expect(getCurrencyMeta('EUR', 'de-DE')).toEqual({ symbol: '€', fractionDigits: 2, symbolPosition: 'suffix' });
        expect(getCurrencyMeta('JPY', 'en-JP')).toEqual({ symbol: '¥', fractionDigits: 0, symbolPosition: 'prefix' });
    });

    it('falls back to the code when Intl rejects the currency', () => {
        expect(getCurrencyMeta('RUPEES', 'en-IN')).toEqual({
            symbol: 'RUPEES',
            fractionDigits: 2,
            symbolPosition: 'prefix',
        });
    });
});

describe('currency registry', () => {
    // Intl.supportedValuesOf is ES2022; the app's TS lib is ES2020.
    const intl = Intl as unknown as { supportedValuesOf: (key: 'currency') => string[] };
    const supported = new Set(intl.supportedValuesOf('currency'));
    const modes: NumberFormatMode[] = ['exact', 'compact_short', 'compact_long'];
    // Arabic, Thai, CJK and Hangul have no glyphs in the PDF font.
    const unrenderableInPdf = /[\u0600-\u06ff\u0e00-\u0e7f\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;

    it('has unique codes, all known to Intl', () => {
        const codes = CURRENCIES.map((currency) => currency.code);
        expect(new Set(codes).size).toBe(codes.length);
        codes.forEach((code) => expect(supported.has(code), code).toBe(true));
    });

    it('offers every default locale in the number-style picker', () => {
        CURRENCIES.forEach((currency) => expect(NUMBER_STYLE_LOCALES, currency.code).toContain(currency.defaultLocale));
    });

    it('renders every currency in its default locale with Latin digits only', () => {
        CURRENCIES.forEach(({ code, defaultLocale }) => {
            modes.forEach((mode) => {
                const output = format(-123456789.12, defaultLocale, code, mode);
                expect(output, `${code} ${mode}`).not.toBe('N/A');
                expect(output, `${code} ${mode}`).toMatch(/[0-9]/);
                expect(output, `${code} ${mode}`).not.toMatch(unrenderableInPdf);
            });
        });
    });

    it('looks up a definition by code', () => {
        expect(getCurrencyDefinition('INR')?.defaultLocale).toBe('en-IN');
        expect(getCurrencyDefinition('XYZ')).toBeUndefined();
    });
});

describe('formatPercent', () => {
    it('localises the decimal separator and spacing', () => {
        expect(formatPercent(12.5, 'en-IN')).toBe('12.5%');
        expect(normalizeSpaces(formatPercent(12.5, 'de-DE'))).toBe('12,5 %');
    });

    it('fixes the places like toFixed when decimals is given', () => {
        expect(formatPercent(12, 'en-US', 2)).toBe('12.00%');
        expect(formatPercent(33.3333, 'en-US', 1)).toBe('33.3%');
    });

    it('drops trailing zeros without decimals', () => {
        expect(formatPercent(18, 'en-IN')).toBe('18%');
    });

    it('returns N/A for non-finite values', () => {
        expect(formatPercent(Number.NaN, 'en-IN')).toBe('N/A');
    });
});

describe('formatCurrencyAmount - currencyDisplay', () => {
    it('prints the ISO code when asked', () => {
        expect(
            normalizeSpaces(
                formatCurrencyAmount(1234.5, {
                    locale: 'de-DE',
                    currency: 'THB',
                    numberFormat: 'exact',
                    currencyDisplay: 'code',
                })
            )
        ).toBe('1.234,50 THB');
    });
});
