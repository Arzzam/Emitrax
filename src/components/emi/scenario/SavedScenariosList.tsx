import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';

import { ILoanScenario } from '@/types/scenario.types';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SavedScenariosListProps {
    scenarios: ILoanScenario[];
    isLoading: boolean;
    canEdit: boolean;
    isDeleting: boolean;
    selectedId?: string;
    editingId?: string;
    formatCurrencyAmount: (amount: number) => string;
    onSelect: (scenario: ILoanScenario) => void;
    onEdit: (scenario: ILoanScenario) => void;
    onDelete: (scenarioId: string) => void;
}

const SavedScenariosList = ({
    scenarios,
    isLoading,
    canEdit,
    isDeleting,
    selectedId,
    editingId,
    formatCurrencyAmount,
    onSelect,
    onEdit,
    onDelete,
}: SavedScenariosListProps) => {
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Saved scenarios</CardTitle>
                    <CardDescription>Review, edit, or remove foreclosure quotes for this loan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isLoading && (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    )}

                    {!isLoading && scenarios.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No saved scenarios yet. Calculate a preview and save it for later comparison.
                        </p>
                    )}

                    {!isLoading &&
                        scenarios.map((scenario) => {
                            const isSelected = selectedId === scenario.id;
                            const isEditing = editingId === scenario.id;
                            return (
                                <div
                                    key={scenario.id}
                                    className={`rounded-lg border p-3 transition-colors ${
                                        isEditing
                                            ? 'border-primary/50 bg-muted/50'
                                            : isSelected
                                              ? 'border-primary/40 bg-muted/40'
                                              : 'hover:bg-muted/20'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            type="button"
                                            className="min-w-0 flex-1 text-left"
                                            onClick={() => onSelect(scenario)}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-medium">{scenario.name}</p>
                                                <Badge variant="outline">{scenario.confidence}</Badge>
                                                {isEditing && <Badge variant="secondary">Editing</Badge>}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Foreclose on {format(new Date(scenario.simulationDate), 'PPP')} · Saved{' '}
                                                {format(new Date(scenario.createdAt), 'PP')}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                <span>
                                                    Payoff{' '}
                                                    <span className="font-medium tabular-nums">
                                                        {formatCurrencyAmount(scenario.totalPayoff)}
                                                    </span>
                                                </span>
                                                <span>
                                                    {scenario.netSavings < -0.005
                                                        ? 'Loss '
                                                        : scenario.netSavings > 0.005
                                                          ? 'Savings '
                                                          : 'Difference '}
                                                    <span
                                                        className={`font-medium tabular-nums ${
                                                            scenario.netSavings < -0.005
                                                                ? 'text-amber-700 dark:text-amber-400'
                                                                : scenario.netSavings > 0.005
                                                                  ? 'text-emerald-700 dark:text-emerald-400'
                                                                  : ''
                                                        }`}
                                                    >
                                                        {formatCurrencyAmount(Math.abs(scenario.netSavings))}
                                                    </span>
                                                </span>
                                            </div>
                                        </button>
                                        {canEdit && (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground"
                                                    onClick={() => onEdit(scenario)}
                                                    aria-label={`Edit scenario ${scenario.name}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-destructive"
                                                    onClick={() => setPendingDeleteId(scenario.id)}
                                                    aria-label={`Delete scenario ${scenario.name}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </CardContent>
            </Card>

            <ConfirmationModal
                open={!!pendingDeleteId}
                setOpen={(open) => {
                    if (!open) setPendingDeleteId(null);
                }}
                title="Delete scenario?"
                description="This removes the saved foreclosure quote permanently. You can always create a new one."
                confirmText="Delete"
                cancelText="Keep"
                isLoading={isDeleting}
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={(setOpen) => {
                    if (pendingDeleteId) {
                        onDelete(pendingDeleteId);
                    }
                    setPendingDeleteId(null);
                    setOpen(false);
                }}
            />
        </>
    );
};

export default SavedScenariosList;
