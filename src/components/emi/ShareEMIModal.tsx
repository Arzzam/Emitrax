import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Share2, UserPlus, Eye, Edit, Trash2 } from 'lucide-react';

import { useShareEmi, useUnshareEmi, useUpdateSharePermission, useEmiShares } from '@/hooks/useEmi';
import { IEmiShare } from '@/types/emi.types';
import { errorToast, successToast } from '@/utils/toast.utils';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const shareFormSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    permission: z.enum(['read', 'write'], {
        required_error: 'Please select a permission level',
    }),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface ShareEMIModalProps {
    emiId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ShareEMIModal = ({ emiId, open, onOpenChange }: ShareEMIModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: shares, isLoading: sharesLoading } = useEmiShares(emiId);
    const { mutate: shareEmi } = useShareEmi();
    const { mutate: unshareEmi } = useUnshareEmi();
    const { mutate: updatePermission } = useUpdateSharePermission();

    const form = useForm<ShareFormValues>({
        resolver: zodResolver(shareFormSchema),
        defaultValues: {
            email: '',
            permission: 'read',
        },
    });

    const onSubmit = (values: ShareFormValues) => {
        setIsSubmitting(true);
        shareEmi(
            {
                emiId,
                email: values.email,
                permission: values.permission,
            },
            {
                onSuccess: () => {
                    successToast('EMI shared successfully');
                    form.reset();
                    setIsSubmitting(false);
                },
                onError: (error: Error) => {
                    errorToast(error.message || 'Failed to share EMI');
                    setIsSubmitting(false);
                },
            }
        );
    };

    const handleUnshare = (sharedWithUserId: string) => {
        unshareEmi(
            { emiId, sharedWithUserId },
            {
                onSuccess: () => {
                    successToast('Share removed successfully');
                },
                onError: (error: Error) => {
                    errorToast(error.message || 'Failed to remove share');
                },
            }
        );
    };

    const handlePermissionChange = (share: IEmiShare, newPermission: 'read' | 'write') => {
        if (share.permission === newPermission) return;

        updatePermission(
            {
                emiId,
                sharedWithUserId: share.sharedWithUserId,
                permission: newPermission,
            },
            {
                onSuccess: () => {
                    successToast('Permission updated successfully');
                },
                onError: (error: Error) => {
                    errorToast(error.message || 'Failed to update permission');
                },
            }
        );
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
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="user@example.com"
                                                type="email"
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="permission"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Permission Level</FormLabel>
                                        <Select
                                            onValueChange={(value: 'read' | 'write') => field.onChange(value)}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select permission" />
                                                </SelectTrigger>
                                            </FormControl>
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Sharing...' : 'Share EMI'}
                            </Button>
                        </form>
                    </Form>

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
