import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Check, ChevronDown } from 'lucide-react';

import { useDisplayUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import type { AdvancedFilterShareFilter } from '@/modules/filter/filter.types';
import { getSharedPersonOptions, getSplitPersonOptions } from '@/modules/filter/filterOptions';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import type { IEmi } from '@/types/emi.types';

import AmountInput from '@/components/common/AmountInput';
import FilterDatePicker from '@/components/filter/FilterDatePicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AdvancedFilterPanelProps {
    emiData: IEmi[];
    /** Bounds apply to EMIs in this currency only; amounts don't compare across currencies. */
    amountCurrency?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function MultiSelectPerson({
    options,
    selectedIds,
    onToggle,
    placeholder,
    triggerLabel,
}: {
    options: { id: string; label: string }[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    placeholder: string;
    triggerLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const label = triggerLabel ?? (selectedIds.length > 0 ? `${selectedIds.length} selected` : placeholder);

    if (options.length === 0) {
        return <p className="text-muted-foreground text-xs">No {placeholder.toLowerCase()} to filter by.</p>;
    }

    // modal: the panel is a modal Sheet, whose scroll lock otherwise swallows wheel/touch in this portaled list
    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-full justify-between font-normal" aria-label={placeholder}>
                    <span className="truncate">{label}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="max-h-56 overflow-y-auto overscroll-contain">
                    {options.map((opt) => {
                        const selected = selectedIds.includes(opt.id);
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                                    selected && 'bg-accent/50'
                                )}
                                onClick={() => onToggle(opt.id)}
                            >
                                {selected && <Check className="h-4 w-4 shrink-0" />}
                                <span className={cn('flex-1 truncate', !selected && 'pl-6')}>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

const AdvancedFilterPanel = ({ emiData, amountCurrency, open, onOpenChange }: AdvancedFilterPanelProps) => {
    const state = useSelector((s: IRootState) => s.advancedFilterModel);
    const dispatch = useRematchDispatch((d: IDispatch) => d.advancedFilterModel);
    const { user, displayName } = useDisplayUser();
    const currentUserId = user?.id;
    const currentUserLabel = displayName ?? 'Me';

    // Empty or unparseable text clears the bound rather than filtering on NaN.
    const toBound = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? null : v);
    const setPrincipalMin = (v: number | undefined) =>
        dispatch.setPrincipalRange({ min: toBound(v), max: state.principalMax });
    const setPrincipalMax = (v: number | undefined) =>
        dispatch.setPrincipalRange({ min: state.principalMin, max: toBound(v) });
    const setTotalLoanMin = (v: number | undefined) =>
        dispatch.setTotalLoanRange({ min: toBound(v), max: state.totalLoanMax });
    const setTotalLoanMax = (v: number | undefined) =>
        dispatch.setTotalLoanRange({ min: state.totalLoanMin, max: toBound(v) });

    const setBillDateFrom = (iso: string | null) => dispatch.setBillDateRange({ from: iso, to: state.billDateTo });
    const setBillDateTo = (iso: string | null) => dispatch.setBillDateRange({ from: state.billDateFrom, to: iso });
    const setEndDateFrom = (iso: string | null) => dispatch.setEndDateRange({ from: iso, to: state.endDateTo });
    const setEndDateTo = (iso: string | null) => dispatch.setEndDateRange({ from: state.endDateFrom, to: iso });
    const setCreatedAtFrom = (iso: string | null) => dispatch.setCreatedAtRange({ from: iso, to: state.createdAtTo });
    const setCreatedAtTo = (iso: string | null) => dispatch.setCreatedAtRange({ from: state.createdAtFrom, to: iso });

    const handleClear = () => {
        dispatch.clearFilters();
    };

    const sharedPersonOptions = useMemo(() => getSharedPersonOptions(emiData), [emiData]);
    const splitPersonOptions = useMemo(
        () => getSplitPersonOptions(emiData, { currentUserId, currentUserLabel }),
        [emiData, currentUserId, currentUserLabel]
    );

    const showSharedPersonSelect =
        (state.shareFilter === 'owned' || state.shareFilter === 'shared') && sharedPersonOptions.length > 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Advanced filters</SheetTitle>
                    <SheetDescription> Use the advanced filters to refine your search results. </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
                    {/* Amounts */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground">
                            Amounts{amountCurrency ? ` (${amountCurrency})` : ''}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="principal-min" className="text-xs">
                                    Principal min
                                </Label>
                                <AmountInput
                                    currency={amountCurrency}
                                    id="principal-min"
                                    placeholder="Min"
                                    value={state.principalMin}
                                    onValueChange={setPrincipalMin}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="principal-max" className="text-xs">
                                    Principal max
                                </Label>
                                <AmountInput
                                    currency={amountCurrency}
                                    id="principal-max"
                                    placeholder="Max"
                                    value={state.principalMax}
                                    onValueChange={setPrincipalMax}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="loan-min" className="text-xs">
                                    Total loan min
                                </Label>
                                <AmountInput
                                    currency={amountCurrency}
                                    id="loan-min"
                                    placeholder="Min"
                                    value={state.totalLoanMin}
                                    onValueChange={setTotalLoanMin}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="loan-max" className="text-xs">
                                    Total loan max
                                </Label>
                                <AmountInput
                                    currency={amountCurrency}
                                    id="loan-max"
                                    placeholder="Max"
                                    value={state.totalLoanMax}
                                    onValueChange={setTotalLoanMax}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Dates */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground">Dates</h3>
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="bill-from" className="text-xs">
                                        Bill date from
                                    </Label>
                                    <FilterDatePicker
                                        id="bill-from"
                                        value={state.billDateFrom}
                                        onChange={setBillDateFrom}
                                        placeholder="From"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="bill-to" className="text-xs">
                                        Bill date to
                                    </Label>
                                    <FilterDatePicker
                                        id="bill-to"
                                        value={state.billDateTo}
                                        onChange={setBillDateTo}
                                        placeholder="To"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="end-from" className="text-xs">
                                        End date from
                                    </Label>
                                    <FilterDatePicker
                                        id="end-from"
                                        value={state.endDateFrom}
                                        onChange={setEndDateFrom}
                                        placeholder="From"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="end-to" className="text-xs">
                                        End date to
                                    </Label>
                                    <FilterDatePicker
                                        id="end-to"
                                        value={state.endDateTo}
                                        onChange={setEndDateTo}
                                        placeholder="To"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="created-from" className="text-xs">
                                        Created from
                                    </Label>
                                    <FilterDatePicker
                                        id="created-from"
                                        value={state.createdAtFrom}
                                        onChange={setCreatedAtFrom}
                                        placeholder="From"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="created-to" className="text-xs">
                                        Created to
                                    </Label>
                                    <FilterDatePicker
                                        id="created-to"
                                        value={state.createdAtTo}
                                        onChange={setCreatedAtTo}
                                        placeholder="To"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Share */}
                    <section className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground">Share</h3>
                        <Select
                            value={state.shareFilter}
                            onValueChange={(v) => dispatch.setShareFilter(v as AdvancedFilterShareFilter)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="owned">I own</SelectItem>
                                <SelectItem value="shared">Shared with others</SelectItem>
                                <SelectItem value="sharedWithMe">Shared with me</SelectItem>
                            </SelectContent>
                        </Select>
                        {showSharedPersonSelect && (
                            <div className="space-y-1">
                                <Label className="text-xs">Shared with (select persons)</Label>
                                <MultiSelectPerson
                                    options={sharedPersonOptions}
                                    selectedIds={state.sharedWithUserIds}
                                    onToggle={(id) => dispatch.toggleSharedWithUserId(id)}
                                    placeholder="Select persons"
                                />
                            </div>
                        )}
                    </section>

                    {/* Split: current user (Me) + other participants; selecting Me = split-with-me or non-split by case */}
                    <section className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground">Split</h3>
                        <div className="space-y-1">
                            <Label className="text-xs">Show EMIs where these participants are involved</Label>
                            <MultiSelectPerson
                                options={splitPersonOptions}
                                selectedIds={state.splitWithParticipantKeys}
                                onToggle={(key) => dispatch.toggleSplitWithParticipantKey(key)}
                                placeholder="Select participants (none = all)"
                            />
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Selecting your name: if you appear in any split, only split EMIs with you; otherwise only
                            non-split EMIs.
                        </p>
                    </section>
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={handleClear}>
                        Clear all
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default AdvancedFilterPanel;
