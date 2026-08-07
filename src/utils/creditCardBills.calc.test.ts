import { describe, expect, it } from 'vitest';

import { ICreditCard, ICreditCardBillEntry, ICreditCardIssuer, SaveBillEntryInput } from '@/types/creditCard.types';
import {
    aggregateBillsByIssuer,
    BILL_SERIES,
    getBillAmount,
    getBillDefaultDates,
    getExpectedPaymentMonth,
    isEmptyBillEntry,
} from '@/utils/creditCardBills.calc';
import { buildTrackerMatrix } from '@/utils/creditCardTracker.calc';
import { getFinancialYearMonths } from '@/utils/financialYear';

const REFERENCE = new Date(2026, 7, 15); // Aug 2026, i.e. 5 months into FY 2026-27
const MONTHS = getFinancialYearMonths('2026-27', REFERENCE);

const buildCard = (id: string, issuerId: string, overrides: Partial<ICreditCard> = {}): ICreditCard => ({
    id,
    userId: 'user-1',
    issuerId,
    name: id,
    last4: null,
    isActive: true,
    sortOrder: 0,
    statementDay: null,
    dueDay: null,
    creditLimit: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
});

const buildIssuer = (id: string, name: string, cards: ICreditCard[]): ICreditCardIssuer => ({
    id,
    userId: 'user-1',
    name,
    color: null,
    sortOrder: 0,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    cards,
});

const buildBill = (
    cardId: string,
    statementMonth: string,
    totalDue: number | null,
    overrides: Partial<ICreditCardBillEntry> = {}
): ICreditCardBillEntry => ({
    id: `${cardId}-${statementMonth}`,
    userId: 'user-1',
    cardId,
    statementMonth,
    status: 'issued',
    totalDue,
    minimumDue: null,
    statementDate: null,
    dueDate: null,
    note: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
});

const noStatement = (cardId: string, statementMonth: string): ICreditCardBillEntry =>
    buildBill(cardId, statementMonth, null, { status: 'no_statement' });

describe('getExpectedPaymentMonth', () => {
    it('rolls to the next month when the due day falls at or before the statement day', () => {
        const result = getExpectedPaymentMonth('2026-08-01', { statementDay: 25, dueDay: 14 });
        expect(result).toMatchObject({ periodMonth: '2026-09-01', basis: 'card' });
    });

    it('stays in the same month when the due day is after the statement day', () => {
        const result = getExpectedPaymentMonth('2026-08-01', { statementDay: 2, dueDay: 22 });
        expect(result).toMatchObject({ periodMonth: '2026-08-01', basis: 'card' });
    });

    it('treats an equal due day as the following month - the boundary is strict', () => {
        const result = getExpectedPaymentMonth('2026-08-01', { statementDay: 15, dueDay: 15 });
        expect(result.periodMonth).toBe('2026-09-01');
    });

    it('assumes the next month when the card has no cycle configured', () => {
        const result = getExpectedPaymentMonth('2026-08-01', { statementDay: null, dueDay: null });
        expect(result).toMatchObject({ periodMonth: '2026-09-01', basis: 'assumed' });
    });

    it('assumes when only one of the two days is known', () => {
        expect(getExpectedPaymentMonth('2026-08-01', { statementDay: 15, dueDay: null }).basis).toBe('assumed');
        expect(getExpectedPaymentMonth('2026-08-01', { statementDay: null, dueDay: 5 }).basis).toBe('assumed');
    });

    it("lets the row's own dates override the card's days", () => {
        // The card says same-month, but this row was actually due in September.
        const result = getExpectedPaymentMonth(
            '2026-08-01',
            { statementDay: 2, dueDay: 22 },
            { statementDate: '2026-08-28', dueDate: '2026-09-17' }
        );
        expect(result).toMatchObject({ periodMonth: '2026-09-01', basis: 'dated' });
    });

    it('ignores row dates unless both are present', () => {
        const result = getExpectedPaymentMonth(
            '2026-08-01',
            { statementDay: 2, dueDay: 22 },
            { statementDate: '2026-08-28', dueDate: null }
        );
        expect(result.basis).toBe('card');
    });

    it('flags a March bill whose payment lands in the next financial year', () => {
        const result = getExpectedPaymentMonth('2027-03-01', { statementDay: 25, dueDay: 14 });
        expect(result).toMatchObject({ periodMonth: '2027-04-01', crossesFinancialYear: true });
    });

    it('does not flag a March bill settled within the same financial year', () => {
        const result = getExpectedPaymentMonth('2027-03-01', { statementDay: 2, dueDay: 22 });
        expect(result).toMatchObject({ periodMonth: '2027-03-01', crossesFinancialYear: false });
    });

    it('treats a calendar-year rollover as staying inside the financial year', () => {
        // Dec -> Jan crosses the calendar year but not the Apr-Mar financial year.
        const result = getExpectedPaymentMonth('2026-12-01', { statementDay: 25, dueDay: 14 });
        expect(result).toMatchObject({ periodMonth: '2027-01-01', crossesFinancialYear: false });
    });
});

