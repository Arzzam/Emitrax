import { useMemo } from 'react';
import { Wallet } from 'lucide-react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { IEmi, IEmiSplit } from '@/types/emi.types';
import {
    getParticipantRepaymentBreakdown,
    getRepaymentProgress,
    prorateRepaymentProgress,
    RepaymentComponents,
} from '@/utils/emiRepayment.calc';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FormatCurrency = (value: number) => string;

const getParticipantName = (split: IEmiSplit): string =>
    split.participantName || split.participantEmail || split.user_profiles?.email || 'Unknown';

const LedgerRow = ({ label, value, format }: { label: string; value: number; format: FormatCurrency }) => (
    <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{format(value)}</span>
    </div>
);

const LedgerPanel = ({
    title,
    components,
    subtotalLabel,
    format,
    showOriginationCharges,
    footnote,
}: {
    title: string;
    components: RepaymentComponents;
    subtotalLabel: string;
    format: FormatCurrency;
    showOriginationCharges: boolean;
    footnote?: string;
}) => (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="space-y-2.5">
            <LedgerRow label="Principal" value={components.principal} format={format} />
            <LedgerRow label="Interest" value={components.interest} format={format} />
            <LedgerRow label="Interest GST" value={components.gst} format={format} />
            {showOriginationCharges && (
                <>
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            Processing fee
                            <Badge variant="secondary" className="text-[10px] font-normal">
                                Upfront
                            </Badge>
                        </span>
                        <span className="font-medium tabular-nums">{format(components.processingFee)}</span>
                    </div>
                    {components.processingFeeGst > 0 && (
                        <LedgerRow label="Processing fee GST" value={components.processingFeeGst} format={format} />
                    )}
                </>
            )}
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-foreground">{subtotalLabel}</span>
            <span className="font-semibold tabular-nums">{format(components.total)}</span>
        </div>
        {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
    </div>
);

const ComponentSplitLine = ({ components, format }: { components: RepaymentComponents; format: FormatCurrency }) => (
    <span className="block text-xs text-muted-foreground tabular-nums">
        {`P ${format(components.principal)} · I ${format(components.interest)} · GST ${format(components.gst)}`}
    </span>
);

/**
 * Where the borrower stands on a loan: what has been settled and what is still
 * owed, broken into principal, interest and tax — and, for a split EMI, the
 * same ledger for each participant.
 *
 * Every figure derives from the amortization schedule via emiRepayment.calc,
 * never from the persisted totalPaidEMIs or remainingBalance columns, which go
 * stale and (in remainingBalance's case) mix GST into a principal figure.
 */
const RepaymentProgressCard = ({ emi }: { emi: IEmi }) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    const { progress, breakdown, scopedProgress } = useMemo(() => {
        const wholeLoan = getRepaymentProgress(emi);
        const participantBreakdown = getParticipantRepaymentBreakdown(emi, wholeLoan);

        // Under RLS a non-owner participant can only read their own split row,
        // so the ledger is scoped to their share rather than showing a total
        // they are not responsible for.
        const scoped =
            participantBreakdown.isPartialView && emi.mySplit
                ? prorateRepaymentProgress(wholeLoan, emi.mySplit.splitPercentage)
                : wholeLoan;

        return { progress: wholeLoan, breakdown: participantBreakdown, scopedProgress: scoped };
    }, [emi]);

    const isScoped = breakdown.isPartialView && !!emi.mySplit;
    const showParticipantTable = breakdown.participants.length > 0 && !breakdown.isPartialView;
    const hasOriginationCharges = scopedProgress.paid.processingFee > 0;

    const settledPercent = Math.round(scopedProgress.completionRatio * 100);

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                            <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
                            Repayment progress
                        </CardTitle>
                        <CardDescription>What you have settled so far, and what is still outstanding.</CardDescription>
                    </div>
                    {isScoped && (
                        <Badge variant="outline" className="w-fit text-xs font-normal">
                            Your {emi.mySplit?.splitPercentage.toFixed(1)}% portion
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="tabular-nums">
                            <span className="font-semibold">{formatCurrencyAmount(scopedProgress.paid.total)}</span>
                            <span className="text-muted-foreground">
                                {' '}
                                of {formatCurrencyAmount(scopedProgress.lifetime.total)} settled
                            </span>
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {progress.paidInstallments} of {progress.totalInstallments} instalments
                        </span>
                    </div>
                    <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label="Repayment progress"
                        aria-valuenow={settledPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="h-1.5 rounded-full bg-primary transition-[width]"
                            style={{ width: `${settledPercent}%` }}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <LedgerPanel
                        title="Paid to date"
                        components={scopedProgress.paid}
                        subtotalLabel="Total paid"
                        format={formatCurrencyAmount}
                        showOriginationCharges={hasOriginationCharges}
                    />
                    <LedgerPanel
                        title="Remaining"
                        components={scopedProgress.remaining}
                        subtotalLabel="Total remaining"
                        format={formatCurrencyAmount}
                        showOriginationCharges={false}
                        footnote={
                            hasOriginationCharges ? 'One-time charges were collected upfront at disbursal.' : undefined
                        }
                    />
                </div>

                {scopedProgress.interestDiscountApplied > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Interest shown net of {formatCurrencyAmount(scopedProgress.interestDiscountApplied)} discount.
                        GST is charged on the undiscounted interest.
                    </p>
                )}

                {isScoped && (
                    <p className="text-xs text-muted-foreground">
                        Only your share is visible. Ask the EMI owner for the full split breakdown.
                    </p>
                )}

                {showParticipantTable && emi.splits && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participant</TableHead>
                                    <TableHead className="text-right">Share</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {breakdown.participants.map((participant) => {
                                    const split = emi.splits?.find((s) => s.id === participant.splitId);
                                    if (!split) return null;

                                    return (
                                        <TableRow key={participant.splitId}>
                                            <TableCell>
                                                <span className="flex flex-wrap items-center gap-1.5">
                                                    <span className="font-medium">{getParticipantName(split)}</span>
                                                    {participant.isCurrentUser && (
                                                        <Badge variant="default" className="text-[10px]">
                                                            You
                                                        </Badge>
                                                    )}
                                                    {split.isExternal && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            External
                                                        </Badge>
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {participant.splitPercentage.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium tabular-nums">
                                                    {formatCurrencyAmount(participant.progress.paid.total)}
                                                </span>
                                                <ComponentSplitLine
                                                    components={participant.progress.paid}
                                                    format={formatCurrencyAmount}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium tabular-nums">
                                                    {formatCurrencyAmount(participant.progress.remaining.total)}
                                                </span>
                                                <ComponentSplitLine
                                                    components={participant.progress.remaining}
                                                    format={formatCurrencyAmount}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell className="font-medium">Whole loan</TableCell>
                                    <TableCell className="text-right tabular-nums">100.0%</TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">
                                        {formatCurrencyAmount(progress.paid.total)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">
                                        {formatCurrencyAmount(progress.remaining.total)}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RepaymentProgressCard;
