/**
 * Locale-aware amount parsing for text inputs.
 *
 * `Number(raw)` rejects a pasted `1,25,000` and - worse - reads a German
 * `1.234,56` as 1.234, silently. This parser reads the locale's own group and
 * decimal separators, and when a string is ambiguous it REJECTS rather than
 * guesses: a wrong amount that looks right is worse than a refused one.
 *
 * Contract (shared by every caller): a number, `null` for empty input, and
 * `undefined` for input that is not an amount. Negatives are returned as-is;
 * callers that forbid them check the sign themselves.
 *
 * See context/plan/currency-and-number-formatting-plan.md §5.
 */

type Separators = { group: string; decimal: string };

const separatorCache = new Map<string, Separators>();

function getSeparators(locale: string): Separators {
    const cached = separatorCache.get(locale);
    if (cached) return cached;

    let separators: Separators = { group: ',', decimal: '.' };
    try {
        const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
        separators = {
            group: parts.find((part) => part.type === 'group')?.value ?? ',',
            decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
        };
    } catch {
        // Unknown locale: fall through to `,` / `.`.
    }
    separatorCache.set(locale, separators);
    return separators;
}

const APOSTROPHE = /['\u2019]/;
const APOSTROPHES = /['\u2019]/g;
const isApostrophe = (char: string) => APOSTROPHE.test(char);

/**
 * Western (`1,234,567`) and Indian (`12,34,567`) grouping both pass: a 1-3
 * digit lead, then 2-3 digit groups, ending on exactly 3. Anything else is
 * not grouping - `1.5` in de-DE is a decimal typed with a dot, not 1500.
 */
function isValidGrouping(groups: string[]): boolean {
    const [lead, ...rest] = groups;
    return (
        rest.length > 0 &&
        /^\d{1,3}$/.test(lead) &&
        rest.every((group) => /^\d{2,3}$/.test(group)) &&
        /^\d{3}$/.test(rest[rest.length - 1])
    );
}

function roundTo(value: number, fractionDigits: number): number {
    const factor = 10 ** fractionDigits;
    const rounded = Math.round(value * factor) / factor;
    return rounded === 0 ? 0 : rounded; // no -0
}

export function parseLocaleAmount(
    raw: string,
    { locale, fractionDigits = 2 }: { locale: string; fractionDigits?: number }
): number | null | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const { group, decimal } = getSeparators(locale);
    const other = decimal === '.' ? ',' : '.';

    // Drop currency symbols (₹ $ €), codes and abbreviations with a trailing
    // dot (INR, Rs., kr.), and all whitespace - which also removes the
    // space-style group separators of fr-FR, sv-SE, pl-PL and en-ZA.
    let text = trimmed
        .replace(/\p{Sc}/gu, '')
        .replace(/\p{L}+\.?/gu, '')
        .replace(/\s/g, '');

    let sign = '';
    if (/^[-\u2212]/.test(text)) {
        sign = '-';
        text = text.slice(1);
    }

    // Apostrophes group digits only where the locale says so (de-CH).
    if (APOSTROPHE.test(text)) {
        if (!isApostrophe(group)) return undefined;
        text = text.replace(APOSTROPHES, "'");
    }
    if (!/^[\d.,']+$/.test(text)) return undefined;

    const groupChars = new Set<string>(["'"]);
    if (group === '.' || group === ',') groupChars.add(group);
    const splitGroups = (integer: string) => integer.split(new RegExp(`[${[...groupChars].join('')}]`));
    const hasGroupChar = (integer: string) => [...integer].some((char) => groupChars.has(char));

    let integerPart: string;
    let fractionPart = '';

    const decimalCount = text.split(decimal).length - 1;
    if (decimalCount > 1) return undefined;

    if (decimalCount === 1) {
        [integerPart, fractionPart] = text.split(decimal);
        if (!/^\d*$/.test(fractionPart)) return undefined;
    } else {
        integerPart = text;
        const otherCount = text.split(other).length - 1;
        // A lone foreign separator that is not valid grouping is a decimal
        // typed the other way: `1234.5` in de-DE, `12,5` in en-US.
        if (otherCount === 1 && !(groupChars.has(other) && isValidGrouping(splitGroups(text)))) {
            [integerPart, fractionPart] = text.split(other);
            if (!/^\d*$/.test(integerPart) || !/^\d+$/.test(fractionPart)) return undefined;
        }
    }

    if (hasGroupChar(integerPart)) {
        const groups = splitGroups(integerPart);
        if (!isValidGrouping(groups)) return undefined;
        integerPart = groups.join('');
    }
    if (!/^\d*$/.test(integerPart) || (!integerPart && !fractionPart)) return undefined;

    const value = Number(`${sign}${integerPart || '0'}.${fractionPart || '0'}`);
    return Number.isFinite(value) ? roundTo(value, fractionDigits) : undefined;
}

const inputFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * An amount as an editable input value: grouped in the user's locale, no
 * currency symbol, and no `.00` on whole amounts (`1,25,000`, `1.234,5`).
 * Round-trips through parseLocaleAmount.
 */
export function formatAmountForInput(
    value: number | null | undefined,
    { locale, fractionDigits = 2 }: { locale: string; fractionDigits?: number }
): string {
    if (value == null || !Number.isFinite(value)) return '';

    const digits = Number.isInteger(value) ? 0 : fractionDigits;
    const key = `${locale}|${digits}`;
    let formatter = inputFormatterCache.get(key);
    if (!formatter) {
        try {
            formatter = new Intl.NumberFormat(locale, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            });
        } catch {
            return String(value);
        }
        inputFormatterCache.set(key, formatter);
    }
    return formatter.format(value);
}
