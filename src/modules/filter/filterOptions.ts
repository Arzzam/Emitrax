import type { IEmi } from '@/types/emi.types';

import type { SharedPersonOption, SplitPersonOption } from './filter.types';

/**
 * Unique persons the current user has shared EMIs with (from owned EMIs only).
 */
export function getSharedPersonOptions(emiData: IEmi[]): SharedPersonOption[] {
    const seen = new Set<string>();
    const options: SharedPersonOption[] = [];

    for (const emi of emiData) {
        if (!emi.isOwner || !emi.sharedWith?.length) continue;
        for (const s of emi.sharedWith) {
            if (seen.has(s.sharedWithUserId)) continue;
            seen.add(s.sharedWithUserId);
            const label = s.sharedWithUserEmail ?? s.user_profiles?.email ?? s.sharedWithUserId;
            options.push({ id: s.sharedWithUserId, label });
        }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Split participant options: current user (by id/email) first as "Me", then unique participants from EMIs that have splits.
 * Always include current user so they can filter by "Me" (two-case: split-with-me or non-split).
 */
export function getSplitPersonOptions(
    emiData: IEmi[],
    options?: { currentUserId?: string; currentUserLabel?: string }
): SplitPersonOption[] {
    const result: SplitPersonOption[] = [];
    const seen = new Set<string>();

    if (options?.currentUserId) {
        result.push({ id: options.currentUserId, label: options.currentUserLabel ?? 'Me' });
        seen.add(options.currentUserId);
    }

    for (const emi of emiData) {
        if (!emi.splits?.length) continue;
        for (const s of emi.splits) {
            const id = s.userId ? s.userId : `ext:${s.participantEmail ?? s.participantName ?? ''}`;
            if (seen.has(id)) continue;
            seen.add(id);
            const label = s.participantName ?? s.participantEmail ?? s.user_profiles?.email ?? id;
            result.push({ id, label });
        }
    }

    result.sort((a, b) => {
        if (options?.currentUserId && a.id === options.currentUserId) return -1;
        if (options?.currentUserId && b.id === options.currentUserId) return 1;
        return a.label.localeCompare(b.label);
    });
    return result;
}
