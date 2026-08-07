import { useEffect, useRef, useState } from 'react';
import { Check, StickyNote } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ICreditCardPaymentEntry, SavePaymentEntryInput } from '@/types/creditCard.types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

const TICK_DURATION_MS = 1200;

const toInputValue = (amount: number | undefined) => (amount === undefined || amount === 0 ? '' : String(amount));

const parseAmount = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return 0;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }
    return Math.round(parsed * 100) / 100;
};

/**
 * A single grid cell.
 *
 * Amount commits on blur or Enter and reverts on Escape - never on keystroke.
 * Debouncing money inputs persists nonsense intermediates (1 -> 12 -> 120) and
 * lets two in-flight upserts for the same row land out of order.
 *
 * Cash portion and note live behind a popover so bulk amount entry stays fast.
 */
const PaymentCellEditor = ({
    entry,
    cardId,
    periodMonth,
    disabled = false,
    onSave,
}: {
    entry: ICreditCardPaymentEntry | undefined;
    cardId: string;
    periodMonth: string;
    disabled?: boolean;
    onSave: (input: SavePaymentEntryInput) => void;
}) => {
    const [draft, setDraft] = useState(() => toInputValue(entry?.amount));
    const [showTick, setShowTick] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [cashDraft, setCashDraft] = useState(() => toInputValue(entry?.cashAmount));
    const [noteDraft, setNoteDraft] = useState(entry?.note ?? '');
    const [detailError, setDetailError] = useState<string | null>(null);
    const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const serverAmount = entry?.amount ?? 0;
    const serverCash = entry?.cashAmount ?? 0;
    const serverNote = entry?.note ?? '';

    // Re-sync when the server value changes underneath an unfocused cell.
    useEffect(() => {
        setDraft(toInputValue(serverAmount));
    }, [serverAmount]);

    useEffect(() => {
        if (!detailOpen) {
            setCashDraft(toInputValue(serverCash));
            setNoteDraft(serverNote);
            setDetailError(null);
        }
    }, [detailOpen, serverCash, serverNote]);

    useEffect(() => () => (tickTimer.current ? clearTimeout(tickTimer.current) : undefined), []);

    const flashTick = () => {
        setShowTick(true);
        if (tickTimer.current) clearTimeout(tickTimer.current);
        tickTimer.current = setTimeout(() => setShowTick(false), TICK_DURATION_MS);
    };

    const commitAmount = () => {
        const parsed = parseAmount(draft);
        if (parsed === null) {
            setDraft(toInputValue(serverAmount));
            return;
        }
        if (parsed === serverAmount) {
            return;
        }

        // Clearing the amount cannot leave a larger cash portion behind.
        const nextCash = Math.min(serverCash, parsed);
        onSave({ cardId, periodMonth, amount: parsed, cashAmount: nextCash, note: serverNote || null });
        flashTick();
    };

    const commitDetails = () => {
        const amount = parseAmount(draft) ?? serverAmount;
        const cash = parseAmount(cashDraft);

        if (cash === null) {
            setDetailError('Enter a valid cash amount.');
            return;
        }
        if (cash > amount) {
            setDetailError('Cash paid cannot exceed the amount paid.');
            return;
        }

        onSave({ cardId, periodMonth, amount, cashAmount: cash, note: noteDraft.trim() || null });
        setDetailError(null);
        setDetailOpen(false);
        flashTick();
    };

    const hasDetails = serverCash > 0 || !!serverNote;

    return (
        <div className="group/cell relative flex items-center">
            <Input
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={draft}
                placeholder="—"
                aria-label={`Amount paid for ${periodMonth}`}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitAmount}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commitAmount();
                        event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        setDraft(toInputValue(serverAmount));
                        event.currentTarget.blur();
                    }
                }}
                className={cn(
                    'h-8 w-full min-w-[7rem] border-transparent bg-transparent pr-7 text-right tabular-nums shadow-none',
                    'hover:border-input focus-visible:border-input',
                    serverAmount === 0 && 'text-muted-foreground'
                )}
            />

            <Popover open={detailOpen} onOpenChange={setDetailOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={disabled}
                        aria-label="Cash portion and note"
                        className={cn(
                            'absolute right-0.5 text-muted-foreground',
                            hasDetails ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-70 focus:opacity-100'
                        )}
                    >
                        {showTick ? <Check className="text-primary" aria-hidden /> : <StickyNote aria-hidden />}
                        {hasDetails && !showTick && (
                            <span className="absolute top-0 right-0 size-1.5 rounded-full bg-primary" aria-hidden />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-3" align="end">
                    <div className="space-y-1.5">
                        <Label htmlFor={`cash-${cardId}-${periodMonth}`} className="text-xs">
                            Paid in cash
                        </Label>
                        <Input
                            id={`cash-${cardId}-${periodMonth}`}
                            type="text"
                            inputMode="decimal"
                            value={cashDraft}
                            placeholder="0"
                            className="h-8 text-right tabular-nums"
                            onChange={(event) => {
                                setCashDraft(event.target.value);
                                setDetailError(null);
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Cash bill payments are reported against a separate limit.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor={`note-${cardId}-${periodMonth}`} className="text-xs">
                            Note
                        </Label>
                        <Textarea
                            id={`note-${cardId}-${periodMonth}`}
                            value={noteDraft}
                            rows={2}
                            placeholder="Optional"
                            onChange={(event) => setNoteDraft(event.target.value)}
                        />
                    </div>

                    {detailError && <p className="text-xs text-destructive">{detailError}</p>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setDetailOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={commitDetails}>
                            Save
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default PaymentCellEditor;
