import { ComponentProps, useState } from 'react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { cn } from '@/lib/utils';

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../ui/input-group';

type AmountInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
    /** `NaN` while the text is not a valid amount, so form validation can flag it. */
    value: number | null | undefined;
    onValueChange: (value: number | undefined) => void;
    /** Hide the currency symbol adornment, e.g. inside an already-labelled control. */
    hideSymbol?: boolean;
};

/**
 * A money field for forms. Accepts typed or pasted text in the user's number
 * style (`1,25,000`, `1.234,56`, `₹1,25,000`) and reports a number upward on
 * every keystroke; shows the value regrouped once the field loses focus.
 *
 * Invalid text is kept on screen and reported as `NaN` rather than dropped, so
 * a typo surfaces as a validation error instead of silently becoming "empty".
 *
 * Grid cells do not use this - they commit on blur and own their drafts.
 */
const AmountInput = ({
    value,
    onValueChange,
    hideSymbol = false,
    className,
    onFocus,
    onBlur,
    ...props
}: AmountInputProps) => {
    const { currencySymbol, symbolPosition, parseAmountInput, formatAmountInput } = useCurrencyPreferences();
    const [draft, setDraft] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const isInvalidValue = typeof value === 'number' && Number.isNaN(value);
    const displayValue = isFocused || isInvalidValue ? draft : formatAmountInput(value);

    return (
        <InputGroup>
            <InputGroupInput
                {...props}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={cn('tabular-nums', className)}
                value={displayValue}
                onFocus={(event) => {
                    if (!isInvalidValue) setDraft(formatAmountInput(value));
                    setIsFocused(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setIsFocused(false);
                    onBlur?.(event);
                }}
                onChange={(event) => {
                    const text = event.target.value;
                    setDraft(text);
                    const parsed = parseAmountInput(text);
                    onValueChange(parsed === null ? undefined : parsed === undefined ? Number.NaN : parsed);
                }}
            />
            {!hideSymbol && (
                <InputGroupAddon align={symbolPosition === 'suffix' ? 'inline-end' : 'inline-start'}>
                    <InputGroupText>{currencySymbol}</InputGroupText>
                </InputGroupAddon>
            )}
        </InputGroup>
    );
};

export default AmountInput;