describe('getBillDefaultDates', () => {
    it('clamps a 31st statement day to the end of February', () => {
        expect(getBillDefaultDates('2027-02-01', { statementDay: 31, dueDay: null }).statementDate).toBe('2027-02-28');
    });

    it('clamps to 29 February in a leap year', () => {
        expect(getBillDefaultDates('2028-02-01', { statementDay: 31, dueDay: null }).statementDate).toBe('2028-02-29');
    });

    it('puts the due date in the following month when it falls at or before the statement day', () => {
        expect(getBillDefaultDates('2026-08-01', { statementDay: 25, dueDay: 5 })).toEqual({
            statementDate: '2026-08-25',
            dueDate: '2026-09-05',
        });
    });

    it('keeps both dates in the same month when the due day is later', () => {
        expect(getBillDefaultDates('2026-08-01', { statementDay: 2, dueDay: 22 })).toEqual({
            statementDate: '2026-08-02',
            dueDate: '2026-08-22',
        });
    });

    it('returns nothing when the card has no statement day', () => {
        expect(getBillDefaultDates('2026-08-01', { statementDay: null, dueDay: 5 })).toEqual({
            statementDate: null,
            dueDate: null,
        });
    });

    it('returns only the statement date when the due day is unknown', () => {
        expect(getBillDefaultDates('2026-08-01', { statementDay: 15, dueDay: null })).toEqual({
            statementDate: '2026-08-15',
            dueDate: null,
        });
    });
});

describe('isEmptyBillEntry', () => {
    const base: SaveBillEntryInput = {
        cardId: 'card-a',
        statementMonth: '2026-08-01',
        status: 'issued',
        totalDue: null,
    };

    it('treats an issued row with nothing in it as empty', () => {
        expect(isEmptyBillEntry(base)).toBe(true);
    });

    it('never treats a no-statement row as empty - that is information', () => {
        expect(isEmptyBillEntry({ ...base, status: 'no_statement' })).toBe(false);
    });

    it('treats a zero total as a real statement, not an empty row', () => {
        expect(isEmptyBillEntry({ ...base, totalDue: 0 })).toBe(false);
    });

    it('keeps a row that carries only a note or only a date', () => {
        expect(isEmptyBillEntry({ ...base, note: 'Disputed charge' })).toBe(false);
        expect(isEmptyBillEntry({ ...base, dueDate: '2026-09-05' })).toBe(false);
    });

    it('ignores a whitespace-only note', () => {
        expect(isEmptyBillEntry({ ...base, note: '   ' })).toBe(true);
    });
});

describe('getBillAmount', () => {
    it('returns the total for an issued statement', () => {
        expect(getBillAmount(buildBill('card-a', '2026-08-01', 38200))).toBe(38200);
    });

    it('returns zero for a no-statement month', () => {
        expect(getBillAmount(noStatement('card-a', '2026-08-01'))).toBe(0);
    });

    it('returns a negative total unchanged - a credit balance is real', () => {
        expect(getBillAmount(buildBill('card-a', '2026-08-01', -2340))).toBe(-2340);
    });
});

describe('buildTrackerMatrix with BILL_SERIES', () => {
    const cards = [buildCard('card-a', 'issuer-1'), buildCard('card-b', 'issuer-1')];

    it('keeps a no-statement row in the matrix while contributing zero', () => {
        const matrix = buildTrackerMatrix(cards, [noStatement('card-a', '2026-04-01')], MONTHS, BILL_SERIES);

        // Present, so the cell can render its distinct state...
        expect(matrix.entries.get('card-a')?.get('2026-04-01')?.status).toBe('no_statement');
        // ...but contributing nothing to any total.
        expect(matrix.monthTotals.get('2026-04-01')).toBe(0);
        expect(matrix.grandTotal).toBe(0);
    });

    it('lets a credit balance reduce the month, card and grand totals', () => {
        const entries = [buildBill('card-a', '2026-04-01', 50000), buildBill('card-b', '2026-04-01', -8000)];
        const matrix = buildTrackerMatrix(cards, entries, MONTHS, BILL_SERIES);

        expect(matrix.monthTotals.get('2026-04-01')).toBe(42000);
        expect(matrix.cardTotals.get('card-b')).toBe(-8000);
        expect(matrix.grandTotal).toBe(42000);
    });

    it('ignores bills outside the supplied months', () => {
        const entries = [buildBill('card-a', '2026-04-01', 10000), buildBill('card-a', '2026-03-01', 999999)];
        expect(buildTrackerMatrix(cards, entries, MONTHS, BILL_SERIES).grandTotal).toBe(10000);
    });

    it('ignores bills for an unknown card', () => {
        const entries = [buildBill('card-a', '2026-04-01', 10000), buildBill('ghost', '2026-04-01', 999999)];
        expect(buildTrackerMatrix(cards, entries, MONTHS, BILL_SERIES).grandTotal).toBe(10000);
    });
});

