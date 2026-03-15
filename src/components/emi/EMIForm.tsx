import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { CalendarIcon, IndianRupee, Info, PercentIcon, PlusCircle, Tag } from 'lucide-react';
import * as z from 'zod';

import { useCreateEmi, useUpdateEmi } from '@/hooks/useEmi';
import { useUniqueTagsOptions } from '@/hooks/useStats';
import { cn } from '@/lib/utils';
import { IComboboxOption } from '@/types/common.types';
import { IEmi } from '@/types/emi.types';
import { calculateEMI } from '@/utils/calculation';

import ToolTipWrapper from '../common/TooltipWrapper';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxSeparator,
} from '../ui/combobox';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const formSchema = z
    .object({
        itemName: z.string().min(2, {
            message: 'Item name must be at least 2 characters.',
        }),
        principal: z.number().min(100, {
            message: 'Principal amount must be at least ₹100.',
        }),
        interestRate: z.number().min(0).max(100, {
            message: 'Interest rate must be between 1 and 100.',
        }),
        billDate: z.date({ message: 'Please select a bill date.' }),
        tenure: z.number().min(1).max(360, {
            message: 'Tenure must be between 1 and 360 months.',
        }),
        interestDiscountType: z.enum(['percent', 'amount']).optional(),
        interestDiscount: z.number().optional(),
        gst: z
            .number()
            .min(0)
            .max(100, {
                message: 'GST must be between 0 and 100.',
            })
            .optional(),
        tag: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.interestDiscount === undefined) return true;

            if (data.interestDiscountType === 'percent') {
                return data.interestDiscount >= 0 && data.interestDiscount <= 100;
            }

            return data.interestDiscount >= 0;
        },
        {
            message: 'Interest discount must be between 0-100% for percent type or a positive value for amount type',
            path: ['interestDiscount'],
        }
    );

export type TFormValues = z.infer<typeof formSchema>;

