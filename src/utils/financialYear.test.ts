import { describe, expect, it } from 'vitest';

import {
    addMonthsToPeriodMonth,
    formatFinancialYearKey,
    getCurrentFinancialYear,
    getElapsedMonthCount,
    getFinancialYear,
    getFinancialYearForDate,
    getFinancialYearMonths,
    getFinancialYearRange,
    getPeriodMonthKey,
    isMonthInFinancialYear,
    listSelectableFinancialYears,
    parseFinancialYearKey,
} from '@/utils/financialYear';

describe('getFinancialYearForDate', () => {
    it('treats April 1 as the first day of a new financial year', () => {
        expect(getFinancialYearForDate(new Date(2026, 3, 1)).key).toBe('2026-27');
    });

    it('treats March 31 as the last day of the previous financial year', () => {
        expect(getFinancialYearForDate(new Date(2026, 2, 31)).key).toBe('2025-26');
    });

    it('maps January, February and March to the previous start year', () => {
        expect(getFinancialYearForDate(new Date(2027, 0, 15)).key).toBe('2026-27');
        expect(getFinancialYearForDate(new Date(2027, 1, 15)).key).toBe('2026-27');
        expect(getFinancialYearForDate(new Date(2027, 2, 15)).key).toBe('2026-27');
    });

    it('maps April through December to the current start year', () => {
        expect(getFinancialYearForDate(new Date(2026, 3, 30)).key).toBe('2026-27');
        expect(getFinancialYearForDate(new Date(2026, 11, 31)).key).toBe('2026-27');
    });

    it('exposes start and end dates on the financial year boundaries', () => {
        const financialYear = getFinancialYearForDate(new Date(2026, 7, 10));
        expect(financialYear.startDate.getFullYear()).toBe(2026);
        expect(financialYear.startDate.getMonth()).toBe(3);
        expect(financialYear.startDate.getDate()).toBe(1);
        expect(financialYear.endDate.getFullYear()).toBe(2027);
        expect(financialYear.endDate.getMonth()).toBe(2);
        expect(financialYear.endDate.getDate()).toBe(31);
    });

    it('builds readable labels', () => {
        const financialYear = getFinancialYearForDate(new Date(2026, 3, 1));
        expect(financialYear.label).toBe('FY 2026-27');
        expect(financialYear.longLabel).toBe('FY 2026-27 (Apr 2026 - Mar 2027)');
    });
});

describe('getCurrentFinancialYear', () => {
    it('resolves from the supplied reference date', () => {
        expect(getCurrentFinancialYear(new Date(2025, 5, 1)).key).toBe('2025-26');
    });
});

describe('formatFinancialYearKey', () => {
    it('formats a standard year', () => {
        expect(formatFinancialYearKey(2026)).toBe('2026-27');
    });

    it('pads single-digit end years', () => {
        expect(formatFinancialYearKey(2008)).toBe('2008-09');
    });

    it('wraps the end year across a century boundary', () => {
        expect(formatFinancialYearKey(2099)).toBe('2099-00');
        expect(formatFinancialYearKey(1999)).toBe('1999-00');
    });
});

describe('parseFinancialYearKey', () => {
    it('parses a valid key', () => {
        const financialYear = parseFinancialYearKey('2026-27');
        expect(financialYear?.startYear).toBe(2026);
        expect(financialYear?.endYear).toBe(2027);
    });

    it('parses a century-boundary key', () => {
        expect(parseFinancialYearKey('2099-00')?.startYear).toBe(2099);
    });

    it('rejects non-consecutive years', () => {
        expect(parseFinancialYearKey('2026-28')).toBeNull();
    });

    it('rejects malformed keys', () => {
        expect(parseFinancialYearKey('26-27')).toBeNull();
        expect(parseFinancialYearKey('2026')).toBeNull();
        expect(parseFinancialYearKey('')).toBeNull();
        expect(parseFinancialYearKey('2026-2027')).toBeNull();
        expect(parseFinancialYearKey('abcd-ef')).toBeNull();
    });

    it('tolerates surrounding whitespace', () => {
        expect(parseFinancialYearKey(' 2026-27 ')?.key).toBe('2026-27');
    });
});

describe('getFinancialYear', () => {
    it('throws on an invalid key', () => {
        expect(() => getFinancialYear('2026-28')).toThrow(/Invalid financial year key/);
    });
});

describe('getPeriodMonthKey', () => {
    it('serializes to the first of the month in local time', () => {
        // A naive toISOString() here would yield 2026-03-31 in IST.
        expect(getPeriodMonthKey(new Date(2026, 3, 1))).toBe('2026-04-01');
    });

    it('normalizes any day of the month to the first', () => {
        expect(getPeriodMonthKey(new Date(2026, 3, 27))).toBe('2026-04-01');
        expect(getPeriodMonthKey(new Date(2027, 0, 31))).toBe('2027-01-01');
    });
});

