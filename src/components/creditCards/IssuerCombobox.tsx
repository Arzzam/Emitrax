import { useState } from 'react';
import { Check, ChevronsUpDown, Landmark, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ICreditCardIssuer } from '@/types/creditCard.types';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SUGGESTED_ISSUERS = ['ICICI', 'HDFC', 'SBI', 'Axis', 'Kotak', 'Amex', 'IndusInd', 'Yes Bank'];

export type IssuerSelection = { kind: 'existing'; issuerId: string; name: string } | { kind: 'new'; name: string };

/**
 * Searchable issuer picker that can also create. Typing a name that does not
 * exist yet offers a "Create" row, so adding a card never requires creating the
 * issuer as a separate first step.
 */
const IssuerCombobox = ({
    issuers,
    value,
    onChange,
}: {
    issuers: ICreditCardIssuer[];
    value: IssuerSelection | null;
    onChange: (selection: IssuerSelection) => void;
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const trimmed = query.trim();
    const existingNames = new Set(issuers.map((issuer) => issuer.name.toLowerCase()));
    const canCreate = trimmed.length > 0 && !existingNames.has(trimmed.toLowerCase());

    // Only suggest banks the user has not added yet, and only before they type.
    const suggestions = trimmed
        ? []
        : SUGGESTED_ISSUERS.filter((name) => !existingNames.has(name.toLowerCase())).slice(0, 5);

    const select = (selection: IssuerSelection) => {
        onChange(selection);
        setQuery('');
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn('flex min-w-0 items-center gap-2', !value && 'text-muted-foreground')}>
                        <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">
                            {value ? value.name : 'Search or add a bank'}
                            {value?.kind === 'new' && (
                                <span className="ml-1.5 text-xs text-muted-foreground">(new)</span>
                            )}
                        </span>
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command shouldFilter>
                    <CommandInput placeholder="Search banks..." value={query} onValueChange={setQuery} />
                    <CommandList>
                        {!canCreate && suggestions.length === 0 && <CommandEmpty>No bank found.</CommandEmpty>}

                        {issuers.length > 0 && (
                            <CommandGroup heading="Your banks">
                                {issuers.map((issuer) => (
                                    <CommandItem
                                        key={issuer.id}
                                        value={issuer.name}
                                        onSelect={() =>
                                            select({ kind: 'existing', issuerId: issuer.id, name: issuer.name })
                                        }
                                    >
                                        <Landmark aria-hidden />
                                        <span className="flex-1 truncate">{issuer.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {issuer.cards.length} {issuer.cards.length === 1 ? 'card' : 'cards'}
                                        </span>
                                        {value?.kind === 'existing' && value.issuerId === issuer.id && (
                                            <Check className="size-4" aria-hidden />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {suggestions.length > 0 && (
                            <CommandGroup heading="Common banks">
                                {suggestions.map((name) => (
                                    <CommandItem key={name} value={name} onSelect={() => select({ kind: 'new', name })}>
                                        <Plus aria-hidden />
                                        <span className="truncate">{name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {canCreate && (
                            <CommandGroup>
                                {/* forceMount so the create row survives cmdk's own filtering */}
                                <CommandItem
                                    forceMount
                                    value={`__create__${trimmed}`}
                                    onSelect={() => select({ kind: 'new', name: trimmed })}
                                >
                                    <Plus aria-hidden />
                                    <span className="truncate">
                                        Create “<span className="font-medium">{trimmed}</span>”
                                    </span>
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default IssuerCombobox;
