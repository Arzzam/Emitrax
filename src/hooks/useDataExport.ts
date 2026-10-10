import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAccountDetails } from '@/hooks/useAccount';
import type { ILoanScenario } from '@/types/scenario.types';
import { CreditCardService } from '@/utils/CreditCardService';
import { EmiService } from '@/utils/EMIService';
import { exportDataToJson } from '@/utils/export/json/jsonExport';
import { ScenarioService } from '@/utils/ScenarioService';
import { errorToast, successToast } from '@/utils/toast.utils';

const EMIS_STALE_TIME = 1000 * 60 * 5;

/** Matches the key in useEmis, so an export reuses the dashboard's cached list. */
const EMIS_QUERY_KEY = ['emis'] as const;

const groupScenariosByEmiId = (scenarios: ILoanScenario[]): Record<string, ILoanScenario[]> =>
    scenarios.reduce<Record<string, ILoanScenario[]>>((acc, scenario) => {
        if (!acc[scenario.emiId]) {
            acc[scenario.emiId] = [];
        }
        acc[scenario.emiId].push(scenario);
        return acc;
    }, {});

/**
 * Whole-account JSON export.
 *
 * The reads are imperative rather than a set of `useQuery` calls on purpose:
 * scenarios, credit card issuers, payments and bills would otherwise be fetched
 * every time the account page is opened, when almost nobody opens it to export.
 */
export function useDataExport() {
    const [isExporting, setIsExporting] = useState(false);
    const queryClient = useQueryClient();
    const { data: account } = useAccountDetails();

    const exportAll = useCallback(async () => {
        if (!account) {
            errorToast('Your account is still loading. Try again in a moment.');
            return;
        }

        setIsExporting(true);
        try {
            const [emis, scenarios, issuers, payments, bills, trackerYears] = await Promise.all([
                queryClient.fetchQuery({
                    queryKey: EMIS_QUERY_KEY,
                    queryFn: () => EmiService.getEmis(),
                    staleTime: EMIS_STALE_TIME,
                }),
                ScenarioService.getAllScenarios(),
                CreditCardService.getIssuersWithCards(),
                CreditCardService.getAllPaymentEntries(),
                CreditCardService.getAllBillEntries(),
                CreditCardService.getAllTrackerYears(),
            ]);

            exportDataToJson({
                scope: 'all',
                account,
                emis,
                scenariosByEmiId: groupScenariosByEmiId(scenarios),
                creditCards: { issuers, payments, bills, trackerYears },
            });
            successToast('Data exported successfully.');
        } catch (error) {
            console.error(error);
            errorToast('Failed to export your data. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [account, queryClient]);

    return { exportAll, isExporting };
}
