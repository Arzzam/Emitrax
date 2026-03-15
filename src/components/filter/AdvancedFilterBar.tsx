import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowUpDown, Filter, Search, X } from 'lucide-react';

import type { AdvancedFilterSortBy, AdvancedFilterSortOrder } from '@/modules/filter/filter.types';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { IEmi } from '@/types/emi.types';

import FormModal from '@/components/emi/AddButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import AdvancedFilterPanel from './AdvancedFilterPanel';

interface AdvancedFilterBarProps {
    emiData: IEmi[];
    setOpenConfirmationModal: (value: boolean) => void;
}

const SORT_OPTIONS: { value: AdvancedFilterSortBy; label: string }[] = [
    { value: 'dateAdded', label: 'Date Added' },
    { value: 'updated', label: 'Last Updated' },
    { value: 'name', label: 'Name' },
    { value: 'balance', label: 'Balance' },
    { value: 'principal', label: 'Principal' },
    { value: 'totalLoan', label: 'Total Loan' },
    { value: 'emi', label: 'EMI' },
    { value: 'tenure', label: 'Tenure' },
    { value: 'endDate', label: 'End Date' },
    { value: 'billDate', label: 'Bill Date' },
];

const AdvancedFilterBar = ({ emiData, setOpenConfirmationModal }: AdvancedFilterBarProps) => {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>(['All']);

    const state = useSelector((s: IRootState) => s.advancedFilterModel);
    const dispatch = useRematchDispatch((d: IDispatch) => d.advancedFilterModel);

    useEffect(() => {
        if (emiData.length > 0) {
            const tags = ['All', ...new Set(emiData.map((emi) => emi.tag || 'Personal').filter(Boolean))];
            setAvailableTags(tags);
        }
    }, [emiData]);

    const hasActiveFilters =
        state.tag !== 'All' ||
        state.status !== 'all' ||
        state.shareFilter !== 'all' ||
        (state.sharedWithUserIds?.length ?? 0) > 0 ||
        (state.splitWithParticipantKeys?.length ?? 0) > 0 ||
        state.principalMin != null ||
        state.principalMax != null ||
        state.totalLoanMin != null ||
        state.totalLoanMax != null ||
        state.billDateFrom != null ||
        state.billDateTo != null ||
        state.endDateFrom != null ||
        state.endDateTo != null ||
        state.createdAtFrom != null ||
        state.createdAtTo != null;

    return (
        <>
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,2fr]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search EMIs..."
                                    value={state.searchQuery}
                                    onChange={(e) => dispatch.setSearchQuery(e.target.value)}
                                    className="pl-8 w-full"
                                    aria-label="Search EMIs"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="min-w-[120px] flex-1 basis-[120px]">
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Select
                                        value={state.status}
                                        onValueChange={(v) =>
                                            dispatch.setStatus(v as 'all' | 'active' | 'completed' | 'archived')
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-[120px] flex-1 basis-[120px]">
                                    <Label className="text-sm font-medium">Tag</Label>
                                    <Select value={state.tag} onValueChange={(v) => dispatch.setTag(v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Tag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTags.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-[120px] flex-1 basis-[120px]">
                                    <Label className="text-sm font-medium">Sort by</Label>
                                    <Select
                                        value={state.sortBy}
                                        onValueChange={(v) => dispatch.setSortBy(v as AdvancedFilterSortBy)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SORT_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-[100px] flex-1 basis-[100px]">
                                    <Label className="text-sm font-medium">Order</Label>
                                    <Select
                                        value={state.sortOrder}
                                        onValueChange={(v) => dispatch.setSortOrder(v as AdvancedFilterSortOrder)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Order" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asc">Asc</SelectItem>
                                            <SelectItem value="desc">Desc</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="default"
                                        onClick={() => setAdvancedOpen(true)}
                                        className="shrink-0"
                                        aria-label="Open advanced filters"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Advanced
                                    </Button>
                                    {hasActiveFilters && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => dispatch.clearFilters()}
                                            className="h-10 w-10 shrink-0"
                                            title="Clear all filters"
                                            aria-label="Clear all filters"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            <FormModal />
                            <Button variant="outline" onClick={() => setOpenConfirmationModal(true)}>
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                Recalculate
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AdvancedFilterPanel emiData={emiData} open={advancedOpen} onOpenChange={setAdvancedOpen} />
        </>
    );
};

export default AdvancedFilterBar;
