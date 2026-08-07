import { useNavigate } from 'react-router';
import { Moon, Receipt, Sun } from 'lucide-react';

import { useCommandPalette } from '@/context/CommandPaletteProvider/commandPaletteProvider';
import { useTheme } from '@/context/ThemeProvider/themeProvider';
import { useEmis } from '@/hooks/useEmi';

import { appNavItems } from '@/components/sidebar/nav.config';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';

/**
 * Global jump-to search. Open state is shared via CommandPaletteProvider so
 * both the Cmd/Ctrl+K shortcut and the header's search button can trigger it.
 */
const CommandPalette = () => {
    const { open, setOpen } = useCommandPalette();
    const navigate = useNavigate();
    const { data: emis = [] } = useEmis();
    const { setTheme, theme } = useTheme();

    const run = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={setOpen}
            title="Command palette"
            description="Search for a page or an EMI"
        >
            <CommandInput placeholder="Jump to a page or an EMI..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Go to">
                    {appNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <CommandItem
                                key={item.id}
                                value={item.label}
                                onSelect={() => run(() => navigate(item.href))}
                            >
                                <Icon aria-hidden />
                                <span>{item.label}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>

                {emis.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="EMIs">
                            {emis.map((emi) => (
                                <CommandItem
                                    key={emi.id}
                                    value={`${emi.itemName} ${emi.id}`}
                                    onSelect={() => run(() => navigate(`/emi/${emi.id}`))}
                                >
                                    <Receipt aria-hidden />
                                    <span className="truncate">{emi.itemName}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                <CommandSeparator />
                <CommandGroup heading="Actions">
                    <CommandItem
                        value="Toggle theme dark light"
                        onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                    >
                        {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
                        <span>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</span>
                        <CommandShortcut>⌘K</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
};

export default CommandPalette;
