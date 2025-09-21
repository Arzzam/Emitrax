import { TFilterOptions } from '@/components/filter/FilterOptions';

interface IFilterState extends TFilterOptions {
    searchQuery: string;
}

const initialState: IFilterState = {
    searchQuery: '',
    status: 'active',
    sortBy: 'dateAdded',
    tag: 'All',
    sortOrder: 'desc',
};

const filterModel = {
    state: initialState,
    reducers: {
        setSearchQuery: (state: IFilterState, searchQuery: string) => {
            return {
                ...state,
                searchQuery,
            };
        },
        setStatus: (state: IFilterState, status: TFilterOptions['status']) => {
            return {
                ...state,
                status,
            };
        },
        setSortBy: (state: IFilterState, sortBy: TFilterOptions['sortBy']) => {
            return {
                ...state,
                sortBy,
            };
        },
        setTag: (state: IFilterState, tag: TFilterOptions['tag']) => {
            return {
                ...state,
                tag,
            };
        },
        setSortOrder: (state: IFilterState, sortOrder: TFilterOptions['sortOrder']) => {
            return {
                ...state,
                sortOrder,
            };
        },
        clearFilters: (state: IFilterState) => {
            return {
                ...state,
                tag: 'All',
                status: 'all',
                sortOrder: 'asc',
            };
        },
    },
};

export default filterModel;
