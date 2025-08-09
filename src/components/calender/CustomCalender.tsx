import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ICalendarProps } from './calender.type';
import { getDayPickerClassNames } from './calender.util';

import { CalenderCaption, CalenderNav, CalenderContent } from './CalendarControls';

function CustomCalendar({
    className,
    showOutsideDays = true,
    showYearSwitcher = true,
    yearRange = 12,
    numberOfMonths,
    disabled,
    ...props
}: ICalendarProps) {
    const [navView, setNavView] = useState<'days' | 'years' | 'months'>('days');
    const [displayYears, setDisplayYears] = useState<{
        from: number;
        to: number;
    }>(
        React.useMemo(() => {
            const currentYear = new Date().getFullYear();
            return {
                from: currentYear - Math.floor(yearRange / 2 - 1),
                to: currentYear + Math.ceil(yearRange / 2),
            };
        }, [yearRange])
    );
    const [month, setMonth] = useState<Date | undefined>(props.selected);

    useEffect(() => {
        if (props.selected && props.selected instanceof Date) {
            setMonth(props.selected);
        }
    }, [props.selected]);

    const dayPickerClassNames = getDayPickerClassNames(props);

    const { onNextClick, onPrevClick, startMonth, endMonth } = props;

    const columnsDisplayed = navView === 'years' ? 1 : numberOfMonths;

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-3', className)}
            style={{
                width: 248.8 * (columnsDisplayed ?? 1) + 'px',
            }}
            month={month}
            onMonthChange={setMonth}
            disabled={disabled || false}
            classNames={dayPickerClassNames}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4" />;
                },
                Nav: ({ className }) => {
                    return (
                        <CalenderNav
                            {...{
                                navView,
                                startMonth,
                                endMonth,
                                displayYears,
                                setDisplayYears,
                                onPrevClick,
                                onNextClick,
                                className,
                            }}
                        />
                    );
                },
                // This is Top Label Month and Year
                CaptionLabel: ({ children, ...props }) => {
                    const currChildren = (children as string).split(' ');
                    if (!showYearSwitcher) return <span {...props}>{children}</span>;
                    return (
                        <CalenderCaption
                            navView={navView}
                            setNavView={setNavView}
                            displayYears={displayYears}
                            date={currChildren}
                        />
                    );
                },
                MonthGrid: ({ className, children, ...props }) => {
                    return (
                        <CalenderContent
                            {...{
                                navView,
                                setNavView,
                                displayYears,
                                startMonth,
                                endMonth,
                                className,
                                selectedMonth: month,
                                ...props,
                            }}
                        >
                            {children}
                        </CalenderContent>
                    );
                },
            }}
            numberOfMonths={columnsDisplayed}
            {...props}
        />
    );
}
CustomCalendar.displayName = 'Calendar';

export default CustomCalendar;
