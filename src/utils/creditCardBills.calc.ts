import { format, parseISO } from 'date-fns';

import {
    ICreditCard,
    ICreditCardBillEntry,
    ICreditCardIssuer,
    IssuerBillAggregate,
    SaveBillEntryInput,
} from '@/types/creditCard.types';
import { getThresholdStatus, projectYearEnd, TrackerSeriesAccessors } from '@/utils/creditCardTracker.calc';
import { addMonthsToPeriodMonth, FinancialYearMonth, getFinancialYearForDate } from '@/utils/financialYear';

/**
 * Bill / statement maths for the credit-card tracker.
 *
 * Kept separate from `creditCardTracker.calc.ts` so that module stays about the
 * SFT payment thresholds. The generic pieces there - `projectYearEnd`,
 * `getThresholdStatus`, `buildTrackerMatrix` - are reused as-is.
 *
 * Domain rule: a bill is filed under the month its STATEMENT WAS GENERATED, so
 * bill month N is normally settled by a payment in month N+1.
 */

const DATE_FORMAT = 'yyyy-MM-dd';

/** How the expected payment month was arrived at, for display and debugging. */
export type ExpectedPaymentBasis = 'dated' | 'card' | 'assumed';

export interface ExpectedPayment {
    /** First-of-month key the settling payment should appear in. */
    periodMonth: string;
    basis: ExpectedPaymentBasis;
    /** True when the expected month falls in a different financial year. */
    crossesFinancialYear: boolean;
}

type CardCycle = Pick<ICreditCard, 'statementDay' | 'dueDay'>;
type BillDates = Pick<ICreditCardBillEntry, 'statementDate' | 'dueDate'>;

/** Largest valid day in the month a first-of-month key points at. */
function daysInMonth(periodMonth: string): number {
    const anchor = parseISO(periodMonth);
    return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
}

/** First-of-month key, with the day clamped to the month's length. */
function isoDayInMonth(periodMonth: string, day: number): string {
    const anchor = parseISO(periodMonth);
    const clamped = Math.min(Math.max(day, 1), daysInMonth(periodMonth));
    return format(new Date(anchor.getFullYear(), anchor.getMonth(), clamped), DATE_FORMAT);
}

/**
 * The month a bill's settling payment should appear in.
 *
 * Precedence matters: the row's own dates always win over the card's configured
 * days. That is what makes a bank changing its cycle mid-year work - historical
 * rows keep the dates that were actually in force.
 *
 * 1. `dated`    both row dates present -> the month of dueDate
 * 2. `card`     both card days known   -> dueDay > statementDay ? M : M+1
 * 3. `assumed`  otherwise              -> M+1, the normal case
 *
 * Note the strict `>`: a due day equal to the statement day means the following
 * month, not the same day.
 */
export function getExpectedPaymentMonth(
    statementMonth: string,
    card: CardCycle,
    entry?: BillDates | null
): ExpectedPayment {
    const statementFy = getFinancialYearForDate(parseISO(statementMonth)).key;

    const resolve = (periodMonth: string, basis: ExpectedPaymentBasis): ExpectedPayment => ({
        periodMonth,
        basis,
        crossesFinancialYear: getFinancialYearForDate(parseISO(periodMonth)).key !== statementFy,
    });

    if (entry?.statementDate && entry?.dueDate) {
        const due = parseISO(entry.dueDate);
        return resolve(format(new Date(due.getFullYear(), due.getMonth(), 1), DATE_FORMAT), 'dated');
    }

    if (card.statementDay != null && card.dueDay != null) {
        const sameMonth = card.dueDay > card.statementDay;
        return resolve(sameMonth ? statementMonth : addMonthsToPeriodMonth(statementMonth, 1), 'card');
    }

    return resolve(addMonthsToPeriodMonth(statementMonth, 1), 'assumed');
}

/**
 * Suggested statement and due dates for a bill row, from the card's configured
 * days. Days are clamped to the month's length, so a statement day of 31 gives
 * 28 (or 29) in February rather than overflowing into March.
 *
 * These are placeholders for the editor to show - never auto-committed, because
 * a row's stored dates are the record of what was actually in force.
 */
export function getBillDefaultDates(
    statementMonth: string,
    card: CardCycle
): { statementDate: string | null; dueDate: string | null } {
    if (card.statementDay == null) {
        return { statementDate: null, dueDate: null };
    }

    const statementDate = isoDayInMonth(statementMonth, card.statementDay);

    if (card.dueDay == null) {
        return { statementDate, dueDate: null };
    }

    // A due day at or before the statement day falls in the following month.
    const dueMonth = card.dueDay > card.statementDay ? statementMonth : addMonthsToPeriodMonth(statementMonth, 1);

    return { statementDate, dueDate: isoDayInMonth(dueMonth, card.dueDay) };
}

