/**
 * The curated set of display currencies and number styles.
 *
 * Deliberately not all ~160 ISO codes: every entry here must render in the
 * PDF font (NotoSans) and be previewable in settings. Decimal places are NOT
 * stored - they come from Intl (see getCurrencyMeta in numberFormat.ts).
 *
 * Every default locale must produce Latin digits and Latin/currency-symbol
 * text in all three number-format modes. That is why JPY pairs with en-JP and
 * THB with en-TH rather than ja-JP / th-TH. Enforced in numberFormat.test.ts.
 *
 * See context/plan/currency-and-number-formatting-plan.md §3-4.
 */

import type { NumberFormatMode } from '@/types/account.types';
import { getCurrencyMeta } from '@/utils/numberFormat';

export type CurrencyGroup = 'south_asia' | 'middle_east' | 'americas' | 'europe' | 'asia_pacific' | 'africa';

export type CurrencyDefinition = {
    code: string;
    label: string;
    group: CurrencyGroup;
    /** Pinned to the top of the picker. */
    isPopular: boolean;
    /** Locale auto-selected when the user picks this currency. */
    defaultLocale: string;
    /** ISO 3166 regions whose browser locale defaults to this currency. */
    regions: readonly string[];
    /** Label for the tax-on-interest field. Display only; data stays in `gst`. */
    taxLabel: string;
};

export const CURRENCY_GROUP_LABELS: Record<CurrencyGroup, string> = {
    south_asia: 'South Asia',
    middle_east: 'Gulf / Middle East',
    americas: 'Americas',
    europe: 'Europe',
    asia_pacific: 'Asia-Pacific',
    africa: 'Africa',
};

const EUROZONE_REGIONS = [
    'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
    'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
] as const; // prettier-ignore

