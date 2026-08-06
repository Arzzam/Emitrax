import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

import { useCreateCard, useCreateIssuer } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';
import { ICreditCardIssuer } from '@/types/creditCard.types';
import { errorToast } from '@/utils/toast.utils';

import BillingCycleFields, {
    BillingCycleErrors,
    BillingCycleValues,
    EMPTY_BILLING_CYCLE,
    validateBillingCycle,
} from '@/components/creditCards/BillingCycleFields';
import IssuerCombobox, { IssuerSelection } from '@/components/creditCards/IssuerCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

/**
 * One-step card creation. The issuer combobox creates on the fly, so there is
 * no "add an issuer first" pre-step and no empty-issuer dead end.
 *
 * A side sheet rather than a centered dialog, matching the house pattern used
 * for the Add EMI and Advanced Filter panels.
 */
const AddCardDialog = ({ issuers, trigger }: { issuers: ICreditCardIssuer[]; trigger?: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [issuer, setIssuer] = useState<IssuerSelection | null>(null);
    const [name, setName] = useState('');
    const [last4, setLast4] = useState('');
    const [cycle, setCycle] = useState<BillingCycleValues>(EMPTY_BILLING_CYCLE);
    const [showCycle, setShowCycle] = useState(false);
    const [errors, setErrors] = useState<{ issuer?: string; name?: string; last4?: string } & BillingCycleErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutateAsync: createIssuer } = useCreateIssuer();
    const { mutateAsync: createCard } = useCreateCard();

    const reset = () => {
        setIssuer(null);
        setName('');
        setLast4('');
        setCycle(EMPTY_BILLING_CYCLE);
        setShowCycle(false);
        setErrors({});
    };

    const validate = () => {
        const next: typeof errors = {};
        if (!issuer) {
            next.issuer = 'Pick or create the bank that issued this card.';
        }
        if (!name.trim()) {
            next.name = 'Give the card a name.';
        }
        if (last4.trim() && !/^\d{4}$/.test(last4.trim())) {
            next.last4 = 'Must be exactly four digits.';
        }

        const cycleResult = validateBillingCycle(cycle);
        if (!cycleResult.ok) {
            Object.assign(next, cycleResult.errors);
            // A cycle error is otherwise invisible while the block is collapsed.
            setShowCycle(true);
        }

        setErrors(next);
        return Object.keys(next).length === 0 ? (cycleResult.ok ? cycleResult.parsed : null) : null;
    };

    const submit = async () => {
        const parsedCycle = validate();
        if (!parsedCycle || !issuer) {
            return;
        }

        setIsSubmitting(true);
        try {
            const issuerId =
                issuer.kind === 'existing'
                    ? issuer.issuerId
                    : (await createIssuer({ name: issuer.name, sortOrder: issuers.length })).id;

            const target = issuers.find((candidate) => candidate.id === issuerId);
            await createCard({
                issuerId,
                name: name.trim(),
                last4: last4.trim() || null,
                sortOrder: target?.cards.length ?? 0,
                ...parsedCycle,
            });

            reset();
            setOpen(false);
        } catch (error) {
            // The hooks already surface their own errors; this catches the
            // issuer-created-but-card-failed case so the sheet stays open.
            const message = error instanceof Error ? error.message : 'Could not add the card.';
            if (!/duplicate|already exists/i.test(message)) {
                errorToast(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <SheetTrigger asChild>
                {trigger ?? (
                    <Button type="button" size="sm">
                        <Plus /> Add card
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
                <SheetHeader className="shrink-0 border-b px-6 py-5">
                    <SheetTitle>Add a card</SheetTitle>
                    <SheetDescription>
                        Cards are grouped by the bank that issued them, because the reporting threshold applies per
                        bank.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <div className="space-y-1.5">
                        <Label>Bank</Label>
                        <IssuerCombobox
                            issuers={issuers}
                            value={issuer}
                            onChange={(selection) => {
                                setIssuer(selection);
                                setErrors((current) => ({ ...current, issuer: undefined }));
                            }}
                        />
                        {errors.issuer && <p className="text-xs text-destructive">{errors.issuer}</p>}
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="add-card-name">Card name</Label>
                            <Input
                                id="add-card-name"
                                value={name}
                                placeholder="Amazon Pay"
                                autoComplete="off"
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setErrors((current) => ({ ...current, name: undefined }));
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void submit();
                                    }
                                }}
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>

                        <div className="w-24 space-y-1.5">
                            <Label htmlFor="add-card-last4">Last 4</Label>
                            <Input
                                id="add-card-last4"
                                value={last4}
                                placeholder="4821"
                                inputMode="numeric"
                                maxLength={4}
                                className="tabular-nums"
                                onChange={(event) => {
                                    setLast4(event.target.value);
                                    setErrors((current) => ({ ...current, last4: undefined }));
                                }}
                            />
                        </div>
                    </div>
                    {errors.last4 && <p className="-mt-2 text-xs text-destructive">{errors.last4}</p>}

                    {/* Optional, and collapsed by default so the fast path stays two fields. */}
                    <div className="border-t pt-4">
                        <button
                            type="button"
                            onClick={() => setShowCycle((current) => !current)}
                            className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
                            aria-expanded={showCycle}
                        >
                            Billing cycle
                            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                                Optional
                                <ChevronDown
                                    className={cn('size-4 transition-transform', showCycle && 'rotate-180')}
                                    aria-hidden
                                />
                            </span>
                        </button>

                        {showCycle && (
                            <div className="pt-3">
                                <BillingCycleFields
                                    idPrefix="add-card"
                                    values={cycle}
                                    errors={errors}
                                    onChange={(next) => {
                                        setCycle(next);
                                        setErrors((current) => ({
                                            ...current,
                                            statementDay: undefined,
                                            dueDay: undefined,
                                            creditLimit: undefined,
                                        }));
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="flex-row justify-end border-t">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={isSubmitting} onClick={() => void submit()}>
                        {isSubmitting ? 'Adding...' : 'Add card'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default AddCardDialog;
