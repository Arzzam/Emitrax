import type { IEmi, IEmiSplit } from '@/types/emi.types';

/** Key used in split filter: userId for registered users, `ext:${email|name}` for externals. */
export function getSplitParticipantKey(split: IEmiSplit): string {
    if (split.userId) return split.userId;
    return `ext:${split.participantEmail ?? split.participantName ?? ''}`;
}

export interface IEmiSplitContribution {
    monthlyShare: number;
    loanShare: number;
    remainingShare: number;
}

/**
 * For a single EMI, compute the combined contribution of all selected split participants.
 * Used when split-person filter is active: stats should show the sum of each selected
 * participant's share (monthly EMI share, total loan share, remaining balance share).
 * Non-split EMIs included because current user is selected are treated as 100% current user.
 */
export function getContributionsForEmi(
    emi: IEmi,
    selectedParticipantKeys: ReadonlySet<string>,
    currentUserId?: string
): IEmiSplitContribution {
    const empty: IEmiSplitContribution = { monthlyShare: 0, loanShare: 0, remainingShare: 0 };
    if (selectedParticipantKeys.size === 0) return empty;

    const hasSplits = (emi.splits?.length ?? 0) > 0;

    if (!hasSplits) {
        if (currentUserId && selectedParticipantKeys.has(currentUserId)) {
            return {
                monthlyShare: emi.isCompleted ? 0 : emi.emi,
                loanShare: emi.totalLoan,
                remainingShare: emi.isCompleted ? 0 : emi.remainingBalance,
            };
        }
        return empty;
    }

    let monthlyShare = 0;
    let loanShare = 0;
    let remainingShare = 0;

    for (const s of emi.splits ?? []) {
        const key = getSplitParticipantKey(s);
        if (!selectedParticipantKeys.has(key)) continue;

        const pct = s.splitPercentage / 100;
        monthlyShare += emi.isCompleted ? 0 : (s.splitAmount ?? emi.emi * pct);
        loanShare += emi.totalLoan * pct;
        remainingShare += emi.isCompleted ? 0 : emi.remainingBalance * pct;
    }

    return { monthlyShare, loanShare, remainingShare };
}

/**
 * Aggregate split contributions across a list of EMIs for the given selected participant keys.
 */
export function aggregateSplitContributions(
    emis: IEmi[],
    selectedParticipantKeys: string[],
    currentUserId?: string
): IEmiSplitContribution {
    const set = new Set(selectedParticipantKeys);
    return emis.reduce<IEmiSplitContribution>(
        (acc, emi) => {
            const c = getContributionsForEmi(emi, set, currentUserId);
            return {
                monthlyShare: acc.monthlyShare + c.monthlyShare,
                loanShare: acc.loanShare + c.loanShare,
                remainingShare: acc.remainingShare + c.remainingShare,
            };
        },
        { monthlyShare: 0, loanShare: 0, remainingShare: 0 }
    );
}
