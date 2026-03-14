import { cn } from '@/lib/utils';

import { buttonVariants } from '../ui/button';

import { ICalendarProps } from './calender.type';

export const getDayPickerClassNames = (props: ICalendarProps) => {
    const _monthsClassName = cn('relative flex', props.monthsClassName);
    const _monthCaptionClassName = cn(
        'relative mx-10 flex h-7 items-center justify-center',
        props.monthCaptionClassName
    );
    const _weekdaysClassName = cn('flex flex-row', props.weekdaysClassName);
    const _weekdayClassName = cn('w-8 text-sm font-normal text-muted-foreground', props.weekdayClassName);
    const _monthClassName = cn('w-full', props.monthClassName);
    const _captionClassName = cn('relative flex items-center justify-center pt-1', props.captionClassName);
    const _captionLabelClassName = cn('truncate text-sm font-medium', props.captionLabelClassName);
    const buttonNavClassName = buttonVariants({
        variant: 'outline',
        className: 'absolute h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    });
    const _buttonNextClassName = cn(buttonNavClassName, 'right-0', props.buttonNextClassName);
    const _buttonPreviousClassName = cn(buttonNavClassName, 'left-0', props.buttonPreviousClassName);
    const _navClassName = cn('flex items-start', props.navClassName);
    const _monthGridClassName = cn('mx-auto mt-4', props.monthGridClassName);
    const _weekClassName = cn('mt-2 flex w-max items-start', props.weekClassName);
    const _dayClassName = cn('flex size-8 flex-1 items-center justify-center p-0 text-sm', props.dayClassName);
    const _dayButtonClassName = cn(
        buttonVariants({ variant: 'ghost' }),
        'size-8 rounded-md p-0 font-normal transition-none aria-selected:opacity-100',
        props.dayButtonClassName
    );
    const buttonRangeClassName =
        'bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground';
    const _rangeStartClassName = cn(buttonRangeClassName, 'day-range-start rounded-s-md', props.rangeStartClassName);
    const _rangeEndClassName = cn(buttonRangeClassName, 'day-range-end rounded-e-md', props.rangeEndClassName);
    const _rangeMiddleClassName = cn(
        'bg-accent !text-foreground [&>button]:bg-transparent [&>button]:!text-foreground [&>button]:hover:bg-transparent [&>button]:hover:!text-foreground',
        props.rangeMiddleClassName
    );
    const _selectedClassName = cn(
        '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        props.selectedClassName
    );
    const _todayClassName = cn('[&>button]:bg-accent [&>button]:text-accent-foreground', props.todayClassName);
    const _outsideClassName = cn(
        'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        props.outsideClassName
    );
    const _disabledClassName = cn('text-muted-foreground opacity-50', props.disabledClassName);
    const _hiddenClassName = cn('invisible flex-1', props.hiddenClassName);

    return {
        months: _monthsClassName,
        month_caption: _monthCaptionClassName,
        weekdays: _weekdaysClassName,
        weekday: _weekdayClassName,
        month: _monthClassName,
        caption: _captionClassName,
        caption_label: _captionLabelClassName,
        button_next: _buttonNextClassName,
        button_previous: _buttonPreviousClassName,
        nav: _navClassName,
        month_grid: _monthGridClassName,
        week: _weekClassName,
        day: _dayClassName,
        day_button: _dayButtonClassName,
        range_start: _rangeStartClassName,
        range_middle: _rangeMiddleClassName,
        range_end: _rangeEndClassName,
        selected: _selectedClassName,
        today: _todayClassName,
        outside: _outsideClassName,
        disabled: _disabledClassName,
        hidden: _hiddenClassName,
    };
};
