import React, { ReactNode, useCallback } from 'react';
import { add, differenceInCalendarDays } from 'date-fns';
import { labelNext, labelPrevious, useDayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import { MONTHS } from './calender.constants';

const CalenderNav = ({
    navView,
    startMonth,
    endMonth,
    displayYears,
    setDisplayYears,
    onPrevClick,
    onNextClick,
    className,
}: {
    navView: 'days' | 'years' | 'months';
    startMonth?: Date;
    endMonth?: Date;
    displayYears: { from: number; to: number };
    setDisplayYears: React.Dispatch<React.SetStateAction<{ from: number; to: number }>>;
    onPrevClick?: (date: Date) => void;
    onNextClick?: (date: Date) => void;
    className?: string;
}) => {
    const { nextMonth, previousMonth, goToMonth } = useDayPicker();

    const isPreviousDisabled = (() => {
        if (navView === 'years') {
            return (
                (startMonth && differenceInCalendarDays(new Date(displayYears.from - 1, 0, 1), startMonth) < 0) ||
                (endMonth && differenceInCalendarDays(new Date(displayYears.from - 1, 0, 1), endMonth) > 0)
            );
        }
        return !previousMonth;
    })();

    const isNextDisabled = (() => {
        if (navView === 'years') {
            return (
                (startMonth && differenceInCalendarDays(new Date(displayYears.to + 1, 0, 1), startMonth) < 0) ||
                (endMonth && differenceInCalendarDays(new Date(displayYears.to + 1, 0, 1), endMonth) > 0)
            );
        }
        return !nextMonth;
    })();

    const handlePreviousClick = useCallback(() => {
        if (navView === 'years') {
            setDisplayYears((prev) => ({
                from: prev.from - (prev.to - prev.from + 1) < 0 ? 0 : prev.from - (prev.to - prev.from + 1),
                to: prev.to - (prev.to - prev.from + 1),
            }));
            onPrevClick?.(new Date(displayYears.from - (displayYears.to - displayYears.from), 0, 1));
            return;
        }
        if (!previousMonth) return;
        goToMonth(previousMonth);
        onPrevClick?.(previousMonth);
    }, [previousMonth, goToMonth, navView, displayYears, setDisplayYears, onPrevClick]);

    const handleNextClick = useCallback(() => {
        if (navView === 'years') {
            setDisplayYears((prev) => ({
                from: prev.from + (prev.to - prev.from + 1),
                to: prev.to + (prev.to - prev.from + 1),
            }));
            onNextClick?.(new Date(displayYears.from + (displayYears.to - displayYears.from), 0, 1));
            return;
        }
        if (!nextMonth) return;
        goToMonth(nextMonth);
        onNextClick?.(nextMonth);
    }, [goToMonth, nextMonth, navView, displayYears, setDisplayYears, onNextClick]);

    return (
        <nav className={cn('flex items-center', className)}>
            <Button
                variant="outline"
                className="absolute left-0 h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
                type="button"
                tabIndex={isPreviousDisabled ? undefined : -1}
                disabled={isPreviousDisabled}
                aria-label={
                    navView === 'years'
                        ? `Go to the previous ${displayYears.to - displayYears.from + 1} years`
                        : labelPrevious(previousMonth)
                }
                onClick={handlePreviousClick}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
                variant="outline"
                className="absolute right-0 h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
                type="button"
                tabIndex={isNextDisabled ? undefined : -1}
                disabled={isNextDisabled}
                aria-label={
                    navView === 'years'
                        ? `Go to the next ${displayYears.to - displayYears.from + 1} years`
                        : labelNext(nextMonth)
                }
                onClick={handleNextClick}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
};

const CalenderCaption = ({
    navView,
    setNavView,
    displayYears,
    date,
}: {
    navView: 'days' | 'years' | 'months';
    setNavView: React.Dispatch<React.SetStateAction<'days' | 'years' | 'months'>>;
    displayYears: { from: number; to: number };
    date: string[];
}) => {
    const month = date[0];
    const year = date[1];

    return (
        <>
            {navView === 'days' && (
                <>
                    <Button
                        className="h-7 w-full truncate text-sm font-medium"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNavView('months')}
                    >
                        {MONTHS.find((m) => m === month)}
                    </Button>
                    <Button
                        className="h-7 w-full truncate text-sm font-medium"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNavView('years')}
                    >
                        {year}
                    </Button>
                </>
            )}
            {navView === 'months' && (
                <Button
                    className="h-7 w-full truncate text-sm font-medium"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNavView('days')}
                >
                    {year}
                </Button>
            )}
            {navView === 'years' && (
                <Button
                    className="h-7 w-full truncate text-sm font-medium"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNavView('days')}
                >
                    {displayYears.from + ' - ' + displayYears.to}
                </Button>
            )}
        </>
    );
};

