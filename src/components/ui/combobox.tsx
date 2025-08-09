import * as React from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormControl } from './form';
import { isCtrlEnter } from '../accessibility/HotKeyUtils';

export type TComboboxOption = {
    value: string;
    label: string;
};

interface ComboboxProps {
    options: TComboboxOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    triggerClassName?: string;
    isForm?: boolean;
    allowCreate?: boolean;
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    emptyMessage = 'No options found.',
    className,
    triggerClassName,
    isForm = false,
    allowCreate = false,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');

    const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()));

    const showCreateOption =
        allowCreate &&
        inputValue &&
        !filteredOptions.some((option) => option.label.toLowerCase() === inputValue.toLowerCase());

    const handleCreateOption = () => {
        const newOption = inputValue.trim();
        onChange(newOption);
        setInputValue('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isCtrlEnter(e)) {
            handleCreateOption();
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {isForm ? (
                    <FormControl>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                'w-full justify-between',
                                !value && 'text-muted-foreground',
                                triggerClassName
                            )}
                        >
                            {value ? options.find((option) => option.value === value)?.label || value : placeholder}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </FormControl>
                ) : (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn('w-full justify-between', !value && 'text-muted-foreground', triggerClassName)}
                    >
                        {value ? options.find((option) => option.value === value)?.label || value : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className={cn('p-0', className)}>
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onKeyDown={handleKeyDown}
                    />
                    {filteredOptions.length === 0 && !showCreateOption ? (
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                    ) : (
                        <CommandGroup>
                            {filteredOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? '' : currentValue);
                                        setInputValue('');
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === option.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}

                            {showCreateOption && (
                                <>
                                    {filteredOptions.length > 0 && <CommandSeparator />}
                                    <CommandItem
                                        value={`create-${inputValue}`}
                                        className="text-primary-foreground hover:bg-primary/10"
                                        onSelect={handleCreateOption}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create "{inputValue}"
                                    </CommandItem>
                                </>
                            )}
                        </CommandGroup>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}
