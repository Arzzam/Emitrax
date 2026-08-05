import { Outlet } from 'react-router';

import { CommandPaletteProvider } from '@/context/CommandPaletteProvider/commandPaletteProvider';
import { PageTitleProvider } from '@/context/PageTitleProvider/pageTitleProvider';
import { useAccountDataBootstrap } from '@/hooks/useAccountDataBootstrap';

import CommandPalette from '@/components/common/CommandPalette';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import AppHeader from './AppHeader';

const Layout = () => {
    useAccountDataBootstrap();

    return (
        <PageTitleProvider>
            <CommandPaletteProvider>
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset className="flex min-h-svh min-w-0 flex-col">
                        <AppHeader />
                        {/* The app's single scroll container - pages must not nest their own. */}
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <Outlet />
                        </div>
                    </SidebarInset>
                </SidebarProvider>
                <CommandPalette />
            </CommandPaletteProvider>
        </PageTitleProvider>
    );
};

export default Layout;
