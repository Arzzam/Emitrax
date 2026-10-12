import { afterEach, describe, expect, it } from 'vitest';

import { IEmi } from '@/types/emi.types';
import { calculateEMI } from '@/utils/calculation';
import {
    getMoneyFractionDigits,
    roundMoney,
    setMoneyFractionDigits,
    syncMoneyPrecision,
    toMoneyString,
} from '@/utils/money';

const buildEmi = () =>
    calculateEMI(
        {
            itemName: 'Test Loan',
            principal: 1234.567,
            interestRate: 7.25,
            tenure: 12,
            billDate: new Date('2025-01-15'),
            interestDiscount: 0,
            interestDiscountType: 'percent',
            gst: 5,
            processingFee: 12.345,
            processingFeeGst: 5,
            tag: 'Personal',
        } as IEmi,
        'test-emi-id'
    );

const decimalsOf = (value: string | number) => String(value).split('.')[1]?.length ?? 0;

afterEach(() => {
    // Module state: put the default back so no test leaks precision into another.
    syncMoneyPrecision('INR', 'en-IN');
    setMoneyFractionDigits(2);
});

describe('money precision', () => {
    it('defaults to 2 decimals', () => {
        expect(getMoneyFractionDigits()).toBe(2);
        expect(roundMoney(10.256)).toBe(10.26);
        expect(toMoneyString(10)).toBe('10.00');
    });

    it('follows the account currency, clamped to 2..3', () => {
        syncMoneyPrecision('KWD', 'en-KW');
        expect(getMoneyFractionDigits()).toBe(3);

        syncMoneyPrecision('JPY', 'en-JP');
        expect(getMoneyFractionDigits()).toBe(2);

        syncMoneyPrecision('USD', 'en-US');
        expect(getMoneyFractionDigits()).toBe(2);
    });

    it('clamps explicit values', () => {
        setMoneyFractionDigits(0);
        expect(getMoneyFractionDigits()).toBe(2);
        setMoneyFractionDigits(5);
        expect(getMoneyFractionDigits()).toBe(3);
        setMoneyFractionDigits(Number.NaN);
        expect(getMoneyFractionDigits()).toBe(2);
    });

    it('rounds like toFixed, not Math.round(v * 100) / 100', () => {
        // 1.115 is stored as 1.11499..., which toFixed honours; Math.round(111.5) would not.
        expect(roundMoney(1.115)).toBe(Number((1.115).toFixed(2)));
        expect(roundMoney(1.0005, 3)).toBe(Number((1.0005).toFixed(3)));
    });
});

describe('calculateEMI at the account precision', () => {
    it('keeps 2-decimal figures for INR', () => {
        const emi = buildEmi();
        expect(decimalsOf(emi.amortizationSchedules![0].emi)).toBe(2);
        expect(decimalsOf(emi.emi)).toBeLessThanOrEqual(2);
        expect(decimalsOf(emi.totalLoan)).toBeLessThanOrEqual(2);
    });

    it('keeps the third decimal for KWD', () => {
        syncMoneyPrecision('KWD', 'en-KW');
        const emi = buildEmi();
        const row = emi.amortizationSchedules![0];
        expect(decimalsOf(row.emi)).toBe(3);
        expect(decimalsOf(row.interest)).toBe(3);
        expect(decimalsOf(row.balance)).toBe(3);
        expect(decimalsOf(emi.emi)).toBeLessThanOrEqual(3);
        expect(decimalsOf(emi.totalLoan)).toBeLessThanOrEqual(3);
    });

    it('lands within a fils of the 2-decimal result, never a different amount', () => {
        const atTwo = buildEmi();
        syncMoneyPrecision('KWD', 'en-KW');
        const atThree = buildEmi();
        expect(Math.abs(atThree.emi - atTwo.emi)).toBeLessThanOrEqual(0.005);
        expect(Math.abs(atThree.totalLoan - atTwo.totalLoan)).toBeLessThanOrEqual(0.05);
    });
});
