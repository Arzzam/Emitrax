import { useSelector } from 'react-redux';
import { AlertCircle, ArrowUpDown, Banknote, Clock, IndianRupee, Tag, User } from 'lucide-react';

import type { ISplitStatsContext } from '@/hooks/useAdvancedFilter';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import useStats from '@/hooks/useStats';
import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { IEmi } from '@/types/emi.types';

import { Badge } from '../ui/badge';
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
                <Card className="mb-6 border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                        <CardTitle className="text-sm font-medium tracking-tight">
                            {tag && tag !== 'All' ? `${tag} Statistics` : 'EMIs by category'}
                        </CardTitle>
                        <Tag className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        {tag && tag !== 'All' ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md bg-primary/10 border border-primary/20 gap-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{tag}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {filteredStatistics.activeEMIs} active EMIs,{' '}
                                            {filteredStatistics.activeEMIs > 0
                                                ? `${formatCurrencyAmount(filteredStatistics.totalMonthlyPayment)} /month`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTag('All')}
                                        className="w-full sm:w-auto"
                                    >
                                        View All Categories
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {uniqueTags.map((uTag) => {
                                    const tagStats = tagStatistics[uTag];
                                    return (
                                        <div
                                            key={uTag}
                                            className={`flex flex-col p-3 rounded-md cursor-pointer hover:bg-muted ${
                                                tag === uTag ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                                            }`}
                                            onClick={() => setTag(uTag)}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{uTag}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {tagStats.totalEMIs} EMIs
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Active EMIs</p>
                                                    <p className="font-medium">{tagStats.activeEMIs}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Monthly</p>
                                                    <p className="font-medium">
                                                        {tagStats.activeEMIs > 0
                                                            ? `${formatCurrencyAmount(tagStats.totalMonthlyPayment)} /mo`
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Outstanding</p>
                                                    <p className="font-medium">
                                                        {tagStats.activeEMIs > 0
                                                            ? formatCurrencyAmount(tagStats.totalRemainingBalance)
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Loan</p>
                                                    <p className="font-medium">
                                                        {'totalLoanAmount' in tagStats
                                                            ? formatCurrencyAmount(tagStats.totalLoanAmount)
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(!tag || tag === 'All') && uniqueTags.length > 0 && (
                <Card className="mb-6 border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                        <CardTitle className="text-sm font-medium tracking-tight">Summary by category</CardTitle>
                        <User className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto -mx-4 px-4">
                            <table className="w-full text-sm min-w-[680px]">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 font-medium">Category</th>
                                        <th className="text-center py-2 font-medium">EMIs</th>
                                        <th className="text-center py-2 font-medium">Active</th>
                                        <th className="text-right py-2 font-medium">Monthly</th>
                                        <th className="text-right py-2 font-medium">Outstanding</th>
                                        <th className="text-right py-2 font-medium">Total loan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueTags.map((ut) => {
                                        const tagStats = tagStatistics[ut];
                                        const isPersonal = ut === 'Personal';
                                        return (
                                            <tr
                                                key={ut}
                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                onClick={() => setTag(ut)}
                                            >
                                                <td className="py-2 flex items-center gap-2">
                                                    {isPersonal ? (
                                                        <Tag className="h-3 w-3 text-muted-foreground" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-primary" />
                                                    )}
                                                    {ut}
                                                </td>
                                                <td className="text-center py-2">{tagStats.totalEMIs}</td>
                                                <td className="text-center py-2">{tagStats.activeEMIs}</td>
                                                <td className="text-right py-2">
                                                    {tagStats.activeEMIs > 0
                                                        ? formatCurrencyAmount(tagStats.totalMonthlyPayment)
                                                        : 'N/A'}
                                                </td>
                                                <td className="text-right py-2">
                                                    {tagStats.activeEMIs > 0
                                                        ? formatCurrencyAmount(tagStats.totalRemainingBalance)
                                                        : 'N/A'}
                                                </td>
                                                <td className="text-right py-2">
                                                    {'totalLoanAmount' in tagStats
                                                        ? formatCurrencyAmount(tagStats.totalLoanAmount)
                                                        : 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-muted/30 font-medium">
                                        <td className="py-2">Total</td>
                                        <td className="text-center py-2">{statistics.totalEMIs}</td>
                                        <td className="text-center py-2">{statistics.activeEMIs}</td>
                                        <td className="text-right py-2">
                                            {formatCurrencyAmount(statistics.totalMonthlyPayment)}
                                        </td>
                                        <td className="text-right py-2">
                                            {formatCurrencyAmount(statistics.totalRemainingBalance)}
                                        </td>
                                        <td className="text-right py-2">
                                            {'totalLoanAmount' in statistics
                                                ? formatCurrencyAmount(statistics.totalLoanAmount)
                                                : 'N/A'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
};

export default StatsSection;
