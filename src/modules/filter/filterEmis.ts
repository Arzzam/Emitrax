import { IDisplayUser } from '@/hooks/useUser';
import { IEmi } from '@/types/emi.types';

import type { IAdvancedFilterState } from './filter.types';

export interface FilterEmisOptions {
    /** Current user id: when selected in splitWithParticipantKeys, apply two-case logic (split-with-me vs non-split). */
    currentUserId?: string;
}

function parseDate(value: Date | string | undefined): number {
    if (value == null) return 0;
    const d = typeof value === 'string' ? new Date(value) : value;
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function inRange(value: number, min: number | null, max: number | null): boolean {
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
}

function inDateRange(emiDateMs: number, from: string | null, to: string | null): boolean {
    if (from != null && emiDateMs < parseDate(from)) return false;
    if (to != null && emiDateMs > parseDate(to)) return false;
    return true;
}

export function filterAndSortEmis(emiData: IEmi[], filterState: IAdvancedFilterState, options?: IDisplayUser): IEmi[] {
    const {
        searchQuery,
        status,
        tag,
        principalMin,
        principalMax,
        totalLoanMin,
        totalLoanMax,
        billDateFrom,
        billDateTo,
        endDateFrom,
        endDateTo,
        createdAtFrom,
        createdAtTo,
        shareFilter,
        sharedWithUserIds,
        splitWithParticipantKeys,
        sortBy,
        sortOrder,
    } = filterState;

    const splitParticipantKeys = new Set(splitWithParticipantKeys);

    const hasCurrentUser = splitParticipantKeys.has(options?.user?.id ?? '');

    const filtered = emiData.filter((emi) => {
        const matchesSearch = !searchQuery.trim() || emi.itemName.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus: boolean;
        if (status === 'archived') {
            matchesStatus = !!emi.isArchived;
        } else if (status === 'all') {
            matchesStatus = true;
        } else if (status === 'completed') {
            matchesStatus = emi.isCompleted;
        } else {
            matchesStatus = !emi.isCompleted && !emi.isArchived;
        }

        const matchesTag = tag === 'All' || (emi.tag || 'Personal') === tag;
        const matchesPrincipal = inRange(emi.principal, principalMin, principalMax);
        const matchesTotalLoan = inRange(emi.totalLoan, totalLoanMin, totalLoanMax);

        const billDateMs = parseDate(emi.billDate);
        const matchesBillDate = inDateRange(billDateMs, billDateFrom, billDateTo);

        const endDateMs = parseDate(emi.endDate);
        const matchesEndDate = inDateRange(endDateMs, endDateFrom, endDateTo);

        const createdMs = parseDate(emi.createdAt);
        const matchesCreatedAt = inDateRange(createdMs, createdAtFrom, createdAtTo);

        let matchesShare: boolean;
        if (shareFilter === 'all') {
            matchesShare = true;
        } else if (shareFilter === 'sharedWithMe') {
            matchesShare = emi.isOwner === false;
        } else {
            // owned | shared: must be owner (and if shared, has sharedWith)
            const isOwnedOrShared =
                emi.isOwner === true && (shareFilter !== 'shared' || (emi.sharedWith?.length ?? 0) > 0);
            if (!isOwnedOrShared) {
                matchesShare = false;
            } else if (sharedWithUserIds.length === 0) {
                matchesShare = true;
            } else {
                matchesShare = emi.sharedWith?.some((s) => sharedWithUserIds.includes(s.sharedWithUserId)) ?? false;
            }
        }

        // Split: empty = all. Otherwise include EMI if any selected key matches.
        // When key is current user: (1) if current user has any split → only split EMIs with them; (2) else → only non-split EMIs.
        let matchesSplit: boolean;
        if (splitParticipantKeys.size === 0) {
            matchesSplit = true;
        } else if (hasCurrentUser) {
            matchesSplit =
                (emi.splits?.length === 0 ||
                    emi.splits?.some(
                        (s) =>
                            s.userId === options?.user?.id ||
                            splitParticipantKeys.has(s.userId ?? `ext:${s.participantEmail ?? s.participantName ?? ''}`)
                    )) ??
                false;
        } else {
            matchesSplit =
                emi.splits?.some((s) =>
                    splitParticipantKeys.has(s.userId ?? `ext:${s.participantEmail ?? s.participantName ?? ''}`)
                ) ?? false;
        }

        return (
            matchesSearch &&
            matchesStatus &&
            matchesTag &&
            matchesPrincipal &&
            matchesTotalLoan &&
            matchesBillDate &&
            matchesEndDate &&
            matchesCreatedAt &&
            matchesShare &&
            matchesSplit
        );
    });

    const mult = sortOrder === 'asc' ? 1 : -1;

    return filtered.sort((a, b) => {
        let cmp = 0;

        switch (sortBy) {
            case 'name':
                cmp = a.itemName.localeCompare(b.itemName);
                break;
            case 'balance':
                cmp = a.remainingBalance - b.remainingBalance;
                break;
            case 'dateAdded':
                cmp = parseDate(a.createdAt) - parseDate(b.createdAt);
                break;
            case 'updated':
                cmp = parseDate(a.updatedAt) - parseDate(b.updatedAt);
                break;
            case 'principal':
                cmp = a.principal - b.principal;
                break;
            case 'totalLoan':
                cmp = a.totalLoan - b.totalLoan;
                break;
            case 'emi':
                cmp = a.emi - b.emi;
                break;
            case 'tenure':
                cmp = (a.tenure ?? 0) - (b.tenure ?? 0);
                break;
            case 'endDate':
                cmp = parseDate(a.endDate) - parseDate(b.endDate);
                break;
            case 'billDate':
                cmp = parseDate(a.billDate) - parseDate(b.billDate);
                break;
            default:
                cmp = 0;
        }

        return mult * cmp;
    });
}
