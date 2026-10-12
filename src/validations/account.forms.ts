import * as z from 'zod';

import { AccountDetails, NumberFormatMode } from '@/types/account.types';
import { ExcelTemplate, PdfTemplate } from '@/types/export.types';
import { CURRENCIES, NUMBER_STYLE_LOCALES } from '@/utils/currencyRegistry';

export const PDF_TEMPLATE_OPTIONS: { value: PdfTemplate; label: string; description: string }[] = [
    { value: 'modern', label: 'Modern', description: 'Gradient header, color-coded stat cards, zebra rows' },
    { value: 'classic', label: 'Classic', description: 'Formal bordered layout, dense and print-ready' },
    { value: 'minimal', label: 'Minimal', description: 'Clean typography, generous whitespace, Oxford-rules table' },
];

export const EXCEL_TEMPLATE_OPTIONS: { value: ExcelTemplate; label: string; description: string }[] = [
    { value: 'detailed', label: 'Detailed', description: 'Summary + full amortization schedule on separate sheets' },
    { value: 'compact', label: 'Compact', description: 'Single sheet with key summary and condensed schedule' },
];

/** Examples are rendered live in the user's locale and currency, not hard-coded here. */
export const NUMBER_FORMAT_OPTIONS: { label: string; value: NumberFormatMode }[] = [
    { label: 'Exact', value: 'exact' },
    { label: 'Compact short', value: 'compact_short' },
    { label: 'Compact long', value: 'compact_long' },
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
    locale: z.enum(NUMBER_STYLE_LOCALES as [string, ...string[]], {
        required_error: 'Number style is required.',
    }),
    currency: z.enum(CURRENCIES.map((currency) => currency.code) as [string, ...string[]], {
        required_error: 'Currency is required.',
    }),
    numberFormat: z.enum(NUMBER_FORMAT_OPTIONS.map((option) => option.value) as [string, ...string[]], {
        required_error: 'Number format is required.',
    }),
    pdfTemplate: z.enum(['modern', 'classic', 'minimal'] as [PdfTemplate, ...PdfTemplate[]]).default('modern'),
    excelTemplate: z.enum(['detailed', 'compact'] as [ExcelTemplate, ...ExcelTemplate[]]).default('detailed'),
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
        pdfTemplate: accountDetails.preferences.exportConfig.pdfTemplate,
        excelTemplate: accountDetails.preferences.exportConfig.excelTemplate,
    };
}
