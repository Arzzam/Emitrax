import { describe, expect, it } from 'vitest';

import { ICardLimitChange, ICreditCard, ICreditCardBillEntry, ICreditCardIssuer } from '@/types/creditCard.types';
import {
    aggregateUtilisationByIssuer,
    buildBureauUtilisation,
    buildUtilisationMatrix,
    getUtilisationStatus,
    resolveLimitForStatementMonth,
    resolveLimitOn,
    sortLimitChanges,
} from '@/utils/creditCardUtilisation.calc';
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

const buildIssuer = (id: string, cards: ICreditCard[]): ICreditCardIssuer => ({
    id,
    userId: 'user-1',
    name: id,
    color: null,
    sortOrder: 0,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    cards,
});

const buildBill = (
    cardId: string,
    statementMonth: string,
    overrides: Partial<ICreditCardBillEntry> = {}
): ICreditCardBillEntry => ({
    id: `${cardId}-${statementMonth}`,
    userId: 'user-1',
    cardId,
    statementMonth,
    status: 'issued',
    totalDue: 0,
    minimumDue: null,
    statementDate: null,
    dueDate: null,
    note: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
});

const buildLimit = (cardId: string, effectiveFrom: string, creditLimit: number): ICardLimitChange => ({
    id: `${cardId}-${effectiveFrom}`,
    userId: 'user-1',
    cardId,
    effectiveFrom,
    creditLimit,
    note: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
});

describe('resolveLimitOn', () => {
    const changes = sortLimitChanges([
        buildLimit('card-1', '2026-09-01', 400_000),
        buildLimit('card-1', '2025-06-15', 250_000),
        buildLimit('card-1', '2027-01-01', 600_000),
    ]);

    it('returns null when there is no history at all', () => {
        expect(resolveLimitOn([], '2026-06-30')).toBeNull();
    });

    it('returns the latest change at or before the date', () => {
        expect(resolveLimitOn(changes, '2026-08-31')).toBe(250_000);
        expect(resolveLimitOn(changes, '2026-09-01')).toBe(400_000);
        expect(resolveLimitOn(changes, '2026-12-31')).toBe(400_000);
        expect(resolveLimitOn(changes, '2027-01-01')).toBe(600_000);
    });

    it('extends the earliest change backwards rather than blanking the month', () => {
        const onlyLater = sortLimitChanges([buildLimit('card-1', '2026-09-01', 400_000)]);
        expect(resolveLimitOn(onlyLater, '2026-04-30')).toBe(400_000);
    });
});

describe('resolveLimitForStatementMonth', () => {
    // 250k until 1 Sep 2026, 400k from then on.
    const changes = sortLimitChanges([
        buildLimit('card-1', '2025-06-15', 250_000),
        buildLimit('card-1', '2026-09-01', 400_000),
    ]);

    it("uses the row's own statement date when it has one", () => {
        const card = buildCard('card-1', 'issuer-1', { statementDay: 20 });
        const entry = buildBill('card-1', '2026-09-01', { statementDate: '2026-08-28' });

        // The row is filed under Sep but was actually printed in Aug, before the
        // increase - so the old limit is the one that applied.
        expect(resolveLimitForStatementMonth('2026-09-01', card, changes, entry)).toEqual({
            limit: 250_000,
            basis: 'dated',
        });
    });

    it("falls back to the card's statement day", () => {
        const card = buildCard('card-1', 'issuer-1', { statementDay: 15 });
        expect(resolveLimitForStatementMonth('2026-09-01', card, changes)).toEqual({
            limit: 400_000,
            basis: 'card',
        });
    });

    it('clamps a statement day past the end of the month', () => {
        const card = buildCard('card-1', 'issuer-1', { statementDay: 31 });
        const febChanges = sortLimitChanges([buildLimit('card-1', '2027-02-28', 900_000)]);

        // Day 31 clamps to 28 Feb 2027, which is exactly the effective date.
        expect(resolveLimitForStatementMonth('2027-02-01', card, febChanges)).toEqual({
            limit: 900_000,
            basis: 'card',
        });
    });

    it("assumes the month's last day when nothing else is known", () => {
        const card = buildCard('card-1', 'issuer-1');
        expect(resolveLimitForStatementMonth('2026-08-01', card, changes)).toEqual({
            limit: 250_000,
            basis: 'assumed',
        });
    });

    it('reports no limit when the card has no history', () => {
        expect(resolveLimitForStatementMonth('2026-08-01', buildCard('card-9', 'issuer-1'), [])).toEqual({
            limit: null,
            basis: 'assumed',
        });
    });
});

