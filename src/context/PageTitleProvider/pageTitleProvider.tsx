import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type PageTitleState = {
    title: string | undefined;
    setTitle: (title: string | undefined) => void;
};

const PageTitleContext = createContext<PageTitleState | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitleState] = useState<string | undefined>(undefined);

    const setTitle = useCallback((next: string | undefined) => setTitleState(next), []);

    const value = useMemo<PageTitleState>(() => ({ title, setTitle }), [title, setTitle]);

    return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

function usePageTitleContext(): PageTitleState {
    const context = useContext(PageTitleContext);

    if (!context) {
        throw new Error('usePageTitle must be used within a PageTitleProvider');
    }

    return context;
}

/** Reads the current page-supplied title override. Consumed by the app header. */
export const usePageTitleValue = (): string | undefined => usePageTitleContext().title;

/**
 * Sets the app header title for as long as the calling component is mounted.
 * Use on routes whose title cannot be derived from the nav config, such as
 * /emi/:id where the title is the EMI's name.
 */
export const usePageTitle = (title?: string): void => {
    const { setTitle } = usePageTitleContext();

    useEffect(() => {
        setTitle(title);
        return () => setTitle(undefined);
    }, [title, setTitle]);
};
