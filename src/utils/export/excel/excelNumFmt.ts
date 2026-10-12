import { getCurrencyMeta } from '@/utils/numberFormat';

/**
 * Excel number formats for currency cells.
 *
 * Excel renders a format's `,` and `.` with the VIEWER's own separators, so
 * the pattern always uses them literally; what the pattern does control is
 * the symbol, its position and spacing, the decimal places, and the grouping
 * shape (Western 1,234,567 vs Indian 12,34,567).
 */

/** True when the locale groups like 12,34,56,789 (lakh/crore). */
function usesIndianGrouping(locale: string): boolean {
    try {
        const groups = new Intl.NumberFormat(locale).format(123456789).split(/\D+/);
        return groups.slice(1, -1).some((group) => group.length === 2);
    } catch {
        return false;
    }
}

/** Whether the locale puts a space between the symbol and the number (`Rp 1.234`, `1.234 €`). */
function hasSymbolSpacing(currency: string, locale: string): boolean {
    try {
        const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(1);
        const currencyIndex = parts.findIndex((part) => part.type === 'currency');
        const neighbours = [parts[currencyIndex - 1], parts[currencyIndex + 1]];
        return neighbours.some((part) => part?.type === 'literal' && /\s/.test(part.value));
    } catch {
        return false;
    }
}

export function buildExcelCurrencyNumFmt({ currency, locale }: { currency: string; locale: string }): string {
    const { symbol, fractionDigits, symbolPosition } = getCurrencyMeta(currency, locale);
    const space = hasSymbolSpacing(currency, locale) ? ' ' : '';
    const quoted = symbol.replace(/"/g, '""');
    const prefix = symbolPosition === 'prefix' ? `"${quoted}${space}"` : '';
    const suffix = symbolPosition === 'suffix' ? `"${space}${quoted}"` : '';
    const decimals = fractionDigits > 0 ? `.${'0'.repeat(fractionDigits)}` : '';

    const pattern = (integer: string) => `${prefix}${integer}${decimals}${suffix}`;

    if (usesIndianGrouping(locale)) {
        // Excel has no lakh grouping, so it is spelled out per magnitude with
        // conditional sections (crore, lakh, then plain thousands).
        return [
            `[>=10000000]${pattern('##\\,##\\,##\\,##0')}`,
            `[>=100000]${pattern('##\\,##\\,##0')}`,
            pattern('##,##0'),
        ].join(';');
    }
    return pattern('#,##0');
}
