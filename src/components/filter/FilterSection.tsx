import { ArrowUpDown, Search } from 'lucide-react';
import { useSelector } from 'react-redux';

import { IEmi } from '@/types/emi.types';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import FormModal from '../emi/AddButton';
import { Input } from '../ui/input';
import FilterOptions from './FilterOptions';

interface EMIFilterOptionsProps {
    emiData: IEmi[];
    setOpenConfirmationModal: (value: boolean) => void;
}

const FilterSection = ({ emiData, setOpenConfirmationModal }: EMIFilterOptionsProps) => {
    const { searchQuery } = useSelector((state: IRootState) => state.filterModel);
    const filterDispatch = useRematchDispatch((state: IDispatch) => state.filterModel);

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
                                onChange={(e) => filterDispatch.setSearchQuery(e.target.value)}
                                className="pl-8 w-full"
                            />
                        </div>
                        <FilterOptions emis={emiData} />
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
