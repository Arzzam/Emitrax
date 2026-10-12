import { getCurrencyMeta } from '@/utils/numberFormat';

/**
 * Money rounding precision for the calculation modules (EMI, amortization,
 * repayment progress, foreclosure scenarios, JSON export).
 *
 * Kept as one module-level setting rather than a parameter on every calc
 * function, because some calc callers have no access to preferences - the EMI
 * service normalises totals on read - and a parameter defaulting to 2 there
 * would silently disagree with the rest. The store keeps it in sync with the
 * account currency on every dispatch (store.ts), synchronously, before any
 * component recalculates.
 *
 * Clamped to 2..3:
 *  - never below 2, so zero-decimal currencies (JPY, KRW, IDR, PKR) keep the
 *    exact math every existing EMI was computed with; display already shows
 *    them without decimals, and rounding each of 360 rows to a whole unit
 *    would only add drift.
 *  - never above 3, the scale of the money columns
 *    (supabase_money_three_decimals.sql).
 *
 * So in practice: 2 everywhere, 3 for KWD / BHD / OMR.
 *
 * See context/plan/currency-and-number-formatting-plan.md, Phase 6.
 */

const DEFAULT_MONEY_FRACTION_DIGITS = 2;
const MAX_MONEY_FRACTION_DIGITS = 3;

let moneyFractionDigits = DEFAULT_MONEY_FRACTION_DIGITS;
let syncedKey = '';

export function getMoneyFractionDigits(): number {
    return moneyFractionDigits;
}

export function setMoneyFractionDigits(currencyFractionDigits: number): void {
    const digits = Number.isFinite(currencyFractionDigits)
        ? Math.trunc(currencyFractionDigits)
        : DEFAULT_MONEY_FRACTION_DIGITS;
    moneyFractionDigits = Math.min(MAX_MONEY_FRACTION_DIGITS, Math.max(DEFAULT_MONEY_FRACTION_DIGITS, digits));
}

/** Derives the precision from the account currency. Cheap to call on every dispatch. */
export function syncMoneyPrecision(currency: string, locale: string): void {
    const key = `${currency}|${locale}`;
    if (key === syncedKey) return;
    syncedKey = key;
    setMoneyFractionDigits(getCurrencyMeta(currency, locale).fractionDigits);
}

/**
 * Rounds via `toFixed`, exactly as the calc modules always have. Not
 * `Math.round(v * 100) / 100`: the two disagree on some floats (1.115), and
 * INR results must stay byte-identical.
 */
export function roundMoney(value: number, fractionDigits: number = moneyFractionDigits): number {
    return Number(value.toFixed(fractionDigits));
}

/** A money value as a fixed-precision string, for the amortization schedule rows. */
export function toMoneyString(value: number): string {
    return value.toFixed(moneyFractionDigits);
}

/**
 * Runs `fn` at the precision of one loan's currency, then restores the
 * previous precision. Calc entry points that take an EMI wrap themselves in
 * this, so a KWD loan calculates at 3 decimals inside an INR account. Safe
 * because every calc is synchronous. No currency -> the store-synced default.
 */
export function withMoneyPrecision<T>(currency: string | null | undefined, fn: () => T): T {
    if (!currency) return fn();
    const previous = moneyFractionDigits;
    setMoneyFractionDigits(getCurrencyMeta(currency, 'en').fractionDigits);
    try {
        return fn();
    } finally {
        moneyFractionDigits = previous;
    }
}
