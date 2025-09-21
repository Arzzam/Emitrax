import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { IEmi } from '@/types/emi.types';
import { IRootState } from '@/store/types/store.types';

import { useEmis } from './useEmi';
import { TComboboxOption } from '@/components/ui/combobox';

export const useUniqueTagsOptions = (): TComboboxOption[] => {
    const { data: emiData } = useEmis();
    const tagOptions = useMemo(() => {
        const defaultTags = ['Personal'];
        const uniqueTags = [...new Set([...defaultTags, ...(emiData?.map((emi) => emi.tag || 'Personal') || [])])];
        return uniqueTags.map((tag) => ({ value: tag, label: tag }));
    }, [emiData]);

    return tagOptions;
};

const useStats = (emiData: IEmi[]) => {
    const { searchQuery, status, tag, sortOrder, sortBy } = useSelector((state: IRootState) => state.filterModel);

    const filteredEmis = useMemo(() => {
        return status === 'active'
            ? emiData.filter((emi) => !emi.isArchived)
            : status === 'archived'
              ? emiData.filter((emi) => emi.isArchived)
              : emiData;
    }, [emiData, status]);

    // Calculate statistics (excluding archived EMIs by default)
    const statistics = useMemo(() => {
        const stats = {
            totalEMIs: filteredEmis.length,
            activeEMIs: filteredEmis.filter((emi) => !emi.isCompleted).length,
            completedEMIs: filteredEmis.filter((emi) => emi.isCompleted).length,
            totalMonthlyPayment: filteredEmis.reduce((sum, emi) => sum + (emi.isCompleted ? 0 : emi.emi), 0),
            totalRemainingBalance: filteredEmis.reduce(
                (sum, emi) => sum + (emi.isCompleted ? 0 : emi.remainingBalance),
                0
            ),
            tagCounts: {} as Record<string, number>,
        };

        // Count EMIs by tag (excluding archived)
        filteredEmis.forEach((emi) => {
            const tag = emi.tag || 'Personal';
            stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
        });

        return stats;
    }, [filteredEmis]);

    // Calculate filtered statistics based on selected tag and archive status
    const filteredStatistics = useMemo(() => {
        // If no tag filter or "All" is selected, calculate stats from base EMIs
        if (!tag || tag === 'All') {
            return {
                totalEMIs: filteredEmis.length,
                activeEMIs: filteredEmis.filter((emi) => !emi.isCompleted).length,
                completedEMIs: filteredEmis.filter((emi) => emi.isCompleted).length,
                totalMonthlyPayment: filteredEmis.reduce((sum, emi) => sum + (emi.isCompleted ? 0 : emi.emi), 0),
                totalRemainingBalance: filteredEmis.reduce(
                    (sum, emi) => sum + (emi.isCompleted ? 0 : emi.remainingBalance),
                    0
                ),
                tagCounts: statistics.tagCounts, // Keep the overall tag counts
            };
        }

        // Filter EMIs by the selected tag from base EMIs
        const tagFilteredEmis = filteredEmis.filter((emi) => (emi.tag || 'Personal') === tag);

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
    }, [filteredEmis, tag, statistics.tagCounts]);

    // Calculate statistics by tag (excluding archived EMIs by default)
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

        filteredEmis.forEach((emi) => {
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
    }, [filteredEmis]);

    // Get unique tags for display in statistics
    const uniqueTags = useMemo(() => {
        return Object.keys(statistics.tagCounts).sort();
    }, [statistics.tagCounts]);

    const filteredEmiData = useMemo(() => {
        return emiData
            .filter((emi) => {
                const matchesSearch = emi.itemName.toLowerCase().includes(searchQuery.toLowerCase());
                let matchesStatus;
                if (status === 'archived') {
                    matchesStatus = emi.isArchived;
                } else {
                    matchesStatus =
                        status === 'all' ? true : status === 'completed' ? emi.isCompleted : !emi.isCompleted;
                }
                const matchesTag = tag === 'All' ? true : (emi.tag || 'Personal') === tag;
                return matchesSearch && matchesStatus && matchesTag;
            })
            .sort((a, b) => {
                if (sortOrder === 'asc') {
                    switch (sortBy) {
                        case 'dateAdded':
                            return new Date(a?.createdAt || '').getTime() - new Date(b?.createdAt || '').getTime();
                        case 'name':
                            return a.itemName.localeCompare(b.itemName);
                        case 'balance':
                            return b.remainingBalance - a.remainingBalance;
                        case 'updated':
                            return new Date(b?.updatedAt || '').getTime() - new Date(a?.updatedAt || '').getTime();
                        default:
                            return 0;
                    }
                } else {
                    switch (sortBy) {
                        case 'dateAdded':
                            return new Date(b?.createdAt || '').getTime() - new Date(a?.createdAt || '').getTime();
                        case 'name':
                            return b.itemName.localeCompare(a.itemName);
                        case 'balance':
                            return b.remainingBalance - a.remainingBalance;
                        case 'updated':
                            return new Date(b?.updatedAt || '').getTime() - new Date(a?.updatedAt || '').getTime();
                        default:
                            return 0;
                    }
                }
            });
    }, [emiData, searchQuery, status, tag, sortOrder, sortBy]);

    return {
        statistics,
        filteredStatistics,
        tagStatistics,
        uniqueTags,
        filteredEmiData,
    };
};

export default useStats;
