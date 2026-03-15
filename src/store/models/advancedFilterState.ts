import type {
    AdvancedFilterShareFilter,
    AdvancedFilterSortBy,
    AdvancedFilterSortOrder,
    AdvancedFilterStatus,
    IAdvancedFilterState,
} from '@/modules/filter/filter.types';
import { ADVANCED_FILTER_DEFAULTS } from '@/modules/filter/filter.types';

const initialState: IAdvancedFilterState = { ...ADVANCED_FILTER_DEFAULTS };

const advancedFilterModel = {
    state: initialState,
    reducers: {
        setSearchQuery: (state: IAdvancedFilterState, searchQuery: string): IAdvancedFilterState => ({
            ...state,
            searchQuery,
        }),
        setStatus: (state: IAdvancedFilterState, status: AdvancedFilterStatus): IAdvancedFilterState => ({
            ...state,
            status,
        }),
        setTag: (state: IAdvancedFilterState, tag: string): IAdvancedFilterState => ({
            ...state,
            tag,
        }),
        setSortBy: (state: IAdvancedFilterState, sortBy: AdvancedFilterSortBy): IAdvancedFilterState => ({
            ...state,
            sortBy,
        }),
        setSortOrder: (state: IAdvancedFilterState, sortOrder: AdvancedFilterSortOrder): IAdvancedFilterState => ({
            ...state,
            sortOrder,
        }),
        setPrincipalRange: (
            state: IAdvancedFilterState,
            payload: { min: number | null; max: number | null }
        ): IAdvancedFilterState => ({
            ...state,
            principalMin: payload.min,
            principalMax: payload.max,
        }),
        setTotalLoanRange: (
            state: IAdvancedFilterState,
            payload: { min: number | null; max: number | null }
        ): IAdvancedFilterState => ({
            ...state,
            totalLoanMin: payload.min,
            totalLoanMax: payload.max,
        }),
        setBillDateRange: (
            state: IAdvancedFilterState,
            payload: { from: string | null; to: string | null }
        ): IAdvancedFilterState => ({
            ...state,
            billDateFrom: payload.from,
            billDateTo: payload.to,
        }),
        setEndDateRange: (
            state: IAdvancedFilterState,
            payload: { from: string | null; to: string | null }
        ): IAdvancedFilterState => ({
            ...state,
            endDateFrom: payload.from,
            endDateTo: payload.to,
        }),
        setCreatedAtRange: (
            state: IAdvancedFilterState,
            payload: { from: string | null; to: string | null }
        ): IAdvancedFilterState => ({
            ...state,
            createdAtFrom: payload.from,
            createdAtTo: payload.to,
        }),
        setShareFilter: (
            state: IAdvancedFilterState,
            shareFilter: AdvancedFilterShareFilter
        ): IAdvancedFilterState => ({
            ...state,
            shareFilter,
        }),
        setSharedWithUserIds: (state: IAdvancedFilterState, sharedWithUserIds: string[]): IAdvancedFilterState => ({
            ...state,
            sharedWithUserIds,
        }),
        setSplitWithParticipantKeys: (
            state: IAdvancedFilterState,
            splitWithParticipantKeys: string[]
        ): IAdvancedFilterState => ({
            ...state,
            splitWithParticipantKeys,
        }),
        toggleSharedWithUserId: (state: IAdvancedFilterState, userId: string): IAdvancedFilterState => {
            const set = new Set(state.sharedWithUserIds);
            if (set.has(userId)) set.delete(userId);
            else set.add(userId);
            return { ...state, sharedWithUserIds: Array.from(set) };
        },
        toggleSplitWithParticipantKey: (state: IAdvancedFilterState, key: string): IAdvancedFilterState => {
            const set = new Set(state.splitWithParticipantKeys);
            if (set.has(key)) set.delete(key);
            else set.add(key);
            return { ...state, splitWithParticipantKeys: Array.from(set) };
        },
        clearFilters: (): IAdvancedFilterState => ({
            ...ADVANCED_FILTER_DEFAULTS,
        }),
        /** Hydrate state from saved account preference (e.g. after loading from backend). */
        hydrateFilterConfig: (_state: IAdvancedFilterState, payload: IAdvancedFilterState): IAdvancedFilterState => ({
            ...payload,
        }),
    },
};

export default advancedFilterModel;
