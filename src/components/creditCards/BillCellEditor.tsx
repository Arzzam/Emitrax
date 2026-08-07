import { useEffect, useRef, useState } from 'react';
import { Check, StickyNote } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ICreditCard, ICreditCardBillEntry, SaveBillEntryInput } from '@/types/creditCard.types';
import { getBillDefaultDates } from '@/utils/creditCardBills.calc';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const TICK_DURATION_MS = 1200;

const toInputValue = (amount: number | null | undefined) => (amount == null ? '' : String(amount));

/**
 * Signed parser - a bill may be negative when a refund or overpayment leaves a
 * credit balance. Deliberately local rather than loosening the payment editor's
 * parser, which correctly rejects negatives.
 */
const parseSignedAmount = (raw: string): number | null | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }
    return Math.round(parsed * 100) / 100;
};

/**
 * A single bill cell.
 *
 * Mirrors PaymentCellEditor: the total commits on blur or Enter and reverts on
 * Escape, never on keystroke. Minimum due, dates and the note live behind a
 * popover so bulk total entry stays fast.
 *
 * Three states are rendered distinctly - absent, `no_statement`, and an issued
 * statement (including a real zero).
 */
const BillCellEditor = ({
    entry,
    card,
    statementMonth,
    disabled = false,
    onSave,
}: {
    entry: ICreditCardBillEntry | undefined;
    card: ICreditCard;
    statementMonth: string;
    disabled?: boolean;
    onSave: (input: SaveBillEntryInput) => void;
}) => {
    const serverStatus = entry?.status ?? 'issued';
    const serverTotal = entry?.status === 'issued' ? (entry.totalDue ?? null) : null;
    const serverMinimum = entry?.minimumDue ?? null;
    const serverStatementDate = entry?.statementDate ?? null;
    const serverDueDate = entry?.dueDate ?? null;
    const serverNote = entry?.note ?? '';

    const [draft, setDraft] = useState(() => toInputValue(serverTotal));
    const [showTick, setShowTick] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [minimumDraft, setMinimumDraft] = useState(() => toInputValue(serverMinimum));
    const [statementDateDraft, setStatementDateDraft] = useState(serverStatementDate ?? '');
    const [dueDateDraft, setDueDateDraft] = useState(serverDueDate ?? '');
    const [noteDraft, setNoteDraft] = useState(serverNote);
    const [noStatement, setNoStatement] = useState(serverStatus === 'no_statement');
    const [detailError, setDetailError] = useState<string | null>(null);
    const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Suggestions only - never auto-committed, because a row's stored dates are
    // the record of what the bank actually did that month.
    const suggested = getBillDefaultDates(statementMonth, card);

    useEffect(() => {
        setDraft(toInputValue(serverTotal));
    }, [serverTotal]);

    useEffect(() => {
        if (!detailOpen) {
            setMinimumDraft(toInputValue(serverMinimum));
            setStatementDateDraft(serverStatementDate ?? '');
            setDueDateDraft(serverDueDate ?? '');
            setNoteDraft(serverNote);
            setNoStatement(serverStatus === 'no_statement');
            setDetailError(null);
        }
    }, [detailOpen, serverMinimum, serverStatementDate, serverDueDate, serverNote, serverStatus]);

    useEffect(() => () => (tickTimer.current ? clearTimeout(tickTimer.current) : undefined), []);

    const flashTick = () => {
        setShowTick(true);
        if (tickTimer.current) clearTimeout(tickTimer.current);
        tickTimer.current = setTimeout(() => setShowTick(false), TICK_DURATION_MS);
    };

    const baseInput = {
        cardId: card.id,
        statementMonth,
        statementDate: serverStatementDate,
        dueDate: serverDueDate,
        note: serverNote || null,
    };

    const commitTotal = () => {
        if (serverStatus === 'no_statement') {
            return;
        }

        const parsed = parseSignedAmount(draft);
        if (parsed === undefined) {
            setDraft(toInputValue(serverTotal));
            return;
        }
        if (parsed === serverTotal) {
            return;
        }

        onSave({
            ...baseInput,
            status: 'issued',
            totalDue: parsed,
            // A cleared or reduced total cannot leave a larger minimum behind.
            minimumDue: parsed == null || serverMinimum == null ? null : Math.min(serverMinimum, Math.max(parsed, 0)),
        });
        flashTick();
    };

    const commitDetails = () => {
        if (noStatement) {
            onSave({
                ...baseInput,
                status: 'no_statement',
                totalDue: null,
                minimumDue: null,
                statementDate: statementDateDraft || null,
                dueDate: dueDateDraft || null,
                note: noteDraft.trim() || null,
            });
            setDetailOpen(false);
            flashTick();
            return;
        }

        const total = parseSignedAmount(draft);
        const minimum = parseSignedAmount(minimumDraft);

        if (total === undefined) {
            setDetailError('Enter a valid total.');
            return;
        }
        if (minimum === undefined) {
            setDetailError('Enter a valid minimum due.');
            return;
        }
        if (minimum != null && minimum < 0) {
            setDetailError('Minimum due cannot be negative.');
            return;
        }
        if (minimum != null && total != null && minimum > Math.max(total, 0)) {
            setDetailError('Minimum due cannot exceed the total.');
            return;
        }
        if (statementDateDraft && dueDateDraft && dueDateDraft < statementDateDraft) {
            setDetailError('The due date cannot be before the statement date.');
            return;
        }

        onSave({
            cardId: card.id,
            statementMonth,
            status: 'issued',
            totalDue: total,
            minimumDue: minimum,
            statementDate: statementDateDraft || null,
            dueDate: dueDateDraft || null,
            note: noteDraft.trim() || null,
        });

        setDetailError(null);
        setDetailOpen(false);
        flashTick();
    };

    const applySuggestedDates = () => {
        setStatementDateDraft(suggested.statementDate ?? '');
        setDueDateDraft(suggested.dueDate ?? '');
        setDetailError(null);
    };

    // A statement dated outside its own month is unusual but legitimate - some
    // banks label a 1 Aug statement as July's. Warn, never block.
    const monthMismatch = Boolean(statementDateDraft) && statementDateDraft.slice(0, 7) !== statementMonth.slice(0, 7);

    const hasDetails = serverMinimum != null || !!serverStatementDate || !!serverDueDate || !!serverNote;
    const isNoStatement = serverStatus === 'no_statement';

    return (
        <div className="group/cell relative flex items-center">
            {isNoStatement ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setDetailOpen(true)}
                    className="h-8 w-full min-w-[7rem] cursor-pointer rounded-md pr-7 text-right text-xs text-muted-foreground italic hover:bg-muted/50"
                >
                    No stmt
                </button>
            ) : (
                <Input
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    value={draft}
                    placeholder="—"
                    aria-label={`Amount billed for ${statementMonth}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitTotal}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitTotal();
                            event.currentTarget.blur();
                        }
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setDraft(toInputValue(serverTotal));
                            event.currentTarget.blur();
                        }
                    }}
                    className={cn(
                        'h-8 w-full min-w-[7rem] border-transparent bg-transparent pr-7 text-right tabular-nums shadow-none',
                        'hover:border-input focus-visible:border-input',
                        serverTotal == null && 'text-muted-foreground'
                    )}
                />
            )}

            <Popover open={detailOpen} onOpenChange={setDetailOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={disabled}
                        aria-label="Statement details"
                        className={cn(
                            'absolute right-0.5 text-muted-foreground',
                            hasDetails || isNoStatement
                                ? 'opacity-100'
                                : 'opacity-0 group-hover/cell:opacity-70 focus:opacity-100'
                        )}
                    >
                        {showTick ? <Check className="text-primary" aria-hidden /> : <StickyNote aria-hidden />}
                        {hasDetails && !showTick && (
                            <span className="absolute top-0 right-0 size-1.5 rounded-full bg-primary" aria-hidden />
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-72 space-y-3" align="end">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                            <Label htmlFor={`no-stmt-${card.id}-${statementMonth}`} className="text-xs">
                                No statement generated
                            </Label>
                            <p className="text-[11px] text-muted-foreground">Different from a ₹0 bill.</p>
                        </div>
                        <Switch
                            id={`no-stmt-${card.id}-${statementMonth}`}
                            checked={noStatement}
                            onCheckedChange={(checked) => {
                                setNoStatement(checked);
                                setDetailError(null);
                            }}
                        />
                    </div>

                    {!noStatement && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor={`min-${card.id}-${statementMonth}`} className="text-xs">
                                    Minimum due
                                </Label>
                                <Input
                                    id={`min-${card.id}-${statementMonth}`}
                                    type="text"
                                    inputMode="decimal"
                                    value={minimumDraft}
                                    placeholder="Optional"
                                    className="h-8 text-right tabular-nums"
                                    onChange={(event) => {
                                        setMinimumDraft(event.target.value);
                                        setDetailError(null);
                                    }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor={`stmt-${card.id}-${statementMonth}`} className="text-xs">
                                        Statement date
                                    </Label>
                                    <Input
                                        id={`stmt-${card.id}-${statementMonth}`}
                                        type="date"
                                        value={statementDateDraft}
                                        className="h-8"
                                        onChange={(event) => {
                                            setStatementDateDraft(event.target.value);
                                            setDetailError(null);
                                        }}
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor={`due-${card.id}-${statementMonth}`} className="text-xs">
                                        Due date
                                    </Label>
                                    <Input
                                        id={`due-${card.id}-${statementMonth}`}
                                        type="date"
                                        value={dueDateDraft}
                                        className="h-8"
                                        onChange={(event) => {
                                            setDueDateDraft(event.target.value);
                                            setDetailError(null);
                                        }}
                                    />
                                </div>
                            </div>

                            {suggested.statementDate && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    className="h-6 px-1 text-muted-foreground"
                                    onClick={applySuggestedDates}
                                >
                                    Use card cycle ({suggested.statementDate}
                                    {suggested.dueDate ? ` → ${suggested.dueDate}` : ''})
                                </Button>
                            )}

                            {monthMismatch && (
                                <p className="text-xs text-muted-foreground">
                                    This statement is dated outside its month. That is fine if the bank labels it that
                                    way.
                                </p>
                            )}
                        </>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor={`note-${card.id}-${statementMonth}`} className="text-xs">
                            Note
                        </Label>
                        <Textarea
                            id={`note-${card.id}-${statementMonth}`}
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

export default BillCellEditor;
