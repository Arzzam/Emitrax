import * as z from 'zod';

import { AccountDetails } from '@/types/account.types';

export const LOCALE_OPTIONS = [
    { label: 'English (India)', value: 'en-IN' },
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (UK)', value: 'en-GB' },
] as const;

export const CURRENCY_OPTIONS = [
    { label: 'Indian Rupee (INR)', value: 'INR' },
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
] as const;

export const NUMBER_FORMAT_OPTIONS: { label: string; value: string }[] = [
    { label: 'Exact (e.g. 1,25,000)', value: 'exact' },
    { label: 'Compact short (e.g. 1.25L)', value: 'compact_short' },
    { label: 'Compact long (e.g. 1.25 lakh)', value: 'compact_long' },
];

export const accountSchema = z.object({
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
    locale: z.enum(LOCALE_OPTIONS.map((option) => option.value) as [string, ...string[]], {
        required_error: 'Language/locale is required.',
    }),
    currency: z.enum(CURRENCY_OPTIONS.map((option) => option.value) as [string, ...string[]], {
        required_error: 'Currency is required.',
    }),
    numberFormat: z.enum(NUMBER_FORMAT_OPTIONS.map((option) => option.value) as [string, ...string[]], {
        required_error: 'Number format is required.',
    }),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export function getAccountFormDefaults(accountDetails: AccountDetails): AccountFormValues {
    return {
        displayName: accountDetails.displayName ?? '',
        phone: accountDetails.preferences.phone ?? '',
        avatarUrl: accountDetails.preferences.avatarUrl ?? '',
        locale: accountDetails.preferences.locale ?? '',
        currency: accountDetails.preferences.currency ?? '',
        numberFormat: accountDetails.preferences.numberFormat ?? '',
    };
}
