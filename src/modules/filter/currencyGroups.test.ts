import { describe, expect, it } from 'vitest';

import { getCurrencyGroups, getEmiCurrency, resolveStatsCurrency } from '@/modules/filter/currencyGroups';

const emis = (...currencies: string[]) => currencies.map((currency) => ({ currency }));

describe('getCurrencyGroups', () => {
    it('puts the account currency first, then the largest groups', () => {
        expect(getCurrencyGroups(emis('USD', 'AED', 'USD', 'INR', 'AED', 'AED'), 'INR')).toEqual([
            { currency: 'INR', count: 1 },
            { currency: 'AED', count: 3 },
            { currency: 'USD', count: 2 },
        ]);
    });

    it('treats a missing currency as the account currency', () => {
        expect(getCurrencyGroups([{ currency: '' }, { currency: 'INR' }], 'INR')).toEqual([
            { currency: 'INR', count: 2 },
        ]);
        expect(getEmiCurrency({ currency: '' }, 'USD')).toBe('USD');
    });

    it('returns no groups for no EMIs', () => {
        expect(getCurrencyGroups([], 'INR')).toEqual([]);
    });
});

describe('resolveStatsCurrency', () => {
    const groups = getCurrencyGroups(emis('AED', 'AED', 'USD'), 'INR');

    it("keeps the user's pick while it has EMIs", () => {
        expect(resolveStatsCurrency(groups, 'USD', 'INR')).toBe('USD');
    });

    it('falls back to the largest group when the account currency has no EMIs', () => {
        expect(resolveStatsCurrency(groups, null, 'INR')).toBe('AED');
        expect(resolveStatsCurrency(groups, 'GBP', 'INR')).toBe('AED');
    });

    it('prefers the account currency when it has EMIs', () => {
        expect(resolveStatsCurrency(getCurrencyGroups(emis('INR', 'USD', 'USD'), 'INR'), null, 'INR')).toBe('INR');
    });

    it('defaults to the account currency when there are no EMIs', () => {
        expect(resolveStatsCurrency([], null, 'INR')).toBe('INR');
    });
});
