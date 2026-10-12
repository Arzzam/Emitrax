import { describe, expect, it } from 'vitest';

import type { NumberFormatMode } from '@/types/account.types';
import { CURRENCIES, NUMBER_STYLE_LOCALES } from '@/utils/currencyRegistry';
import { fmt } from '@/utils/export/pdf/templates/shared';

// Glyphs NotoSans lacks, from checking the font's cmap against every output.
const NOT_IN_PDF_FONT = /[\u2212\u0e00-\u0e7f\u0600-\u06ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;
const MODES: NumberFormatMode[] = ['exact', 'compact_short', 'compact_long'];

describe('fmt (PDF amounts)', () => {
    it('keeps symbols the font can draw', () => {
        expect(fmt(1234.5, { locale: 'en-IN', currency: 'INR', numberFormat: 'exact' })).toBe('₹1,234.50');
    });

    it('falls back to the ISO code for the baht sign', () => {
        const text = fmt(1234.5, { locale: 'de-DE', currency: 'THB', numberFormat: 'exact' });
        expect(text).toContain('THB');
        expect(text).not.toContain('฿');
    });

    it('prints the Swedish and Norwegian minus as a hyphen', () => {
        expect(fmt(-1234.5, { locale: 'sv-SE', currency: 'SEK', numberFormat: 'exact' })).toMatch(/^-1/);
    });

    it('never emits a glyph the PDF font lacks, for any currency, number style or mode', () => {
        CURRENCIES.forEach(({ code }) =>
            NUMBER_STYLE_LOCALES.forEach((locale) =>
                MODES.forEach((numberFormat) => {
                    const text = fmt(-123456789.12, { locale, currency: code, numberFormat });
                    expect(text, `${code} ${locale} ${numberFormat}`).not.toMatch(NOT_IN_PDF_FONT);
                })
            )
        );
    });
});
