import { cn } from '@/lib/utils';
import { ThresholdStatus } from '@/types/creditCard.types';

const FILL_CLASS: Record<ThresholdStatus, string> = {
    safe: 'bg-primary/80',
    watch: 'bg-yellow-500',
    risk: 'bg-orange-500',
    breached: 'bg-destructive',
};

/**
 * Progress bar for a threshold. Hand-rolled rather than a Progress primitive to
 * match the existing bars in StatsSection and EMIDetails.
 */
const ThresholdGauge = ({
    value,
    threshold,
    status,
    label,
    className,
    thin = false,
}: {
    value: number;
    threshold: number;
    status: ThresholdStatus;
    label: string;
    className?: string;
    thin?: boolean;
}) => {
    const percent = threshold > 0 ? (value / threshold) * 100 : 0;
    const width = Math.min(100, Math.max(0, percent));

    return (
        <div
            className={cn('w-full overflow-hidden rounded-full bg-muted', thin ? 'h-1' : 'h-1.5', className)}
            role="progressbar"
            aria-label={label}
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={Math.round(threshold)}
        >
            <div
                className={cn('rounded-full transition-[width]', thin ? 'h-1' : 'h-1.5', FILL_CLASS[status])}
                style={{ width: `${width}%` }}
            />
        </div>
    );
};

export default ThresholdGauge;
