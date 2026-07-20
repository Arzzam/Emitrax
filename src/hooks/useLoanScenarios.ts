import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { CreateLoanScenarioInput, ILoanScenario, UpdateLoanScenarioInput } from '@/types/scenario.types';
import { ScenarioService } from '@/utils/ScenarioService';
import { errorToast, successToast } from '@/utils/toast.utils';

export const loanScenarioKeys = {
    all: ['loanScenarios'] as const,
    byEmi: (emiId: string) => [...loanScenarioKeys.all, emiId] as const,
};

export const useLoanScenarios = (emiId: string | undefined): UseQueryResult<ILoanScenario[], Error> => {
    return useQuery({
        queryKey: loanScenarioKeys.byEmi(emiId || ''),
        enabled: !!emiId,
        queryFn: () => ScenarioService.getScenariosByEmiId(emiId!),
        staleTime: 1000 * 60 * 2,
    });
};

export const useCreateLoanScenario = (emiId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: Omit<CreateLoanScenarioInput, 'emiId'>) =>
            ScenarioService.createScenario({ ...input, emiId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: loanScenarioKeys.byEmi(emiId) });
            successToast('Scenario saved successfully');
        },
        onError: (error: Error) => {
            errorToast(error.message || 'Unable to save scenario. Please try again.');
        },
    });
};

export const useUpdateLoanScenario = (emiId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateLoanScenarioInput) => ScenarioService.updateScenario(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: loanScenarioKeys.byEmi(emiId) });
            successToast('Scenario updated successfully');
        },
        onError: (error: Error) => {
            errorToast(error.message || 'Unable to update scenario. Please try again.');
        },
    });
};

export const useDeleteLoanScenario = (emiId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (scenarioId: string) => ScenarioService.deleteScenario(scenarioId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: loanScenarioKeys.byEmi(emiId) });
            successToast('Scenario deleted');
        },
        onError: (error: Error) => {
            errorToast(error.message || 'Unable to delete scenario. Please try again.');
        },
    });
};
