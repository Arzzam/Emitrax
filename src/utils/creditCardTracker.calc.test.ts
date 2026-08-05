import { describe, expect, it } from 'vitest';

import {
    ICreditCard,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    SFT_CASH_THRESHOLD,
    SFT_TOTAL_THRESHOLD,
} from '@/types/creditCard.types';
import {
    aggregateByIssuer,
    buildTrackerMatrix,
    getThresholdStatus,
    projectYearEnd,
} from '@/utils/creditCardTracker.calc';
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

const buildEntry = (cardId: string, periodMonth: string, amount: number, cashAmount = 0): ICreditCardPaymentEntry => ({
    id: `${cardId}-${periodMonth}`,
    userId: 'user-1',
    cardId,
    periodMonth,
    amount,
    cashAmount,
    note: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
});

describe('projectYearEnd', () => {
    it('returns zero before any month has elapsed', () => {
        expect(projectYearEnd(0, 0)).toBe(0);
        expect(projectYearEnd(50000, 0)).toBe(0);
    });

    it('extrapolates a partial year across twelve months', () => {
        expect(projectYearEnd(100000, 4)).toBe(300000);
    });

    it('returns the actual total once the year is complete', () => {
        expect(projectYearEnd(700000, 12)).toBe(700000);
        expect(projectYearEnd(700000, 15)).toBe(700000);
    });
});

describe('getThresholdStatus', () => {
    const threshold = SFT_TOTAL_THRESHOLD;

    it('reports breached once the actual total reaches the limit', () => {
        expect(getThresholdStatus(threshold, threshold, threshold)).toBe('breached');
        expect(getThresholdStatus(threshold + 1, 0, threshold)).toBe('breached');
    });

    it('reports risk when the projection nears the limit', () => {
        expect(getThresholdStatus(400000, 900000, threshold)).toBe('risk');
    });

    it('reports watch in the middle band', () => {
        expect(getThresholdStatus(300000, 700000, threshold)).toBe('watch');
    });

    it('reports safe well below the limit', () => {
        expect(getThresholdStatus(100000, 300000, threshold)).toBe('safe');
    });

    it('uses whichever of actual and projected is larger', () => {
        // Actual alone is 'safe', but the projection pushes it into 'risk'.
        expect(getThresholdStatus(500000, 880000, threshold)).toBe('risk');
    });

    it('treats a non-positive threshold as safe rather than dividing by zero', () => {
        expect(getThresholdStatus(500000, 900000, 0)).toBe('safe');
    });
});

describe('buildTrackerMatrix', () => {
    const cards = [buildCard('card-a', 'issuer-1'), buildCard('card-b', 'issuer-1'), buildCard('card-c', 'issuer-2')];
    const entries = [
        buildEntry('card-a', '2026-04-01', 40000),
        buildEntry('card-b', '2026-04-01', 25000),
        buildEntry('card-c', '2026-04-01', 30000),
        buildEntry('card-a', '2026-05-01', 15000),
    ];

    it('indexes entries by card and month', () => {
        const matrix = buildTrackerMatrix(cards, entries, MONTHS);
        expect(matrix.entries.get('card-a')?.get('2026-04-01')?.amount).toBe(40000);
        expect(matrix.entries.get('card-c')?.get('2026-05-01')).toBeUndefined();
    });

    it('totals each month across all cards', () => {
        const matrix = buildTrackerMatrix(cards, entries, MONTHS);
        expect(matrix.monthTotals.get('2026-04-01')).toBe(95000);
        expect(matrix.monthTotals.get('2026-05-01')).toBe(15000);
        expect(matrix.monthTotals.get('2026-06-01')).toBe(0);
    });

    it('subtotals each month by issuer', () => {
        const matrix = buildTrackerMatrix(cards, entries, MONTHS);
        expect(matrix.monthIssuerTotals.get('2026-04-01')?.get('issuer-1')).toBe(65000);
        expect(matrix.monthIssuerTotals.get('2026-04-01')?.get('issuer-2')).toBe(30000);
    });

    it('totals each card across the financial year', () => {
        const matrix = buildTrackerMatrix(cards, entries, MONTHS);
        expect(matrix.cardTotals.get('card-a')).toBe(55000);
        expect(matrix.grandTotal).toBe(110000);
    });

    it('ignores entries outside the supplied months', () => {
        const stale = [...entries, buildEntry('card-a', '2026-03-01', 999999)];
        const matrix = buildTrackerMatrix(cards, stale, MONTHS);
        expect(matrix.grandTotal).toBe(110000);
    });

    it('ignores entries for unknown cards', () => {
        const orphaned = [...entries, buildEntry('card-zzz', '2026-04-01', 999999)];
        const matrix = buildTrackerMatrix(cards, orphaned, MONTHS);
        expect(matrix.grandTotal).toBe(110000);
    });

    it('creates a zeroed row for every month even with no entries', () => {
        const matrix = buildTrackerMatrix(cards, [], MONTHS);
        expect(matrix.monthTotals.size).toBe(12);
        expect(matrix.grandTotal).toBe(0);
    });
});

