import { addMonths, format, parseISO } from 'date-fns';

/**
 * Indian financial year helpers (April 1 -> March 31).
 *
 * Date handling rules enforced throughout this module:
 * - Dates are always constructed locally via `new Date(year, monthIndex, 1)`.
 * - Dates are always serialized with date-fns `format(date, 'yyyy-MM-dd')`, never
 *   `toISOString()`, which shifts to UTC and yields the previous day in IST.
 * - DB date strings are parsed with `parseISO`, never `new Date(string)`.
 */

/** Month index (0-based, JS convention) on which a financial year starts. */
const FY_START_MONTH_INDEX = 3; // April
const MONTHS_IN_YEAR = 12;
const DATE_FORMAT = 'yyyy-MM-dd';
const FY_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export interface FinancialYear {
    /** Canonical key, e.g. '2026-27'. */
    key: string;
    /** Calendar year the financial year starts in, e.g. 2026. */
    startYear: number;
    /** Calendar year the financial year ends in, e.g. 2027. */
    endYear: number;
    /** e.g. 'FY 2026-27'. */
    label: string;
    /** e.g. 'FY 2026-27 (Apr 2026 - Mar 2027)'. */
    longLabel: string;
    /** Local date for April 1 of the start year. */
    startDate: Date;
    /** Local date for March 31 of the end year. */
    endDate: Date;
}

export interface FinancialYearMonth {
    /** e.g. '2026-04'. */
    key: string;
    /** First day of the month as stored in the database, e.g. '2026-04-01'. */
    periodMonth: string;
    /** Local date for the first day of the month. */
    date: Date;
    /** Position within the financial year: 0 = April ... 11 = March. */
    index: number;
    /** Calendar year this month falls in. */
    calendarYear: number;
    /** e.g. 'Apr 2026'. */
    label: string;
    /** e.g. 'Apr'. */
    shortLabel: string;
    /** True when the month begins after the reference date. */
    isFuture: boolean;
}

export interface ListFinancialYearsOptions {
    /** Reference date used to determine the current financial year. Defaults to now. */
    today?: Date;
    /** How many financial years before the current one to include. Defaults to 5. */
    pastYears?: number;
    /** Extra financial year keys to union in (e.g. years that already hold data). */
    include?: string[];
}

/**
 * Builds the canonical financial year key from its starting calendar year.
 * The end year is reduced modulo 100 so century boundaries stay two digits
 * (2099 -> '2099-00').
 */
export function formatFinancialYearKey(startYear: number): string {
    const endYearSuffix = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearSuffix}`;
}

function buildFinancialYear(startYear: number): FinancialYear {
    const endYear = startYear + 1;
    const key = formatFinancialYearKey(startYear);
    const startDate = new Date(startYear, FY_START_MONTH_INDEX, 1);
    // March 31 is never leap-affected, so a fixed day is safe here.
    const endDate = new Date(endYear, FY_START_MONTH_INDEX - 1, 31);

    return {
        key,
        startYear,
        endYear,
        label: `FY ${key}`,
        longLabel: `FY ${key} (${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')})`,
        startDate,
        endDate,
    };
}

/**
 * Returns the financial year a given date falls in.
 * January, February and March belong to the *previous* start year.
 */
export function getFinancialYearForDate(date: Date): FinancialYear {
    const startYear = date.getMonth() >= FY_START_MONTH_INDEX ? date.getFullYear() : date.getFullYear() - 1;
    return buildFinancialYear(startYear);
}

/** Returns the financial year containing the reference date (defaults to now). */
export function getCurrentFinancialYear(today: Date = new Date()): FinancialYear {
    return getFinancialYearForDate(today);
}

/**
 * Parses a financial year key. Returns null when the key is malformed or the
 * two year components are not consecutive (e.g. '2026-28').
 */