/**
 * True when an entry carries no information and its row should be deleted.
 *
 * A `no_statement` row is never empty - "the bank issued nothing this month" is
 * itself information, and distinct from both a zero bill and an untouched cell.
 * A `totalDue` of 0 is likewise a real statement, not an empty one.
 */
export function isEmptyBillEntry(input: SaveBillEntryInput): boolean {
    if (input.status === 'no_statement') {
        return false;
    }

    return (
        input.totalDue == null &&
        input.minimumDue == null &&
        !input.statementDate &&
        !input.dueDate &&
        !input.note?.trim()
    );
}

/** Signed amount a bill row contributes to every total. */
export function getBillAmount(entry: ICreditCardBillEntry): number {
    return entry.status === 'issued' ? (entry.totalDue ?? 0) : 0;
}

export const BILL_SERIES: TrackerSeriesAccessors<ICreditCardBillEntry> = {
    getMonth: (entry) => entry.statementMonth,
    getCardId: (entry) => entry.cardId,
    getAmount: getBillAmount,
};

/**
 * Rolls per-card bills up to the issuer.
 *
 * Unlike payments, there is no statutory threshold here - nothing about a bill
 * is reportable. The only defensible limit comparison is the peak monthly bill
 * against the issuer's combined credit limit, and only when every card has one:
 * a limit constrains outstanding at a point in time, never an annual total.
 */
export function aggregateBillsByIssuer(
    issuers: ICreditCardIssuer[],
    entries: ICreditCardBillEntry[],
    months: FinancialYearMonth[],
    elapsedMonths: number
): IssuerBillAggregate[] {
    const monthKeys = new Set(months.map((month) => month.periodMonth));
    const cardIssuer = new Map<string, string>();
    issuers.forEach((issuer) => issuer.cards.forEach((card) => cardIssuer.set(card.id, issuer.id)));

    // issuerId -> monthKey -> { billed, hasIssued, hasNoStatement }
    const byIssuer = new Map<string, Map<string, { billed: number; issued: boolean; noStatement: boolean }>>();

    entries.forEach((entry) => {
        const issuerId = cardIssuer.get(entry.cardId);
        if (!issuerId || !monthKeys.has(entry.statementMonth)) {
            return;
        }

        const monthMap = byIssuer.get(issuerId) ?? new Map();
        const bucket = monthMap.get(entry.statementMonth) ?? { billed: 0, issued: false, noStatement: false };

        if (entry.status === 'issued') {
            bucket.billed += entry.totalDue ?? 0;
            bucket.issued = true;
        } else {
            bucket.noStatement = true;
        }

        monthMap.set(entry.statementMonth, bucket);
        byIssuer.set(issuerId, monthMap);
    });

    return issuers.map((issuer) => {
        const monthMap = byIssuer.get(issuer.id) ?? new Map();

        let totalBilled = 0;
        let monthsWithStatement = 0;
        let monthsWithNoStatement = 0;
        let peakBill = 0;
        let peakMonth: string | null = null;

        months.forEach((month) => {
            const bucket = monthMap.get(month.periodMonth);
            if (!bucket) {
                return;
            }

            if (bucket.issued) {
                totalBilled += bucket.billed;
                monthsWithStatement += 1;
                if (peakMonth === null || bucket.billed > peakBill) {
                    peakBill = bucket.billed;
                    peakMonth = month.periodMonth;
                }
            } else if (bucket.noStatement) {
                monthsWithNoStatement += 1;
            }
        });

        const monthsNotEntered = months.length - monthsWithStatement - monthsWithNoStatement;

        // Divide by months that actually produced a statement - a no-statement
        // month would otherwise drag the average down misleadingly.
        const averageBill = monthsWithStatement > 0 ? totalBilled / monthsWithStatement : 0;

        const limits = issuer.cards.map((card) => card.creditLimit);
        const combinedLimit =
            issuer.cards.length > 0 && limits.every((limit) => limit != null)
                ? limits.reduce<number>((sum, limit) => sum + (limit ?? 0), 0)
                : null;

        return {
            issuerId: issuer.id,
            name: issuer.name,
            color: issuer.color,
            cardCount: issuer.cards.length,
            activeCardCount: issuer.cards.filter((card) => card.isActive).length,
            totalBilled,
            monthsWithStatement,
            monthsWithNoStatement,
            monthsNotEntered,
            averageBill,
            peakBill,
            peakMonth,
            projectedTotal: projectYearEnd(totalBilled, elapsedMonths),
            combinedLimit,
            peakStatus: combinedLimit == null ? null : getThresholdStatus(peakBill, peakBill, combinedLimit),
        };
    });
}
