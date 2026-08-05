import {
    ICreditCard,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    IssuerAggregate,
    SFT_CASH_THRESHOLD,
    SFT_TOTAL_THRESHOLD,
    ThresholdStatus,
    TrackerEntryMatrix,
    TrackerMatrix,
} from '@/types/creditCard.types';
import { FinancialYearMonth } from '@/utils/financialYear';

const WATCH_RATIO = 0.6;
const RISK_RATIO = 0.85;
const MONTHS_IN_YEAR = 12;

/**
 * Indexes entries by card and month and precomputes the totals the grid needs.
 * Entries outside the supplied months are ignored, so a stale query result
 * cannot leak into another financial year's totals.
 */
export function buildTrackerMatrix(
    cards: ICreditCard[],
    entries: ICreditCardPaymentEntry[],
    months: FinancialYearMonth[]
): TrackerMatrix {
    const cardIssuer = new Map(cards.map((card) => [card.id, card.issuerId]));
    const monthKeys = new Set(months.map((month) => month.periodMonth));

    const matrix: TrackerEntryMatrix = new Map();
    const monthTotals = new Map<string, number>();
    const monthIssuerTotals = new Map<string, Map<string, number>>();
    const cardTotals = new Map<string, number>();
    let grandTotal = 0;

    months.forEach((month) => {
        monthTotals.set(month.periodMonth, 0);
        monthIssuerTotals.set(month.periodMonth, new Map());
    });

    entries.forEach((entry) => {
        if (!monthKeys.has(entry.periodMonth) || !cardIssuer.has(entry.cardId)) {
            return;
        }

        const byMonth = matrix.get(entry.cardId) ?? new Map<string, ICreditCardPaymentEntry>();
        byMonth.set(entry.periodMonth, entry);
        matrix.set(entry.cardId, byMonth);

        monthTotals.set(entry.periodMonth, (monthTotals.get(entry.periodMonth) ?? 0) + entry.amount);

        const issuerId = cardIssuer.get(entry.cardId)!;
        const issuerTotals = monthIssuerTotals.get(entry.periodMonth)!;
        issuerTotals.set(issuerId, (issuerTotals.get(issuerId) ?? 0) + entry.amount);

        cardTotals.set(entry.cardId, (cardTotals.get(entry.cardId) ?? 0) + entry.amount);
        grandTotal += entry.amount;
    });

    return { entries: matrix, monthTotals, monthIssuerTotals, cardTotals, grandTotal };
}

/**
 * Straight-line projection of a full financial year from what has been logged
 * so far. Returns the amount unchanged once all twelve months have elapsed.
 */
export function projectYearEnd(totalSoFar: number, elapsedMonths: number): number {
    if (elapsedMonths <= 0) {
        return 0;
    }
    if (elapsedMonths >= MONTHS_IN_YEAR) {
        return totalSoFar;
    }
    return (totalSoFar / elapsedMonths) * MONTHS_IN_YEAR;
}

/**
 * Bands an issuer against its threshold. `breached` means the limit is already
 * crossed and the bank will report it; the softer bands look at whichever is
 * larger of the actual and the projected total.
 */
export function getThresholdStatus(actual: number, projected: number, threshold: number): ThresholdStatus {
    if (threshold <= 0) {
        return 'safe';
    }
    if (actual >= threshold) {
        return 'breached';
    }

    const ratio = Math.max(actual, projected) / threshold;
    if (ratio >= RISK_RATIO) {
        return 'risk';
    }
    if (ratio >= WATCH_RATIO) {
        return 'watch';
    }
    return 'safe';
}

/**
 * Rolls per-card entries up to the issuer, which is the unit the SFT threshold
 * actually applies to. Issuers with no cards still appear, at zero.
 */
export function aggregateByIssuer(
    issuers: ICreditCardIssuer[],
    entries: ICreditCardPaymentEntry[],
    elapsedMonths: number,
    thresholds: { total: number; cash: number } = { total: SFT_TOTAL_THRESHOLD, cash: SFT_CASH_THRESHOLD }
): IssuerAggregate[] {
    const cardIssuer = new Map<string, string>();
    issuers.forEach((issuer) => issuer.cards.forEach((card) => cardIssuer.set(card.id, issuer.id)));

    const totals = new Map<string, { total: number; cash: number }>();
    entries.forEach((entry) => {
        const issuerId = cardIssuer.get(entry.cardId);
        if (!issuerId) {
            return;
        }
        const bucket = totals.get(issuerId) ?? { total: 0, cash: 0 };
        bucket.total += entry.amount;
        bucket.cash += entry.cashAmount;
        totals.set(issuerId, bucket);
    });

    return issuers.map((issuer) => {
        const { total = 0, cash = 0 } = totals.get(issuer.id) ?? {};
        const projectedTotal = projectYearEnd(total, elapsedMonths);
        const projectedCash = projectYearEnd(cash, elapsedMonths);

        return {
            issuerId: issuer.id,
            name: issuer.name,
            color: issuer.color,
            cardCount: issuer.cards.length,
            activeCardCount: issuer.cards.filter((card) => card.isActive).length,
            totalPaid: total,
            cashPaid: cash,
            nonCashPaid: total - cash,
            projectedTotal,
            status: getThresholdStatus(total, projectedTotal, thresholds.total),
            cashStatus: getThresholdStatus(cash, projectedCash, thresholds.cash),
        };
    });
}