describe('getFinancialYearMonths', () => {
    const reference = new Date(2026, 7, 15); // Aug 2026

    it('returns exactly twelve months ordered April to March', () => {
        const months = getFinancialYearMonths('2026-27', reference);
        expect(months).toHaveLength(12);
        expect(months.map((month) => month.periodMonth)).toEqual([
            '2026-04-01',
            '2026-05-01',
            '2026-06-01',
            '2026-07-01',
            '2026-08-01',
            '2026-09-01',
            '2026-10-01',
            '2026-11-01',
            '2026-12-01',
            '2027-01-01',
            '2027-02-01',
            '2027-03-01',
        ]);
    });

    it('assigns sequential indexes and the correct calendar years', () => {
        const months = getFinancialYearMonths('2026-27', reference);
        expect(months[0].index).toBe(0);
        expect(months[0].shortLabel).toBe('Apr');
        expect(months[0].calendarYear).toBe(2026);
        expect(months[11].index).toBe(11);
        expect(months[11].shortLabel).toBe('Mar');
        expect(months[11].calendarYear).toBe(2027);
    });

    it('handles a leap February without drifting', () => {
        const months = getFinancialYearMonths('2027-28', reference);
        const february = months.find((month) => month.key === '2028-02');
        expect(february?.periodMonth).toBe('2028-02-01');
        expect(months.map((month) => month.key.slice(5))).toEqual([
            '04',
            '05',
            '06',
            '07',
            '08',
            '09',
            '10',
            '11',
            '12',
            '01',
            '02',
            '03',
        ]);
    });

    it('flags months after the reference month as future', () => {
        const months = getFinancialYearMonths('2026-27', reference);
        expect(months.find((month) => month.key === '2026-07')?.isFuture).toBe(false);
        expect(months.find((month) => month.key === '2026-08')?.isFuture).toBe(false);
        expect(months.find((month) => month.key === '2026-09')?.isFuture).toBe(true);
    });

    it('marks every month of a past financial year as not future', () => {
        const months = getFinancialYearMonths('2024-25', reference);
        expect(months.every((month) => !month.isFuture)).toBe(true);
    });
});

describe('getFinancialYearRange', () => {
    it('returns a half-open range spanning the financial year', () => {
        expect(getFinancialYearRange('2026-27')).toEqual({
            startDate: '2026-04-01',
            endDateExclusive: '2027-04-01',
        });
    });
});

describe('isMonthInFinancialYear', () => {
    it('accepts months inside the year', () => {
        expect(isMonthInFinancialYear('2026-04-01', '2026-27')).toBe(true);
        expect(isMonthInFinancialYear('2027-03-01', '2026-27')).toBe(true);
    });

    it('rejects months outside the year', () => {
        expect(isMonthInFinancialYear('2026-03-01', '2026-27')).toBe(false);
        expect(isMonthInFinancialYear('2027-04-01', '2026-27')).toBe(false);
    });

    it('rejects unparseable input', () => {
        expect(isMonthInFinancialYear('not-a-date', '2026-27')).toBe(false);
    });
});

describe('getElapsedMonthCount', () => {
    it('returns twelve for a past financial year', () => {
        expect(getElapsedMonthCount('2024-25', new Date(2026, 7, 15))).toBe(12);
    });

    it('returns zero for a future financial year', () => {
        expect(getElapsedMonthCount('2027-28', new Date(2026, 7, 15))).toBe(0);
    });

    it('counts the in-progress month for the current financial year', () => {
        expect(getElapsedMonthCount('2026-27', new Date(2026, 3, 1))).toBe(1); // April
        expect(getElapsedMonthCount('2026-27', new Date(2026, 7, 15))).toBe(5); // August
        expect(getElapsedMonthCount('2026-27', new Date(2026, 11, 31))).toBe(9); // December
        expect(getElapsedMonthCount('2026-27', new Date(2027, 0, 1))).toBe(10); // January
        expect(getElapsedMonthCount('2026-27', new Date(2027, 2, 31))).toBe(12); // March
    });
});

describe('listSelectableFinancialYears', () => {
    const today = new Date(2026, 7, 15);

    it('returns the current year plus the requested past years, newest first', () => {
        const years = listSelectableFinancialYears({ today, pastYears: 3 });
        expect(years.map((year) => year.key)).toEqual(['2026-27', '2025-26', '2024-25', '2023-24']);
    });

    it('unions extra keys that hold data', () => {
        const years = listSelectableFinancialYears({ today, pastYears: 1, include: ['2020-21'] });
        expect(years.map((year) => year.key)).toEqual(['2026-27', '2025-26', '2020-21']);
    });

    it('never returns a future financial year', () => {
        const years = listSelectableFinancialYears({ today, pastYears: 1, include: ['2030-31'] });
        expect(years.map((year) => year.key)).toEqual(['2026-27', '2025-26']);
    });

    it('dedupes included keys already covered by pastYears', () => {
        const years = listSelectableFinancialYears({ today, pastYears: 2, include: ['2025-26'] });
        expect(years.map((year) => year.key)).toEqual(['2026-27', '2025-26', '2024-25']);
    });

    it('ignores malformed included keys', () => {
        const years = listSelectableFinancialYears({ today, pastYears: 1, include: ['nonsense', '2026-29'] });
        expect(years.map((year) => year.key)).toEqual(['2026-27', '2025-26']);
    });
});

describe('addMonthsToPeriodMonth', () => {
    it('crosses the financial year boundary', () => {
        expect(addMonthsToPeriodMonth('2026-03-01', 1)).toBe('2026-04-01');
    });

    it('crosses the calendar year boundary', () => {
        expect(addMonthsToPeriodMonth('2026-12-01', 1)).toBe('2027-01-01');
    });

    it('re-anchors a non-first-of-month input instead of overflowing', () => {
        // Naively adding a month to 31 Jan lands in March; anchoring to day 1 does not.
        expect(addMonthsToPeriodMonth('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('is identity at zero and goes backwards on a negative offset', () => {
        expect(addMonthsToPeriodMonth('2026-08-01', 0)).toBe('2026-08-01');
        expect(addMonthsToPeriodMonth('2026-04-01', -1)).toBe('2026-03-01');
    });

    it('shifts by more than a year', () => {
        expect(addMonthsToPeriodMonth('2026-08-01', 13)).toBe('2027-09-01');
    });

    it('throws on an unparseable input', () => {
        expect(() => addMonthsToPeriodMonth('nonsense', 1)).toThrow(/Invalid period month/);
    });
});
