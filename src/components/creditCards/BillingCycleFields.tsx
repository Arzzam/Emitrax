import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BillingCycleValues {
    statementDay: string;
    dueDay: string;
    creditLimit: string;
}

export interface BillingCycleErrors {
    statementDay?: string;
    dueDay?: string;
    creditLimit?: string;
}

export const EMPTY_BILLING_CYCLE: BillingCycleValues = { statementDay: '', dueDay: '', creditLimit: '' };

const parseDay = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : NaN;
};

const parseLimit = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : NaN;
};

/**
 * Validates the three optional cycle fields. Returns the parsed values when
 * every one is valid, mirroring the DB CHECK constraints on `cc_cards`.
 */
export function validateBillingCycle(
    values: BillingCycleValues
):
    | { ok: true; parsed: { statementDay: number | null; dueDay: number | null; creditLimit: number | null } }
    | { ok: false; errors: BillingCycleErrors } {
    const statementDay = parseDay(values.statementDay);
    const dueDay = parseDay(values.dueDay);
    const creditLimit = parseLimit(values.creditLimit);
    const errors: BillingCycleErrors = {};

    if (Number.isNaN(statementDay)) {
        errors.statementDay = 'Enter a day between 1 and 31.';
    }
    if (Number.isNaN(dueDay)) {
        errors.dueDay = 'Enter a day between 1 and 31.';
    }
    if (Number.isNaN(creditLimit)) {
        errors.creditLimit = 'Enter an amount greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
    }

    return { ok: true, parsed: { statementDay, dueDay, creditLimit } };
}

/**
 * The optional billing-cycle block, shared by the add-card sheet and the
 * edit affordance in the card manager.
 *
 * These are defaults that pre-fill a bill row's dates. They are never
 * authoritative over a row's own dates, because banks change cycle dates
 * mid-year and a historical statement keeps the dates that were in force.
 */
const BillingCycleFields = ({
    idPrefix,
    values,
    errors,
    onChange,
    showCreditLimit = true,
}: {
    idPrefix: string;
    values: BillingCycleValues;
    errors: BillingCycleErrors;
    onChange: (next: BillingCycleValues) => void;
    /**
     * Only the add-card flow may set a limit here, and only as the OPENING one.
     * Afterwards a limit is a dated timeline rather than a field - editing it
     * inline would restate every past month's utilisation - so the edit
     * affordance hides it and sends the user to the limit history instead.
     */
    showCreditLimit?: boolean;
}) => {
    const set = (key: keyof BillingCycleValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...values, [key]: event.target.value });

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`${idPrefix}-statement-day`}>Statement day</Label>
                    <Input
                        id={`${idPrefix}-statement-day`}
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="15"
                        className="tabular-nums"
                        value={values.statementDay}
                        onChange={set('statementDay')}
                    />
                    {errors.statementDay && <p className="text-xs text-destructive">{errors.statementDay}</p>}
                </div>

                <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`${idPrefix}-due-day`}>Due day</Label>
                    <Input
                        id={`${idPrefix}-due-day`}
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="5"
                        className="tabular-nums"
                        value={values.dueDay}
                        onChange={set('dueDay')}
                    />
                    {errors.dueDay && <p className="text-xs text-destructive">{errors.dueDay}</p>}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                A statement generated on the 15th, due on the 5th, is filed under its own month and paid the next.
            </p>

            {showCreditLimit && (
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-credit-limit`}>Opening credit limit</Label>
                    <Input
                        id={`${idPrefix}-credit-limit`}
                        inputMode="decimal"
                        placeholder="Optional"
                        className="tabular-nums"
                        value={values.creditLimit}
                        onChange={set('creditLimit')}
                    />
                    {errors.creditLimit && <p className="text-xs text-destructive">{errors.creditLimit}</p>}
                    <p className="text-xs text-muted-foreground">
                        Later increases are recorded with the date they took effect, so earlier months keep the limit
                        that was actually in force.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BillingCycleFields;
