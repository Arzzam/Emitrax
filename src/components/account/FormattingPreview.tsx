import { cn } from '@/lib/utils';
import type { NumberFormatMode } from '@/types/account.types';
import { formatCurrencyAmount } from '@/utils/numberFormat';
import { NUMBER_FORMAT_OPTIONS } from '@/validations/account.forms';

const PREVIEW_AMOUNT = 1234567.89;

type FormattingPreviewProps = {
    locale: string;
    currency: string;
    numberFormat: NumberFormatMode;
};

/**
 * Shows the unsaved regional settings applied to a sample amount, so the three
 * pickers explain themselves. The selected number format is emphasised.
 */
const FormattingPreview = ({ locale, currency, numberFormat }: FormattingPreviewProps) => (
    <div className="rounded-lg border bg-muted/40 px-4 py-3" aria-live="polite">
        <p className="text-xs text-muted-foreground">Amounts will look like</p>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-3">
            {NUMBER_FORMAT_OPTIONS.map((option) => {
                const isSelected = option.value === numberFormat;
                return (
                    <div key={option.value} className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">{option.label}</dt>
                        <dd
                            className={cn(
                                'truncate tabular-nums',
                                isSelected ? 'text-base font-semibold' : 'text-sm text-muted-foreground'
                            )}
                        >
                            {formatCurrencyAmount(PREVIEW_AMOUNT, { locale, currency, numberFormat: option.value })}
                        </dd>
                    </div>
                );
            })}
        </dl>
    </div>
);

export default FormattingPreview;
