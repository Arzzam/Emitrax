import { createContext, useContext } from 'react';

import type { NumberFormatMode } from '@/types/account.types';

export type NumberStyle = {
    locale: string;
    numberFormat: NumberFormatMode;
};

const NumberStyleContext = createContext<NumberStyle | null>(null);

/**
 * Overrides the number style `useCurrencyPreferences` reads from the store, for
 * one subtree. The public share page wraps itself in this so a viewer sees the
 * owner's style rather than their own (or the logged-out defaults).
 */
export function NumberStyleProvider({ value, children }: { value: NumberStyle; children: React.ReactNode }) {
    return <NumberStyleContext.Provider value={value}>{children}</NumberStyleContext.Provider>;
}

/** The overriding style, or null when the store's preferences apply. */
export const useNumberStyleOverride = (): NumberStyle | null => useContext(NumberStyleContext);