export const CURRENCIES: readonly CurrencyDefinition[] = [
    // South Asia - BDT and NPR count in lakh/crore, so they take Indian grouping.
    { code: 'INR', label: 'Indian Rupee', group: 'south_asia', isPopular: true, defaultLocale: 'en-IN', regions: ['IN'], taxLabel: 'GST' },
    { code: 'PKR', label: 'Pakistani Rupee', group: 'south_asia', isPopular: false, defaultLocale: 'en-PK', regions: ['PK'], taxLabel: 'GST' },
    { code: 'BDT', label: 'Bangladeshi Taka', group: 'south_asia', isPopular: false, defaultLocale: 'en-IN', regions: ['BD'], taxLabel: 'VAT' },
    { code: 'LKR', label: 'Sri Lankan Rupee', group: 'south_asia', isPopular: false, defaultLocale: 'en-LK', regions: ['LK'], taxLabel: 'VAT' },
    { code: 'NPR', label: 'Nepalese Rupee', group: 'south_asia', isPopular: false, defaultLocale: 'en-IN', regions: ['NP'], taxLabel: 'VAT' },

    { code: 'AED', label: 'UAE Dirham', group: 'middle_east', isPopular: true, defaultLocale: 'en-AE', regions: ['AE'], taxLabel: 'VAT' },
    { code: 'SAR', label: 'Saudi Riyal', group: 'middle_east', isPopular: false, defaultLocale: 'en-SA', regions: ['SA'], taxLabel: 'VAT' },
    { code: 'QAR', label: 'Qatari Riyal', group: 'middle_east', isPopular: false, defaultLocale: 'en-QA', regions: ['QA'], taxLabel: 'Tax' },

    { code: 'USD', label: 'US Dollar', group: 'americas', isPopular: true, defaultLocale: 'en-US', regions: ['US'], taxLabel: 'Sales tax' },
    { code: 'CAD', label: 'Canadian Dollar', group: 'americas', isPopular: false, defaultLocale: 'en-CA', regions: ['CA'], taxLabel: 'GST' },
    { code: 'BRL', label: 'Brazilian Real', group: 'americas', isPopular: false, defaultLocale: 'pt-BR', regions: ['BR'], taxLabel: 'Tax' },
    { code: 'MXN', label: 'Mexican Peso', group: 'americas', isPopular: false, defaultLocale: 'es-MX', regions: ['MX'], taxLabel: 'IVA' },

    { code: 'EUR', label: 'Euro', group: 'europe', isPopular: true, defaultLocale: 'de-DE', regions: EUROZONE_REGIONS, taxLabel: 'VAT' },
    { code: 'GBP', label: 'British Pound', group: 'europe', isPopular: true, defaultLocale: 'en-GB', regions: ['GB'], taxLabel: 'VAT' },
    { code: 'CHF', label: 'Swiss Franc', group: 'europe', isPopular: false, defaultLocale: 'de-CH', regions: ['CH', 'LI'], taxLabel: 'VAT' },
    { code: 'SEK', label: 'Swedish Krona', group: 'europe', isPopular: false, defaultLocale: 'sv-SE', regions: ['SE'], taxLabel: 'VAT' },
    { code: 'NOK', label: 'Norwegian Krone', group: 'europe', isPopular: false, defaultLocale: 'nb-NO', regions: ['NO'], taxLabel: 'VAT' },
    { code: 'DKK', label: 'Danish Krone', group: 'europe', isPopular: false, defaultLocale: 'da-DK', regions: ['DK'], taxLabel: 'VAT' },
    { code: 'PLN', label: 'Polish Zloty', group: 'europe', isPopular: false, defaultLocale: 'pl-PL', regions: ['PL'], taxLabel: 'VAT' },

    { code: 'SGD', label: 'Singapore Dollar', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-SG', regions: ['SG'], taxLabel: 'GST' },
    { code: 'MYR', label: 'Malaysian Ringgit', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-MY', regions: ['MY'], taxLabel: 'SST' },
    { code: 'IDR', label: 'Indonesian Rupiah', group: 'asia_pacific', isPopular: false, defaultLocale: 'id-ID', regions: ['ID'], taxLabel: 'VAT' },
    { code: 'THB', label: 'Thai Baht', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-TH', regions: ['TH'], taxLabel: 'VAT' },
    { code: 'PHP', label: 'Philippine Peso', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-PH', regions: ['PH'], taxLabel: 'VAT' },
    { code: 'JPY', label: 'Japanese Yen', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-JP', regions: ['JP'], taxLabel: 'Consumption tax' },
    { code: 'KRW', label: 'South Korean Won', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-KR', regions: ['KR'], taxLabel: 'VAT' },
    { code: 'HKD', label: 'Hong Kong Dollar', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-HK', regions: ['HK'], taxLabel: 'Tax' },
    { code: 'AUD', label: 'Australian Dollar', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-AU', regions: ['AU'], taxLabel: 'GST' },
    { code: 'NZD', label: 'New Zealand Dollar', group: 'asia_pacific', isPopular: false, defaultLocale: 'en-NZ', regions: ['NZ'], taxLabel: 'GST' },

    { code: 'ZAR', label: 'South African Rand', group: 'africa', isPopular: false, defaultLocale: 'en-ZA', regions: ['ZA'], taxLabel: 'VAT' },
    { code: 'NGN', label: 'Nigerian Naira', group: 'africa', isPopular: false, defaultLocale: 'en-NG', regions: ['NG'], taxLabel: 'VAT' },
    { code: 'KES', label: 'Kenyan Shilling', group: 'africa', isPopular: false, defaultLocale: 'en-KE', regions: ['KE'], taxLabel: 'VAT' },
] as const; // prettier-ignore

/**
 * Every locale the number-style picker can hold: the hand-picked styles plus
 * every currency's default locale, so auto-linking a currency never selects a
 * locale the picker cannot show.
 */
const EXTRA_NUMBER_STYLE_LOCALES = ['en-IN', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'de-CH', 'es-ES', 'pt-BR', 'en-AE'];

export const NUMBER_STYLE_LOCALES: readonly string[] = Array.from(
    new Set([...EXTRA_NUMBER_STYLE_LOCALES, ...CURRENCIES.map((currency) => currency.defaultLocale)])
);

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code, currency]));

export function getCurrencyDefinition(code: string): CurrencyDefinition | undefined {
    return CURRENCY_BY_CODE.get(code);
}

/** Used when nothing about the browser maps to a registry currency. */
const FALLBACK_CURRENCY = 'INR';

/**
 * Time zone -> ISO region, for the registry's regions only.
 *
 * The time zone is a better region signal than the browser language: many
 * Indian users run an `en-US` or `en-GB` browser, but their clock still says
 * Asia/Kolkata. Includes legacy aliases (Asia/Calcutta, Asia/Katmandu) that
 * some engines still report.
 */
const TIME_ZONE_REGIONS: Record<string, string> = {
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
    'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK',
    'Asia/Kathmandu': 'NP', 'Asia/Katmandu': 'NP',
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US',
    'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'America/Detroit': 'US', 'Pacific/Honolulu': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
    'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
    'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
    'Europe/London': 'GB', 'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL',
    'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
    'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Dublin': 'IE',
    'Europe/Lisbon': 'PT', 'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR', 'Europe/Luxembourg': 'LU',
    'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID', 'Asia/Bangkok': 'TH',
    'Asia/Manila': 'PH', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Hong_Kong': 'HK',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU',
    'Pacific/Auckland': 'NZ',
    'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
}; // prettier-ignore

/** `en-IN` -> `IN`; `en` -> undefined. */
function getLocaleRegion(locale: string): string | undefined {
    try {
        return new Intl.Locale(locale).region;
    } catch {
        return undefined;
    }
}

function getCurrencyForRegion(region: string | undefined): CurrencyDefinition | undefined {
    return region ? CURRENCIES.find((currency) => currency.regions.includes(region)) : undefined;
}

export type DetectedPreferences = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

/**
 * First-run regional defaults from what the browser reports.
 *
 * Region comes from the time zone first, then the first browser language
 * carrying a known region. The locale is the user's own browser language when
 * it belongs to that region and the picker offers it (`fr-FR` in Paris stays
 * French, not the EUR default `de-DE`); otherwise the currency's default.
 * Number format is always `exact` - nothing about a browser implies compact.
 */
export function detectDefaultPreferences({
    languages,
    timeZone,
}: {
    languages: readonly string[];
    timeZone: string | undefined;
}): DetectedPreferences {
    const languageCurrency = languages
        .map((language) => getCurrencyForRegion(getLocaleRegion(language)))
        .find((currency) => currency !== undefined);
    const currency =
        getCurrencyForRegion(timeZone ? TIME_ZONE_REGIONS[timeZone] : undefined) ??
        languageCurrency ??
        getCurrencyDefinition(FALLBACK_CURRENCY)!;

    const matchingLanguage = languages.find(
        (language) =>
            NUMBER_STYLE_LOCALES.includes(language) && currency.regions.includes(getLocaleRegion(language) ?? '')
    );

    return {
        locale: matchingLanguage ?? currency.defaultLocale,
        currency: currency.code,
        numberFormat: 'exact',
    };
}

// ---------------------------------------------------------------------------
// Picker options
// ---------------------------------------------------------------------------

export type CurrencyOptionGroup = { value: string; items: string[] };

/** Popular first, then each region. A currency appears once, so it has one row to highlight. */
export const CURRENCY_OPTION_GROUPS: readonly CurrencyOptionGroup[] = [
    { value: 'Popular', items: CURRENCIES.filter((currency) => currency.isPopular).map((currency) => currency.code) },
    ...(Object.keys(CURRENCY_GROUP_LABELS) as CurrencyGroup[])
        .map((group) => ({
            value: CURRENCY_GROUP_LABELS[group],
            items: CURRENCIES.filter((currency) => currency.group === group && !currency.isPopular).map(
                (currency) => currency.code
            ),
        }))
        .filter((group) => group.items.length > 0),
];

export function getCurrencyOptionLabel(code: string): string {
    const currency = getCurrencyDefinition(code);
    return currency ? `${currency.label} (${code})` : code;
}

const languageNames = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' });

export function getLocaleDisplayName(locale: string): string {
    return languageNames.of(locale) ?? locale;
}

export type NumberStyleGroup = { sample: string; locales: { value: string; label: string }[] };

const NUMBER_STYLE_SAMPLE = 1234567.89;

/**
 * Number-style picker options, grouped by how they actually render. Many
 * locales share `1,234,567.89`; grouping by sample shows the user the real
 * choice (the separators) while keeping every locale selectable.
 */
export function getNumberStyleGroups(): NumberStyleGroup[] {
    const groups = new Map<string, NumberStyleGroup['locales']>();
    NUMBER_STYLE_LOCALES.forEach((locale) => {
        const sample = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
            NUMBER_STYLE_SAMPLE
        );
        groups.set(sample, [...(groups.get(sample) ?? []), { value: locale, label: getLocaleDisplayName(locale) }]);
    });
    return Array.from(groups, ([sample, locales]) => ({
        sample,
        locales: locales.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

/**
 * The locale to switch to when the currency changes. Follows the new
 * currency's default only while the locale is still the old currency's
 * default - a locale the user picked by hand is left alone.
 */
export function getLinkedLocale(currentLocale: string, previousCurrency: string, nextCurrency: string): string {
    const previousDefault = getCurrencyDefinition(previousCurrency)?.defaultLocale;
    const nextDefault = getCurrencyDefinition(nextCurrency)?.defaultLocale;
    if (!nextDefault || (currentLocale && currentLocale !== previousDefault)) {
        return currentLocale;
    }
    return nextDefault;
}

/** Matches on code, name or symbol, so `rupee`, `inr` and `₹` all find INR. */
export function matchesCurrencyQuery(code: string, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const currency = getCurrencyDefinition(code);
    if (!currency) return code.toLowerCase().includes(needle);
    const symbol = getCurrencyMeta(code, currency.defaultLocale).symbol.toLowerCase();
    return (
        code.toLowerCase().includes(needle) || currency.label.toLowerCase().includes(needle) || symbol.includes(needle)
    );
}