const EMIForm = ({ setIsOpen, data }: { setIsOpen: (isOpen: boolean) => void; data?: IEmi }) => {
    const { mutate: updateEmi, isPending: isUpdatingEmi } = useUpdateEmi();
    const { mutate: addEmi, isPending: isAddingEmi } = useCreateEmi();
    const [open, setOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const uniqueTags: IComboboxOption[] = useUniqueTagsOptions();

    const isEdit = !!data;

    const form = useForm({
        defaultValues: {
            itemName: data?.itemName || '',
            principal: data?.principal ?? undefined,
            interestRate: data?.interestRate ?? undefined,
            billDate: data?.billDate ? new Date(data.billDate) : undefined,
            tenure: data?.tenure ?? undefined,
            interestDiscount: data?.interestDiscount ?? undefined,
            interestDiscountType: (data?.interestDiscountType || 'percent') as 'percent' | 'amount',
            gst: data?.gst ?? undefined,
            tag: data?.tag || '',
        },
        validators: {
            onSubmit: formSchema as never,
        },
        onSubmit: ({ value }) => {
            const values = { ...value };
            if (!values.tag) {
                values.tag = 'Personal';
            }
            const calculatedValues = calculateEMI(values as IEmi, data?.id);
            if (calculatedValues) {
                if (isEdit) {
                    updateEmi(calculatedValues);
                } else {
                    addEmi(calculatedValues);
                }
                setIsOpen(false);
            }
        },
    });

    const handleTagChange = (value: string) => {
        form.setFieldValue('tag', value);
        setTagInput('');
        setOpen(false);
    };

    return (
        <form
            className="grid grid-cols-2 gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
            }}
        >
            <form.Field
                name="itemName"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Item Name</FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                aria-invalid={isInvalid}
                                placeholder="e.g., Laptop"
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />
            <form.Field name="tag">
                {(field) => {
                    return (
                        <Field>
                            <div className="flex flex-row gap-2">
                                <FieldLabel htmlFor={field.name}>Category Tag</FieldLabel>
                                <ToolTipWrapper content="Select from existing categories or type to create a new one">
                                    <Tag className="w-4 h-4" />
                                </ToolTipWrapper>
                            </div>
                            <Combobox
                                items={uniqueTags}
                                value={field.state.value}
                                autoHighlight
                                onValueChange={(v) => field.handleChange(v ?? '')}
                                modal={true}
                                onInputValueChange={(v) => setTagInput(v ?? '')}
                            >
                                <ComboboxInput
                                    placeholder="Select a Tag"
                                    id={field.name}
                                    aria-invalid={!!field.state.meta.errors.length}
                                    aria-describedby={`${field.name}-label`}
                                    value={tagInput || field.state.value || ''}
                                />
                                <ComboboxContent>
                                    <ComboboxList>
                                        {({ value, label }) => {
                                            return (
                                                <>
                                                    <ComboboxItem
                                                        key={value}
                                                        value={value}
                                                        className="pointer-events-auto"
                                                        onSelect={() => {
                                                            handleTagChange(value);
                                                        }}
                                                    >
                                                        {label}
                                                    </ComboboxItem>
                                                </>
                                            );
                                        }}
                                    </ComboboxList>
                                    {tagInput && (
                                        <>
                                            <ComboboxSeparator />
                                            <ComboboxItem
                                                value={`${tagInput}`}
                                                className="pointer-events-auto"
                                                onSelect={() => handleTagChange(`${tagInput.trim()}`)}
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Create &quot;{tagInput}&quot;
                                            </ComboboxItem>
                                        </>
                                    )}
                                    {/* <ComboboxEmpty>
                                        <ComboboxItem
                                            value={`${tagInput}`}
                                            className="pointer-events-auto"
                                            onSelect={() => {
                                                handleTagChange(`${tagInput.trim()}`);
                                            }}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Create &quot;{tagInput}&quot;
                                        </ComboboxItem>
                                    </ComboboxEmpty> */}
                                </ComboboxContent>
                            </Combobox>
                            <FieldError errors={field.state.meta.errors?.map((m) => ({ message: m }))} />
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field
                name="principal"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <div className="flex flex-row gap-2">
                                <FieldLabel htmlFor={field.name}>Principal Amount (₹)</FieldLabel>
                                <ToolTipWrapper content="Principal amount is the amount of money borrowed from the bank or lender.">
                                    <Info className="w-4 h-4" />
                                </ToolTipWrapper>
                            </div>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="number"
                                value={field.state.value ?? ''}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value === '' ? undefined : Number(e.target.value))
                                }
                                aria-invalid={isInvalid}
                                placeholder="e.g., 50000"
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />
            <form.Field
                name="interestRate"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <div className="flex flex-row gap-2">
                                <FieldLabel htmlFor={field.name}>Interest Rate (%)</FieldLabel>
                                <ToolTipWrapper content="If it is No Interest Loan, then use 0 for interest rate and interest discount">
                                    <Info className="w-4 h-4" />
                                </ToolTipWrapper>
                            </div>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="number"
                                step="0.01"
                                value={field.state.value ?? ''}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value === '' ? undefined : Number(e.target.value))
                                }
                                aria-invalid={isInvalid}
                                placeholder="e.g., 12.5"
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />
            <form.Field
                name="billDate"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <div className="flex flex-row gap-2">
                                <FieldLabel htmlFor={`${field.name}-trigger`}>Bill Date</FieldLabel>
                                <ToolTipWrapper content="Use statement date as bill date. So that you can track your EMI date and bill date.">
                                    <Info className="w-4 h-4" />
                                </ToolTipWrapper>
                            </div>
                            <Popover open={open} onOpenChange={setOpen} modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        id={`${field.name}-trigger`}
                                        aria-invalid={isInvalid}
                                        className={cn(
                                            'pl-3 text-left font-normal w-full',
                                            !field.state.value && 'text-muted-foreground'
                                        )}
                                    >
                                        {field.state.value ? (
                                            format(field.state.value, 'PPP')
                                        ) : (
                                            <span className="truncate">Select Bill Date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                                    <Calendar
                                        mode="single"
                                        required
                                        selected={field.state.value}
                                        defaultMonth={field.state.value}
                                        captionLayout="dropdown"
                                        onSelect={(date) => {
                                            field.handleChange(date);
                                            setOpen(false);
                                        }}
                                        disabled={{ after: new Date() }}
                                    />
                                </PopoverContent>
                            </Popover>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />
            <form.Field
                name="tenure"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Tenure (Months)</FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="number"
                                value={field.state.value ?? ''}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value === '' ? undefined : Number(e.target.value))
                                }
                                aria-invalid={isInvalid}
                                placeholder="e.g., 12"
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />

            <form.Subscribe selector={(state) => state.values.interestDiscountType}>
                {(interestDiscountType) => (
                    <>
                        <form.Field
                            name="interestDiscount"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                const placeholder =
                                    interestDiscountType === 'amount' ? 'e.g., 1000 (₹)' : 'e.g., 12.5 (%)';
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Interest Discount (%) / (₹)</FieldLabel>
                                        <div className="relative">
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type="number"
                                                value={field.state.value ?? ''}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value === '' ? undefined : Number(e.target.value)
                                                    )
                                                }
                                                aria-invalid={isInvalid}
                                                placeholder={placeholder}
                                                className="pr-16"
                                            />
                                            <form.Field
                                                name="interestDiscountType"
                                                children={(typeField) => (
                                                    <div className="absolute inset-y-0 right-2 flex items-center space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                typeField.handleChange(
                                                                    typeField.state.value === 'amount'
                                                                        ? 'percent'
                                                                        : 'amount'
                                                                )
                                                            }
                                                            className="bg-transparent border-none text-gray-500 hover:bg-transparent hover:text-foreground cursor-pointer"
                                                        >
                                                            {typeField.state.value === 'amount' ? (
                                                                <IndianRupee className="w-4 h-4 transition-all duration-300 scale-100" />
                                                            ) : (
                                                                <PercentIcon className="w-4 h-4 transition-all duration-300 scale-100" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                );
                            }}
                        />
                    </>
                )}
            </form.Subscribe>

            <form.Field
                name="gst"
                children={(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                        <Field data-invalid={isInvalid}>
                            <div className="flex flex-row gap-2">
                                <FieldLabel htmlFor={field.name}>GST (%)</FieldLabel>
                                <ToolTipWrapper content="GST is the tax on the interest rate. It is calculated on the interest rate and principal amount.">
                                    <Info className="w-4 h-4" />
                                </ToolTipWrapper>
                            </div>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="number"
                                step="0.01"
                                value={field.state.value ?? ''}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value === '' ? undefined : Number(e.target.value))
                                }
                                aria-invalid={isInvalid}
                                placeholder="e.g., 18"
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                    );
                }}
            />
            <Button type="submit" className="w-36 col-span-2 ml-auto">
                {isEdit ? (isUpdatingEmi ? 'Updating...' : 'Update') : isAddingEmi ? 'Adding...' : 'Add'}
            </Button>
        </form>
    );
};

export default EMIForm;
