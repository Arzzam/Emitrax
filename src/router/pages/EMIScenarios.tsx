import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { addMonths, startOfDay } from 'date-fns';
import { LineChart } from 'lucide-react';

import { usePageTitle } from '@/context/PageTitleProvider/pageTitleProvider';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { useEmis } from '@/hooks/useEmi';
import {
    useCreateLoanScenario,
    useDeleteLoanScenario,
    useLoanScenarios,
    useUpdateLoanScenario,
} from '@/hooks/useLoanScenarios';
import { IEmi } from '@/types/emi.types';
import { ForeclosureScenarioResult, ILoanScenario } from '@/types/scenario.types';
import { calculateForeclosureScenario } from '@/utils/scenarioCalculation';
import {
    breakdownFromResult,
    breakdownFromScenario,
    comparisonPropsFromResult,
    comparisonPropsFromSaved,
} from '@/utils/scenarioView.mappers';
import { errorToast } from '@/utils/toast.utils';
import { ForeclosureScenarioFormValues } from '@/validations/scenario.forms';

import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import MainContainer from '@/components/common/Container';
import LoadingDetails from '@/components/common/LoadingDetails';
import NotFound from '@/components/common/NotFound';
import ComparisonSummary from '@/components/emi/scenario/ComparisonSummary';
import PayoffBreakdown from '@/components/emi/scenario/PayoffBreakdown';
import SavedScenariosList from '@/components/emi/scenario/SavedScenariosList';
import ScenarioInputForm from '@/components/emi/scenario/ScenarioInputForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMIScenarios = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const { data, isFetching } = useEmis();
    const currentData = useMemo(() => data?.find((emi: IEmi) => emi.id === id) || null, [data, id]);
    const [notFound, setNotFound] = useState(false);

    usePageTitle(currentData?.itemName ? `Scenarios · ${currentData.itemName}` : 'Foreclosure Scenarios');
    const [preview, setPreview] = useState<ForeclosureScenarioResult | null>(null);
    const [selectedSaved, setSelectedSaved] = useState<ILoanScenario | null>(null);
    const [editingScenario, setEditingScenario] = useState<ILoanScenario | null>(null);
    const [calcError, setCalcError] = useState<string | null>(null);

    const { data: scenarios = [], isLoading: scenariosLoading, isError: scenariosError } = useLoanScenarios(id);
    const { mutate: createScenario, isPending: isCreating } = useCreateLoanScenario(id || '');
    const { mutate: updateScenario, isPending: isUpdating } = useUpdateLoanScenario(id || '');
    const { mutate: deleteScenario, isPending: isDeleting } = useDeleteLoanScenario(id || '');

    const canWrite = !!currentData && (currentData.isOwner || currentData.permission === 'write');
    const isSaving = isCreating || isUpdating;

    useEffect(() => {
        if (!isFetching && data && !currentData) {
            setNotFound(true);
            const redirectTimer = setTimeout(() => {
                navigate('/');
            }, 3000);

            return () => clearTimeout(redirectTimer);
        }
    }, [isFetching, data, currentData, navigate]);

    const dateBounds = useMemo(() => {
        if (!currentData) {
            const today = startOfDay(new Date());
            return { minDate: today, maxDate: today };
        }

        const minDate = startOfDay(new Date(currentData.billDate));
        const endDate = startOfDay(new Date(currentData.endDate));
        const maxDate = addMonths(endDate, 1);
        return { minDate, maxDate };
    }, [currentData]);

    const runCalculation = useCallback(
        (values: ForeclosureScenarioFormValues): ForeclosureScenarioResult | null => {
            if (!currentData) return null;

            try {
                const result = calculateForeclosureScenario(currentData, {
                    simulationDate: values.simulationDate,
                    foreclosureChargeRate: values.foreclosureChargeRate,
                    foreclosureChargeAmount: values.foreclosureChargeAmount,
                    foreclosureChargeGstRate: values.foreclosureChargeGstRate,
                    includeNextInstallmentInterest: values.includeNextInstallmentInterest,
                    name: values.name,
                    notes: values.notes,
                });
                setCalcError(null);
                return result;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unable to calculate this scenario. Please check inputs.';
                setCalcError(message);
                errorToast(message);
                return null;
            }
        },
        [currentData]
    );

    const handlePreview = useCallback(
        (values: ForeclosureScenarioFormValues) => {
            const result = runCalculation(values);
            if (!result) return;
            setPreview(result);
            setSelectedSaved(null);
        },
        [runCalculation]
    );

    const handleSave = useCallback(
        (values: ForeclosureScenarioFormValues) => {
            if (!canWrite || !id) {
                errorToast('You do not have permission to save scenarios for this loan.');
                return;
            }

            const result = runCalculation(values);
            if (!result) return;

            setPreview(result);
            setSelectedSaved(null);

            if (editingScenario) {
                updateScenario(
                    {
                        scenarioId: editingScenario.id,
                        name: values.name,
                        notes: values.notes,
                        result,
                    },
                    {
                        onSuccess: (updated) => {
                            setEditingScenario(null);
                            setSelectedSaved(updated);
                            setPreview(null);
                        },
                    }
                );
                return;
            }

            createScenario({
                name: values.name,
                notes: values.notes,
                result,
            });
        },
        [canWrite, createScenario, editingScenario, id, runCalculation, updateScenario]
    );

    const handleSelectSaved = useCallback((scenario: ILoanScenario) => {
        setSelectedSaved(scenario);
        setPreview(null);
        setCalcError(null);
    }, []);

    const handleEditSaved = useCallback((scenario: ILoanScenario) => {
        setEditingScenario(scenario);
        setSelectedSaved(scenario);
        setPreview(null);
        setCalcError(null);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingScenario(null);
    }, []);

    const handleDelete = useCallback(
        (scenarioId: string) => {
            deleteScenario(scenarioId, {
                onSuccess: () => {
                    if (editingScenario?.id === scenarioId) {
                        setEditingScenario(null);
                    }
                    if (selectedSaved?.id === scenarioId) {
                        setSelectedSaved(null);
                    }
                },
            });
        },
        [deleteScenario, editingScenario?.id, selectedSaved?.id]
    );

    if (isFetching) {
        return (
            <LoadingDetails
                title="Foreclosure Scenarios"
                description="Loading foreclosure tools..."
                description2="Please wait while we fetch your loan details."
            />
        );
    }

    if (notFound || !currentData || !id) {
        return (
            <NotFound
                title="EMI Not Found"
                description="We couldn't find the EMI you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    const activeBreakdown = selectedSaved
        ? breakdownFromScenario(selectedSaved)
        : preview
          ? breakdownFromResult(preview)
          : null;
    const activePayoff = selectedSaved?.totalPayoff ?? preview?.totalPayoff ?? null;
    const comparisonProps = selectedSaved
        ? comparisonPropsFromSaved(selectedSaved)
        : preview
          ? comparisonPropsFromResult(preview)
          : null;

    // While editing, prefer live preview over stale saved snapshot once calculated.
    const displayBreakdown = preview ? breakdownFromResult(preview) : activeBreakdown;
    const displayPayoff = preview ? preview.totalPayoff : activePayoff;
    const displayComparison = preview ? comparisonPropsFromResult(preview) : comparisonProps;

    return (
        <>
            <BreadcrumbContainer
                className="py-4 px-8"
                items={[
                    { label: 'Dashboard', link: '/' },
                    { label: `EMI Details (${currentData.itemName})`, link: `/emi/${id}` },
                    { label: 'Foreclosure Scenarios' },
                ]}
            />
            <MainContainer className="space-y-6 pb-10">
                <div className="flex items-start gap-3 px-2">
                    <div className="mt-0.5 rounded-md border bg-muted/40 p-2">
                        <LineChart className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Foreclose vs continue</h3>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Estimate what you would pay to close this loan on a chosen date, including charges, and
                            compare it with continuing your current EMI schedule.
                        </p>
                    </div>
                </div>

                {scenariosError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Saved scenarios could not be loaded. You can still calculate a preview. If this continues,
                            confirm the loan scenarios migration has been applied.
                        </AlertDescription>
                    </Alert>
                )}

                {calcError && (
                    <Alert variant="destructive">
                        <AlertDescription>{calcError}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {editingScenario ? 'Edit scenario' : 'Scenario inputs'}
                                </CardTitle>
                                <CardDescription>
                                    Enter foreclosure date and lender charge assumptions. Processing fees already paid
                                    are treated as sunk cost in both paths.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScenarioInputForm
                                    key={editingScenario?.id ?? 'new-scenario'}
                                    defaultName={`Foreclose ${currentData.itemName}`}
                                    minDate={dateBounds.minDate}
                                    maxDate={dateBounds.maxDate}
                                    canSave={canWrite}
                                    isSaving={isSaving}
                                    editingScenario={editingScenario}
                                    onPreview={handlePreview}
                                    onSave={handleSave}
                                    onCancelEdit={handleCancelEdit}
                                />
                                {!canWrite && (
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        You have view-only access. You can calculate previews, but only owners or
                                        write-shared users can save or edit scenarios.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <SavedScenariosList
                            scenarios={scenarios}
                            isLoading={scenariosLoading}
                            canEdit={canWrite}
                            isDeleting={isDeleting}
                            selectedId={selectedSaved?.id}
                            editingId={editingScenario?.id}
                            formatCurrencyAmount={formatCurrencyAmount}
                            onSelect={handleSelectSaved}
                            onEdit={handleEditSaved}
                            onDelete={handleDelete}
                        />
                    </div>

                    <div className="space-y-6">
                        {displayBreakdown && displayPayoff != null && displayComparison ? (
                            <>
                                <PayoffBreakdown
                                    breakdown={displayBreakdown}
                                    totalPayoff={displayPayoff}
                                    formatCurrencyAmount={formatCurrencyAmount}
                                />
                                <ComparisonSummary formatCurrencyAmount={formatCurrencyAmount} {...displayComparison} />
                            </>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Results</CardTitle>
                                    <CardDescription>
                                        Calculate a preview to see payoff breakdown and savings versus continuing EMIs.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        No active scenario yet. Set a foreclosure date and click Calculate preview.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </MainContainer>
        </>
    );
};

export default EMIScenarios;
