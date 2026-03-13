import { useEffect } from 'react';

import { useRematchDispatch } from '@/store/store';
import { IDispatch } from '@/store/types/store.types';

import { useAccountDetails } from './useAccount';
import { useUser } from './useUser';

/**
 * Hydrates Redux currency preferences from account when user is authenticated,
 * and resets them on logout. Mount once inside StoreProvider + QueryClientProvider.
 */
export function useCurrencyPreferencesBootstrap() {
    const { data: userData } = useUser();
    const hasUser = !!userData?.user;
    const { data: account } = useAccountDetails({ enabled: hasUser });
    const { setPreferences, resetPreferences } = useRematchDispatch((d: IDispatch) => d.currencyPreferencesModel);

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
    }, [hasUser, locale, currency, numberFormat, setPreferences, resetPreferences]);
}