describe('aggregateBillsByIssuer', () => {
    const iciciCards = [buildCard('icici-a', 'issuer-icici'), buildCard('icici-b', 'issuer-icici')];
    const issuers = [buildIssuer('issuer-icici', 'ICICI', iciciCards)];

    it('sums issued bills across the issuer', () => {
        const entries = [buildBill('icici-a', '2026-04-01', 40000), buildBill('icici-b', '2026-04-01', 25000)];
        const [icici] = aggregateBillsByIssuer(issuers, entries, MONTHS, 12);

        expect(icici.totalBilled).toBe(65000);
        expect(icici.cardCount).toBe(2);
    });

    it('averages over months with a statement, not elapsed months', () => {
        const entries = [buildBill('icici-a', '2026-04-01', 30000), buildBill('icici-a', '2026-05-01', 10000)];
        const [icici] = aggregateBillsByIssuer(issuers, entries, MONTHS, 12);

        // 40000 over 2 months with a statement, not over 12 elapsed.
        expect(icici.monthsWithStatement).toBe(2);
        expect(icici.averageBill).toBe(20000);
    });

    it('reports the peak month', () => {
        const entries = [
            buildBill('icici-a', '2026-04-01', 30000),
            buildBill('icici-a', '2026-05-01', 74592),
            buildBill('icici-a', '2026-06-01', 10445),
        ];
        const [icici] = aggregateBillsByIssuer(issuers, entries, MONTHS, 12);

        expect(icici.peakBill).toBe(74592);
        expect(icici.peakMonth).toBe('2026-05-01');
    });

    it('counts the three coverage states, summing to twelve', () => {
        const entries = [
            buildBill('icici-a', '2026-04-01', 30000),
            buildBill('icici-a', '2026-05-01', 0),
            noStatement('icici-a', '2026-06-01'),
        ];
        const [icici] = aggregateBillsByIssuer(issuers, entries, MONTHS, 12);

        expect(icici.monthsWithStatement).toBe(2); // including the real zero bill
        expect(icici.monthsWithNoStatement).toBe(1);
        expect(icici.monthsNotEntered).toBe(9);
        expect(icici.monthsWithStatement + icici.monthsWithNoStatement + icici.monthsNotEntered).toBe(12);
    });

    it('gives no combined limit when any card lacks one', () => {
        const mixed = [
            buildIssuer('issuer-icici', 'ICICI', [
                buildCard('icici-a', 'issuer-icici', { creditLimit: 200000 }),
                buildCard('icici-b', 'issuer-icici'),
            ]),
        ];
        expect(aggregateBillsByIssuer(mixed, [], MONTHS, 12)[0].combinedLimit).toBeNull();
        expect(aggregateBillsByIssuer(mixed, [], MONTHS, 12)[0].peakStatus).toBeNull();
    });

    it('bands the peak bill against the combined limit when every card has one', () => {
        const limited = [
            buildIssuer('issuer-icici', 'ICICI', [
                buildCard('icici-a', 'issuer-icici', { creditLimit: 200000 }),
                buildCard('icici-b', 'issuer-icici', { creditLimit: 100000 }),
            ]),
        ];
        const entries = [buildBill('icici-a', '2026-04-01', 280000)];
        const [icici] = aggregateBillsByIssuer(limited, entries, MONTHS, 12);

        expect(icici.combinedLimit).toBe(300000);
        expect(icici.peakStatus).toBe('risk'); // 280k of 300k
    });

    it('returns an issuer with no bills at zero rather than omitting it', () => {
        const [icici] = aggregateBillsByIssuer(issuers, [], MONTHS, 12);

        expect(icici.totalBilled).toBe(0);
        expect(icici.averageBill).toBe(0);
        expect(icici.peakMonth).toBeNull();
        expect(icici.monthsNotEntered).toBe(12);
    });

    it('ignores bills for a card belonging to no known issuer', () => {
        const entries = [buildBill('icici-a', '2026-04-01', 40000), buildBill('ghost', '2026-04-01', 999999)];
        expect(aggregateBillsByIssuer(issuers, entries, MONTHS, 12)[0].totalBilled).toBe(40000);
    });
});
