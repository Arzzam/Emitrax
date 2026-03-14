import { useForm } from '@tanstack/react-form';
import { Edit, Eye, Share2, Trash2, UserPlus } from 'lucide-react';
import * as z from 'zod';

import { useEmiShares, useShareEmi, useUnshareEmi, useUpdateSharePermission } from '@/hooks/useEmi';
import { IEmiShare } from '@/types/emi.types';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

const shareFormSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    permission: z.enum(['read', 'write'], {
        required_error: 'Please select a permission level',
    }),
});

interface ShareEMIModalProps {
    emiId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ShareEMIModal = ({ emiId, open, onOpenChange }: ShareEMIModalProps) => {
    const { data: shares, isLoading: sharesLoading } = useEmiShares(emiId);
    const { mutate: shareEmi } = useShareEmi();
    const { mutate: unshareEmi } = useUnshareEmi();
    const { mutate: updatePermission } = useUpdateSharePermission();

    const form = useForm({
        defaultValues: {
            email: '',
            permission: 'read' as 'read' | 'write',
        },
        validators: {
            onSubmit: shareFormSchema as never,
        },
        onSubmit: async ({ value }) => {
            shareEmi(
                {
                    emiId,
                    email: value.email,
                    permission: value.permission,
                },
                {
                    onSuccess: () => {
                        form.reset();
                    },
                }
            );
        },
    });

    const handleUnshare = (sharedWithUserId: string) => {
        unshareEmi({ emiId, sharedWithUserId });
    };

    const handlePermissionChange = (share: IEmiShare, newPermission: 'read' | 'write') => {
        if (share.permission === newPermission) return;

        updatePermission({ emiId, sharedWithUserId: share.sharedWithUserId, permission: newPermission });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Share EMI
                    </DialogTitle>
                    <DialogDescription>
                        Share this EMI with other users. They can view or edit based on the permission you grant.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void form.handleSubmit();
                        }}
                    >
                        <form.Field
                            name="email"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            type="email"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="user@example.com"
                                            disabled={form.state.isSubmitting}
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                );
                            }}
                        />

                        <form.Field
                            name="permission"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={`${field.name}-trigger`}>Permission Level</FieldLabel>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(value: 'read' | 'write') => field.handleChange(value)}
                                            disabled={form.state.isSubmitting}
                                        >
                                            <SelectTrigger id={`${field.name}-trigger`} aria-invalid={isInvalid}>
                                                <SelectValue placeholder="Select permission" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="read">
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="h-4 w-4" />
                                                        <span>Read Only</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="write">
                                                    <div className="flex items-center gap-2">
                                                        <Edit className="h-4 w-4" />
                                                        <span>Read & Write</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                );
                            }}
                        />

                        <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            {form.state.isSubmitting ? 'Sharing...' : 'Share EMI'}
                        </Button>
                    </form>

                    {shares && shares.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium">Shared With</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {sharesLoading ? (
                                        <div className="text-sm text-muted-foreground">Loading shares...</div>
                                    ) : (
                                        shares.map((share) => (
                                            <div
                                                key={share.id}
                                                className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {share.user_profiles?.email || 'Failed to load user email'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge
                                                                variant={
                                                                    share.permission === 'write'
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                                className="text-xs"
                                                            >
                                                                {share.permission === 'write' ? (
                                                                    <>
                                                                        <Edit className="h-3 w-3 mr-1" />
                                                                        Write
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Eye className="h-3 w-3 mr-1" />
                                                                        Read
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={share.permission}
                                                        onValueChange={(value: 'read' | 'write') =>
                                                            handlePermissionChange(share, value)
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="min-w-full">
                                                            <SelectItem value="read">
                                                                <Eye className="h-3 w-3" />
                                                            </SelectItem>
                                                            <SelectItem value="write">
                                                                <Edit className="h-3 w-3" />
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 bg-white hover:bg-white/80"
                                                        onClick={() => handleUnshare(share.sharedWithUserId)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareEMIModal;
