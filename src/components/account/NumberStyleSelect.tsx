import { useMemo } from 'react';

import { getLocaleDisplayName, getNumberStyleGroups } from '@/utils/currencyRegistry';

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';

type NumberStyleSelectProps = {
    id?: string;
    value: string;
    onChange: (locale: string) => void;
};

/**
 * The locale picker, presented as what it controls: digit grouping, decimal
 * separator and symbol position. Options are grouped under the sample they
 * actually render, so `1,234,567.89` vs `1.234.567,89` is the visible choice.
 */
const NumberStyleSelect = ({ id, value, onChange }: NumberStyleSelectProps) => {
    const groups = useMemo(() => getNumberStyleGroups(), []);
    const selectedSample = groups.find((group) => group.locales.some((locale) => locale.value === value))?.sample;

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder="Select number style">
                    {value && (
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="tabular-nums">{selectedSample}</span>
                            <span className="truncate text-muted-foreground">{getLocaleDisplayName(value)}</span>
                        </span>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80">
                {groups.map((group) => (
                    <SelectGroup key={group.sample}>
                        <SelectLabel className="font-medium tabular-nums text-foreground">{group.sample}</SelectLabel>
                        {group.locales.map((locale) => (
                            <SelectItem key={locale.value} value={locale.value} className="pl-4">
                                {locale.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
};

export default NumberStyleSelect;
