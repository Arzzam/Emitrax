import { useSelector } from 'react-redux';
import { AlertCircle, ArrowUpDown, Banknote, Clock, IndianRupee, Tag } from 'lucide-react';

import type { ISplitStatsContext } from '@/hooks/useAdvancedFilter';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import useStats from '@/hooks/useStats';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { IEmi } from '@/types/emi.types';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface IStatsOverride {
    statistics: ReturnType<typeof useStats>['statistics'];
    filteredStatistics: ReturnType<typeof useStats>['filteredStatistics'];
    tagStatistics: ReturnType<typeof useStats>['tagStatistics'];
    uniqueTags: string[];
    filterTag: string;
    onSetTag: (tag: string) => void;
    splitContext?: ISplitStatsContext;
}

interface StatsSectionProps {
    emiData: IEmi[];
    statsOverride?: IStatsOverride;
}

const StatsSection = ({ emiData, statsOverride }: StatsSectionProps) => {
    const legacyTag = useSelector((state: IRootState) => state.filterModel.tag);
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const legacyStats = useStats(emiData);
    const legacyDispatch = useRematchDispatch((state: IDispatch) => state.filterModel);

    const tag = statsOverride?.filterTag ?? legacyTag;
    const statistics = statsOverride?.statistics ?? legacyStats.statistics;
    const filteredStatistics = statsOverride?.filteredStatistics ?? legacyStats.filteredStatistics;
    const tagStatistics = statsOverride?.tagStatistics ?? legacyStats.tagStatistics;
    const uniqueTags = statsOverride?.uniqueTags ?? legacyStats.uniqueTags;
    const setTag = statsOverride?.onSetTag ?? legacyDispatch.setTag;
    const splitContext = statsOverride?.splitContext;
    const totalLoanAmount = 'totalLoanAmount' in filteredStatistics ? filteredStatistics.totalLoanAmount : 0;

    return (
        <>
            <section className="mb-8" aria-label="EMI statistics">
                {splitContext?.isActive && (
                    <p className="mb-3 text-xs text-muted-foreground">Based on selected split participants.</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
                            <CardTitle className="text-xs font-medium tracking-tight text-muted-foreground">
                                {tag && tag !== 'All' ? `${tag} EMIs` : 'Total EMIs'}
                            </CardTitle>
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-xl font-semibold tabular-nums">{filteredStatistics.totalEMIs}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {filteredStatistics.activeEMIs} active, {filteredStatistics.completedEMIs} completed
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
                            <CardTitle className="text-xs font-medium tracking-tight text-muted-foreground">
                                {splitContext?.isActive ? 'Monthly share' : 'Monthly payment'}
                            </CardTitle>
                            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-xl font-semibold tabular-nums">
                                {formatCurrencyAmount(filteredStatistics.totalMonthlyPayment)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {splitContext?.isActive ? 'Selected participants’ share' : 'Total monthly EMI'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
                            <CardTitle className="text-xs font-medium tracking-tight text-muted-foreground">
                                Active EMIs
                            </CardTitle>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-xl font-semibold tabular-nums">{filteredStatistics.activeEMIs}</p>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-1.5 rounded-full bg-primary/80 transition-[width]"
                                    style={{
                                        width:
                                            filteredStatistics.totalEMIs > 0
                                                ? `${(filteredStatistics.activeEMIs / filteredStatistics.totalEMIs) * 100}%`
                                                : '0%',
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
                            <CardTitle className="text-xs font-medium tracking-tight text-muted-foreground">
                                {splitContext?.isActive ? 'Outstanding share' : 'Total outstanding'}
                            </CardTitle>
                            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-xl font-semibold tabular-nums">
                                {formatCurrencyAmount(filteredStatistics.totalRemainingBalance)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {splitContext?.isActive ? 'Selected participants’ balance' : 'Remaining balance'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
                            <CardTitle className="text-xs font-medium tracking-tight text-muted-foreground">
                                {splitContext?.isActive ? 'Loan share' : 'Total loan'}
                            </CardTitle>
                            <Banknote className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-xl font-semibold tabular-nums">
                                {formatCurrencyAmount(totalLoanAmount)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {splitContext?.isActive ? 'Selected participants’ loan share' : 'Total loan amount'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {uniqueTags.length > 0 && (
                <Card className="mb-6 border-border/80 shadow-sm" aria-label="Breakdown by category">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                        <CardTitle className="text-sm font-medium tracking-tight">Breakdown by category</CardTitle>
                        <Tag className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        {tag && tag !== 'All' && (
                            <div className="mb-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTag('All')}
                                    className="text-muted-foreground hover:text-foreground -ml-2"
                                >
                                    All categories
                                </Button>
                            </div>
                        )}
                        <ul className="divide-y divide-border/60" role="list">
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setTag('All')}
                                    className={`flex w-full flex-col gap-0.5 py-2.5 px-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                                        !tag || tag === 'All'
                                            ? 'border-l-2 border-primary bg-primary/10'
                                            : 'border-l-2 border-transparent'
                                    }`}
                                    aria-current={!tag || tag === 'All' ? 'true' : undefined}
                                >
                                    <span className="font-medium">All</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {statistics.totalEMIs} EMIs ·{' '}
                                        {formatCurrencyAmount(statistics.totalMonthlyPayment)}/mo ·{' '}
                                        {formatCurrencyAmount(statistics.totalRemainingBalance)} outstanding.
                                        {'totalLoanAmount' in statistics &&
                                            ` · ${formatCurrencyAmount(statistics.totalLoanAmount)} loan`}
                                    </span>
                                </button>
                            </li>
                            {uniqueTags.map((uTag) => {
                                const tagStats = tagStatistics[uTag];
                                const isSelected = tag === uTag;
                                const loanStr =
                                    'totalLoanAmount' in tagStats
                                        ? formatCurrencyAmount(tagStats.totalLoanAmount)
                                        : 'N/A';
                                return (
                                    <li key={uTag}>
                                        <button
                                            type="button"
                                            onClick={() => setTag(uTag)}
                                            className={`flex w-full flex-col gap-0.5 py-2.5 px-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                                                isSelected
                                                    ? 'border-l-2 border-primary bg-primary/10'
                                                    : 'border-l-2 border-transparent'
                                            }`}
                                            aria-current={isSelected ? 'true' : undefined}
                                        >
                                            <span className="flex items-center gap-2 font-medium">
                                                <Tag className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                                                {uTag}
                                            </span>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {tagStats.totalEMIs} EMIs ·{' '}
                                                {tagStats.activeEMIs > 0
                                                    ? `${formatCurrencyAmount(tagStats.totalMonthlyPayment)}/mo · ${formatCurrencyAmount(tagStats.totalRemainingBalance)} outstanding.`
                                                    : '—'}{' '}
                                                · {loanStr} loan
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </>
    );
};

export default StatsSection;
