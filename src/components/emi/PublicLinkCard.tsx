import { useState } from 'react';
import { Copy, Link2, Link2Off } from 'lucide-react';

import {
    buildShareLinkUrl,
    useActiveShareLink,
    useCreateShareLink,
    useRevokeShareLink,
} from '@/hooks/useEmiShareLinks';
import { errorToast, successToast } from '@/utils/toast.utils';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/** Owner-only: create, copy and revoke the EMI's public read-only link. */
const PublicLinkCard = ({ emiId }: { emiId: string }) => {
    const { data: link, isLoading } = useActiveShareLink(emiId);
    const { mutate: createLink, isPending: isCreating } = useCreateShareLink();
    const { mutate: revokeLink, isPending: isRevoking } = useRevokeShareLink();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const url = link ? buildShareLinkUrl(link.token) : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            successToast('Link copied');
        } catch {
            errorToast('Could not copy the link. Select it and copy manually.');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-5 w-5" />
                    Public link
                </CardTitle>
                <CardDescription>
                    Anyone with this link can view the EMI details and amortization schedule without logging in. They
                    cannot edit anything.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-9 w-full" />
                ) : link ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            value={url}
                            readOnly
                            aria-label="Public link"
                            onFocus={(e) => e.target.select()}
                            className="font-mono text-xs"
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleCopy} className="flex-1 sm:flex-none">
                                <Copy className="h-4 w-4" />
                                Copy
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmOpen(true)}
                                disabled={isRevoking}
                                className="flex-1 sm:flex-none"
                            >
                                <Link2Off className="h-4 w-4" />
                                Revoke
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button onClick={() => createLink(emiId)} disabled={isCreating}>
                        <Link2 className="h-4 w-4" />
                        {isCreating ? 'Creating...' : 'Create link'}
                    </Button>
                )}
            </CardContent>
            <ConfirmationModal
                title="Revoke public link?"
                description="Anyone who has this link will no longer be able to open it. You can create a new link afterwards; it will have a different address."
                confirmText="Revoke"
                open={confirmOpen}
                setOpen={setConfirmOpen}
                isLoading={isRevoking}
                onCancel={() => {}}
                onConfirm={(setOpen) => {
                    if (!link) return;
                    revokeLink({ linkId: link.id, emiId }, { onSettled: () => setOpen(false) });
                }}
            />
        </Card>
    );
};

export default PublicLinkCard;