export function parseFinancialYearKey(key: string): FinancialYear | null {
    const match = FY_KEY_PATTERN.exec(key?.trim() ?? '');
    if (!match) {
        return null;
    }

    const startYear = Number(match[1]);
    const endYearSuffix = Number(match[2]);
    if (endYearSuffix !== (startYear + 1) % 100) {
        return null;
    }

    return buildFinancialYear(startYear);
}

/** Like `parseFinancialYearKey` but throws on an invalid key. */
export function getFinancialYear(key: string): FinancialYear {
    const financialYear = parseFinancialYearKey(key);
    if (!financialYear) {
        throw new Error(`Invalid financial year key: "${key}"`);
    }
    return financialYear;
}

/** Serializes a date to the first-of-month string used by `periodMonth` columns. */
export function getPeriodMonthKey(date: Date): string {
    return format(new Date(date.getFullYear(), date.getMonth(), 1), DATE_FORMAT);
}

/**
 * Returns the 12 months of a financial year in order (April -> March).
 * Months are advanced with `addMonths` from a day-1 anchor, so 28/29/30/31-day
 * overflow cannot occur.
 */
export function getFinancialYearMonths(key: string, today: Date = new Date()): FinancialYearMonth[] {
    const { startYear } = getFinancialYear(key);
    const anchor = new Date(startYear, FY_START_MONTH_INDEX, 1);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => {
        const date = addMonths(anchor, index);
        return {
            key: format(date, 'yyyy-MM'),
            periodMonth: format(date, DATE_FORMAT),
            date,
            index,
            calendarYear: date.getFullYear(),
            label: format(date, 'MMM yyyy'),
            shortLabel: format(date, 'MMM'),
            isFuture: date.getTime() > currentMonthStart.getTime(),
        };
    });
}

/**
 * Half-open date range for querying a financial year:
 * `periodMonth >= startDate AND periodMonth < endDateExclusive`.
 */
export function getFinancialYearRange(key: string): { startDate: string; endDateExclusive: string } {
    const { startYear } = getFinancialYear(key);
    return {
        startDate: format(new Date(startYear, FY_START_MONTH_INDEX, 1), DATE_FORMAT),
        endDateExclusive: format(new Date(startYear + 1, FY_START_MONTH_INDEX, 1), DATE_FORMAT),
    };
}

/** True when a `periodMonth` database string falls inside the given financial year. */
export function isMonthInFinancialYear(periodMonth: string, key: string): boolean {
    const parsed = parseISO(periodMonth);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }
    return getFinancialYearForDate(parsed).key === key;
}

/**
 * How many months of a financial year have begun as of the reference date.
 * Past years return 12, future years 0, and the in-progress month counts
 * (a payment made this month is logged this month), so April returns 1.
 */
export function getElapsedMonthCount(key: string, today: Date = new Date()): number {
    const financialYear = getFinancialYear(key);
    const current = getFinancialYearForDate(today);

    if (current.startYear > financialYear.startYear) {
        return MONTHS_IN_YEAR;
    }
    if (current.startYear < financialYear.startYear) {
        return 0;
    }

    const monthIndex = (today.getMonth() - FY_START_MONTH_INDEX + MONTHS_IN_YEAR) % MONTHS_IN_YEAR;
    return monthIndex + 1;
}

/**
 * Financial years offered in the selector: the current year, `pastYears` before
 * it, and any extra keys supplied (typically years that already hold data).
 * Future financial years are never returned. Sorted newest first.
 */
export function listSelectableFinancialYears(options: ListFinancialYearsOptions = {}): FinancialYear[] {
    const { today = new Date(), pastYears = 5, include = [] } = options;
    const current = getCurrentFinancialYear(today);

    const startYears = new Set<number>();
    for (let offset = 0; offset <= Math.max(0, pastYears); offset += 1) {
        startYears.add(current.startYear - offset);
    }

    include.forEach((key) => {
        const parsed = parseFinancialYearKey(key);
        if (parsed && parsed.startYear <= current.startYear) {
            startYears.add(parsed.startYear);
        }
    });

    return Array.from(startYears)
        .sort((a, b) => b - a)
        .map(buildFinancialYear);
}
