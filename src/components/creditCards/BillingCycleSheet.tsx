import { useState } from 'react';

import { useUpdateCard } from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { ICreditCard } from '@/types/creditCard.types';

import BillingCycleFields, {
    BillingCycleErrors,
    BillingCycleValues,
    validateBillingCycle,
} from '@/components/creditCards/BillingCycleFields';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const toCycleValues = (card: ICreditCard): BillingCycleValues => ({
    statementDay: card.statementDay == null ? '' : String(card.statementDay),
    dueDay: card.dueDay == null ? '' : String(card.dueDay),
    creditLimit: card.creditLimit == null ? '' : String(card.creditLimit),
});

/**
 * Editing the cycle after creation matters: a user who skipped the fields in
 * the add sheet would otherwise have no way to set them, and a bank changing
 * its cycle date mid-year would have no path at all.
 */
export const BillingCycleSheet = ({
    card,
    open,
    onOpenChange,
}: {
    card: ICreditCard;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const { parseAmountInput } = useCurrencyPreferences();
    const [values, setValues] = useState<BillingCycleValues>(() => toCycleValues(card));
    const [errors, setErrors] = useState<BillingCycleErrors>({});
    const { mutate: updateCard, isPending } = useUpdateCard();

    // Reset on every open, whoever opened it. Callers open the sheet by setting
    // `open` directly, and Radix only fires onOpenChange for its own triggers,
    // so resetting there would let a cancelled edit survive to the next open.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setValues(toCycleValues(card));
            setErrors({});
        }
    }

    const save = () => {
        const result = validateBillingCycle(values, parseAmountInput);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }

        // creditLimit is deliberately dropped: it lives in the dated limit
        // history now, and writing it here would be overwritten by the next sync.
        const { statementDay, dueDay } = result.parsed;
        updateCard({ id: card.id, statementDay, dueDay }, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
                <SheetHeader className="shrink-0 border-b px-6 py-5">
                    <SheetTitle>Billing cycle</SheetTitle>
                    <SheetDescription>
                        {card.name} — these pre-fill a bill's dates. Each bill keeps its own dates once entered.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                    <BillingCycleFields
                        idPrefix={`cycle-${card.id}`}
                        values={values}
                        errors={errors}
                        showCreditLimit={false}
                        onChange={(next) => {
                            setValues(next);
                            setErrors({});
                        }}
                    />

                    <p className="mt-4 text-xs text-muted-foreground">
                        The credit limit is a dated timeline rather than a field — open the card to record an increase
                        without restating earlier months.
                    </p>
                </div>

                <SheetFooter className="flex-row justify-end border-t">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={isPending} onClick={save}>
                        {isPending ? 'Saving...' : 'Save'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default BillingCycleSheet;
