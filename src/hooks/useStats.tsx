import { useMemo } from 'react';

import { IEmi } from '@/types/emi.types';
import { TFilterOptions } from '@/components/filter/FilterOptions';

const useStats = (emiData: IEmi[], filters: TFilterOptions, searchQuery: string) => {
    // Calculate statistics
    const statistics = useMemo(() => {
        const stats = {
            totalEMIs: emiData.length,
            activeEMIs: emiData.filter((emi) => !emi.isCompleted).length,
            completedEMIs: emiData.filter((emi) => emi.isCompleted).length,
            totalMonthlyPayment: emiData.reduce((sum, emi) => sum + (emi.isCompleted ? 0 : emi.emi), 0),
            totalRemainingBalance: emiData.reduce((sum, emi) => sum + (emi.isCompleted ? 0 : emi.remainingBalance), 0),
            tagCounts: {} as Record<string, number>,
        };

        // Count EMIs by tag
        emiData.forEach((emi) => {
            const tag = emi.tag || 'Personal';
            stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
        });

        return stats;
    }, [emiData]);

    // Calculate filtered statistics based on selected tag
    const filteredStatistics = useMemo(() => {
        // If no tag filter or "All" is selected, return the overall statistics
        if (!filters.tag || filters.tag === 'All') {
            return statistics;
        }

        // Filter EMIs by the selected tag
        const tagFilteredEmis = emiData.filter((emi) => (emi.tag || 'Personal') === filters.tag);

        return {
            totalEMIs: tagFilteredEmis.length,
            activeEMIs: tagFilteredEmis.filter((emi) => !emi.isCompleted).length,
            completedEMIs: tagFilteredEmis.filter((emi) => emi.isCompleted).length,
            totalMonthlyPayment: tagFilteredEmis.reduce((sum, emi) => sum + (emi.isCompleted ? 0 : emi.emi), 0),
            totalRemainingBalance: tagFilteredEmis.reduce(
                (sum, emi) => sum + (emi.isCompleted ? 0 : emi.remainingBalance),
                0
            ),
            tagCounts: statistics.tagCounts, // Keep the overall tag counts
        };
    }, [emiData, filters.tag, statistics]);

    // Calculate statistics by tag
    const tagStatistics = useMemo(() => {
        const stats: Record<
            string,
            {
                activeEMIs: number;
                totalEMIs: number;
                totalMonthlyPayment: number;
                totalRemainingBalance: number;
            }
        > = {};

        // Group EMIs by tag and calculate stats
        emiData.forEach((emi) => {
            const tag = emi.tag || 'Personal';

            if (!stats[tag]) {
                stats[tag] = {
                    activeEMIs: 0,
                    totalEMIs: 0,
                    totalMonthlyPayment: 0,
                    totalRemainingBalance: 0,
                };
            }

            stats[tag].totalEMIs++;

            if (!emi.isCompleted) {
                stats[tag].activeEMIs++;
                stats[tag].totalMonthlyPayment += emi.emi;
                stats[tag].totalRemainingBalance += emi.remainingBalance;
            }
        });

        return stats;
    }, [emiData]);

    // Get unique tags for display in statistics
    const uniqueTags = useMemo(() => {
        return Object.keys(statistics.tagCounts).sort();
    }, [statistics.tagCounts]);

    const filteredEmiData = useMemo(() => {
        return emiData
            .filter((emi) => {
                const matchesSearch = emi.itemName.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus =
                    filters.status === 'all'
                        ? true
                        : filters.status === 'completed'
                          ? emi.isCompleted
                          : !emi.isCompleted;
                const matchesTag = filters.tag === 'All' ? true : (emi.tag || 'Personal') === filters.tag;
                return matchesSearch && matchesStatus && matchesTag;
            })
            .sort((a, b) => {
                switch (filters.sortBy) {
                    case 'name':
                        return a.itemName.localeCompare(b.itemName);
                    case 'balance':
                        return b.remainingBalance - a.remainingBalance;
                    default:
                        return 0;
                }
            });
    }, [emiData, filters, searchQuery]);

    return {
        statistics,
        filteredStatistics,
        tagStatistics,
        uniqueTags,
        filteredEmiData,
    };
};

export default useStats;
