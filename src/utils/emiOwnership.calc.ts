import { IEmi, IEmiSplit } from '@/types/emi.types';
import { coerceOptionalNumber } from '@/utils/calculation';

/** Splits may sum to 100 with float slop; matches EmiSplitService.validateSplits. */
const COVERAGE_TOLERANCE = 0.01;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const roundPercentage = (value: number): number => Number(value.toFixed(2));

/**
 * Who actually carries a loan, from the signed-in user's point of view.
 *
 * - `sole`      — the whole loan is the user's. The common case: no split rows.
 * - `shared`    — split, and the user carries some but not all of it.
 * - `on_behalf` — the user owns the loan (it is on their card / their credit)
 *                 but carries none of it. This is the "financed it for a friend
 *                 or family member, split 100% to them" case: the money leaves
 *                 the user's account each month, but the liability is not
 *                 theirs, so it must never be added to their own totals.
 * - `observer`  — somebody else's loan, visible only because it was shared with
 *                 the user. Belongs in neither of the user's buckets.
 */
export type EmiOwnershipMode = 'sole' | 'shared' | 'on_behalf' | 'observer';

export interface IEmiOwnership {
    mode: EmiOwnershipMode;
    /** True when the signed-in user created the loan and fronts the money. */
    isOwner: boolean;
    isSplit: boolean;
    /** 0-100 of the loan the user carries. */
    myPercentage: number;
    /** 0-100 carried by everyone else. Unreliable when `isPartialView`. */
    othersPercentage: number;
    /** Sum of the visible split rows. 0 on an unsplit loan. */
    coveredPercentage: number;
    /** Percentage no split row claims, absorbed by the owner. 0 for a non-owner. */
    unallocatedPercentage: number;
    /** The user cannot see every split row, so `othersPercentage` is a floor. */
    isPartialView: boolean;
}

/** The split row belonging to the signed-in user, if they are a participant. */
export function findMySplit(splits: IEmiSplit[], currentUserId?: string): IEmiSplit | undefined {
    if (!currentUserId) return undefined;
    return splits.find((split) => !split.isExternal && split.userId === currentUserId);
}

/**
 * Resolves how much of an EMI the signed-in user is actually on the hook for.
 *
 * Two rules carry the weight here:
 *
 * 1. **An unsplit loan sits entirely with its owner.** There are no split rows
 *    to read, so absence of a split means 100%, not 0%.
 * 2. **The owner absorbs whatever the split table leaves unallocated.** A loan
 *    is owed in full by somebody; if the user split 40% to a friend and never
 *    added a row for themselves, the other 60% is still theirs. This applies
 *    only to the owner — row-level RLS lets a mere participant see just their
 *    own row, so an incomplete set there means "hidden", not "unclaimed", and
 *    is reported through `isPartialView` instead.
 */
export function resolveEmiOwnership(
    emi: Pick<IEmi, 'splits' | 'mySplit' | 'isOwner' | 'userId'>,
    currentUserId?: string
): IEmiOwnership {
    const splits = emi.splits ?? [];
    const isSplit = splits.length > 0;
    const isOwner = emi.isOwner ?? (!!currentUserId && emi.userId === currentUserId);

    const coveredPercentage = roundPercentage(
        splits.reduce((acc, split) => acc + coerceOptionalNumber(split.splitPercentage), 0)
    );
    const unallocatedPercentage = isOwner ? roundPercentage(Math.max(0, 100 - coveredPercentage)) : 0;

    const mySplit = emi.mySplit ?? findMySplit(splits, currentUserId);
    const declaredPercentage = mySplit ? coerceOptionalNumber(mySplit.splitPercentage) : 0;

    const myPercentage = roundPercentage(clamp(declaredPercentage + unallocatedPercentage, 0, 100));
    const othersPercentage = roundPercentage(clamp(100 - myPercentage, 0, 100));
    const isPartialView = !isOwner && isSplit && coveredPercentage < 100 - COVERAGE_TOLERANCE;

    let mode: EmiOwnershipMode;
    if (myPercentage >= 100 - COVERAGE_TOLERANCE) {
        mode = 'sole';
    } else if (myPercentage > COVERAGE_TOLERANCE) {
        mode = 'shared';
    } else {
        mode = isOwner ? 'on_behalf' : 'observer';
    }

    return {
        mode,
        isOwner,
        isSplit,
        myPercentage,
        othersPercentage,
        coveredPercentage,
        unallocatedPercentage,
        isPartialView,
    };
}

/** Display label for a split participant, registered or name-only. */
export function getParticipantName(split: IEmiSplit): string {
    return split.participantName?.trim() || split.user_profiles?.email || split.participantEmail?.trim() || 'Unknown';
}

/** Email for a split participant, resolved through the joined profile for registered users. */
export function getParticipantEmail(split: IEmiSplit): string | null {
    return split.user_profiles?.email || split.participantEmail?.trim() || null;
}
