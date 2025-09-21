import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSelector } from 'react-redux';

import { IEmi } from '@/types/emi.types';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { useRematchDispatch } from '@/store/store';

import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

export type TFilterOptions = {
    status: 'all' | 'active' | 'completed' | 'archived';
    sortBy: 'name' | 'balance' | 'updated' | 'dateAdded';
    tag: string;
    sortOrder: 'asc' | 'desc';
};

interface IFilterOptionsProps {
    emis?: IEmi[];
}

const FilterOptions = ({ emis = [] }: IFilterOptionsProps) => {
    const [availableTags, setAvailableTags] = useState<string[]>(['All']);

    const { tag, sortBy, sortOrder, status } = useSelector((state: IRootState) => state.filterModel);
    const filterDispatch = useRematchDispatch((state: IDispatch) => state.filterModel);

    // Extract unique tags from EMIs
    useEffect(() => {
        if (emis.length > 0) {
            const tags = ['All', ...new Set(emis.map((emi) => emi.tag || 'Personal').filter(Boolean))];
            setAvailableTags(tags);
        }
    }, [emis]);

    const hasActiveFilters = tag !== 'All' || status !== 'all';

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 flex-col sm:flex-row gap-2 items-center">
                <div className="w-full xs:w-auto min-w-[120px]">
                    <Label className="text-sm font-medium">Filter by Status:</Label>
                    <Select
                        value={status}
                        onValueChange={(value: TFilterOptions['status']) => filterDispatch.setStatus(value)}
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

                <div className="w-full xs:w-auto min-w-[120px]">
                    <Label className="text-sm font-medium">Filter by Tag:</Label>
                    <Select value={tag} onValueChange={(value: string) => filterDispatch.setTag(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Filter by tag" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTags.map((tag) => (
                                <SelectItem key={tag} value={tag}>
                                    {tag}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full xs:w-auto min-w-[120px]">
                    <Label className="text-sm font-medium">Sort By:</Label>
                    <Select
                        value={sortBy}
                        onValueChange={(value: TFilterOptions['sortBy']) => filterDispatch.setSortBy(value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dateAdded">Date Added</SelectItem>
                            <SelectItem value="updated">Last Updated</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="balance">Balance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full xs:w-auto min-w-[120px]">
                    <Label className="text-sm font-medium">Sort Order:</Label>
                    <Select
                        value={sortOrder}
                        onValueChange={(value: TFilterOptions['sortOrder']) => filterDispatch.setSortOrder(value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sort Order" />
                        </SelectTrigger>
                        <SelectContent>
                            {['asc', 'desc'].map((order) => (
                                <SelectItem key={order} value={order}>
                                    {order}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={filterDispatch.clearFilters}
                    className="h-10 w-10 shrink-0"
                    title="Clear filters"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};

export default FilterOptions;
