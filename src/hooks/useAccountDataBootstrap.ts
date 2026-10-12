import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useRematchDispatch } from '@/store/store';
import { IDispatch, IRootState } from '@/store/types/store.types';
import { AccountService } from '@/utils/AccountService';
import { detectDefaultPreferences } from '@/utils/currencyRegistry';

import { useAccountDetails, useInitializeRegionalPreferences } from './useAccount';
import { useUser } from './useUser';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Hydrates Redux account data from account when user is authenticated,
 * and persists them to the backend when they change (debounced).
 * Mount once inside StoreProvider + QueryClientProvider (e.g. Layout).
 */
export function useAccountDataBootstrap() {
    const { data: userData } = useUser();
    const hasUser = !!userData?.user;
    const { data: account } = useAccountDetails({ enabled: hasUser });
    const advancedFilterState = useSelector((state: IRootState) => state.advancedFilterModel);
    const { setPreferences, resetPreferences } = useRematchDispatch((d: IDispatch) => d.currencyPreferencesModel);
    const { hydrateFilterConfig } = useRematchDispatch((d: IDispatch) => d.advancedFilterModel);
    const { mutate: initializeRegionalPreferences } = useInitializeRegionalPreferences();
    const hasRequestedInitializationRef = useRef(false);

    const locale = account?.preferences?.locale;
    const currency = account?.preferences?.currency;
    const numberFormat = account?.preferences?.numberFormat;

    useEffect(() => {
        if (!hasUser) {
            resetPreferences();
            return;
        }
        if (locale != null && currency != null && numberFormat != null) {
            setPreferences({ locale, currency, numberFormat });
        }
        const filterConfig = account?.preferences?.filterConfig ?? null;
        if (filterConfig) {
            hydrateFilterConfig(filterConfig);
        }
    }, [hasUser, locale, currency, numberFormat, setPreferences, resetPreferences]);

    // First run: no preferences row yet, so detect regional defaults from the
    // browser and save them once. Attempted at most once per mount; on failure
    // the in-memory defaults (INR / en-IN) stay and the next load retries.
    const hasSavedPreferences = account?.hasSavedPreferences;
    useEffect(() => {
        if (!hasUser || hasSavedPreferences !== false || hasRequestedInitializationRef.current) return;
        hasRequestedInitializationRef.current = true;
        initializeRegionalPreferences(
            detectDefaultPreferences({
                languages: navigator.languages?.length ? navigator.languages : [navigator.language],
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
        );
    }, [hasUser, hasSavedPreferences, initializeRegionalPreferences]);

    // Persist filter state to backend when it changes (debounced)
    useEffect(() => {
        if (!hasUser) return;
        const timer = setTimeout(() => {
            AccountService.saveFilterConfig(advancedFilterState).catch(() => {
                // Ignore save errors (e.g. network); store and persist plugin keep state
            });
        }, SAVE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [hasUser, advancedFilterState]);
}
