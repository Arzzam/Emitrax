import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { ICreditCard, UtilisationPeak } from '@/types/creditCard.types';
import { formatUtilisationPercent, getUtilisationStatus } from '@/utils/creditCardUtilisation.calc';

import ThresholdGauge from '@/components/creditCards/ThresholdGauge';
import { Badge } from '@/components/ui/badge';

/** "15th → 5th", or nothing when the cycle has not been configured. */
function describeCycle(card: ICreditCard): string | null {
    if (card.statementDay == null && card.dueDay == null) {
        return null;
    }

    const statement = card.statementDay == null ? '—' : `${card.statementDay}`;
    const due = card.dueDay == null ? '—' : `${card.dueDay}`;
    return `Statement ${statement} → due ${due}`;
}

/**
 * One card on the list page: what it is, what it can borrow, and how hard it was
 * pushed this year.
 *
 * The peak is the headline rather than the latest month, for the same reason the
 * issuer card uses it - a limit is breached at a point in time, and the month
 * that mattered is the worst one, not the most recent.
 */
const CardSummaryRow = ({
    card,
    peak,
    financialYear,
}: {
    card: ICreditCard;
    peak: UtilisationPeak | null;
    /** Carried into the link so the card page opens on the year being viewed. */
    financialYear: string;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const cycle = describeCycle(card);

    return (
        <Link
            to={`/credit-cards/cards/${card.id}?fy=${financialYear}`}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-2">
                    <span className={cn('truncate text-sm font-medium', !card.isActive && 'text-muted-foreground')}>
                        {card.name}
                    </span>
                    {card.last4 && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">•••• {card.last4}</span>
                    )}
                    {!card.isActive && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                            Inactive
                        </Badge>
                    )}
                </div>

                <p className="truncate text-xs text-muted-foreground">
                    {card.creditLimit == null
                        ? 'No credit limit recorded'
                        : `${formatCurrencyAmount(card.creditLimit)} limit`}
                    {cycle && ` · ${cycle}`}
                </p>
            </div>

            <div className="w-32 shrink-0 space-y-1">
                {peak === null ? (
                    <p className="text-right text-xs text-muted-foreground">No utilisation yet</p>
                ) : (
                    <>
                        <p
                            className={cn(
                                'text-right text-sm tabular-nums',
                                peak.cell.overLimit && 'font-semibold text-destructive'
                            )}
                        >
                            {formatUtilisationPercent(peak.cell.ratio)}
                            <span className="ml-1 text-[11px] text-muted-foreground">peak</span>
                        </p>
                        <ThresholdGauge
                            value={peak.cell.billed}
                            threshold={peak.cell.limit}
                            status={getUtilisationStatus(peak.cell.ratio)}
                            label={`${card.name} peak utilisation`}
                            thin
                        />
                    </>
                )}
            </div>

            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
    );
};

export default CardSummaryRow;
