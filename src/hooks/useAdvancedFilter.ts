import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { filterAndSortEmis } from '@/modules/filter/filterEmis';
import { aggregateSplitContributions } from '@/modules/filter/splitContributions';
import { IRootState } from '@/store/types/store.types';
import { IEmi } from '@/types/emi.types';

import { useDisplayUser } from './useUser';

/** Context when split-person filter is active; used for UI labels. */
export interface ISplitStatsContext {
    isActive: boolean;
    selectedParticipantKeys: string[];
}

export interface IAdvancedFilterStats {
    totalEMIs: number;
    activeEMIs: number;
    completedEMIs: number;
    totalMonthlyPayment: number;
    totalRemainingBalance: number;
    totalLoanAmount: number;
    tagCounts: Record<string, number>;
    splitContext?: ISplitStatsContext;
}

export interface IAdvancedFilterTagStats {
    activeEMIs: number;
    totalEMIs: number;
    totalMonthlyPayment: number;
    totalRemainingBalance: number;
    totalLoanAmount: number;
}

interface ComputeStatsOptions {
    splitParticipantKeys: string[];
    currentUserId?: string;
}

function computeStatistics(emis: IEmi[], options?: ComputeStatsOptions): IAdvancedFilterStats {
    const tagCounts: Record<string, number> = {};
    emis.forEach((emi) => {
        const tag = emi.tag || 'Personal';
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });

    const useSplitContributions = options && options.splitParticipantKeys.length > 0;

    let totalMonthlyPayment: number;
    let totalRemainingBalance: number;
    let totalLoanAmount: number;
    let splitContext: ISplitStatsContext | undefined;

    if (useSplitContributions && options) {
        const contrib = aggregateSplitContributions(emis, options.splitParticipantKeys, options.currentUserId);
        totalMonthlyPayment = contrib.monthlyShare;
        totalRemainingBalance = contrib.remainingShare;
        totalLoanAmount = contrib.loanShare;
        splitContext = {
            isActive: true,
            selectedParticipantKeys: options.splitParticipantKeys,
        };
    } else {
        totalMonthlyPayment = emis.reduce((sum, e) => sum + (e.isCompleted ? 0 : e.emi), 0);
        totalRemainingBalance = emis.reduce((sum, e) => sum + (e.isCompleted ? 0 : e.remainingBalance), 0);
        totalLoanAmount = emis.reduce((sum, e) => sum + e.totalLoan, 0);
    }

    return {
        totalEMIs: emis.length,
        activeEMIs: emis.filter((e) => !e.isCompleted).length,
        completedEMIs: emis.filter((e) => e.isCompleted).length,
        totalMonthlyPayment,
        totalRemainingBalance,
        totalLoanAmount,
        tagCounts,
        splitContext,
    };
}

function computeTagStatistics(emis: IEmi[], options?: ComputeStatsOptions): Record<string, IAdvancedFilterTagStats> {
    const stats: Record<string, IAdvancedFilterTagStats> = {};
    const useSplitContributions = options && options.splitParticipantKeys.length > 0;

    emis.forEach((emi) => {
        const tag = emi.tag || 'Personal';
        if (!stats[tag]) {
            stats[tag] = {
                activeEMIs: 0,
                totalEMIs: 0,
                totalMonthlyPayment: 0,
                totalRemainingBalance: 0,
                totalLoanAmount: 0,
            };
        }
        stats[tag].totalEMIs += 1;
        if (!emi.isCompleted) {
            stats[tag].activeEMIs += 1;
        }
        if (useSplitContributions && options) {
            const contrib = aggregateSplitContributions([emi], options.splitParticipantKeys, options.currentUserId);
            stats[tag].totalMonthlyPayment += contrib.monthlyShare;
            stats[tag].totalRemainingBalance += contrib.remainingShare;
            stats[tag].totalLoanAmount += contrib.loanShare;
        } else {
            if (!emi.isCompleted) {
                stats[tag].totalMonthlyPayment += emi.emi;
                stats[tag].totalRemainingBalance += emi.remainingBalance;
            }
            stats[tag].totalLoanAmount += emi.totalLoan;
        }
    });
    return stats;
}

export function useAdvancedFilter(emiData: IEmi[]) {
    const filterState = useSelector((state: IRootState) => state.advancedFilterModel);

    const currentUser = useDisplayUser();

    const filteredEmiData = useMemo(
        () => filterAndSortEmis(emiData, filterState, currentUser),
        [emiData, filterState, currentUser]
    );

    const statsOptions: ComputeStatsOptions | undefined = useMemo(() => {
        const keys = filterState.splitWithParticipantKeys;
        if (keys.length === 0) return undefined;
        return {
            splitParticipantKeys: keys,
            currentUserId: currentUser?.user?.id,
        };
    }, [filterState.splitWithParticipantKeys, currentUser?.user?.id]);

    const statistics = useMemo(() => computeStatistics(filteredEmiData, statsOptions), [filteredEmiData, statsOptions]);

    const filteredStatistics = useMemo(
        () => computeStatistics(filteredEmiData, statsOptions),
        [filteredEmiData, statsOptions]
    );

    const tagStatistics = useMemo(
        () => computeTagStatistics(filteredEmiData, statsOptions),
        [filteredEmiData, statsOptions]
    );

    const uniqueTags = useMemo(() => Object.keys(statistics.tagCounts).sort(), [statistics.tagCounts]);

    return {
        filteredEmiData,
        statistics,
        filteredStatistics,
        tagStatistics,
        uniqueTags,
        filterTag: filterState.tag,
        splitContext: statistics.splitContext,
    };
}

export default useAdvancedFilter;
