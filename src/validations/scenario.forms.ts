import * as z from 'zod';

export const foreclosureScenarioFormSchema = z.object({
    name: z
        .string()
        .min(2, { message: 'Scenario name must be at least 2 characters.' })
        .max(80, { message: 'Scenario name must be 80 characters or fewer.' }),
    simulationDate: z.date({ message: 'Please select a foreclosure date.' }),
    foreclosureChargeRate: z
        .number()
        .min(0, { message: 'Charge rate must be 0 or greater.' })
        .max(100, { message: 'Charge rate cannot exceed 100%.' }),
    foreclosureChargeAmount: z.number().min(0, { message: 'Flat charge cannot be negative.' }),
    foreclosureChargeGstRate: z
        .number()
        .min(0, { message: 'GST must be 0 or greater.' })
        .max(100, { message: 'GST cannot exceed 100%.' }),
    includeNextInstallmentInterest: z.boolean(),
    notes: z.string().max(500, { message: 'Notes must be 500 characters or fewer.' }).optional(),
});

export type ForeclosureScenarioFormValues = z.infer<typeof foreclosureScenarioFormSchema>;
