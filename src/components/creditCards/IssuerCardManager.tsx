import { useState } from 'react';
import { ArrowLeftRight, Check, Landmark, MoreVertical, Pencil, Power, Settings2, Trash2, X } from 'lucide-react';

import { useDeleteCard, useDeleteIssuer, useUpdateCard, useUpdateIssuer } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';
import { ICreditCard, ICreditCardIssuer } from '@/types/creditCard.types';
import { CreditCardService } from '@/utils/CreditCardService';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import AddCardDialog from '@/components/creditCards/AddCardDialog';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type PendingDelete = { kind: 'issuer' | 'card'; id: string; name: string; entryCount: number };

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

    const countEntries = async (cardIds: string[]) => {
        try {
            const counts = await Promise.all(cardIds.map((id) => CreditCardService.countEntriesForCard(id)));
            return counts.reduce((sum, count) => sum + count, 0);
        } catch {
            return 0;
        }
    };

    const requestDeleteCard = async (card: ICreditCard) => {
        setPendingDelete({
            kind: 'card',
            id: card.id,
            name: card.name,
            entryCount: await countEntries([card.id]),
        });
    };

    const requestDeleteIssuer = async (issuer: ICreditCardIssuer) => {
        setPendingDelete({
            kind: 'issuer',
            id: issuer.id,
            name: issuer.name,
            entryCount: await countEntries(issuer.cards.map((card) => card.id)),
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

    const deleteDescription = pendingDelete
        ? pendingDelete.entryCount > 0
            ? `This permanently deletes ${pendingDelete.entryCount} logged payment${
                  pendingDelete.entryCount === 1 ? '' : 's'
              } across every financial year. To keep the history, deactivate instead.`
            : 'Nothing has been logged against this yet, so no payment history will be lost.'
        : '';

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
