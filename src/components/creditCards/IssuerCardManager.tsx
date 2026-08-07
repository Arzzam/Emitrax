import { useState } from 'react';
import {
    ArrowLeftRight,
    CalendarClock,
    Check,
    Landmark,
    MoreVertical,
    Pencil,
    Power,
    Settings2,
    Trash2,
    X,
} from 'lucide-react';

import { useDeleteCard, useDeleteIssuer, useUpdateCard, useUpdateIssuer } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';
import { ICreditCard, ICreditCardIssuer } from '@/types/creditCard.types';
import { CreditCardService } from '@/utils/CreditCardService';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import AddCardDialog from '@/components/creditCards/AddCardDialog';
import BillingCycleFields, {
    BillingCycleErrors,
    BillingCycleValues,
    validateBillingCycle,
} from '@/components/creditCards/BillingCycleFields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

type EntryCounts = { payments: number; bills: number };
type PendingDelete = { kind: 'issuer' | 'card'; id: string; name: string; counts: EntryCounts };

/** Inline rename that commits on Enter / tick and reverts on Escape. */
const InlineRename = ({
    value,
    onCommit,
    onCancel,
    className,
}: {
    value: string;
    onCommit: (next: string) => void;
    onCancel: () => void;
    className?: string;
}) => {
    const [draft, setDraft] = useState(value);

    const commit = () => {
        const trimmed = draft.trim();
        if (!trimmed || trimmed === value) {
            onCancel();
            return;
        }
        onCommit(trimmed);
    };

    return (
        <div className="flex items-center gap-1">
            <Input
                autoFocus
                value={draft}
                className={cn('h-7', className)}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit();
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        onCancel();
                    }
                }}
            />
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Save name" onClick={commit}>
                <Check />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Cancel rename" onClick={onCancel}>
                <X />
            </Button>
        </div>
    );
};

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
const BillingCycleSheet = ({
    card,
    open,
    onOpenChange,
}: {
    card: ICreditCard;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const [values, setValues] = useState<BillingCycleValues>(() => toCycleValues(card));
    const [errors, setErrors] = useState<BillingCycleErrors>({});
    const { mutate: updateCard, isPending } = useUpdateCard();

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setValues(toCycleValues(card));
            setErrors({});
        }
        onOpenChange(next);
    };

    const save = () => {
        const result = validateBillingCycle(values);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }

        updateCard({ id: card.id, ...result.parsed }, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
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
                        onChange={(next) => {
                            setValues(next);
                            setErrors({});
                        }}
                    />
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

const CardRow = ({
    card,
    issuers,
    onRequestDelete,
}: {
    card: ICreditCard;
    issuers: ICreditCardIssuer[];
    onRequestDelete: (card: ICreditCard) => void;
}) => {
    const [renaming, setRenaming] = useState(false);
    const [cycleOpen, setCycleOpen] = useState(false);
    const { mutate: updateCard } = useUpdateCard();

    const otherIssuers = issuers.filter((issuer) => issuer.id !== card.issuerId);

    return (
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
            {renaming ? (
                <InlineRename
                    value={card.name}
                    className="max-w-[14rem]"
                    onCommit={(name) => {
                        updateCard({ id: card.id, name });
                        setRenaming(false);
                    }}
                    onCancel={() => setRenaming(false)}
                />
            ) : (
                <>
                    <span className={cn('truncate text-sm', !card.isActive && 'text-muted-foreground line-through')}>
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
                </>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="ml-auto shrink-0"
                        aria-label={`Options for ${card.name}`}
                    >
                        <MoreVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => setRenaming(true)}>
                        <Pencil /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCycleOpen(true)}>
                        <CalendarClock /> Billing cycle
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => updateCard({ id: card.id, isActive: !card.isActive })}>
                        <Power /> {card.isActive ? 'Deactivate' : 'Reactivate'}
                    </DropdownMenuItem>
                    {otherIssuers.length > 0 && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <ArrowLeftRight /> Move to bank
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {otherIssuers.map((issuer) => (
                                    <DropdownMenuItem
                                        key={issuer.id}
                                        onSelect={() => updateCard({ id: card.id, issuerId: issuer.id })}
                                    >
                                        {issuer.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onRequestDelete(card)}>
                        <Trash2 /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <BillingCycleSheet card={card} open={cycleOpen} onOpenChange={setCycleOpen} />
        </div>
    );
};

const IssuerBlock = ({
    issuer,
    issuers,
    onRequestDeleteIssuer,
    onRequestDeleteCard,
}: {
    issuer: ICreditCardIssuer;
    issuers: ICreditCardIssuer[];
    onRequestDeleteIssuer: (issuer: ICreditCardIssuer) => void;
    onRequestDeleteCard: (card: ICreditCard) => void;
}) => {
    const [renaming, setRenaming] = useState(false);
    const { mutate: updateIssuer } = useUpdateIssuer();

    return (
        <section className="rounded-lg border">
            <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {renaming ? (
                    <InlineRename
                        value={issuer.name}
                        className="max-w-[14rem]"
                        onCommit={(name) => {
                            updateIssuer({ id: issuer.id, name });
                            setRenaming(false);
                        }}
                        onCancel={() => setRenaming(false)}
                    />
                ) : (
                    <>
                        <h3 className="truncate text-sm font-semibold">{issuer.name}</h3>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {issuer.cards.length} {issuer.cards.length === 1 ? 'card' : 'cards'}
                        </span>
                    </>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="ml-auto shrink-0"
                            aria-label={`Options for ${issuer.name}`}
                        >
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setRenaming(true)}>
                            <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onRequestDeleteIssuer(issuer)}>
                            <Trash2 /> Delete bank
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <div className="p-1.5">
                {issuer.cards.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">No cards yet.</p>
                ) : (
                    issuer.cards.map((card) => (
                        <CardRow key={card.id} card={card} issuers={issuers} onRequestDelete={onRequestDeleteCard} />
                    ))
                )}
            </div>
        </section>
    );
};

const plural = (count: number, noun: string) => `${count} logged ${noun}${count === 1 ? '' : 's'}`;

/** Names both series, so the copy never under-reports what a delete destroys. */
function buildDeleteDescription(counts: EntryCounts | undefined): string {
    if (!counts) {
        return '';
    }

    const parts: string[] = [];
    if (counts.payments > 0) {
        parts.push(plural(counts.payments, 'payment'));
    }
    if (counts.bills > 0) {
        parts.push(plural(counts.bills, 'bill'));
    }

    if (parts.length === 0) {
        return 'Nothing has been logged against this yet, so no history will be lost.';
    }

    return `This permanently deletes ${parts.join(' and ')} across every financial year. To keep the history, deactivate instead.`;
}

/**
 * Management surface for issuers and cards. Creation lives in AddCardDialog;
 * this handles rename, move, deactivate and delete.
 *
 * A side sheet rather than a centered dialog, matching the house pattern used
 * for the Add EMI and Advanced Filter panels.
 */
const IssuerCardManager = ({ issuers }: { issuers: ICreditCardIssuer[] }) => {
    const [open, setOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

    const { mutate: deleteIssuer } = useDeleteIssuer();
    const { mutate: deleteCard } = useDeleteCard();

    const countEntries = async (cardIds: string[]): Promise<EntryCounts> => {
        try {
            const counts = await Promise.all(cardIds.map((id) => CreditCardService.countEntriesForCard(id)));
            return counts.reduce(
                (sum, count) => ({ payments: sum.payments + count.payments, bills: sum.bills + count.bills }),
                { payments: 0, bills: 0 }
            );
        } catch {
            return { payments: 0, bills: 0 };
        }
    };

    const requestDeleteCard = async (card: ICreditCard) => {
        setPendingDelete({
            kind: 'card',
            id: card.id,
            name: card.name,
            counts: await countEntries([card.id]),
        });
    };

    const requestDeleteIssuer = async (issuer: ICreditCardIssuer) => {
        setPendingDelete({
            kind: 'issuer',
            id: issuer.id,
            name: issuer.name,
            counts: await countEntries(issuer.cards.map((card) => card.id)),
        });
    };

    const confirmDelete = (setConfirmOpen: (value: boolean) => void) => {
        if (!pendingDelete) {
            return;
        }
        if (pendingDelete.kind === 'card') {
            deleteCard(pendingDelete.id);
        } else {
            deleteIssuer(pendingDelete.id);
        }
        setConfirmOpen(false);
        setPendingDelete(null);
    };

    const deleteDescription = buildDeleteDescription(pendingDelete?.counts);

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                        <Settings2 /> Manage
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                    <SheetHeader className="shrink-0 border-b px-6 py-5">
                        <SheetTitle>Banks and cards</SheetTitle>
                        <SheetDescription>
                            Rename, move a card between banks, or retire one. Deactivating keeps the payment history;
                            deleting does not.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
                        {issuers.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                No banks yet. Add your first card to get started.
                            </p>
                        ) : (
                            issuers.map((issuer) => (
                                <IssuerBlock
                                    key={issuer.id}
                                    issuer={issuer}
                                    issuers={issuers}
                                    onRequestDeleteIssuer={requestDeleteIssuer}
                                    onRequestDeleteCard={requestDeleteCard}
                                />
                            ))
                        )}

                        <AddCardDialog
                            issuers={issuers}
                            trigger={
                                <Button type="button" variant="outline" size="sm" className="w-full">
                                    Add another card
                                </Button>
                            }
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <ConfirmationModal
                open={!!pendingDelete}
                setOpen={(value) => {
                    if (!value) setPendingDelete(null);
                }}
                title={`Delete ${pendingDelete?.name ?? ''}?`}
                description={deleteDescription}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
};

export default IssuerCardManager;
