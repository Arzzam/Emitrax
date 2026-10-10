import { format } from 'date-fns';

import { getSplitParticipantKey } from '@/modules/filter';
import type { AccountDetails } from '@/types/account.types';
import type {
    ICreditCardBillEntry,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    ICreditCardTrackerYear,
} from '@/types/creditCard.types';
import {
    DATA_EXPORT_SCHEMA_VERSION,
    type DataExportDocument,
    type DataExportScope,
    type DataExportSummary,
    type ExportedCreditCardBill,
    type ExportedCreditCardPayment,
    type ExportedCreditCards,
    type ExportedEmi,
    type ExportedEmiOwnership,
    type ExportedOutflowTotals,
    type ExportedParticipant,
    type ExportedParticipantRollup,
    type ExportedScheduleRow,
} from '@/types/dataExport.types';
import type { IEmi, IEmiSplit } from '@/types/emi.types';
import type { ILoanScenario } from '@/types/scenario.types';
import { coerceOptionalNumber } from '@/utils/calculation';
import {
    type EmiOwnershipMode,
    findMySplit,
    getParticipantEmail,
    getParticipantName,
    resolveEmiOwnership,
} from '@/utils/emiOwnership.calc';
import {
    getParticipantRepaymentBreakdown,
    getRepaymentProgress,
    prorateRepaymentProgress,
    type RepaymentProgress,
} from '@/utils/emiRepayment.calc';
import { getFinancialYearForDate } from '@/utils/financialYear';

const APP_URL = 'https://emitrax.arzzam.in';

const roundMoney = (value: number): number => Number(value.toFixed(2));

const toIsoDate = (value: Date | string): string => format(new Date(value), 'yyyy-MM-dd');

const nullIfBlank = (value: string | null | undefined): string | null => value?.trim() || null;

const OWNERSHIP_SUMMARIES: Record<EmiOwnershipMode, string> = {
    sole: 'Entirely the account owner’s liability.',
    shared: 'Split — the account owner carries part of it, other participants carry the rest.',
    on_behalf:
        'Financed by the account owner but split 100% to other people. The instalment leaves their account, but none of it is their liability.',
    observer: 'Owned by someone else and visible only through a share. Not the account owner’s liability.',
};

const EXPORT_GLOSSARY: Record<string, string> = {
    money: 'Every amount is in the account currency at 2 decimal places. Every percentage is 0-100.',
    'ownership.mode':
        'sole = wholly the account owner’s. shared = they carry part of it. on_behalf = they own and pay the loan but split 100% of it to other people, so none of it is their liability. observer = someone else’s loan, visible through a share.',
    'ownership.myPercentage':
        'The share the account owner carries. An unsplit loan is 100% theirs, and the owner absorbs any percentage no split row claims.',
    'ownership.myShare':
        'The account owner’s prorated slice of the loan ledger. All zeroes on an on_behalf or observer loan.',
    'ownership.othersShare': 'The slice carried by every other participant.',
    'ownership.isPartialView':
        'True when split rows are hidden by row-level security, so othersPercentage is a floor rather than an exact figure.',
    progress:
        'paid / remaining / lifetime breakdown of a loan, recomputed from the calendar rather than read from a stored counter. The processing fee and its GST sit wholly on the paid side because they are charged upfront at disbursal. GST is never discounted, even when the interest is.',
    'summary.mine': 'What the account owner actually owes, prorated across every loan they carry a share of.',
    'summary.financedForOthers':
        'Loans the account owner pays for on their own card or credit but does not owe — money fronted for family and friends.',
    'summary.monthlyOutflow': 'Sums only active loans. Completed and archived loans contribute zero.',
    'summary.participants': 'Per-person roll-up across every loan, for answering who owes what in total.',
    creditCards:
        'Payments and bills are tracked separately and are deliberately never combined. periodMonth is the month money was paid; statementMonth is the month the bill was generated. The two are normally offset by one month.',
    'creditCards.thresholds':
        'India’s SFT-006 reporting limits apply per issuer per financial year, aggregating that issuer’s cards. thresholdAmount covers all payments; cashThresholdAmount covers the cash portion only.',
    financialYear: 'Indian financial year, April through March, keyed as e.g. 2026-27.',
};

