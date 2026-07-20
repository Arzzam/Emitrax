import { ScenarioBreakdownItem } from '@/types/scenario.types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PayoffBreakdownProps {
    title?: string;
    description?: string;
    breakdown: ScenarioBreakdownItem[];
    totalPayoff: number;
    formatCurrencyAmount: (amount: number) => string;
}

const PayoffBreakdown = ({
    title = 'Payoff breakdown',
    description = 'Amounts due if you foreclose on the selected date.',
    breakdown,
    totalPayoff,
    formatCurrencyAmount,
}: PayoffBreakdownProps) => {
    const rows = breakdown.filter((item) => item.component !== 'total_payoff' && item.amount > 0);
    const zeroRows = breakdown.filter((item) => item.component !== 'total_payoff' && item.amount <= 0);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
                {rows.map((item) => (
                    <div key={item.component} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium tabular-nums">{formatCurrencyAmount(item.amount)}</span>
                    </div>
                ))}

                {zeroRows.length > 0 && (
                    <div className="space-y-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                        {zeroRows.map((item) => (
                            <div
                                key={item.component}
                                className="flex items-center justify-between gap-4 text-xs text-muted-foreground"
                            >
                                <span>{item.label}</span>
                                <span className="tabular-nums">{formatCurrencyAmount(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <Separator />
                <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-3">
                    <span className="font-medium">Total payoff</span>
                    <span className="text-lg font-semibold tabular-nums">{formatCurrencyAmount(totalPayoff)}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default PayoffBreakdown;
