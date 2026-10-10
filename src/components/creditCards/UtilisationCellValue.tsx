import { Link } from 'react-router';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';
import { UtilisationCell } from '@/types/creditCard.types';
import { formatUtilisationPercent, getUtilisationStatus } from '@/utils/creditCardUtilisation.calc';

import ThresholdGauge from '@/components/creditCards/ThresholdGauge';

/**
 * One derived utilisation reading.
 *
 * Read-only by design: every figure here is computed from a bill row and the
 * limit history, so there is nothing to edit in place. The cell links to the
 * card instead, which is where both inputs are actually changed.
 *
 * An absent cell renders an em dash rather than 0%. The three reasons a cell can
 * be absent - not entered, no statement, no credit limit - are all "we cannot
 * say", and rendering any of them as zero would claim the card was unused.
 */
const UtilisationCellValue = ({
    cell,
    cardId,
    cardName,
    monthLabel,
    financialYear,
}: {
    cell: UtilisationCell | undefined;
    cardId: string;
    cardName: string;
    monthLabel: string;
    financialYear: string;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    if (!cell) {
        return (
            <div
                className="px-2 py-1 text-right text-muted-foreground"
                aria-label={`${cardName}, ${monthLabel}: no utilisation figure`}
            >
                —
            </div>
        );
    }

    const status = getUtilisationStatus(cell.ratio);
    const percent = formatUtilisationPercent(cell.ratio);
    const detail = `${formatCurrencyAmount(cell.billed)} of ${formatCurrencyAmount(cell.limit)}`;

    return (
        <Link
            to={`/credit-cards/cards/${cardId}?fy=${financialYear}`}
            title={`${cardName}, ${monthLabel}: ${detail}${cell.overLimit ? ' — over the limit' : ''}`}
            aria-label={`${cardName}, ${monthLabel}: ${percent} utilisation, ${detail}`}
            className="block space-y-1 rounded-sm px-2 py-1 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <span
                className={cn(
                    'block text-right text-[13px] tabular-nums',
                    cell.overLimit && 'font-semibold text-destructive'
                )}
            >
                {percent}
            </span>
            <ThresholdGauge
                value={cell.billed}
                threshold={cell.limit}
                status={status}
                label={`${cardName} utilisation in ${monthLabel}`}
                thin
            />
        </Link>
    );
};

export default UtilisationCellValue;