describe('getUtilisationStatus', () => {
    it('bands on the conventional credit-health ratios', () => {
        expect(getUtilisationStatus(0.29)).toBe('safe');
        expect(getUtilisationStatus(0.3)).toBe('watch');
        expect(getUtilisationStatus(0.49)).toBe('watch');
        expect(getUtilisationStatus(0.5)).toBe('risk');
        expect(getUtilisationStatus(0.79)).toBe('risk');
        expect(getUtilisationStatus(0.8)).toBe('breached');
        expect(getUtilisationStatus(1.4)).toBe('breached');
    });

    it('treats a credit balance as the healthiest state', () => {
        expect(getUtilisationStatus(-0.1)).toBe('safe');
    });
});

describe('buildUtilisationMatrix', () => {
    it('does not restate earlier months when a limit is raised later', () => {
        const card = buildCard('card-1', 'issuer-1', { statementDay: 15 });
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 250_000), buildLimit('card-1', '2026-09-01', 400_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: 145_000 }),
            buildBill('card-1', '2026-10-01', { totalDue: 145_000 }),
        ];

        const matrix = buildUtilisationMatrix(issuers, bills, changes, MONTHS);
        const cells = matrix.cells.get('card-1')!;

        expect(cells.get('2026-04-01')!.limit).toBe(250_000);
        expect(cells.get('2026-04-01')!.ratio).toBeCloseTo(0.58, 5);
        expect(cells.get('2026-10-01')!.limit).toBe(400_000);
        expect(cells.get('2026-10-01')!.ratio).toBeCloseTo(0.3625, 5);
    });

    it('still resolves a limit for months before the only recorded change', () => {
        const card = buildCard('card-1', 'issuer-1', { statementDay: 15 });
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-09-01', 400_000)];
        const bills = [buildBill('card-1', '2026-04-01', { totalDue: 100_000 })];

        const matrix = buildUtilisationMatrix(issuers, bills, changes, MONTHS);

        expect(matrix.cells.get('card-1')!.get('2026-04-01')).toMatchObject({ limit: 400_000, ratio: 0.25 });
    });

    it('produces no cell for a card with no limit', () => {
        const limited = buildCard('limited', 'issuer-1');
        const unlimited = buildCard('unlimited', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [limited, unlimited])];
        const changes = [buildLimit('limited', '2026-04-01', 100_000)];
        const bills = [
            buildBill('limited', '2026-04-01', { totalDue: 40_000 }),
            buildBill('unlimited', '2026-04-01', { totalDue: 999_999 }),
        ];

        const matrix = buildUtilisationMatrix(issuers, bills, changes, MONTHS);

        expect(matrix.cells.has('unlimited')).toBe(false);
        expect(matrix.cardsWithoutLimit).toEqual(['unlimited']);
        expect(matrix.cardsWithLimit).toEqual(['limited']);
    });

    it('reads a no-statement month as 0%, and an unentered month as nothing', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { status: 'no_statement', totalDue: null }),
            buildBill('card-1', '2026-05-01', { totalDue: 0 }),
        ];

        const cells = buildUtilisationMatrix(issuers, bills, changes, MONTHS).cells.get('card-1')!;

        // No statement means nothing was owed, so 0% is the true reading. That
        // is narrower than the bill series, where 'no statement' and a zero
        // statement are genuinely different events.
        expect(cells.get('2026-04-01')).toMatchObject({ ratio: 0, billed: 0 });
        expect(cells.get('2026-05-01')).toMatchObject({ ratio: 0, overLimit: false });
        expect(cells.has('2026-06-01')).toBe(false);
    });

    it('reports a credit balance as a negative ratio', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [buildBill('card-1', '2026-04-01', { totalDue: -2_340 })];

        const cell = buildUtilisationMatrix(issuers, bills, changes, MONTHS).cells.get('card-1')!.get('2026-04-01')!;

        expect(cell.ratio).toBeCloseTo(-0.0234, 10);
        expect(cell.overLimit).toBe(false);
    });

    it('flags over-limit at and above the full limit without capping the ratio', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: 100_000 }),
            buildBill('card-1', '2026-05-01', { totalDue: 112_000 }),
        ];

        const cells = buildUtilisationMatrix(issuers, bills, changes, MONTHS).cells.get('card-1')!;

        expect(cells.get('2026-04-01')!.overLimit).toBe(true);
        expect(cells.get('2026-05-01')!.ratio).toBeCloseTo(1.12, 10);
    });

    it("tracks each card's peak month", () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: 20_000 }),
            buildBill('card-1', '2026-06-01', { totalDue: 70_000 }),
            buildBill('card-1', '2026-07-01', { totalDue: 30_000 }),
        ];

        const matrix = buildUtilisationMatrix(issuers, bills, changes, MONTHS);

        expect(matrix.cardPeak.get('card-1')).toMatchObject({ statementMonth: '2026-06-01' });
        expect(matrix.cardPeak.get('card-1')!.cell.ratio).toBeCloseTo(0.7, 10);
    });

    it('ignores months outside the year and cards it does not know', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2025-04-01', { totalDue: 90_000 }),
            buildBill('ghost', '2026-04-01', { totalDue: 90_000 }),
        ];

        const matrix = buildUtilisationMatrix(issuers, bills, changes, MONTHS);

        expect(matrix.cells.size).toBe(0);
        expect(matrix.cardPeak.size).toBe(0);
    });
});