const emptyTotals = (): ExportedOutflowTotals => ({
    emiCount: 0,
    monthlyOutflow: 0,
    paid: 0,
    remaining: 0,
    lifetime: 0,
});

const addToTotals = (totals: ExportedOutflowTotals, progress: RepaymentProgress, monthly: number): void => {
    if (progress.lifetime.total <= 0 && monthly <= 0) return;
    totals.emiCount += 1;
    totals.monthlyOutflow = roundMoney(totals.monthlyOutflow + monthly);
    totals.paid = roundMoney(totals.paid + progress.paid.total);
    totals.remaining = roundMoney(totals.remaining + progress.remaining.total);
    totals.lifetime = roundMoney(totals.lifetime + progress.lifetime.total);
};

const buildScheduleRows = (emi: IEmi, progress: RepaymentProgress): ExportedScheduleRow[] =>
    [...(emi.amortizationSchedules ?? [])]
        .sort((a, b) => a.month - b.month)
        .map((row, index) => ({
            month: row.month,
            billDate: row.billDate,
            emi: coerceOptionalNumber(row.emi),
            interest: coerceOptionalNumber(row.interest),
            principalPaid: coerceOptionalNumber(row.principalPaid),
            balance: coerceOptionalNumber(row.balance),
            gst: coerceOptionalNumber(row.gst),
            isPaid: index < progress.paidInstallments,
        }));

const buildParticipants = (emi: IEmi, progress: RepaymentProgress, currentUserId: string): ExportedParticipant[] => {
    const splits = emi.splits ?? [];
    const splitsById = new Map<string, IEmiSplit>(splits.map((split) => [split.id, split]));
    // `mySplit` is resolved here rather than trusted off the EMI, so the export
    // does not depend on whichever service happened to hydrate the record.
    const mySplit = emi.mySplit ?? findMySplit(splits, currentUserId);
    const breakdown = getParticipantRepaymentBreakdown({ emi: emi.emi, splits, mySplit }, progress);

    return breakdown.participants.reduce<ExportedParticipant[]>((acc, participant) => {
        const split = splitsById.get(participant.splitId);
        if (!split) return acc;

        acc.push({
            key: getSplitParticipantKey(split),
            name: getParticipantName(split),
            email: getParticipantEmail(split),
            isExternal: split.isExternal,
            isCurrentUser: participant.isCurrentUser,
            percentage: participant.splitPercentage,
            monthlyShare: participant.monthlyShare,
            share: participant.progress,
        });
        return acc;
    }, []);
};

/** Shapes one EMI into its export node. `asOfDate` is injected so callers stay deterministic. */
export function buildExportedEmi(
    emi: IEmi,
    currentUserId: string,
    scenarios: ILoanScenario[] = [],
    asOfDate: Date = new Date()
): ExportedEmi {
    const progress = getRepaymentProgress(emi, asOfDate);
    const ownership = resolveEmiOwnership(emi, currentUserId);
    const monthlyEmi = coerceOptionalNumber(emi.emi);

    const exportedOwnership: ExportedEmiOwnership = {
        ...ownership,
        summary: OWNERSHIP_SUMMARIES[ownership.mode],
        myShare: prorateRepaymentProgress(progress, ownership.myPercentage),
        myMonthlyShare: roundMoney((monthlyEmi * ownership.myPercentage) / 100),
        othersShare: prorateRepaymentProgress(progress, ownership.othersPercentage),
        othersMonthlyShare: roundMoney((monthlyEmi * ownership.othersPercentage) / 100),
        participants: buildParticipants(emi, progress, currentUserId),
    };

    return {
        id: emi.id,
        itemName: emi.itemName,
        tag: nullIfBlank(emi.tag),
        notes: nullIfBlank(emi.notes),
        isCompleted: !!emi.isCompleted,
        isArchived: !!emi.isArchived,
        createdAt: emi.createdAt ?? null,
        updatedAt: emi.updatedAt ?? null,
        terms: {
            principal: coerceOptionalNumber(emi.principal),
            interestRatePercent: coerceOptionalNumber(emi.interestRate),
            tenureMonths: coerceOptionalNumber(emi.tenure),
            billDate: toIsoDate(emi.billDate),
            endDate: toIsoDate(emi.endDate),
            gstRatePercent: coerceOptionalNumber(emi.gst),
            interestDiscount: coerceOptionalNumber(emi.interestDiscount),
            interestDiscountType: emi.interestDiscountType,
            processingFee: coerceOptionalNumber(emi.processingFee),
            processingFeeGstPercent: coerceOptionalNumber(emi.processingFeeGst),
        },
        totals: {
            monthlyEmi,
            totalInterest: coerceOptionalNumber(emi.totalInterest),
            totalGst: coerceOptionalNumber(emi.totalGST),
            totalOutflow: coerceOptionalNumber(emi.totalLoan),
        },
        progress,
        ownership: exportedOwnership,
        sharedWith: (emi.sharedWith ?? []).map((share) => ({
            email: share.sharedWithUserEmail ?? share.user_profiles?.email ?? null,
            permission: share.permission,
        })),
        amortizationSchedule: buildScheduleRows(emi, progress),
        scenarios,
    };
}

