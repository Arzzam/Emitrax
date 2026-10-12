import {
    CURRENCY_OPTION_GROUPS,
    CurrencyOptionGroup,
    getCurrencyDefinition,
    getCurrencyOptionLabel,
    matchesCurrencyQuery,
} from '@/utils/currencyRegistry';
import { getCurrencyMeta } from '@/utils/numberFormat';

import {
    Combobox,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList,
} from '@/components/ui/combobox';

type CurrencyComboboxProps = {
    id?: string;
    value: string;
    onChange: (code: string) => void;
    isInvalid?: boolean;
};

/**
 * Searchable currency picker: matches code, name or symbol, with the popular
 * currencies pinned above the regional groups.
 */
const CurrencyCombobox = ({ id, value, onChange, isInvalid }: CurrencyComboboxProps) => {
    const selectedLabel = getCurrencyOptionLabel(value);

    return (
        <Combobox
            items={CURRENCY_OPTION_GROUPS}
            value={value}
            autoHighlight
            onValueChange={(next: string | null) => {
                if (next) onChange(next);
            }}
            itemToStringLabel={(code: string) => getCurrencyOptionLabel(code)}
            // Reopening shows the selected label in the input; treat that as no query.
            filter={(code: string, query: string) => query === selectedLabel || matchesCurrencyQuery(code, query)}
        >
            <ComboboxInput
                id={id}
                className="w-full"
                placeholder="Search by name, code or symbol"
                aria-invalid={isInvalid}
            />
            <ComboboxContent>
                <ComboboxEmpty>No currency found.</ComboboxEmpty>
                <ComboboxList>
                    {(group: CurrencyOptionGroup) => (
                        <ComboboxGroup key={group.value} items={group.items}>
                            <ComboboxLabel>{group.value}</ComboboxLabel>
                            <ComboboxCollection>
                                {(code: string) => {
                                    const currency = getCurrencyDefinition(code);
                                    const symbol = currency ? getCurrencyMeta(code, currency.defaultLocale).symbol : '';
                                    return (
                                        <ComboboxItem key={code} value={code}>
                                            <span className="flex-1 truncate">{currency?.label ?? code}</span>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {symbol && symbol !== code ? `${symbol} · ${code}` : code}
                                            </span>
                                        </ComboboxItem>
                                    );
                                }}
                            </ComboboxCollection>
                        </ComboboxGroup>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
};

export default CurrencyCombobox;
