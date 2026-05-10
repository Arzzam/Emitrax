import { Trash2 } from 'lucide-react';

import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { EditableSplit } from '@/hooks/useSplitEmi';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SplitEmiEditRowProps = {
    split: EditableSplit;
    index: number;
    isRegistered: boolean;
    onUpdateSplit: (index: number, field: 'name' | 'email' | 'percentage', value: string | number) => void;
    onRemoveSplitRow: (index: number) => void;
    getSplitAmount: (percentage: number) => number;
};

const SplitEmiEditRow = ({
    split,
    index,
    isRegistered,
    onUpdateSplit,
    onRemoveSplitRow,
    getSplitAmount,
}: SplitEmiEditRowProps) => {
    const { formatCurrencyAmount } = useCurrencyPreferences();

    return (
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Name</p>
                <Input
                    placeholder="Name"
                    value={split.name}
                    onChange={(e) => onUpdateSplit(index, 'name', e.target.value)}
                />
                <div className="mt-2 min-h-5 text-xs text-muted-foreground">
                    {split.userId ? 'Synced from app user' : 'Required'}
                </div>
            </div>

            <div className="md:col-span-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Email</p>
                <Input
                    type="email"
                    placeholder="Email"
                    value={split.email}
                    onChange={(e) => onUpdateSplit(index, 'email', e.target.value)}
                />
                <div className="mt-2 min-h-5">
                    {split.email ? (
                        <Badge variant={isRegistered ? 'default' : 'outline'} className="text-xs">
                            {isRegistered ? 'App User' : 'External'}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">Optional (name can be used instead)</span>
                    )}
                </div>
            </div>

            <div className="md:col-span-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Percentage</p>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        placeholder="Percentage"
                        value={split.percentage || ''}
                        onChange={(e) => onUpdateSplit(index, 'percentage', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="mt-2 min-h-5 text-xs text-muted-foreground">
                    {split.percentage > 0
                        ? `${formatCurrencyAmount(getSplitAmount(split.percentage))}/month`
                        : 'Enter a value > 0'}
                </div>
            </div>

            <div className="flex items-end justify-end md:col-span-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveSplitRow(index)}
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default SplitEmiEditRow;