/**
 * Rolls the per-EMI nodes into account-level totals.
 *
 * The three outflow buckets partition every visible rupee exactly once:
 * what the account owner owes, what they front for other people on loans they
 * own, and what belongs to loans somebody else owns. Nothing is counted twice.
 */
export function buildSummary(emis: ExportedEmi[]): DataExportSummary {
    const mine = emptyTotals();
    const financedForOthers = emptyTotals();
    const observed = emptyTotals();
    const ownedGross = emptyTotals();

    const countByOwnership: Record<EmiOwnershipMode, number> = { sole: 0, shared: 0, on_behalf: 0, observer: 0 };
    const rollups = new Map<string, ExportedParticipantRollup>();

    let activeCount = 0;
    let completedCount = 0;
    let archivedCount = 0;

    for (const emi of emis) {
        const { ownership } = emi;
        countByOwnership[ownership.mode] += 1;

        if (emi.isArchived) archivedCount += 1;
        if (emi.isCompleted) completedCount += 1;
        const isActive = !emi.isCompleted && !emi.isArchived;
        if (isActive) activeCount += 1;

        addToTotals(mine, ownership.myShare, isActive ? ownership.myMonthlyShare : 0);

        if (ownership.isOwner) {
            addToTotals(financedForOthers, ownership.othersShare, isActive ? ownership.othersMonthlyShare : 0);
            addToTotals(ownedGross, emi.progress, isActive ? emi.totals.monthlyEmi : 0);
        } else {
            addToTotals(observed, ownership.othersShare, isActive ? ownership.othersMonthlyShare : 0);
        }

        for (const participant of ownership.participants) {
            const existing = rollups.get(participant.key);
            const next: ExportedParticipantRollup = existing ?? {
                key: participant.key,
                name: participant.name,
                email: participant.email,
                isExternal: participant.isExternal,
                isCurrentUser: participant.isCurrentUser,
                emiCount: 0,
                monthlyShare: 0,
                paid: 0,
                remaining: 0,
                lifetime: 0,
            };

            next.emiCount += 1;
            next.monthlyShare = roundMoney(next.monthlyShare + (isActive ? participant.monthlyShare : 0));
            next.paid = roundMoney(next.paid + participant.share.paid.total);
            next.remaining = roundMoney(next.remaining + participant.share.remaining.total);
            next.lifetime = roundMoney(next.lifetime + participant.share.lifetime.total);
            rollups.set(participant.key, next);
        }
    }

    return {
        emiCount: emis.length,
        activeCount,
        completedCount,
        archivedCount,
        countByOwnership,
        mine,
        financedForOthers,
        observed,
        ownedGross,
        participants: [...rollups.values()].sort((a, b) => b.remaining - a.remaining),
    };
}

export interface CreditCardExportInput {
    issuers: ICreditCardIssuer[];
    payments: ICreditCardPaymentEntry[];
    bills: ICreditCardBillEntry[];
    trackerYears: ICreditCardTrackerYear[];
}

