import { ArrowUpDown, Search } from 'lucide-react';

import { IEmi } from '@/types/emi.types';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import FormModal from '../emi/AddButton';
import { Input } from '../ui/input';
import FilterOptions, { TFilterOptions } from './FilterOptions';

interface EMIFilterOptionsProps {
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filters: TFilterOptions;
    setFilters: (value: TFilterOptions) => void;
    emiData: IEmi[];
    setOpenConfirmationModal: (value: boolean) => void;
}

const FilterSection = ({
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    emiData,
    setOpenConfirmationModal,
}: EMIFilterOptionsProps) => {
    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search EMIs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-full"
                            />
                        </div>
                        <FilterOptions filters={filters} onFilterChange={setFilters} emis={emiData} />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        <FormModal />
                        <Button variant="outline" onClick={() => setOpenConfirmationModal(true)}>
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            Recalculate
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FilterSection;
