import { AlertCircle, ArrowUpDown, Clock, IndianRupee, Tag, User } from 'lucide-react';

import { formatAmount } from '@/utils/utils';
import useStats from '@/hooks/useStats';
import { IEmi } from '@/types/emi.types';
import { TFilterOptions } from '../filter/FilterOptions';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const StatsSection = ({
    emiData,
    filters,
    searchQuery,
    setFilters,
}: {
    emiData: IEmi[];
    filters: TFilterOptions;
    searchQuery: string;
    setFilters: (filters: TFilterOptions) => void;
}) => {
    const { statistics, filteredStatistics, uniqueTags, tagStatistics } = useStats(emiData, filters, searchQuery);
    return (
        <>
            {/* Statistics Cards - Now using filteredStatistics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {filters.tag && filters.tag !== 'All' ? `${filters.tag} EMIs` : 'Total EMIs'}
                        </CardTitle>
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStatistics.totalEMIs}</div>
                        <p className="text-xs text-muted-foreground">
                            {filteredStatistics.activeEMIs} active, {filteredStatistics.completedEMIs} completed
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{formatAmount(filteredStatistics.totalMonthlyPayment)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total monthly EMI payments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active EMIs</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStatistics.activeEMIs}</div>
                        <div className="mt-2 h-2 w-full bg-secondary rounded-full">
                            <div
                                className="h-2 bg-primary rounded-full"
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{formatAmount(filteredStatistics.totalRemainingBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total remaining balance</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tag Statistics - Show all tags or just the selected one with a back button */}
            {uniqueTags.length > 0 && (
                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {filters.tag && filters.tag !== 'All' ? `${filters.tag} Statistics` : 'EMIs by Category'}
                        </CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {filters.tag && filters.tag !== 'All' ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md bg-primary/10 border border-primary/20 gap-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{filters.tag}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {filteredStatistics.activeEMIs} active EMIs, ₹
                                            {formatAmount(filteredStatistics.totalMonthlyPayment)}
                                            /month
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, tag: 'All' })}
                                        className="w-full sm:w-auto"
                                    >
                                        View All Categories
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {uniqueTags.map((tag) => {
                                    const tagStats = tagStatistics[tag];
                                    return (
                                        <div
                                            key={tag}
                                            className={`flex flex-col p-3 rounded-md cursor-pointer hover:bg-muted ${
                                                filters.tag === tag
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'bg-muted/50'
                                            }`}
                                            onClick={() => setFilters({ ...filters, tag })}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{tag}</span>
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
                                                        ₹{formatAmount(tagStats.totalMonthlyPayment)}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-muted-foreground">Outstanding</p>
                                                    <p className="font-medium">
                                                        ₹{formatAmount(tagStats.totalRemainingBalance)}
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

            {/* Summary section - Only show when viewing all EMIs */}
            {(!filters.tag || filters.tag === 'All') && uniqueTags.length > 0 && (
                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Summary by Category</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto -mx-4 px-4">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 font-medium">Category</th>
                                        <th className="text-center py-2 font-medium">EMIs</th>
                                        <th className="text-center py-2 font-medium">Active</th>
                                        <th className="text-right py-2 font-medium">Monthly Payment</th>
                                        <th className="text-right py-2 font-medium">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueTags.map((tag) => {
                                        const tagStats = tagStatistics[tag];
                                        const isPersonal = tag === 'Personal';
                                        return (
                                            <tr
                                                key={tag}
                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                onClick={() => setFilters({ ...filters, tag })}
                                            >
                                                <td className="py-2 flex items-center gap-2">
                                                    {isPersonal ? (
                                                        <Tag className="h-3 w-3 text-muted-foreground" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-primary" />
                                                    )}
                                                    {tag}
                                                </td>
                                                <td className="text-center py-2">{tagStats.totalEMIs}</td>
                                                <td className="text-center py-2">{tagStats.activeEMIs}</td>
                                                <td className="text-right py-2">
                                                    ₹{formatAmount(tagStats.totalMonthlyPayment)}
                                                </td>
                                                <td className="text-right py-2">
                                                    ₹{formatAmount(tagStats.totalRemainingBalance)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-muted/30 font-medium">
                                        <td className="py-2">Total</td>
                                        <td className="text-center py-2">{statistics.totalEMIs}</td>
                                        <td className="text-center py-2">{statistics.activeEMIs}</td>
                                        <td className="text-right py-2">
                                            ₹{formatAmount(statistics.totalMonthlyPayment)}
                                        </td>
                                        <td className="text-right py-2">
                                            ₹{formatAmount(statistics.totalRemainingBalance)}
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