describe('aggregateByIssuer', () => {
    const iciciCards = [buildCard('icici-a', 'issuer-icici'), buildCard('icici-b', 'issuer-icici')];
    const hdfcCards = [buildCard('hdfc-a', 'issuer-hdfc')];
    const issuers = [buildIssuer('issuer-icici', 'ICICI', iciciCards), buildIssuer('issuer-hdfc', 'HDFC', hdfcCards)];

    it('combines two cards of the same issuer toward one threshold', () => {
        const entries = [buildEntry('icici-a', '2026-04-01', 400000), buildEntry('icici-b', '2026-04-01', 300000)];
        const [icici] = aggregateByIssuer(issuers, entries, 12);

        expect(icici.name).toBe('ICICI');
        expect(icici.totalPaid).toBe(700000);
        expect(icici.cardCount).toBe(2);
        expect(icici.status).toBe('watch'); // 70% of 10L with the year complete
    });

    it('keeps issuers independent - a combined total above the limit is not a breach', () => {
        const entries = [
            buildEntry('icici-a', '2026-04-01', 400000),
            buildEntry('icici-b', '2026-04-01', 300000),
            buildEntry('hdfc-a', '2026-04-01', 600000),
        ];
        const [icici, hdfc] = aggregateByIssuer(issuers, entries, 12);

        // 13L across both banks, but neither issuer has breached its own 10L.
        expect(icici.totalPaid + hdfc.totalPaid).toBe(1300000);
        expect(icici.status).not.toBe('breached');
        expect(hdfc.status).not.toBe('breached');
        expect(hdfc.totalPaid).toBe(600000);
    });

    it('flags an issuer that crosses its own limit', () => {
        const entries = [buildEntry('icici-a', '2026-04-01', 600000), buildEntry('icici-b', '2026-05-01', 450000)];
        const [icici] = aggregateByIssuer(issuers, entries, 12);

        expect(icici.totalPaid).toBe(1050000);
        expect(icici.status).toBe('breached');
    });

    it('splits cash from non-cash and bands cash separately', () => {
        const entries = [buildEntry('icici-a', '2026-04-01', 700000, 60000)];
        const [icici] = aggregateByIssuer(issuers, entries, 12);

        expect(icici.cashPaid).toBe(60000);
        expect(icici.nonCashPaid).toBe(640000);
        expect(icici.cashStatus).toBe('watch'); // 60% of 1L
    });

    it('projects from elapsed months for an in-progress year', () => {
        const entries = [buildEntry('icici-a', '2026-04-01', 200000)];
        const [icici] = aggregateByIssuer(issuers, entries, 4);

        expect(icici.projectedTotal).toBe(600000);
        expect(icici.status).toBe('watch');
    });

    it('returns issuers with no entries at zero rather than omitting them', () => {
        const [icici, hdfc] = aggregateByIssuer(issuers, [], 5);

        expect(icici.totalPaid).toBe(0);
        expect(icici.status).toBe('safe');
        expect(hdfc.totalPaid).toBe(0);
    });

    it('counts active cards separately from total cards', () => {
        const withInactive = [
            buildIssuer('issuer-icici', 'ICICI', [
                buildCard('icici-a', 'issuer-icici'),
                buildCard('icici-b', 'issuer-icici', { isActive: false }),
            ]),
        ];
        const [icici] = aggregateByIssuer(withInactive, [], 5);

        expect(icici.cardCount).toBe(2);
        expect(icici.activeCardCount).toBe(1);
    });

    it('honours custom thresholds', () => {
        const entries = [buildEntry('icici-a', '2026-04-01', 60000, 60000)];
        const [icici] = aggregateByIssuer(issuers, entries, 12, {
            total: SFT_TOTAL_THRESHOLD,
            cash: SFT_CASH_THRESHOLD / 2,
        });

        expect(icici.cashStatus).toBe('breached');
    });
});
