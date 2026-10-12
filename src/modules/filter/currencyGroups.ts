import type { IEmi } from '@/types/emi.types';

/**
 * Dashboard grouping by currency. Amounts in different currencies are never
 * added together; the dashboard shows one currency's stats at a time.
 *
 * See context/plan/per-emi-currency-plan.md §4.4.
 */

export interface CurrencyGroup {
    currency: string;
    count: number;
}

/** The EMI's currency, or the account default for a row written before per-EMI currency existed. */
export function getEmiCurrency(emi: Pick<IEmi, 'currency'>, accountCurrency: string): string {
    return emi.currency || accountCurrency;
}

/** Account currency first, then by EMI count (desc), then by code for a stable order. */
export function getCurrencyGroups(emis: Pick<IEmi, 'currency'>[], accountCurrency: string): CurrencyGroup[] {
    const counts = new Map<string, number>();
    emis.forEach((emi) => {
        const currency = getEmiCurrency(emi, accountCurrency);
        counts.set(currency, (counts.get(currency) ?? 0) + 1);
    });
    return Array.from(counts, ([currency, count]) => ({ currency, count })).sort(
        (a, b) =>
            Number(b.currency === accountCurrency) - Number(a.currency === accountCurrency) ||
            b.count - a.count ||
            a.currency.localeCompare(b.currency)
    );
}

/**
 * The currency the dashboard shows: the user's pick while it still has EMIs,
 * else the account currency if it has any, else the largest group.
 */
export function resolveStatsCurrency(
    groups: CurrencyGroup[],
    selected: string | null,
    accountCurrency: string
): string {
    const available = new Set(groups.map((group) => group.currency));
    if (selected && available.has(selected)) return selected;
    if (available.has(accountCurrency)) return accountCurrency;
    return groups[0]?.currency ?? accountCurrency;
}