const CalenderContent = ({
    navView,
    setNavView,
    displayYears,
    startMonth,
    endMonth,
    children,
    className,
    selectedMonth,
    ...props
}: {
    navView: 'days' | 'years' | 'months';
    setNavView: React.Dispatch<React.SetStateAction<'days' | 'years' | 'months'>>;
    displayYears: { from: number; to: number };
    startMonth?: Date;
    endMonth?: Date;
    children: ReactNode;
    selectedMonth: Date | undefined;
    className?: string;
}) => {
    const { goToMonth, selected } = useDayPicker();
    const selectedMonthDateObject = typeof selectedMonth === 'string' ? new Date(selectedMonth) : selectedMonth;

    // Derive the current month and year from `selectedMonth` or the current date
    const currentYear = selectedMonthDateObject?.getFullYear() ?? new Date().getFullYear();
    const currentMonth = MONTHS[selectedMonthDateObject?.getMonth() ?? new Date().getMonth()];

    if (navView === 'years') {
        return (
            <div className={cn('grid grid-cols-4 gap-y-2', className)} {...props}>
                {Array.from({ length: displayYears.to - displayYears.from + 1 }, (_, i) => {
                    const isBefore = differenceInCalendarDays(new Date(displayYears.from + i, 11, 31), startMonth!) < 0;

                    const isAfter = differenceInCalendarDays(new Date(displayYears.from + i, 0, 0), endMonth!) > 0;

                    const isDisabled = isBefore || isAfter;
                    return (
                        <Button
                            key={i}
                            className={cn(
                                'h-7 w-full text-sm font-normal text-foreground',
                                displayYears.from + i === currentYear && 'bg-accent font-medium text-accent-foreground'
                            )}
                            variant="ghost"
                            onClick={() => {
                                setNavView('days');
                                goToMonth(
                                    new Date(displayYears.from + i, (selected as Date | undefined)?.getMonth() ?? 0)
                                );
                            }}
                            disabled={isDisabled}
                        >
                            {displayYears.from + i}
                        </Button>
                    );
                })}
            </div>
        );
    } else if (navView === 'months') {
        return (
            <div className={cn('grid grid-cols-3 gap-y-2', className)} {...props}>
                {MONTHS.map((month, i) => {
                    const isBefore = differenceInCalendarDays(new Date(currentYear, i, 1), startMonth!) < 0;
                    const isAfter =
                        differenceInCalendarDays(
                            new Date(currentYear, i + 1, 1),
                            add(endMonth ? endMonth : new Date(), {
                                months: 1,
                            })!
                        ) > 0;

                    const isDisabled = isBefore || isAfter;
                    return (
                        <Button
                            key={month}
                            className={cn(
                                'h-7 w-full text-sm font-normal text-foreground',
                                month === currentMonth && 'bg-accent font-medium text-accent-foreground'
                            )}
                            variant="ghost"
                            onClick={() => {
                                setNavView('days');
                                goToMonth(
                                    new Date(selectedMonthDateObject?.getFullYear() ?? new Date().getFullYear(), i)
                                );
                            }}
                            disabled={isDisabled}
                        >
                            {month}
                        </Button>
                    );
                })}
            </div>
        );
    }
    return (
        <table className={className} {...props}>
            {children}
        </table>
    );
};

export { CalenderNav, CalenderCaption, CalenderContent };
