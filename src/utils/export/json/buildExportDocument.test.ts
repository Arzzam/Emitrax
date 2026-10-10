import { addMonths, format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { type AccountDetails, DEFAULT_ACCOUNT_PREFERENCES } from '@/types/account.types';
import { IEmi, IEmiSplit, ScheduleData } from '@/types/emi.types';

import { buildDataExportDocument, buildExportedEmi, buildSummary } from './buildExportDocument';

const ME = 'user-me';
const FRIEND = 'user-friend';

/** 12 x 1000 interest-free instalments from 15 Jan 2026, so the arithmetic stays checkable by eye. */
const BILL_DATE = new Date(2026, 0, 15);
const TENURE = 12;
const MONTHLY = 1000;
const PRINCIPAL = MONTHLY * TENURE;

/** Six instalments behind us, six ahead. */
const AS_OF = new Date(2026, 6, 15);

const buildSchedule = (): ScheduleData[] =>
    Array.from({ length: TENURE }, (_, index) => ({
        month: index + 1,
        billDate: format(addMonths(BILL_DATE, index), 'yyyy-MM-dd'),
        emi: String(MONTHLY),
        interest: '0',
        principalPaid: String(MONTHLY),
        balance: String(PRINCIPAL - MONTHLY * (index + 1)),
        gst: 0,
    }));

const makeSplit = (overrides: Partial<IEmiSplit>): IEmiSplit => ({
    id: 'split-1',
    emiId: 'emi-1',
    splitPercentage: 0,
    splitAmount: 0,
    isExternal: false,
    createdBy: ME,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

const makeEmi = (overrides: Partial<IEmi>): IEmi => ({
    id: 'emi-1',
    itemName: 'Laptop',
    principal: PRINCIPAL,
    interestRate: 0,
    billDate: BILL_DATE,
    tenure: TENURE,
    interestDiscount: 0,
    interestDiscountType: 'percent',
    emi: MONTHLY,
    gst: 0,
    totalGST: 0,
    totalLoan: PRINCIPAL,
    totalPaidEMIs: 0,
    totalInterest: 0,
    remainingBalance: PRINCIPAL / 2,
    remainingTenure: TENURE / 2,
    endDate: addMonths(BILL_DATE, TENURE),
    isCompleted: false,
    isArchived: false,
    amortizationSchedules: buildSchedule(),
    userId: ME,
    isOwner: true,
    splits: [],
    ...overrides,
});

const ACCOUNT: AccountDetails = {
    id: ME,
    email: 'me@example.com',
    displayName: 'Me',
    preferences: DEFAULT_ACCOUNT_PREFERENCES,
};

describe('buildExportedEmi', () => {
    it('assigns the whole loan to the user when it is not split', () => {
        const node = buildExportedEmi(makeEmi({}), ME, [], AS_OF);

        expect(node.ownership.mode).toBe('sole');
        expect(node.ownership.myShare.lifetime.total).toBe(PRINCIPAL);
        expect(node.ownership.myMonthlyShare).toBe(MONTHLY);
        expect(node.ownership.othersShare.lifetime.total).toBe(0);
        expect(node.progress.paidInstallments).toBe(6);
    });

    it('assigns nothing to the user when the loan is split 100% to someone else', () => {
        const node = buildExportedEmi(
            makeEmi({
                splits: [
                    makeSplit({
                        id: 's-ravi',
                        participantName: 'Ravi',
                        isExternal: true,
                        splitPercentage: 100,
                        splitAmount: MONTHLY,
                    }),
                ],
            }),
            ME,
            [],
            AS_OF
        );

        expect(node.ownership.mode).toBe('on_behalf');
        expect(node.ownership.isOwner).toBe(true);
        expect(node.ownership.myShare.lifetime.total).toBe(0);
        expect(node.ownership.myMonthlyShare).toBe(0);
        expect(node.ownership.othersShare.lifetime.total).toBe(PRINCIPAL);
        expect(node.ownership.participants).toHaveLength(1);
        expect(node.ownership.participants[0]).toMatchObject({
            name: 'Ravi',
            email: null,
            isExternal: true,
            percentage: 100,
            monthlyShare: MONTHLY,
        });
    });

    it('marks the schedule rows that have already been paid', () => {
        const node = buildExportedEmi(makeEmi({}), ME, [], AS_OF);

        expect(node.amortizationSchedule.filter((row) => row.isPaid)).toHaveLength(6);
        expect(node.amortizationSchedule[5].isPaid).toBe(true);
        expect(node.amortizationSchedule[6].isPaid).toBe(false);
        // Schedule money arrives from Supabase as strings; the export emits numbers.
        expect(node.amortizationSchedule[0].emi).toBe(MONTHLY);
    });

    it('carries notes and tags through untouched, and normalises blanks to null', () => {
        const node = buildExportedEmi(makeEmi({ notes: 'Bought for Amma', tag: '  ' }), ME, [], AS_OF);

        expect(node.notes).toBe('Bought for Amma');
        expect(node.tag).toBeNull();
    });
});

describe('buildSummary', () => {
    const soleEmi = makeEmi({ id: 'emi-sole' });
    const onBehalfEmi = makeEmi({
        id: 'emi-on-behalf',
        splits: [
            makeSplit({
                id: 's-ravi',
                emiId: 'emi-on-behalf',
                participantName: 'Ravi',
                isExternal: true,
                splitPercentage: 100,
                splitAmount: MONTHLY,
            }),
        ],
    });
    const halfSplitEmi = makeEmi({
        id: 'emi-half',
        splits: [
            makeSplit({ id: 's-me', emiId: 'emi-half', userId: ME, splitPercentage: 50, splitAmount: MONTHLY / 2 }),
            makeSplit({
                id: 's-friend',
                emiId: 'emi-half',
                userId: FRIEND,
                splitPercentage: 50,
                splitAmount: MONTHLY / 2,
                user_profiles: { email: 'friend@example.com' },
            }),
        ],
    });

    const summary = buildSummary(
        [soleEmi, onBehalfEmi, halfSplitEmi].map((emi) => buildExportedEmi(emi, ME, [], AS_OF))
    );

    it('keeps a loan financed for someone else out of the user’s own totals', () => {
        expect(summary.mine.lifetime).toBe(PRINCIPAL + PRINCIPAL / 2);
        expect(summary.mine.monthlyOutflow).toBe(MONTHLY + MONTHLY / 2);
        expect(summary.financedForOthers.lifetime).toBe(PRINCIPAL + PRINCIPAL / 2);
        expect(summary.financedForOthers.monthlyOutflow).toBe(MONTHLY + MONTHLY / 2);
    });

    it('partitions every rupee exactly once across the three buckets', () => {
        const partitioned = summary.mine.lifetime + summary.financedForOthers.lifetime + summary.observed.lifetime;

        expect(partitioned).toBe(PRINCIPAL * 3);
        expect(summary.ownedGross.lifetime).toBe(PRINCIPAL * 3);
    });

    it('counts each loan under its ownership mode', () => {
        expect(summary.countByOwnership).toEqual({ sole: 1, shared: 1, on_behalf: 1, observer: 0 });
        expect(summary.emiCount).toBe(3);
        expect(summary.activeCount).toBe(3);
    });

    it('rolls each participant up across every loan they appear on', () => {
        const ravi = summary.participants.find((participant) => participant.name === 'Ravi');
        const friend = summary.participants.find((participant) => participant.email === 'friend@example.com');

        expect(ravi).toMatchObject({ emiCount: 1, lifetime: PRINCIPAL, remaining: PRINCIPAL / 2 });
        expect(friend).toMatchObject({ emiCount: 1, lifetime: PRINCIPAL / 2, isCurrentUser: false });
        expect(summary.participants.find((participant) => participant.isCurrentUser)?.lifetime).toBe(PRINCIPAL / 2);
    });

    it('excludes completed and archived loans from the monthly outflow', () => {
        const closed = buildSummary([
            buildExportedEmi(makeEmi({ id: 'emi-done', isCompleted: true }), ME, [], AS_OF),
            buildExportedEmi(makeEmi({ id: 'emi-archived', isArchived: true }), ME, [], AS_OF),
        ]);

        expect(closed.mine.monthlyOutflow).toBe(0);
        expect(closed.mine.lifetime).toBe(PRINCIPAL * 2);
        expect(closed.activeCount).toBe(0);
        expect(closed.completedCount).toBe(1);
        expect(closed.archivedCount).toBe(1);
    });
});

describe('buildDataExportDocument', () => {
    it('omits the credit card block on a single-EMI export', () => {
        const document = buildDataExportDocument({
            scope: 'emi',
            account: ACCOUNT,
            emis: [makeEmi({})],
            generatedAt: AS_OF,
        });

        expect(document.creditCards).toBeUndefined();
        expect(document.scope).toBe('emi');
        expect(document.emis).toHaveLength(1);
        expect(document.account).toMatchObject({ userId: ME, currency: 'INR', locale: 'en-IN' });
        expect(document.glossary['ownership.mode']).toContain('on_behalf');
    });

    it('denormalises card and issuer names onto every credit card entry', () => {
        const document = buildDataExportDocument({
            scope: 'all',
            account: ACCOUNT,
            emis: [],
            generatedAt: AS_OF,
            creditCards: {
                issuers: [
                    {
                        id: 'iss-1',
                        userId: ME,
                        name: 'HDFC',
                        color: 'chart-1',
                        sortOrder: 0,
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-01T00:00:00Z',
                        cards: [
                            {
                                id: 'card-1',
                                userId: ME,
                                issuerId: 'iss-1',
                                name: 'Millennia',
                                last4: '1234',
                                isActive: true,
                                sortOrder: 0,
                                statementDay: 5,
                                dueDay: 25,
                                creditLimit: 200000,
                                createdAt: '2026-01-01T00:00:00Z',
                                updatedAt: '2026-01-01T00:00:00Z',
                            },
                        ],
                    },
                ],
                payments: [
                    {
                        id: 'pay-1',
                        userId: ME,
                        cardId: 'card-1',
                        periodMonth: '2026-05-01',
                        amount: 5000,
                        cashAmount: 1000,
                        note: null,
                        createdAt: '2026-05-01T00:00:00Z',
                        updatedAt: '2026-05-01T00:00:00Z',
                    },
                ],
                bills: [
                    {
                        id: 'bill-1',
                        userId: ME,
                        cardId: 'card-1',
                        statementMonth: '2026-04-01',
                        status: 'issued',
                        totalDue: 5000,
                        minimumDue: 500,
                        statementDate: '2026-04-05',
                        dueDate: '2026-04-25',
                        note: null,
                        createdAt: '2026-04-05T00:00:00Z',
                        updatedAt: '2026-04-05T00:00:00Z',
                    },
                ],
                trackerYears: [
                    {
                        id: 'year-1',
                        userId: ME,
                        financialYear: '2026-27',
                        notes: null,
                        thresholdAmount: 1000000,
                        cashThresholdAmount: 100000,
                        createdAt: '2026-04-01T00:00:00Z',
                        updatedAt: '2026-04-01T00:00:00Z',
                    },
                ],
            },
        });

        expect(document.creditCards?.payments[0]).toMatchObject({
            cardName: 'Millennia',
            issuerName: 'HDFC',
            nonCashAmount: 4000,
            financialYear: '2026-27',
        });
        expect(document.creditCards?.bills[0]).toMatchObject({
            cardName: 'Millennia',
            issuerName: 'HDFC',
            // A March-quarter statement month still lands in the FY that contains it.
            financialYear: '2026-27',
        });
    });
});
