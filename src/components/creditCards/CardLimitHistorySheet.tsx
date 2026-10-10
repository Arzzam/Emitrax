import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

import { useCardLimitChanges, useDeleteLimitChange, useSaveLimitChange } from '@/hooks/useCreditCards';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { ICardLimitChange, ICreditCard } from '@/types/creditCard.types';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

type DraftErrors = { effectiveFrom?: string; creditLimit?: string };

const emptyDraft = () => ({ effectiveFrom: format(new Date(), 'yyyy-MM-dd'), creditLimit: '', note: '' });

/**
 * Validates one limit change against the DB constraints, so a bad value is
 * caught here rather than surfacing as raw Postgres text in a toast.
 */
function validateDraft(
    draft: ReturnType<typeof emptyDraft>
): { ok: true; creditLimit: number } | { ok: false; errors: DraftErrors } {
    const errors: DraftErrors = {};

    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveFrom)) {
        errors.effectiveFrom = 'Pick the date the limit took effect.';
    }

    const parsed = Number(draft.creditLimit.trim());
    if (!draft.creditLimit.trim() || !Number.isFinite(parsed) || parsed <= 0) {
        errors.creditLimit = 'Enter an amount greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
    }

    return { ok: true, creditLimit: Math.round(parsed * 100) / 100 };
}

const HistoryRow = ({
    change,
    isEarliest,
    onRequestDelete,
}: {
    change: ICardLimitChange;
    isEarliest: boolean;
    onRequestDelete: (change: ICardLimitChange) => void;
}) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const isFuture = change.effectiveFrom > format(new Date(), 'yyyy-MM-dd');

    return (
        <div className="flex items-start gap-2 rounded-md border px-3 py-2">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatCurrencyAmount(change.creditLimit)}</span>
                    {/* Naming the earliest row is what makes the backwards
                        extension visible: it is the limit for every month before
                        it too, not just from its own date. */}
                    {isEarliest && (
                        <Badge variant="secondary" className="text-[10px]">
                            Initial limit
                        </Badge>
                    )}
                    {isFuture && (
                        <Badge variant="warning" className="text-[10px]">
                            Scheduled
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {isEarliest ? 'In force until superseded, and for everything before' : 'From'}{' '}
                    {format(new Date(change.effectiveFrom + 'T00:00:00'), 'd MMM yyyy')}
                </p>
                {change.note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{change.note}</p>}
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove the limit change effective ${change.effectiveFrom}`}
                onClick={() => onRequestDelete(change)}
            >
                <Trash2 />
            </Button>
        </div>
    );
};

/**
 * The card's dated limit history.
 *
 * A limit is a property of a card at a time, so this is a timeline rather than
 * a single field. Recording an increase here leaves every earlier month's
 * utilisation exactly as it was, which is the whole reason the history exists.
 */
const CardLimitHistorySheet = ({
    card,
    open,
    onOpenChange,
}: {
    card: ICreditCard;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const [draft, setDraft] = useState(emptyDraft);
    const [errors, setErrors] = useState<DraftErrors>({});
    const [pendingDelete, setPendingDelete] = useState<ICardLimitChange | null>(null);

    const { data: changes = [], isLoading } = useCardLimitChanges(open ? card.id : undefined);
    const { mutate: saveLimitChange, isPending } = useSaveLimitChange();
    const { mutate: deleteLimitChange } = useDeleteLimitChange();

    // Same reset-on-open as BillingCycleSheet: callers set `open` directly, so
    // onOpenChange never sees the open. This also re-dates the draft to today.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setDraft(emptyDraft());
            setErrors({});
        }
    }

    const add = () => {
        const result = validateDraft(draft);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }

        saveLimitChange(
            {
                cardId: card.id,
                effectiveFrom: draft.effectiveFrom,
                creditLimit: result.creditLimit,
                note: draft.note,
            },
            {
                onSuccess: () => {
                    setDraft(emptyDraft());
                    setErrors({});
                },
            }
        );
    };

    // Ascending from the service; newest first reads better as a timeline.
    const descending = [...changes].reverse();

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
                    <SheetHeader className="shrink-0 border-b px-6 py-5">
                        <SheetTitle>Credit limit history</SheetTitle>
                        <SheetDescription>
                            {card.name} — record each increase with the date it took effect. Earlier months keep the
                            limit that was actually in force, so utilisation history never quietly moves.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor={`limit-amount-${card.id}`}>New limit</Label>
                                    <Input
                                        id={`limit-amount-${card.id}`}
                                        inputMode="decimal"
                                        placeholder="250000"
                                        className="tabular-nums"
                                        value={draft.creditLimit}
                                        onChange={(event) => {
                                            setDraft({ ...draft, creditLimit: event.target.value });
                                            setErrors({});
                                        }}
                                    />
                                    {errors.creditLimit && (
                                        <p className="text-xs text-destructive">{errors.creditLimit}</p>
                                    )}
                                </div>

                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor={`limit-date-${card.id}`}>Effective from</Label>
                                    <Input
                                        id={`limit-date-${card.id}`}
                                        type="date"
                                        className="tabular-nums"
                                        value={draft.effectiveFrom}
                                        onChange={(event) => {
                                            setDraft({ ...draft, effectiveFrom: event.target.value });
                                            setErrors({});
                                        }}
                                    />
                                    {errors.effectiveFrom && (
                                        <p className="text-xs text-destructive">{errors.effectiveFrom}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor={`limit-note-${card.id}`}>Note</Label>
                                <Input
                                    id={`limit-note-${card.id}`}
                                    placeholder="Optional — e.g. annual review increase"
                                    value={draft.note}
                                    onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                                />
                            </div>

                            <Button type="button" size="sm" className="w-full" disabled={isPending} onClick={add}>
                                <Plus /> {isPending ? 'Saving...' : 'Add limit change'}
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-14 w-full rounded-md" />
                                <Skeleton className="h-14 w-full rounded-md" />
                            </div>
                        ) : descending.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No limit recorded yet. Until there is one, this card shows no utilisation.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {descending.map((change, index) => (
                                    <HistoryRow
                                        key={change.id}
                                        change={change}
                                        isEarliest={index === descending.length - 1}
                                        onRequestDelete={setPendingDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <SheetFooter className="flex-row justify-end border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <ConfirmationModal
                open={!!pendingDelete}
                setOpen={(value) => {
                    if (!value) setPendingDelete(null);
                }}
                title="Remove this limit change?"
                description="Months that resolved to this limit will fall back to the previous one, restating their utilisation."
                confirmText="Remove"
                cancelText="Cancel"
                onConfirm={(setConfirmOpen) => {
                    if (pendingDelete) {
                        deleteLimitChange({ id: pendingDelete.id, cardId: card.id });
                    }
                    setConfirmOpen(false);
                    setPendingDelete(null);
                }}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
};

export default CardLimitHistorySheet;
