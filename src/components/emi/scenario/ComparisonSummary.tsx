import { CheckCircle2, CircleAlert, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ComparisonSummaryProps {
    formatCurrencyAmount: (amount: number) => string;
    baselineTotalOutflow: number;
    foreclosureTotalOutflow: number;
    interestSaved: number;
    gstSaved: number;
    netSavings: number;
    monthsSaved: number;
    confidence: 'exact' | 'estimated';
    assumptionNotes: string[];
}

const ComparisonSummary = ({
    formatCurrencyAmount,
    baselineTotalOutflow,
    foreclosureTotalOutflow,
    interestSaved,
    gstSaved,
    netSavings,
    monthsSaved,
    confidence,
    assumptionNotes,
}: ComparisonSummaryProps) => {
    const isBreakeven = Math.abs(netSavings) < 0.005;
    const isSaving = netSavings > 0.005;
    const isLoss = netSavings < -0.005;
    const absoluteDelta = Math.abs(netSavings);

    const recommendation = isBreakeven
        ? {
              tone: 'neutral' as const,
              title: 'Both paths cost about the same',
              body: 'Foreclosing and continuing EMIs have a similar total outflow for this date. Choose based on cash availability and comfort.',
              Icon: Info,
          }
        : isSaving
          ? {
                tone: 'positive' as const,
                title: 'Foreclosure looks financially better',
                body: `Closing now reduces total outflow by about ${formatCurrencyAmount(absoluteDelta)} versus continuing monthly EMIs.`,
                Icon: CheckCircle2,
            }
          : {
                tone: 'caution' as const,
                title: 'Continuing EMIs looks financially better',
                body: `Foreclosing now costs about ${formatCurrencyAmount(absoluteDelta)} more overall. Prefer paying every month unless you need to close for non-financial reasons.`,
                Icon: CircleAlert,
            };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20">
                <div className="space-y-1.5">
                    <CardTitle className="text-lg">Baseline vs foreclosure</CardTitle>
                    <CardDescription>
                        Compare continuing EMIs with closing the loan on the selected date.
                    </CardDescription>
                </div>
                <Badge variant={confidence === 'exact' ? 'success' : 'secondary'}>
                    {confidence === 'exact' ? 'Exact' : 'Estimated'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <RecommendationBanner
                    tone={recommendation.tone}
                    title={recommendation.title}
                    body={recommendation.body}
                    Icon={recommendation.Icon}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                    <PathCard
                        label="Continue current EMI"
                        amount={formatCurrencyAmount(baselineTotalOutflow)}
                        hint="Total outflow if you keep paying monthly"
                        preferred={isLoss || isBreakeven}
                        preferenceLabel={isLoss ? 'Recommended' : isBreakeven ? 'Balanced' : undefined}
                        tone={isLoss ? 'positive' : 'neutral'}
                    />
                    <PathCard
                        label="Foreclose now"
                        amount={formatCurrencyAmount(foreclosureTotalOutflow)}
                        hint="Paid to date + payoff amount"
                        preferred={isSaving}
                        preferenceLabel={isSaving ? 'Recommended' : isLoss ? 'Higher cost' : undefined}
                        tone={isSaving ? 'positive' : isLoss ? 'caution' : 'neutral'}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                        label={isLoss ? 'Net loss' : isBreakeven ? 'Net difference' : 'Net savings'}
                        value={formatCurrencyAmount(absoluteDelta)}
                        hint={
                            isLoss
                                ? 'Extra cost vs continuing EMIs'
                                : isBreakeven
                                  ? 'Almost no difference either way'
                                  : 'Lower total cost vs continuing EMIs'
                        }
                        tone={isLoss ? 'caution' : isSaving ? 'positive' : 'neutral'}
                    />
                    <Metric
                        label="Interest avoided"
                        value={formatCurrencyAmount(interestSaved)}
                        hint="Future interest not paid if you close"
                        tone="neutral"
                    />
                    <Metric
                        label="GST avoided"
                        value={formatCurrencyAmount(gstSaved)}
                        hint="Future GST not paid if you close"
                        tone="neutral"
                    />
                    <Metric
                        label="Months shortened"
                        value={`${monthsSaved}`}
                        hint={monthsSaved > 0 ? 'Remaining EMIs you would skip' : 'No remaining tenure'}
                        tone="neutral"
                    />
                </div>

                {isLoss && interestSaved > 0 && (
                    <p className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        You may still avoid some future interest and GST by closing early, but foreclosure charges and
                        payoff timing make the overall path more expensive than continuing EMIs in this scenario.
                    </p>
                )}

                <div className="rounded-lg border border-dashed bg-muted/15 p-4">
                    <p className="text-sm font-medium">Assumptions</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        {assumptionNotes.map((note) => (
                            <li key={note} className="leading-relaxed">
                                • {note}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

const RecommendationBanner = ({
    tone,
    title,
    body,
    Icon,
}: {
    tone: 'positive' | 'caution' | 'neutral';
    title: string;
    body: string;
    Icon: typeof Info;
}) => (
    <div
        className={cn(
            'flex gap-3 rounded-lg border p-4',
            tone === 'positive' &&
                'border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50',
            tone === 'caution' &&
                'border-amber-200/80 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50',
            tone === 'neutral' && 'border-border bg-muted/40 text-foreground'
        )}
        role="status"
    >
        <Icon
            className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
                tone === 'caution' && 'text-amber-700 dark:text-amber-400',
                tone === 'neutral' && 'text-muted-foreground'
            )}
            aria-hidden
        />
        <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            <p className="text-sm leading-relaxed opacity-90">{body}</p>
        </div>
    </div>
);

const PathCard = ({
    label,
    amount,
    hint,
    preferred,
    preferenceLabel,
    tone,
}: {
    label: string;
    amount: string;
    hint: string;
    preferred?: boolean;
    preferenceLabel?: string;
    tone: 'positive' | 'caution' | 'neutral';
}) => (
    <div
        className={cn(
            'rounded-lg border p-4 transition-colors',
            preferred &&
                tone === 'positive' &&
                'border-emerald-300/70 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20',
            preferred &&
                tone === 'caution' &&
                'border-amber-300/70 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20',
            !preferred &&
                tone === 'caution' &&
                'border-amber-200/60 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10',
            !preferred && tone === 'neutral' && 'bg-muted/25',
            !preferred && tone === 'positive' && 'bg-muted/25'
        )}
    >
        <div className="flex items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            {preferenceLabel && (
                <Badge
                    variant="outline"
                    className={cn(
                        'shrink-0 font-medium',
                        tone === 'positive' &&
                            'border-emerald-300 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300',
                        tone === 'caution' &&
                            'border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300'
                    )}
                >
                    {preferenceLabel}
                </Badge>
            )}
        </div>
        <p
            className={cn(
                'mt-2 text-xl font-semibold tabular-nums',
                preferred && tone === 'positive' && 'text-emerald-900 dark:text-emerald-100',
                preferred && tone === 'caution' && 'text-amber-950 dark:text-amber-100'
            )}
        >
            {amount}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
);

const Metric = ({
    label,
    value,
    hint,
    tone,
}: {
    label: string;
    value: string;
    hint?: string;
    tone: 'positive' | 'caution' | 'neutral';
}) => (
    <div
        className={cn(
            'rounded-lg border p-3',
            tone === 'positive' &&
                'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20',
            tone === 'caution' && 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20',
            tone === 'neutral' && 'bg-background'
        )}
    >
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
            className={cn(
                'mt-1 text-base font-semibold tabular-nums',
                tone === 'positive' && 'text-emerald-800 dark:text-emerald-300',
                tone === 'caution' && 'text-amber-800 dark:text-amber-300'
            )}
        >
            {value}
        </p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
);

export default ComparisonSummary;
