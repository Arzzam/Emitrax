import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ILoanScenario } from '@/types/scenario.types';
import { foreclosureScenarioFormSchema, ForeclosureScenarioFormValues } from '@/validations/scenario.forms';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface ScenarioInputFormProps {
    defaultName: string;
    minDate: Date;
    maxDate: Date;
    canSave: boolean;
    isSaving: boolean;
    editingScenario?: ILoanScenario | null;
    onPreview: (values: ForeclosureScenarioFormValues) => void;
    onSave: (values: ForeclosureScenarioFormValues) => void;
    onCancelEdit?: () => void;
}

const buildInitialValues = (
    defaultName: string,
    editingScenario?: ILoanScenario | null
): ForeclosureScenarioFormValues => {
    if (editingScenario) {
        return {
            name: editingScenario.name,
            simulationDate: new Date(editingScenario.simulationDate),
            foreclosureChargeRate: editingScenario.foreclosureChargeRate,
            foreclosureChargeAmount: editingScenario.foreclosureChargeAmount,
            foreclosureChargeGstRate: editingScenario.foreclosureChargeGstRate,
            includeNextInstallmentInterest: editingScenario.includeNextInstallmentInterest,
            notes: editingScenario.notes || '',
        };
    }

    return {
        name: defaultName,
        simulationDate: new Date(),
        foreclosureChargeRate: 0,
        foreclosureChargeAmount: 0,
        foreclosureChargeGstRate: 18,
        includeNextInstallmentInterest: false,
        notes: '',
    };
};

const ScenarioInputForm = ({
    defaultName,
    minDate,
    maxDate,
    canSave,
    isSaving,
    editingScenario,
    onPreview,
    onSave,
    onCancelEdit,
}: ScenarioInputFormProps) => {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const isEditing = !!editingScenario;
    const initialValues = useMemo(
        () => buildInitialValues(defaultName, editingScenario),
        [defaultName, editingScenario]
    );

    const form = useForm({
        defaultValues: initialValues,
        validators: {
            onSubmit: foreclosureScenarioFormSchema as never,
        },
        onSubmit: ({ value }) => {
            onPreview(value);
        },
    });

    const handleSave = () => {
        const parsed = foreclosureScenarioFormSchema.safeParse(form.state.values);
        if (!parsed.success) {
            void form.handleSubmit();
            return;
        }
        onSave(parsed.data);
    };

    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            {isEditing && (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Editing saved scenario. Update inputs, preview results, then save changes.
                </div>
            )}

            <form.Field name="name">
                {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                        <FieldLabel htmlFor="scenario-name">Scenario name</FieldLabel>
                        <Input
                            id="scenario-name"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="e.g. Close in June"
                            autoComplete="off"
                        />
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <form.Field name="simulationDate">
                {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                        <FieldLabel>Foreclosure date</FieldLabel>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !field.state.value && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.state.value ? format(field.state.value, 'PPP') : 'Select date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.state.value}
                                    defaultMonth={field.state.value}
                                    captionLayout="dropdown"
                                    onSelect={(date) => {
                                        if (date) {
                                            field.handleChange(date);
                                            setCalendarOpen(false);
                                        }
                                    }}
                                    disabled={(date) => date < minDate || date > maxDate}
                                />
                            </PopoverContent>
                        </Popover>
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <div className="grid gap-4 sm:grid-cols-3">
                <form.Field name="foreclosureChargeRate">
                    {(field) => (
                        <Field data-invalid={field.state.meta.errors.length > 0}>
                            <FieldLabel htmlFor="charge-rate">Charge rate (%)</FieldLabel>
                            <Input
                                id="charge-rate"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(Number(event.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Percent of outstanding principal</p>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="foreclosureChargeAmount">
                    {(field) => (
                        <Field data-invalid={field.state.meta.errors.length > 0}>
                            <FieldLabel htmlFor="charge-amount">Flat charges</FieldLabel>
                            <Input
                                id="charge-amount"
                                type="number"
                                min={0}
                                step="0.01"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(Number(event.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Kept separate from % charges</p>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="foreclosureChargeGstRate">
                    {(field) => (
                        <Field data-invalid={field.state.meta.errors.length > 0}>
                            <FieldLabel htmlFor="charge-gst">GST on % charges</FieldLabel>
                            <Input
                                id="charge-gst"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(Number(event.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Applies only to percent charges</p>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>
            </div>

            <form.Field name="includeNextInstallmentInterest">
                {(field) => (
                    <Field className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <FieldLabel htmlFor="include-next-interest">
                                    Include next installment interest
                                </FieldLabel>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, payoff includes the full next month interest and its GST instead of
                                    prorated accrued interest.
                                </p>
                            </div>
                            <Switch
                                id="include-next-interest"
                                checked={field.state.value}
                                onCheckedChange={(checked) => field.handleChange(checked)}
                            />
                        </div>
                    </Field>
                )}
            </form.Field>

            <form.Field name="notes">
                {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                        <FieldLabel htmlFor="scenario-notes">Notes (optional)</FieldLabel>
                        <Textarea
                            id="scenario-notes"
                            value={field.state.value || ''}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="Optional context for this quote"
                            rows={3}
                        />
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="default">
                    Calculate preview
                </Button>
                {canSave && (
                    <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
                        {isSaving
                            ? isEditing
                                ? 'Updating...'
                                : 'Saving...'
                            : isEditing
                              ? 'Update scenario'
                              : 'Save scenario'}
                    </Button>
                )}
                {isEditing && onCancelEdit && (
                    <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={isSaving}>
                        Cancel edit
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ScenarioInputForm;
