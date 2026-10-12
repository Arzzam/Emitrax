import { describe, expect, it } from 'vitest';

import {
    CURRENCIES,
    CURRENCY_OPTION_GROUPS,
    detectDefaultPreferences,
    getLinkedLocale,
    getNumberStyleGroups,
    matchesCurrencyQuery,
    NUMBER_STYLE_LOCALES,
} from '@/utils/currencyRegistry';

describe('detectDefaultPreferences', () => {
    it('trusts the time zone over an en-US browser (common in India)', () => {
        expect(detectDefaultPreferences({ languages: ['en-US'], timeZone: 'Asia/Kolkata' })).toEqual({
            locale: 'en-IN',
            currency: 'INR',
            numberFormat: 'exact',
        });
    });

    it('accepts legacy time-zone aliases', () => {
        expect(detectDefaultPreferences({ languages: ['en'], timeZone: 'Asia/Calcutta' }).currency).toBe('INR');
    });

    it('keeps the browser language when it belongs to the detected region', () => {
        expect(detectDefaultPreferences({ languages: ['fr-FR'], timeZone: 'Europe/Paris' })).toEqual({
            locale: 'fr-FR',
            currency: 'EUR',
            numberFormat: 'exact',
        });
    });

    it("uses the currency's default locale when the language is from elsewhere", () => {
        expect(detectDefaultPreferences({ languages: ['en-IN'], timeZone: 'Asia/Dubai' })).toEqual({
            locale: 'en-AE',
            currency: 'AED',
            numberFormat: 'exact',
        });
    });

    it('falls back to the first language with a known region when the time zone is unknown', () => {
        expect(detectDefaultPreferences({ languages: ['en', 'en-GB'], timeZone: 'Antarctica/Troll' }).currency).toBe(
            'GBP'
        );
    });

    it('falls back to INR when nothing maps', () => {
        expect(detectDefaultPreferences({ languages: ['xx'], timeZone: undefined })).toEqual({
            locale: 'en-IN',
            currency: 'INR',
            numberFormat: 'exact',
        });
    });
});

describe('getLinkedLocale', () => {
    it("follows the new currency while the locale is still the old currency's default", () => {
        expect(getLinkedLocale('en-IN', 'INR', 'EUR')).toBe('de-DE');
    });

    it('leaves a hand-picked locale alone', () => {
        expect(getLinkedLocale('en-US', 'INR', 'AED')).toBe('en-US');
    });

    it('fills an empty locale', () => {
        expect(getLinkedLocale('', 'INR', 'JPY')).toBe('en-JP');
    });
});

describe('matchesCurrencyQuery', () => {
    it('matches code, name and symbol', () => {
        expect(matchesCurrencyQuery('INR', 'inr')).toBe(true);
        expect(matchesCurrencyQuery('INR', 'rupee')).toBe(true);
        expect(matchesCurrencyQuery('INR', '₹')).toBe(true);
        expect(matchesCurrencyQuery('EUR', '€')).toBe(true);
        expect(matchesCurrencyQuery('USD', 'rupee')).toBe(false);
    });

    it('matches everything on an empty query', () => {
        expect(matchesCurrencyQuery('USD', '  ')).toBe(true);
    });
});

describe('picker options', () => {
    it('lists every currency exactly once across the groups', () => {
        const listed = CURRENCY_OPTION_GROUPS.flatMap((group) => group.items);
        expect(new Set(listed).size).toBe(listed.length);
        expect(listed.sort()).toEqual(CURRENCIES.map((currency) => currency.code).sort());
        expect(CURRENCY_OPTION_GROUPS[0].value).toBe('Popular');
    });

    it('groups every number-style locale under the sample it renders', () => {
        const groups = getNumberStyleGroups();
        const locales = groups.flatMap((group) => group.locales.map((locale) => locale.value));
        expect(locales.sort()).toEqual([...NUMBER_STYLE_LOCALES].sort());

        const indian = groups.find((group) => group.locales.some((locale) => locale.value === 'en-IN'));
        expect(indian?.sample).toBe('12,34,567.89');
        expect(indian?.locales.map((locale) => locale.value)).toContain('en-IN');
    });
});