/** Denormalises card and issuer names onto every entry so a row reads on its own. */
export function buildCreditCards({
    issuers,
    payments,
    bills,
    trackerYears,
}: CreditCardExportInput): ExportedCreditCards {
    const cardLookup = new Map<string, { cardName: string; issuerName: string }>();
    for (const issuer of issuers) {
        for (const card of issuer.cards) {
            cardLookup.set(card.id, { cardName: card.name, issuerName: issuer.name });
        }
    }

    const resolveCard = (cardId: string) =>
        cardLookup.get(cardId) ?? { cardName: 'Unknown card', issuerName: 'Unknown issuer' };
    const financialYearOf = (monthKey: string): string => getFinancialYearForDate(new Date(`${monthKey}T00:00:00`)).key;

    const exportedPayments: ExportedCreditCardPayment[] = payments.map((entry) => {
        const { cardName, issuerName } = resolveCard(entry.cardId);
        return {
            cardId: entry.cardId,
            cardName,
            issuerName,
            periodMonth: entry.periodMonth,
            financialYear: financialYearOf(entry.periodMonth),
            amount: entry.amount,
            cashAmount: entry.cashAmount,
            nonCashAmount: roundMoney(entry.amount - entry.cashAmount),
            note: nullIfBlank(entry.note),
        };
    });

    const exportedBills: ExportedCreditCardBill[] = bills.map((entry) => {
        const { cardName, issuerName } = resolveCard(entry.cardId);
        return {
            cardId: entry.cardId,
            cardName,
            issuerName,
            statementMonth: entry.statementMonth,
            financialYear: financialYearOf(entry.statementMonth),
            status: entry.status,
            totalDue: entry.totalDue,
            minimumDue: entry.minimumDue,
            statementDate: entry.statementDate,
            dueDate: entry.dueDate,
            note: nullIfBlank(entry.note),
        };
    });

    return {
        issuers: issuers.map((issuer) => ({
            id: issuer.id,
            name: issuer.name,
            color: issuer.color,
            cards: issuer.cards.map((card) => ({
                id: card.id,
                name: card.name,
                last4: card.last4,
                isActive: card.isActive,
                statementDay: card.statementDay,
                dueDay: card.dueDay,
                creditLimit: card.creditLimit,
            })),
        })),
        trackerYears: trackerYears.map((year) => ({
            financialYear: year.financialYear,
            notes: nullIfBlank(year.notes),
            thresholdAmount: year.thresholdAmount,
            cashThresholdAmount: year.cashThresholdAmount,
        })),
        payments: exportedPayments,
        bills: exportedBills,
    };
}

export interface BuildDataExportInput {
    scope: DataExportScope;
    account: AccountDetails;
    emis: IEmi[];
    /** Keyed by EMI id. Absent entries export as an empty scenario list. */
    scenariosByEmiId?: Record<string, ILoanScenario[]>;
    creditCards?: CreditCardExportInput;
    generatedAt?: Date;
}

export function buildDataExportDocument({
    scope,
    account,
    emis,
    scenariosByEmiId = {},
    creditCards,
    generatedAt = new Date(),
}: BuildDataExportInput): DataExportDocument {
    const exportedEmis = emis.map((emi) =>
        buildExportedEmi(emi, account.id, scenariosByEmiId[emi.id] ?? [], generatedAt)
    );

    return {
        schemaVersion: DATA_EXPORT_SCHEMA_VERSION,
        generatedAt: generatedAt.toISOString(),
        scope,
        source: { app: 'Emitrax', url: APP_URL },
        account: {
            userId: account.id,
            email: account.email,
            displayName: account.displayName,
            currency: account.preferences.currency,
            locale: account.preferences.locale,
            numberFormat: account.preferences.numberFormat,
        },
        glossary: EXPORT_GLOSSARY,
        summary: buildSummary(exportedEmis),
        emis: exportedEmis,
        ...(creditCards ? { creditCards: buildCreditCards(creditCards) } : {}),
    };
}
