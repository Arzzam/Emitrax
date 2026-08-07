import { useSelector } from 'react-redux';
import { QueryClient, useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { IRootState } from '@/store/types/store.types';
import {
    CreateCardInput,
    CreateIssuerInput,
    ICreditCardBillEntry,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    ICreditCardTrackerYear,
    SaveBillEntryInput,
    SavePaymentEntryInput,
    UpdateCardInput,
    UpdateIssuerInput,
} from '@/types/creditCard.types';
import { isEmptyBillEntry } from '@/utils/creditCardBills.calc';
import { CreditCardService } from '@/utils/CreditCardService';
import { isEmptyPaymentEntry } from '@/utils/creditCardTracker.calc';
import { errorToast, successToast } from '@/utils/toast.utils';

export const creditCardKeys = {
    all: ['creditCards'] as const,
    issuers: () => [...creditCardKeys.all, 'issuers'] as const,
    entries: (financialYear: string) => [...creditCardKeys.all, 'entries', financialYear] as const,
    year: (financialYear: string) => [...creditCardKeys.all, 'year', financialYear] as const,
    bills: (financialYear: string) => [...creditCardKeys.all, 'bills', financialYear] as const,
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
 * Materialises the tracker-year row on the first entry of a year, so notes and
 * threshold overrides have somewhere to live. Fires at most once per year per
 * session - the cached null is what gates it. Non-fatal on failure: the entry
 * is saved either way and thresholds fall back to the statutory defaults.
 */
const ensureYearRowOnce = async (queryClient: QueryClient, financialYear: string) => {
    const yearKey = creditCardKeys.year(financialYear);
    if (queryClient.getQueryData<ICreditCardTrackerYear | null>(yearKey) !== null) {
        return;
    }

    try {
        queryClient.setQueryData(yearKey, await CreditCardService.ensureTrackerYear(financialYear));
    } catch {
        // Intentionally swallowed - see the doc comment.
    }
};

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

                if (isEmptyPaymentEntry({ ...input, note })) {
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
            await ensureYearRowOnce(queryClient, financialYear);
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

// --- Bill entries -----------------------------------------------------------

export const useCreditCardBillEntries = (financialYear: string): UseQueryResult<ICreditCardBillEntry[], Error> => {
    const userId = useUserId();

    return useQuery({
        queryKey: creditCardKeys.bills(financialYear),
        queryFn: () => CreditCardService.getBillEntriesForFinancialYear(financialYear),
        enabled: !!userId && !!financialYear,
        staleTime: 1000 * 60 * 2,
    });
};

type SaveBillContext = { previous: ICreditCardBillEntry[] | undefined };

/**
 * Saves a single bill cell, reusing the payment recipe: optimistic so tabbing
 * the grid never shows a stale cell, and deliberately silent on success because
 * one toast per cell is unusable during bulk entry.
 */
export const useSaveBillEntry = (financialYear: string) => {
    const queryClient = useQueryClient();
    const billsKey = creditCardKeys.bills(financialYear);

    return useMutation<ICreditCardBillEntry | null, Error, SaveBillEntryInput, SaveBillContext>({
        mutationFn: (input: SaveBillEntryInput) => CreditCardService.saveBillEntry(input),
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: billsKey });
            const previous = queryClient.getQueryData<ICreditCardBillEntry[]>(billsKey);

            queryClient.setQueryData<ICreditCardBillEntry[]>(billsKey, (current = []) => {
                const matches = (entry: ICreditCardBillEntry) =>
                    entry.cardId === input.cardId && entry.statementMonth === input.statementMonth;
                const rest = current.filter((entry) => !matches(entry));
                const note = input.note?.trim() || null;

                // Same predicate the service uses, so the two cannot drift.
                if (isEmptyBillEntry({ ...input, note })) {
                    return rest;
                }

                const existing = current.find(matches);
                const now = new Date().toISOString();
                const isIssued = input.status === 'issued';

                return [
                    ...rest,
                    {
                        id: existing?.id ?? `optimistic-${input.cardId}-${input.statementMonth}`,
                        userId: existing?.userId ?? '',
                        cardId: input.cardId,
                        statementMonth: input.statementMonth,
                        status: input.status,
                        totalDue: isIssued ? (input.totalDue ?? 0) : null,
                        minimumDue: isIssued ? (input.minimumDue ?? null) : null,
                        statementDate: input.statementDate ?? null,
                        dueDate: input.dueDate ?? null,
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
                queryClient.setQueryData(billsKey, context.previous);
            }
            errorToast(error.message || 'Failed to save bill');
        },
        onSuccess: async () => {
            await ensureYearRowOnce(queryClient, financialYear);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: billsKey });
            // A first bill in a previously empty year makes that year selectable.
            queryClient.invalidateQueries({ queryKey: creditCardKeys.years() });
        },
    });
};
