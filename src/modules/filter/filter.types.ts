/**
 * Advanced filter module types.
 * Used by advancedFilterModel and filterAndSortEmis; no dependency on legacy FilterOptions.
 */

export type AdvancedFilterStatus = 'all' | 'active' | 'completed' | 'archived';

export type AdvancedFilterSortBy =
    | 'name'
    | 'balance'
    | 'dateAdded'
    | 'updated'
    | 'principal'
    | 'totalLoan'
    | 'emi'
    | 'tenure'
    | 'endDate'
    | 'billDate';

export type AdvancedFilterSortOrder = 'asc' | 'desc';

export type AdvancedFilterShareFilter = 'all' | 'owned' | 'shared' | 'sharedWithMe';

/** Option for "shared with" filter: userId from IEmiShare. */
export type SharedPersonOption = { id: string; label: string };

/** Option for "split with" filter: key is userId or `ext:${email}` for externals. */
export type SplitPersonOption = { id: string; label: string };

export interface IAdvancedFilterState {
    searchQuery: string;
    status: AdvancedFilterStatus;
    tag: string;
    sortBy: AdvancedFilterSortBy;
    sortOrder: AdvancedFilterSortOrder;
    principalMin: number | null;
    principalMax: number | null;
    totalLoanMin: number | null;
    totalLoanMax: number | null;
    billDateFrom: string | null;
    billDateTo: string | null;
    endDateFrom: string | null;
    endDateTo: string | null;
    createdAtFrom: string | null;
    createdAtTo: string | null;
    shareFilter: AdvancedFilterShareFilter;
    /** When set, show only EMIs shared with at least one of these user IDs (owned/shared filter). */
    sharedWithUserIds: string[];
    /**
     * When set, show only EMIs where at least one selected participant is involved.
     * Keys = userId or `ext:${email}`. When current user's id is selected: if they appear in any split, show only split EMIs with them; else show non-split EMIs.
     */
    splitWithParticipantKeys: string[];
}

export const ADVANCED_FILTER_DEFAULTS: IAdvancedFilterState = {
    searchQuery: '',
    status: 'active',
    tag: 'All',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    principalMin: null,
    principalMax: null,
    totalLoanMin: null,
    totalLoanMax: null,
    billDateFrom: null,
    billDateTo: null,
    endDateFrom: null,
    endDateTo: null,
    createdAtFrom: null,
    createdAtTo: null,
    shareFilter: 'all',
    sharedWithUserIds: [],
    splitWithParticipantKeys: [],
};
