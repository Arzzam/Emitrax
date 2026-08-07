import { useLocation } from 'react-router';
import { Search } from 'lucide-react';

import { useCommandPalette } from '@/context/CommandPaletteProvider/commandPaletteProvider';
import { usePageTitleValue } from '@/context/PageTitleProvider/pageTitleProvider';

import { getActiveNavItem } from '@/components/sidebar/nav.config';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { ModeToggle } from '../components/common/ModeToggle';

const isAppleUserAgent = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * The single app-wide header. Identity and sign-out live in the sidebar
 * footer now, so this only carries navigation chrome, search and theme.
 *
 * Title resolution order: page-supplied override -> nav config label -> app name.
 */
const AppHeader = () => {
    const { pathname } = useLocation();
    const pageTitle = usePageTitleValue();
    const title = pageTitle ?? getActiveNavItem(pathname)?.label ?? 'Emitrax';
    const { setOpen: setPaletteOpen } = useCommandPalette();

    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 hidden h-7 sm:block" />
            <h1 className="truncate text-base font-semibold capitalize tracking-tight">{title}</h1>
            <div className="ml-auto flex flex-row items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden text-muted-foreground sm:flex"
                    onClick={() => setPaletteOpen(true)}
                >
                    <Search className="size-3.5" aria-hidden />
                    Search
                    <kbd className="ml-2 rounded border bg-muted px-1.5 font-mono text-[10px]">
                        {isAppleUserAgent ? '⌘K' : 'Ctrl K'}
                    </kbd>
                </Button>
                <ModeToggle />
            </div>
        </header>
    );
};

export default AppHeader;
