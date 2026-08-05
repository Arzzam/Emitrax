import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type CommandPaletteState = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteState | null>(null);

/** Owns the ⌘K palette's open state, so both the global shortcut and the header's search button can drive it. */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const value = useMemo<CommandPaletteState>(() => ({ open, setOpen }), [open]);

    return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteState {
    const context = useContext(CommandPaletteContext);

    if (!context) {
        throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
    }

    return context;
}
