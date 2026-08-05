import { listSelectableFinancialYears } from '@/utils/financialYear';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FinancialYearSelector = ({
    value,
    onChange,
    yearsWithData = [],
}: {
    value: string;
    onChange: (financialYear: string) => void;
    yearsWithData?: string[];
}) => {
    const options = listSelectableFinancialYears({ pastYears: 5, include: [...yearsWithData, value] });

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[200px]" aria-label="Financial year">
                <SelectValue placeholder="Select financial year" />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default FinancialYearSelector;
