import { describe, expect, it } from 'vitest';

import { ADVANCED_FILTER_DEFAULTS } from '@/modules/filter/filter.types';
import { filterAndSortEmis } from '@/modules/filter/filterEmis';
import type { IEmi } from '@/types/emi.types';

const emi = (id: string, currency: string, principal: number) =>
    ({
        id,
        itemName: id,
        currency,
        principal,
        totalLoan: principal,
        isCompleted: false,
        isArchived: false,
        billDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
    }) as IEmi;

const EMIS = [emi('inr-big', 'INR', 500000), emi('inr-small', 'INR', 50000), emi('usd', 'USD', 500000)];
const ids = (emis: IEmi[]) => emis.map((item) => item.id).sort();

describe('filterAndSortEmis - amount bounds and currency', () => {
    it('ignores currency when no amount bound is set', () => {
        expect(ids(filterAndSortEmis(EMIS, ADVANCED_FILTER_DEFAULTS, undefined, 'INR'))).toEqual([
            'inr-big',
            'inr-small',
            'usd',
        ]);
    });

    it('matches only EMIs in the bound currency while a bound is set', () => {
        const state = { ...ADVANCED_FILTER_DEFAULTS, principalMin: 100000 };
        expect(ids(filterAndSortEmis(EMIS, state, undefined, 'INR'))).toEqual(['inr-big']);
        expect(ids(filterAndSortEmis(EMIS, state, undefined, 'USD'))).toEqual(['usd']);
    });
});