describe('aggregateUtilisationByIssuer', () => {
    it('averages across months, counts coverage and bands on the peak', () => {
        const withLimit = buildCard('with-limit', 'issuer-1');
        const noLimit = buildCard('no-limit', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [withLimit, noLimit])];
        const changes = [buildLimit('with-limit', '2026-04-01', 100_000)];
        const bills = [
            buildBill('with-limit', '2026-04-01', { totalDue: 20_000 }),
            buildBill('with-limit', '2026-05-01', { totalDue: 60_000 }),
            buildBill('no-limit', '2026-05-01', { totalDue: 10_000 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);
        const [aggregate] = aggregateUtilisationByIssuer(issuers, bureau, MONTHS);

        expect(aggregate.monthsWithData).toBe(2);
        expect(aggregate.averageRatio).toBeCloseTo(0.4, 10);
        expect(aggregate.peak).toMatchObject({ statementMonth: '2026-05-01' });
        expect(aggregate.status).toBe('risk');
        expect(aggregate.latest).toMatchObject({ statementMonth: '2026-05-01' });
        expect(aggregate.cardsCountedCount).toBe(1);
        expect(aggregate.cardsWithoutLimitCount).toBe(1);
    });

    it('reports nulls rather than zeros for an issuer with nothing measurable', () => {
        const issuers = [buildIssuer('issuer-1', [buildCard('card-1', 'issuer-1')])];
        const bureau = buildBureauUtilisation(issuers, [], [], MONTHS);
        const [aggregate] = aggregateUtilisationByIssuer(issuers, bureau, MONTHS);

        expect(aggregate.averageRatio).toBeNull();
        expect(aggregate.peak).toBeNull();
        expect(aggregate.status).toBeNull();
        expect(aggregate.monthsWithData).toBe(0);
    });

    it('counts limits from history rather than from months with bills, and measures only elapsed months', () => {
        const issuers = [buildIssuer('issuer-1', [buildCard('a', 'issuer-1'), buildCard('b', 'issuer-1')])];
        const changes = [buildLimit('a', '2026-04-01', 100_000), buildLimit('b', '2026-04-01', 100_000)];

        const bureau = buildBureauUtilisation(issuers, [], changes, MONTHS);
        const [aggregate] = aggregateUtilisationByIssuer(issuers, bureau, MONTHS);

        // Both cards have limits; neither has a statement yet.
        expect(aggregate.cardsCountedCount).toBe(2);
        expect(aggregate.cardsWithoutLimitCount).toBe(0);
        // Apr-Aug have happened by the August reference date.
        expect(aggregate.monthsMeasurable).toBe(5);
    });
});

describe('buildBureauUtilisation', () => {
    it("keeps an unused card's limit in the denominator", () => {
        const spender = buildCard('spender', 'issuer-1');
        const idle = buildCard('idle', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [spender, idle])];
        const changes = [buildLimit('spender', '2026-04-01', 100_000), buildLimit('idle', '2026-04-01', 400_000)];
        const bills = [
            buildBill('spender', '2026-04-01', { totalDue: 60_000 }),
            buildBill('idle', '2026-04-01', { totalDue: 0 }),
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        // The strict matrix would also say 12%, but only because the idle card
        // happened to be entered. The point of this rule is that its limit
        // counts regardless - which is why closing it would raise the figure.
        expect(figure.ratio).toBeCloseTo(60_000 / 500_000, 10);
        expect(figure.cardCount).toBe(2);
        expect(figure.isPartial).toBe(false);
    });

    it('assumes nil for an unentered card and flags the month partial', () => {
        const entered = buildCard('entered', 'issuer-1');
        const missing = buildCard('missing', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [entered, missing])];
        const changes = [buildLimit('entered', '2026-04-01', 100_000), buildLimit('missing', '2026-04-01', 100_000)];
        const bills = [buildBill('entered', '2026-04-01', { totalDue: 80_000 })];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        expect(figure.ratio).toBeCloseTo(0.4, 10);
        expect(figure.assumedCount).toBe(1);
        expect(figure.isPartial).toBe(true);
        // The assumption can only understate: the truth is at least this.
        expect(figure.ratio).toBeLessThanOrEqual(0.9);
    });

    it('produces no figure for a month where nothing at all was entered', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [buildBill('card-1', '2026-04-01', { totalDue: 20_000 })];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        // May would otherwise read a confident 0% purely from absence.
        expect(bureau.months.has('2026-05-01')).toBe(false);
        expect(bureau.months.size).toBe(1);
    });

    it('floors a credit balance at zero rather than going negative', () => {
        const card = buildCard('card-1', 'issuer-1');
        const other = buildCard('other', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card, other])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000), buildLimit('other', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: -5_000 }),
            buildBill('other', '2026-04-01', { totalDue: 50_000 }),
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        // A bureau sees a credit balance as nil, not as an offset against the
        // other card, so this is 25% rather than 22.5%.
        expect(figure.balance).toBe(50_000);
        expect(figure.ratio).toBeCloseTo(0.25, 10);
    });

    it('counts a no-statement month as a known nil with its limit intact', () => {
        const card = buildCard('card-1', 'issuer-1');
        const quiet = buildCard('quiet', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card, quiet])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000), buildLimit('quiet', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: 50_000 }),
            buildBill('quiet', '2026-04-01', { status: 'no_statement', totalDue: null }),
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        expect(figure.ratio).toBeCloseTo(0.25, 10);
        expect(figure.assumedCount).toBe(0);
        expect(figure.isPartial).toBe(false);
    });

    it('excludes a card with no limit, and names how many', () => {
        const limited = buildCard('limited', 'issuer-1');
        const unlimited = buildCard('unlimited', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [limited, unlimited])];
        const changes = [buildLimit('limited', '2026-04-01', 100_000)];
        const bills = [
            buildBill('limited', '2026-04-01', { totalDue: 40_000 }),
            buildBill('unlimited', '2026-04-01', { totalDue: 999_999 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        expect(bureau.months.get('2026-04-01')!.ratio).toBeCloseTo(0.4, 10);
        expect(bureau.cardsCounted).toBe(1);
        expect(bureau.cardsWithoutLimit).toBe(1);
    });

    it('leaves a card opened mid-year out of the months before it opened', () => {
        const old = buildCard('old', 'issuer-1');
        const added = buildCard('added', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [old, added])];
        const changes = [buildLimit('old', '2025-01-01', 100_000), buildLimit('added', '2026-06-10', 400_000)];
        const bills = [
            buildBill('old', '2026-04-01', { totalDue: 80_000 }),
            buildBill('old', '2026-07-01', { totalDue: 80_000 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        // April: the new card did not exist, so 80k / 1L - not 80k / 5L.
        const april = bureau.months.get('2026-04-01')!;
        expect(april.ratio).toBeCloseTo(0.8, 10);
        expect(april.cardCount).toBe(1);
        expect(april.isPartial).toBe(false);

        // July: it is open and unentered, so it counts at an assumed nil.
        const july = bureau.months.get('2026-07-01')!;
        expect(july.ratio).toBeCloseTo(0.16, 10);
        expect(july.assumedCount).toBe(1);
    });

    it('still counts an entered statement dated before the earliest recorded limit', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-09-01', 200_000)];
        const bills = [buildBill('card-1', '2026-05-01', { totalDue: 50_000 })];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        expect(bureau.months.get('2026-05-01')!.ratio).toBeCloseTo(0.25, 10);
    });

    it('keeps a deactivated card that still holds data, and drops one that does not', () => {
        const active = buildCard('active', 'issuer-1');
        const retiredWithData = buildCard('retired-with-data', 'issuer-1', { isActive: false });
        const retiredSilent = buildCard('retired-silent', 'issuer-1', { isActive: false });
        const issuers = [buildIssuer('issuer-1', [active, retiredWithData, retiredSilent])];
        const changes = [
            buildLimit('active', '2026-04-01', 100_000),
            buildLimit('retired-with-data', '2026-04-01', 100_000),
            buildLimit('retired-silent', '2026-04-01', 500_000),
        ];
        const bills = [
            buildBill('active', '2026-04-01', { totalDue: 50_000 }),
            buildBill('retired-with-data', '2026-04-01', { totalDue: 0 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        // The silent retired card's 5 lakh limit would otherwise halve the
        // figure for a card that is no longer in play.
        expect(bureau.cardsCounted).toBe(2);
        expect(bureau.months.get('2026-04-01')!.ratio).toBeCloseTo(0.25, 10);
    });

    it('skips future months instead of reading them as fully assumed zeros', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [buildBill('card-1', '2026-04-01', { totalDue: 20_000 })];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        // MONTHS is anchored at Aug 2026, so Sep onward is still to come.
        expect(bureau.months.has('2026-12-01')).toBe(false);
    });

    it('tracks the latest month, the peak and the average across months', () => {
        const card = buildCard('card-1', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: 20_000 }),
            buildBill('card-1', '2026-06-01', { totalDue: 80_000 }),
            buildBill('card-1', '2026-07-01', { totalDue: 50_000 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);

        expect(bureau.latest).toMatchObject({ statementMonth: '2026-07-01' });
        expect(bureau.peak).toMatchObject({ statementMonth: '2026-06-01' });
        expect(bureau.averageRatio).toBeCloseTo(0.5, 10);
        expect(bureau.monthsWithData).toBe(3);
    });

    it('combines as a ratio of sums, not a mean of per-card ratios', () => {
        const small = buildCard('small', 'issuer-1');
        const large = buildCard('large', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [small, large])];
        const changes = [buildLimit('small', '2026-04-01', 50_000), buildLimit('large', '2026-04-01', 500_000)];
        const bills = [
            buildBill('small', '2026-04-01', { totalDue: 5_000 }), // 10%
            buildBill('large', '2026-04-01', { totalDue: 400_000 }), // 80%
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        // Mean of ratios would be 45% - and would say the wallet is comfortable
        // while 4 lakh sits against a 5 lakh limit.
        expect(figure.ratio).toBeCloseTo(405_000 / 550_000, 10);
        expect(figure.ratio).toBeGreaterThan(0.73);
        expect(figure.cardCount).toBe(2);
    });

    it('breaks a month down by card, largest balance first, naming each basis', () => {
        const big = buildCard('big', 'issuer-1', { last4: '4321' });
        const small = buildCard('small', 'issuer-1');
        const quiet = buildCard('quiet', 'issuer-1');
        const missing = buildCard('missing', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [big, small, quiet, missing])];
        const changes = [
            buildLimit('big', '2026-04-01', 200_000),
            buildLimit('small', '2026-04-01', 100_000),
            buildLimit('quiet', '2026-04-01', 100_000),
            buildLimit('missing', '2026-04-01', 100_000),
        ];
        const bills = [
            buildBill('small', '2026-04-01', { totalDue: 10_000 }),
            buildBill('big', '2026-04-01', { totalDue: 90_000 }),
            buildBill('quiet', '2026-04-01', { status: 'no_statement', totalDue: null }),
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;

        // Balance descending, then entered-before-assumed among the nil rows.
        expect(figure.contributions.map((entry) => entry.cardId)).toEqual(['big', 'small', 'quiet', 'missing']);
        expect(figure.contributions[0]).toMatchObject({
            cardName: 'big',
            last4: '4321',
            balance: 90_000,
            limit: 200_000,
            basis: 'issued',
        });
        expect(figure.contributions[0].ratio).toBeCloseTo(0.45, 10);
        expect(figure.contributions[2]).toMatchObject({ cardId: 'quiet', balance: 0, basis: 'no_statement' });
        expect(figure.contributions[3]).toMatchObject({ cardId: 'missing', balance: 0, basis: 'assumed_nil' });

        // The breakdown sums back to the headline, or it is not a breakdown.
        const summed = figure.contributions.reduce((total, entry) => total + entry.balance, 0);
        expect(summed).toBe(figure.balance);
        expect(figure.contributions.reduce((total, entry) => total + entry.limit, 0)).toBe(figure.limit);
    });

    it('reports a floored credit balance as zero in the breakdown', () => {
        const card = buildCard('card-1', 'issuer-1');
        const other = buildCard('other', 'issuer-1');
        const issuers = [buildIssuer('issuer-1', [card, other])];
        const changes = [buildLimit('card-1', '2026-04-01', 100_000), buildLimit('other', '2026-04-01', 100_000)];
        const bills = [
            buildBill('card-1', '2026-04-01', { totalDue: -5_000 }),
            buildBill('other', '2026-04-01', { totalDue: 50_000 }),
        ];

        const figure = buildBureauUtilisation(issuers, bills, changes, MONTHS).months.get('2026-04-01')!;
        const credit = figure.contributions.find((entry) => entry.cardId === 'card-1')!;

        expect(credit.balance).toBe(0);
        expect(credit.ratio).toBe(0);
    });

    it('applies the same rule per issuer as it does overall', () => {
        const a = buildCard('a', 'issuer-1');
        const b = buildCard('b', 'issuer-2');
        const issuers = [buildIssuer('issuer-1', [a]), buildIssuer('issuer-2', [b])];
        const changes = [buildLimit('a', '2026-04-01', 100_000), buildLimit('b', '2026-04-01', 300_000)];
        const bills = [
            buildBill('a', '2026-04-01', { totalDue: 80_000 }),
            buildBill('b', '2026-04-01', { totalDue: 30_000 }),
        ];

        const bureau = buildBureauUtilisation(issuers, bills, changes, MONTHS);
        const perIssuer = bureau.issuerMonths.get('2026-04-01')!;

        expect(perIssuer.get('issuer-1')!.ratio).toBeCloseTo(0.8, 10);
        expect(perIssuer.get('issuer-2')!.ratio).toBeCloseTo(0.1, 10);
        expect(bureau.months.get('2026-04-01')!.ratio).toBeCloseTo(110_000 / 400_000, 10);
    });
});
