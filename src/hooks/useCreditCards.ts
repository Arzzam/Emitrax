import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { IRootState } from '@/store/types/store.types';
import {
    CreateCardInput,
    CreateIssuerInput,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    ICreditCardTrackerYear,
    SavePaymentEntryInput,
    UpdateCardInput,
    UpdateIssuerInput,
} from '@/types/creditCard.types';
import { CreditCardService } from '@/utils/CreditCardService';
import { errorToast, successToast } from '@/utils/toast.utils';

export const creditCardKeys = {
    all: ['creditCards'] as const,
    issuers: () => [...creditCardKeys.all, 'issuers'] as const,
    entries: (financialYear: string) => [...creditCardKeys.all, 'entries', financialYear] as const,
    year: (financialYear: string) => [...creditCardKeys.all, 'year', financialYear] as const,
    years: () => [...creditCardKeys.all, 'years'] as const,
};

const useUserId = (): string | undefined => useSelector((state: IRootState) => state.userModel).id;

// --- Queries ----------------------------------------------------------------

export const useCreditCardIssuers = (): UseQueryResult<ICreditCardIssuer[], Error> => {
    const userId = useUserId();

    return useQuery({
        queryKey: creditCardKeys.issuers(),
        queryFn: () => CreditCardService.getIssuersWithCards(),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreditCardEntries = (financialYear: string): UseQueryResult<ICreditCardPaymentEntry[], Error> => {
    const userId = useUserId();

    return useQuery({
        queryKey: creditCardKeys.entries(financialYear),
        queryFn: () => CreditCardService.getEntriesForFinancialYear(financialYear),
        enabled: !!userId && !!financialYear,
        staleTime: 1000 * 60 * 2,
    });
};

export const useCreditCardTrackerYear = (
    financialYear: string
): UseQueryResult<ICreditCardTrackerYear | null, Error> => {
    const userId = useUserId();

    return useQuery({
        queryKey: creditCardKeys.year(financialYear),
        queryFn: () => CreditCardService.getTrackerYear(financialYear),
        enabled: !!userId && !!financialYear,
        staleTime: 1000 * 60 * 2,
    });
};

export const useAvailableFinancialYears = (): UseQueryResult<string[], Error> => {
    const userId = useUserId();

    return useQuery({
        queryKey: creditCardKeys.years(),
        queryFn: () => CreditCardService.getFinancialYearsWithData(),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
    });
};

// --- Issuer mutations -------------------------------------------------------

export const useCreateIssuer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateIssuerInput) => CreditCardService.createIssuer(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.issuers() });
            successToast('Issuer added');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to add issuer'),
    });
};

export const useUpdateIssuer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateIssuerInput) => CreditCardService.updateIssuer(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.issuers() });
            successToast('Issuer updated');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to update issuer'),
    });
};

export const useDeleteIssuer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => CreditCardService.deleteIssuer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.all });
            successToast('Issuer deleted');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to delete issuer'),
    });
};

// --- Card mutations ---------------------------------------------------------

export const useCreateCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateCardInput) => CreditCardService.createCard(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.issuers() });
            successToast('Card added');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to add card'),
    });
};

export const useUpdateCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateCardInput) => CreditCardService.updateCard(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.issuers() });
            successToast('Card updated');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to update card'),
    });
};

export const useDeleteCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => CreditCardService.deleteCard(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: creditCardKeys.all });
            successToast('Card deleted');
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to delete card'),
    });
};

// --- Entry + notes mutations ------------------------------------------------

type SaveEntryContext = { previous: ICreditCardPaymentEntry[] | undefined };

/**
 * Saves a single grid cell.
 *
 * Deliberately breaks the house mutation pattern in two ways:
 * - it is optimistic, so tabbing through the grid never shows a stale cell;
 * - it fires NO success toast, because one toast per cell is unusable during
 *   bulk entry. The cell shows a transient inline tick instead.
 */
export const useSavePaymentEntry = (financialYear: string) => {
    const queryClient = useQueryClient();
    const entriesKey = creditCardKeys.entries(financialYear);
    const yearKey = creditCardKeys.year(financialYear);

    return useMutation<ICreditCardPaymentEntry | null, Error, SavePaymentEntryInput, SaveEntryContext>({
        mutationFn: (input: SavePaymentEntryInput) => CreditCardService.savePaymentEntry(input),
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: entriesKey });
            const previous = queryClient.getQueryData<ICreditCardPaymentEntry[]>(entriesKey);

            queryClient.setQueryData<ICreditCardPaymentEntry[]>(entriesKey, (current = []) => {
                const rest = current.filter(
                    (entry) => !(entry.cardId === input.cardId && entry.periodMonth === input.periodMonth)
                );
                const note = input.note?.trim() || null;

                if (input.amount === 0 && input.cashAmount === 0 && !note) {
                    return rest;
                }

                const existing = current.find(
                    (entry) => entry.cardId === input.cardId && entry.periodMonth === input.periodMonth
                );
                const now = new Date().toISOString();

                return [
                    ...rest,
                    {
                        id: existing?.id ?? `optimistic-${input.cardId}-${input.periodMonth}`,
                        userId: existing?.userId ?? '',
                        cardId: input.cardId,
                        periodMonth: input.periodMonth,
                        amount: input.amount,
                        cashAmount: input.cashAmount,
                        note,
                        createdAt: existing?.createdAt ?? now,
                        updatedAt: now,
                    },
                ];
            });

            return { previous };
        },
        onError: (error, _input, context) => {
            if (context?.previous) {
                queryClient.setQueryData(entriesKey, context.previous);
            }
            errorToast(error.message || 'Failed to save payment');
        },
        onSuccess: async () => {
            // The first entry in a year materialises its tracker-year row, so
            // notes and threshold overrides have somewhere to live. Fires at
            // most once per year per session - the cached null is what gates it.
            if (queryClient.getQueryData<ICreditCardTrackerYear | null>(yearKey) === null) {
                try {
                    const year = await CreditCardService.ensureTrackerYear(financialYear);
                    queryClient.setQueryData(yearKey, year);
                } catch {
                    // Non-fatal: the entry is saved, and thresholds fall back to
                    // the statutory defaults until the row is created.
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: entriesKey });
            // A first entry in a previously empty year makes that year selectable.
            queryClient.invalidateQueries({ queryKey: creditCardKeys.years() });
        },
    });
};

export const useUpdateTrackerYearNotes = (financialYear: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (notes: string) => CreditCardService.updateTrackerYearNotes(financialYear, notes),
        onSuccess: (data) => {
            queryClient.setQueryData(creditCardKeys.year(financialYear), data);
            queryClient.invalidateQueries({ queryKey: creditCardKeys.years() });
        },
        onError: (error: Error) => errorToast(error.message || 'Failed to save notes'),
    });
};
