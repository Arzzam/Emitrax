import { describe, expect, it } from 'vitest';

import { CURRENCIES } from '@/utils/currencyRegistry';
import { buildExcelCurrencyNumFmt } from '@/utils/export/excel/excelNumFmt';

describe('buildExcelCurrencyNumFmt', () => {
    it('spells out lakh/crore grouping for Indian-style locales', () => {
        expect(buildExcelCurrencyNumFmt({ currency: 'INR', locale: 'en-IN' })).toBe(
            '[>=10000000]"₹"##\\,##\\,##\\,##0.00;[>=100000]"₹"##\\,##\\,##0.00;"₹"##,##0.00'
        );
        expect(buildExcelCurrencyNumFmt({ currency: 'NPR', locale: 'en-IN' })).toContain('[>=100000]"NPR "');
    });

    it('uses Western grouping elsewhere', () => {
        expect(buildExcelCurrencyNumFmt({ currency: 'USD', locale: 'en-US' })).toBe('"$"#,##0.00');
        expect(buildExcelCurrencyNumFmt({ currency: 'INR', locale: 'en-US' })).toBe('"₹"#,##0.00');
    });

    it('places a suffixed symbol after the number with its spacing', () => {
        expect(buildExcelCurrencyNumFmt({ currency: 'EUR', locale: 'de-DE' })).toBe('#,##0.00" €"');
    });

    it('keeps the space after a spaced prefix', () => {
        expect(buildExcelCurrencyNumFmt({ currency: 'CHF', locale: 'de-CH' })).toBe('"CHF "#,##0.00');
    });

    it('drops decimals for zero-decimal currencies', () => {
        expect(buildExcelCurrencyNumFmt({ currency: 'JPY', locale: 'en-JP' })).toBe('"¥"#,##0');
        expect(buildExcelCurrencyNumFmt({ currency: 'IDR', locale: 'id-ID' })).toBe('"Rp "#,##0');
    });

    it('builds a format for every registry currency in its default locale', () => {
        CURRENCIES.forEach(({ code, defaultLocale }) => {
            const numFmt = buildExcelCurrencyNumFmt({ currency: code, locale: defaultLocale });
            expect(numFmt, code).toMatch(/#,##0|##,##0/);
            expect(numFmt, code).not.toContain('undefined');
        });
    });
});
