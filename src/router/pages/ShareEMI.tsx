import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from '@tanstack/react-form';
import { AlertCircle, Edit, Eye, Share2, Trash2, UserPlus, Users } from 'lucide-react';
import * as z from 'zod';

import { useEmis, useEmiShares, useShareEmi, useUnshareEmi, useUpdateSharePermission } from '@/hooks/useEmi';
import { IEmi, IEmiShare } from '@/types/emi.types';

import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import LoadingDetails from '@/components/common/LoadingDetails';
import NotFound from '@/components/common/NotFound';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SHARED_WITH_SKELETON_ROWS = 1;

const shareFormSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    permission: z.enum(['read', 'write'], {
        required_error: 'Please select a permission level',
    }),
});

const ShareEMI = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: emisData, isFetching } = useEmis();
    const currentData = useMemo(() => emisData?.find((emi: IEmi) => emi.id === id) || null, [emisData, id]);
    const { data: shares, isLoading: sharesLoading } = useEmiShares(id || '');
    const { mutate: shareEmi } = useShareEmi();
    const { mutate: unshareEmi } = useUnshareEmi();
    const { mutate: updatePermission } = useUpdateSharePermission();
    const [notFound, setNotFound] = useState(false);

    const form = useForm({
        defaultValues: {
            email: '',
            permission: 'read' as 'read' | 'write',
        },
        validators: {
            onSubmit: shareFormSchema as never,
        },
        onSubmit: async ({ value }) => {
            if (!id) return;
            shareEmi(
                {
                    emiId: id,
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

    const breadcrumbItems = useMemo(
        () => [
            { label: 'Dashboard', link: '/' },
            {
                label: currentData?.itemName ? `EMI Details (${currentData.itemName})` : 'EMI Details',
                link: `/emi/${id}`,
            },
            { label: 'Share EMI' },
        ],
        [currentData?.itemName, id]
    );

    useEffect(() => {
        if (!isFetching && emisData && !currentData) {
            setNotFound(true);
            const redirectTimer = setTimeout(() => navigate('/'), 3000);
            return () => clearTimeout(redirectTimer);
        }
    }, [isFetching, emisData, currentData, navigate]);

    const handleUnshare = (sharedWithUserId: string) => {
        if (!id) return;
        unshareEmi({ emiId: id, sharedWithUserId });
    };

    const handlePermissionChange = (share: IEmiShare, newPermission: 'read' | 'write') => {
        if (share.permission === newPermission || !id) return;
        updatePermission({ emiId: id, sharedWithUserId: share.sharedWithUserId, permission: newPermission });
    };

    const shareCount = shares?.length ?? 0;

    if (isFetching) {
        return (
            <LoadingDetails
                title="Share EMI"
                description="Loading EMI..."
                description2="Please wait while we fetch the EMI details."
            />
        );
    }

    if (notFound || !currentData) {
        return (
            <NotFound
                title="EMI Not Found"
                description="We couldn't find the EMI you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    const isOwner = currentData.isOwner;
    if (!isOwner) {
        return (
            <>
                <Header title="Share EMI" />
                <BreadcrumbContainer className="py-4 px-8" items={breadcrumbItems} />
                <MainContainer>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Only the EMI owner can manage sharing. You can view this EMI if it was shared with you from
                            the EMI details page.
                        </AlertDescription>
                    </Alert>
                </MainContainer>
            </>
        );
    }

    return (
        <>
            <Header title="Share EMI" />
            <BreadcrumbContainer className="pt-4 pb-0 px-8" items={breadcrumbItems} />
            <MainContainer>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Share2 className="h-7 w-7" />
                                Share EMI
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                Share this EMI with other users. They can view or edit based on the permission you
                                grant.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/emi/${id}`}>Back to EMI</Link>
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Item</p>
                                    <p className="font-semibold">{currentData.itemName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Shared with</p>
                                    <p className="font-semibold flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        {shareCount} {shareCount === 1 ? 'person' : 'people'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Manage</p>
                                    <p className="text-sm text-muted-foreground">
                                        Add or remove people below and change their access.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <UserPlus className="h-5 w-5" />
                                Share with someone
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
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
                                            <Field data-invalid={isInvalid} className="md:col-span-5">
                                                <FieldLabel htmlFor={field.name}>Email address</FieldLabel>
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
                                            <Field data-invalid={isInvalid} className="md:col-span-4">
                                                <FieldLabel htmlFor={`${field.name}-trigger`}>Permission</FieldLabel>
                                                <Select
                                                    value={field.state.value}
                                                    onValueChange={(value: 'read' | 'write') =>
                                                        field.handleChange(value)
                                                    }
                                                    disabled={form.state.isSubmitting}
                                                >
                                                    <SelectTrigger
                                                        id={`${field.name}-trigger`}
                                                        aria-invalid={isInvalid}
                                                    >
                                                        <SelectValue placeholder="Select permission" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="read">
                                                            <div className="flex items-center gap-2">
                                                                <Eye className="h-4 w-4" />
                                                                Read only
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="write">
                                                            <div className="flex items-center gap-2">
                                                                <Edit className="h-4 w-4" />
                                                                Read & write
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                            </Field>
                                        );
                                    }}
                                />
                                <div className="md:col-span-3">
                                    <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        {form.state.isSubmitting ? 'Sharing...' : 'Share'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5" />
                                Shared with ({shareCount})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sharesLoading ? (
                                <ul className="divide-y divide-border rounded-lg border">
                                    {Array.from({ length: SHARED_WITH_SKELETON_ROWS }).map((_, i) => (
                                        <li
                                            key={i}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 first:rounded-t-lg last:rounded-b-lg"
                                        >
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <Skeleton className="h-4 w-48 max-w-full" />
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Skeleton className="h-9 w-[130px] rounded-md" />
                                                <Skeleton className="h-9 w-9 rounded-md" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : shares && shares.length > 0 ? (
                                <ul className="divide-y divide-border rounded-lg border">
                                    {shares.map((share) => (
                                        <li
                                            key={share.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">
                                                    {share.user_profiles?.email ?? 'Failed to load email'}
                                                </p>
                                                <div className="mt-1">
                                                    <Badge
                                                        variant={share.permission === 'write' ? 'default' : 'secondary'}
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
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Select
                                                    value={share.permission}
                                                    onValueChange={(value: 'read' | 'write') =>
                                                        handlePermissionChange(share, value)
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="read">
                                                            <Eye className="h-3 w-3 mr-2" />
                                                            Read
                                                        </SelectItem>
                                                        <SelectItem value="write">
                                                            <Edit className="h-3 w-3 mr-2" />
                                                            Write
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleUnshare(share.sharedWithUserId)}
                                                    aria-label="Remove share"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No one shared yet</p>
                                    <p className="text-xs mt-1">Use the form above to share this EMI with someone.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainContainer>
        </>
    );
};

export default ShareEMI;
