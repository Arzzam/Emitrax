import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import Header from '@/components/common/Header';
import MainContainer from '@/components/common/Container';
import LoginCard from '@/components/cards/LoginCard';
import LoadingDetails from '@/components/common/LoadingDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountDetails, useUpsertAccountDetails } from '@/hooks/useAccount';
import { useUser } from '@/hooks/useUser';
import { errorToast, successToast } from '@/utils/toast.utils';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';

const LOCALE_OPTIONS = [
    { label: 'English (India)', value: 'en-IN' },
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (UK)', value: 'en-GB' },
] as const;

const CURRENCY_OPTIONS = [
    { label: 'Indian Rupee (INR)', value: 'INR' },
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
] as const;

const ensureCurrentOption = (
    options: readonly { label: string; value: string }[],
    currentValue: string | undefined,
    fallbackLabelPrefix: string
) => {
    if (!currentValue) {
        return options;
    }

    const hasCurrentValue = options.some((option) => option.value === currentValue);
    if (hasCurrentValue) {
        return options;
    }

    return [{ label: `${fallbackLabelPrefix}: ${currentValue}`, value: currentValue }, ...options];
};

const accountSchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(2, { message: 'Display name must be at least 2 characters.' })
        .max(80, { message: 'Display name cannot exceed 80 characters.' }),
    phone: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || /^[0-9+\-() ]{7,20}$/.test(value), {
            message: 'Enter a valid phone number or leave it empty.',
        }),
    avatarUrl: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || z.string().url().safeParse(value).success, {
            message: 'Avatar must be a valid URL.',
        }),
    locale: z.string().trim().min(1, { message: 'Language/locale is required.' }),
    currency: z
        .string()
        .trim()
        .regex(/^[A-Z]{3}$/, { message: 'Currency must be a 3-letter code.' }),
});

type AccountFormValues = z.infer<typeof accountSchema>;

const Account = () => {
    const { data: userData, isLoading: isUserLoading } = useUser();
    const hasUser = !!userData?.user;
    const { data: account, isLoading: isAccountLoading, isError, refetch } = useAccountDetails({ enabled: hasUser });
    const { mutateAsync: upsertAccount, isPending: isSaving } = useUpsertAccountDetails();

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            displayName: '',
            phone: '',
            avatarUrl: '',
            locale: 'en-IN',
            currency: 'INR',
        },
    });
    const isFormDirty = form.formState.isDirty;

    const displayNameValue = form.watch('displayName');
    const avatarUrlValue = form.watch('avatarUrl');
    const localeValue = form.watch('locale');
    const currencyValue = form.watch('currency');
    const initials =
        displayNameValue
            ?.split(' ')
            .map((part) => part.trim().charAt(0))
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'U';

    const localeOptions = useMemo(
        () => ensureCurrentOption(LOCALE_OPTIONS, localeValue, 'Saved locale'),
        [localeValue]
    );
    const currencyOptions = useMemo(
        () => ensureCurrentOption(CURRENCY_OPTIONS, currencyValue, 'Saved currency'),
        [currencyValue]
    );

    useEffect(() => {
        if (!account) {
            return;
        }

        form.reset({
            displayName: account.displayName || '',
            phone: account.preferences.phone || '',
            avatarUrl: account.preferences.avatarUrl || '',
            locale: account.preferences.locale,
            currency: account.preferences.currency,
        });
    }, [account, form]);

    const onSubmit = async (values: AccountFormValues) => {
        try {
            await upsertAccount({
                displayName: values.displayName,
                phone: values.phone,
                avatarUrl: values.avatarUrl,
                locale: values.locale,
                currency: values.currency,
            });

            form.reset(values);
            successToast('Account details updated successfully.');
        } catch {
            errorToast('Could not save account details. Please try again.');
        }
    };

    if (isUserLoading) {
        return (
            <LoadingDetails
                title="Account"
                description="Loading account..."
                description2="Please wait while we verify your session."
            />
        );
    }

    return (
        <>
            <Header title="Account" />
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[{ label: 'Dashboard', link: '/' }, { label: `Account` }]}
            />
            <MainContainer className="max-w-6xl">
                {!hasUser ? (
                    <LoginCard />
                ) : isAccountLoading ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <div className="h-8 w-56 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-80 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                            <div className="h-72 animate-pulse rounded-xl border bg-card" />
                            <div className="space-y-4">
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                            </div>
                        </div>
                    </div>
                ) : isError || !account ? (
                    <Card className="max-w-2xl mx-auto mt-10">
                        <CardHeader>
                            <CardTitle>Unable to load account</CardTitle>
                            <CardDescription>
                                We could not fetch your profile settings right now. Retry in a moment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => refetch()} variant="outline">
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Form {...form}>
                        <form className="space-y-6 py-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <section className="space-y-1">
                                <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage your profile information and default regional preferences.
                                </p>
                            </section>

                            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                                <aside className="rounded-xl border bg-card p-5 lg:sticky lg:top-4 h-fit">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            {avatarUrlValue ? (
                                                <img
                                                    src={avatarUrlValue}
                                                    alt="Profile avatar"
                                                    className="h-12 w-12 rounded-full border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                                                    {initials}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {displayNameValue || 'Your Name'}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {account.email}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            Keep your profile up to date so account sharing and personalized settings
                                            remain consistent.
                                        </p>
                                        <Button
                                            className="w-full cursor-pointer"
                                            type="submit"
                                            disabled={isSaving || !isFormDirty}
                                        >
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </aside>

                                <div className="space-y-4">
                                    <section className="rounded-xl border bg-card p-5 space-y-4">
                                        <div>
                                            <h2 className="font-semibold">Basic Information</h2>
                                            <p className="text-sm text-muted-foreground">
                                                Set the name shown across your account.
                                            </p>
                                        </div>
                                        <div className="grid items-start gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="displayName"
                                                render={({ field }) => (
                                                    <FormItem className="h-full">
                                                        <FormLabel>Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Your display name" {...field} />
                                                        </FormControl>
                                                        <FormDescription className="min-h-5">
                                                            This name appears in your account profile.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormItem className="h-full">
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input value={account.email} readOnly disabled />
                                                </FormControl>
                                                <FormDescription className="min-h-5">
                                                    Email is managed by your login provider.
                                                </FormDescription>
                                            </FormItem>
                                        </div>
                                    </section>

                                    <section className="rounded-xl border bg-card p-5 space-y-4">
                                        <div>
                                            <h2 className="font-semibold">Contact & Profile</h2>
                                            <p className="text-sm text-muted-foreground">
                                                Add optional details for a complete account profile.
                                            </p>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+91 **********" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="avatarUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Avatar URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://example.com/avatar.jpg"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </section>

                                    <section className="rounded-xl border bg-card p-5 space-y-4">
                                        <div>
                                            <h2 className="font-semibold">Regional Settings</h2>
                                            <p className="text-sm text-muted-foreground">
                                                Configure defaults used for locale and currency formatting.
                                            </p>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="locale"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Language</FormLabel>
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select language" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {localeOptions.map((option) => (
                                                                    <SelectItem value={option.value} key={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="currency"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Currency</FormLabel>
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select currency" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {currencyOptions.map((option) => (
                                                                    <SelectItem value={option.value} key={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </form>
                    </Form>
                )}
            </MainContainer>
        </>
    );
};

export default Account;
