import { useState } from 'react';
import type { Matcher } from 'react-day-picker';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

function isoToDate(iso: string | null): Date | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(date: Date | undefined): string | null {
    if (!date) return null;
    return date.toISOString();
}

export interface FilterDatePickerProps {
    /** ISO date string or null (filter state). */
    value: string | null;
    /** Called with ISO string or null when selection changes. */
    onChange: (value: string | null) => void;
    placeholder?: string;
    id?: string;
    /** Optional disabled matcher (e.g. { after: new Date() } to disable future dates). */
    disabled?: Matcher;
    className?: string;
}

/**
 * Compact date picker for filter sections. Uses shadcn Calendar inside a Popover.
 * Works with ISO date strings for compatibility with advanced filter state.
 */
const FilterDatePicker = ({
    value,
    onChange,
    placeholder = 'Pick date',
    id,
    disabled,
    className,
}: FilterDatePickerProps) => {
    const [open, setOpen] = useState(false);
    const date = isoToDate(value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    id={id}
                    className={cn(
                        'h-9 w-full justify-start pl-3 text-left font-normal',
                        !date && 'text-muted-foreground',
                        className
                    )}
                    aria-label={placeholder}
                >
                    {date ? format(date, 'PPP') : <span className="truncate">{placeholder}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    defaultMonth={date}
                    captionLayout="dropdown"
                    onSelect={(selected) => {
                        onChange(dateToIso(selected));
                        setOpen(false);
                    }}
                    disabled={disabled}
                />
            </PopoverContent>
        </Popover>
    );
};

export default FilterDatePicker;
