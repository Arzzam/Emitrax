import { describe, expect, it } from 'vitest';

import { CURRENCIES } from '@/utils/currencyRegistry';
import { getCurrencyMeta } from '@/utils/numberFormat';
import { formatAmountForInput, parseLocaleAmount } from '@/utils/parseAmount';

const MINUS = String.fromCharCode(0x2212);
const RIGHT_QUOTE = String.fromCharCode(0x2019);
const NBSP = String.fromCharCode(0xa0);

const parse = (raw: string, locale: string, fractionDigits = 2) => parseLocaleAmount(raw, { locale, fractionDigits });

describe('parseLocaleAmount - contract', () => {
    it('returns null for empty input and undefined for non-amounts', () => {
        expect(parse('', 'en-IN')).toBeNull();
        expect(parse('   ', 'en-IN')).toBeNull();
        expect(parse('abc', 'en-IN')).toBeUndefined();
        expect(parse('-', 'en-IN')).toBeUndefined();
        expect(parse('.', 'en-IN')).toBeUndefined();
        expect(parse('12-3', 'en-IN')).toBeUndefined();
    });

    it('keeps negatives for callers to judge', () => {
        expect(parse('-1,250.50', 'en-IN')).toBe(-1250.5);
        expect(parse(`${MINUS}1 250,50`, 'sv-SE')).toBe(-1250.5);
    });

    it('rounds to the currency fraction digits', () => {
        expect(parse('10.256', 'en-US')).toBe(10.26);
        expect(parse('1,234.6', 'en-JP', 0)).toBe(1235);
    });
});

describe('parseLocaleAmount - grouping', () => {
    it('reads Indian and Western grouping', () => {
        expect(parse('1,25,000', 'en-IN')).toBe(125000);
        expect(parse('12,34,567.89', 'en-IN')).toBe(1234567.89);
        expect(parse('1,234,567.89', 'en-US')).toBe(1234567.89);
    });

    it('reads European grouping', () => {
        expect(parse('1.234.567,89', 'de-DE')).toBe(1234567.89);
        expect(parse('1.234', 'de-DE')).toBe(1234);
        expect(parse('1 234 567,89', 'fr-FR')).toBe(1234567.89);
        expect(parse(`1${NBSP}234,5`, 'pl-PL')).toBe(1234.5);
    });

    it('reads Swiss apostrophes, straight or curly', () => {
        expect(parse("1'234.50", 'de-CH')).toBe(1234.5);
        expect(parse(`1${RIGHT_QUOTE}234.50`, 'de-CH')).toBe(1234.5);
        expect(parse("1'234", 'en-US')).toBeUndefined();
    });

    it('rejects malformed grouping instead of guessing', () => {
        expect(parse('1,2,3', 'en-US')).toBeUndefined();
        expect(parse('12,34,5', 'en-IN')).toBeUndefined();
    });
});

describe('parseLocaleAmount - the dangerous cases', () => {
    it('never reads a dot-decimal as thousands in a comma-decimal locale', () => {
        // Number-style habit: a German user typing 1234.56 means 1234.56, not 123456.
        expect(parse('1234.56', 'de-DE')).toBe(1234.56);
        expect(parse('1.5', 'de-DE')).toBe(1.5);
    });

    it('treats a lone comma that is not grouping as a decimal', () => {
        expect(parse('12,5', 'en-US')).toBe(12.5);
        expect(parse('12,50', 'en-IN')).toBe(12.5);
    });

    it('rejects US-style input in a German locale rather than mis-scaling it', () => {
        expect(parse('12,345.67', 'de-DE')).toBeUndefined();
    });

    it('rejects two decimal separators', () => {
        expect(parse('1.2.3', 'en-US')).toBeUndefined();
        expect(parse('1,2,3', 'de-DE')).toBeUndefined();
    });
});

describe('parseLocaleAmount - pasted currency text', () => {
    it('strips symbols, codes and abbreviations', () => {
        expect(parse('₹1,25,000', 'en-IN')).toBe(125000);
        expect(parse('Rs. 1,25,000', 'en-IN')).toBe(125000);
        expect(parse('INR 500', 'en-IN')).toBe(500);
        expect(parse('1.234,56 €', 'de-DE')).toBe(1234.56);
        expect(parse('1.234,56 kr.', 'da-DK')).toBe(1234.56);
        expect(parse("CHF-1'234.50", 'de-CH')).toBe(-1234.5);
    });
});

describe('formatAmountForInput', () => {
    it('groups in the locale and drops .00 on whole amounts', () => {
        expect(formatAmountForInput(125000, { locale: 'en-IN' })).toBe('1,25,000');
        expect(formatAmountForInput(1250.5, { locale: 'en-IN' })).toBe('1,250.50');
        expect(formatAmountForInput(1250.5, { locale: 'de-DE' })).toBe('1.250,50');
    });

    it('returns an empty string for missing or non-finite values', () => {
        expect(formatAmountForInput(null, { locale: 'en-IN' })).toBe('');
        expect(formatAmountForInput(undefined, { locale: 'en-IN' })).toBe('');
        expect(formatAmountForInput(Number.NaN, { locale: 'en-IN' })).toBe('');
    });

    it('round-trips through the parser for every currency in its default locale', () => {
        const samples = [0, 7, 1250.5, -1250.5, 125000, 1234567.89];
        CURRENCIES.forEach(({ code, defaultLocale }) => {
            const { fractionDigits } = getCurrencyMeta(code, defaultLocale);
            samples.forEach((sample) => {
                const options = { locale: defaultLocale, fractionDigits };
                const expected = Number(sample.toFixed(fractionDigits));
                expect(parseLocaleAmount(formatAmountForInput(sample, options), options), `${code} ${sample}`).toBe(
                    expected
                );
            });
        });
    });
});

describe('parseLocaleAmount - shorthand units', () => {
    it('reads Indian units', () => {
        expect(parse('1.5L', 'en-IN')).toBe(150000);
        expect(parse('1.5 lakh', 'en-IN')).toBe(150000);
        expect(parse('2cr', 'en-IN')).toBe(20000000);
        expect(parse('2.25 Crore', 'en-IN')).toBe(22500000);
    });

    it('reads Western units in any number style', () => {
        expect(parse('50k', 'en-US')).toBe(50000);
        expect(parse('1.2M', 'en-US')).toBe(1200000);
        expect(parse('3bn', 'en-GB')).toBe(3000000000);
        expect(parse('1.5L', 'en-US')).toBe(150000);
    });

    it("parses the number with the locale's own separators", () => {
        expect(parse('1,5L', 'de-DE')).toBe(150000);
        expect(parse('1,5 Mio.', 'de-DE')).toBe(1500000);
    });

    it('keeps the sign and tolerates a currency symbol', () => {
        expect(parse('-2k', 'en-IN')).toBe(-2000);
        expect(parse('₹1.5L', 'en-IN')).toBe(150000);
        expect(parse('$50k', 'en-US')).toBe(50000);
    });

    it('multiplies before rounding', () => {
        expect(parse('1.2345k', 'en-US')).toBe(1234.5);
    });

    it('does not mistake currency abbreviations for units', () => {
        expect(parse('50 kr', 'sv-SE')).toBe(50);
        expect(parse('Rs. 500', 'en-IN')).toBe(500);
    });

    it('rejects a unit with no number', () => {
        expect(parse('k', 'en-US')).toBeUndefined();
        expect(parse('lakh', 'en-IN')).toBeUndefined();
    });
});
