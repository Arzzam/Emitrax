import { useForm, useStore } from '@tanstack/react-form';
import * as z from 'zod';

import { useUpsertAccountDetails } from '@/hooks/useAccount';
import { useRematchDispatch } from '@/store/store';
import { IDispatch } from '@/store/types/store.types';
import { AccountDetails, NumberFormatMode } from '@/types/account.types';
import { errorToast, successToast } from '@/utils/toast.utils';
import {
    AccountFormValues,
    accountSchema,
    CURRENCY_OPTIONS,
    getAccountFormDefaults,
    LOCALE_OPTIONS,
    NUMBER_FORMAT_OPTIONS,
} from '@/validations/account.forms';

import { Button } from '../ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function validateField<T>(schema: z.ZodType<T>, value: T): string | undefined {
    const result = schema.safeParse(value);
    if (result.success) return undefined;
    const issue = result.error.issues[0];
    return issue?.message ?? 'Invalid value';
}

export const AccountForm = ({ account }: { account: AccountDetails }) => {
    const defaultValues = getAccountFormDefaults(account);
    const { setPreferences } = useRematchDispatch((d: IDispatch) => d.currencyPreferencesModel);
    const { mutateAsync: upsertAccount, isPending: isSaving } = useUpsertAccountDetails();

    const avatarUrlValue = account.preferences.avatarUrl;
    const initials =
        account.displayName
            ?.split(' ')
            .map((part) => part.trim().charAt(0))
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'U';

    const form = useForm({
        defaultValues,
        validators: {
            onSubmit: ({ value }) => {
                const result = accountSchema.safeParse(value);
                if (result.success) return undefined;
                const fieldErrors = result.error.flatten().fieldErrors;
                return Object.keys(fieldErrors).length
                    ? (Object.entries(fieldErrors).flatMap(([k, v]) =>
                          (v ?? []).map((msg) => ({ path: [k] as [string], message: msg }))
                      ) as unknown)
                    : undefined;
            },
        },
        onSubmit: async ({ value }) => {
            await onSubmit(value);
        },
    });

    const nameField = useStore(form.store, (state) => state.values.displayName);

    const isNameDirty = useStore(form.store, (state) => state.values.displayName !== defaultValues.displayName);

    const isPhoneDirty = useStore(form.store, (state) => state.values.phone !== defaultValues.phone);
    const isAvatarUrlDirty = useStore(form.store, (state) => state.values.avatarUrl !== defaultValues.avatarUrl);
    const isLocaleDirty = useStore(form.store, (state) => state.values.locale !== defaultValues.locale);
    const isCurrencyDirty = useStore(form.store, (state) => state.values.currency !== defaultValues.currency);
    const isNumberFormatDirty = useStore(
        form.store,
        (state) => state.values.numberFormat !== defaultValues.numberFormat
    );

    const isDirty =
        isNameDirty || isPhoneDirty || isAvatarUrlDirty || isLocaleDirty || isCurrencyDirty || isNumberFormatDirty;

    const onSubmit = async (values: AccountFormValues) => {
        try {
            await upsertAccount({
                displayName: values.displayName,
                phone: values.phone,
                avatarUrl: values.avatarUrl,
                locale: values.locale,
                currency: values.currency,
                numberFormat: values.numberFormat as NumberFormatMode,
            });

            setPreferences({
                locale: values.locale,
                currency: values.currency,
                numberFormat: values.numberFormat as NumberFormatMode,
            });
            successToast('Account details updated successfully.');
        } catch {
            errorToast('Could not save account details. Please try again.');
        }
    };

    return (
        <form
            className="space-y-6 py-4"
            onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
            }}
        >
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
                                    {nameField || account?.displayName || 'Your Name'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Keep your profile up to date so account sharing and personalized settings remain consistent.
                        </p>
                        <Button className="w-full cursor-pointer" type="submit" disabled={isSaving || !isDirty}>
                            {form.state.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </aside>

                <div className="space-y-4">
                    <section className="rounded-xl border bg-card p-5 space-y-4">
                        <div>
                            <h2 className="font-semibold">Basic Information</h2>
                            <p className="text-sm text-muted-foreground">Set the name shown across your account.</p>
                        </div>
                        <div className="grid items-start gap-4 md:grid-cols-2">
                            <form.Field name="displayName">
                                {(field) => (
                                    <Field className="h-full">
                                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="Your display name"
                                        />
                                        <FieldDescription className="min-h-5">
                                            This name appears in your account profile.
                                        </FieldDescription>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                            <Field className="h-full">
                                <FieldLabel>Email</FieldLabel>
                                <Input value={account?.email ?? ''} readOnly disabled />
                                <FieldDescription className="min-h-5">
                                    Email is managed by your login provider.
                                </FieldDescription>
                            </Field>
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
                            <form.Field
                                name="phone"
                                validators={{ onBlur: ({ value }) => validateField(accountSchema.shape.phone, value) }}
                            >
                                {(field) => (
                                    <Field className="h-full">
                                        <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="+91 **********"
                                        />
                                        <FieldError errors={field.state.meta.errors as { message?: string }[]} />
                                    </Field>
                                )}
                            </form.Field>

                            <form.Field name="avatarUrl">
                                {(field) => (
                                    <Field className="h-full">
                                        <FieldLabel htmlFor={field.name}>Avatar URL</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
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
                            <form.Field name="locale">
                                {(field) => (
                                    <FieldGroup className="gap-2">
                                        <FieldLabel>Locale</FieldLabel>
                                        <Select
                                            value={(field.state.value as string) ?? ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Locale" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LOCALE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={field.state.meta.errors} />
                                    </FieldGroup>
                                )}
                            </form.Field>
                            <form.Field name="currency">
                                {(field) => (
                                    <FieldGroup className="gap-2">
                                        <FieldLabel htmlFor={`${field.name}-trigger`}>Currency</FieldLabel>
                                        <Select value={field.state.value ?? ''} onValueChange={field.handleChange}>
                                            <SelectTrigger id={`${field.name}-trigger`} className="w-full">
                                                <SelectValue placeholder="Select currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CURRENCY_OPTIONS.map((option) => (
                                                    <SelectItem value={option.value} key={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={field.state.meta.errors} />
                                    </FieldGroup>
                                )}
                            </form.Field>
                            <form.Field name="numberFormat">
                                {(field) => (
                                    <FieldGroup className="gap-2">
                                        <FieldLabel htmlFor={`${field.name}-trigger`}>Number format</FieldLabel>
                                        <Select value={field.state.value ?? ''} onValueChange={field.handleChange}>
                                            <SelectTrigger id={`${field.name}-trigger`} className="w-full">
                                                <SelectValue placeholder="Select Number format" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {NUMBER_FORMAT_OPTIONS.map((option) => (
                                                    <SelectItem value={option.value} key={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* <FieldDescription className="min-h-5">
                                                        How amounts are shown (e.g. in tables and cards).
                                                    </FieldDescription> */}
                                        <FieldError errors={field.state.meta.errors} />
                                    </FieldGroup>
                                )}
                            </form.Field>
                        </div>
                    </section>
                </div>
            </div>
        </form>
    );
};
