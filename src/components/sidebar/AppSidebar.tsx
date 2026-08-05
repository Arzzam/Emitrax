import { Link, useLocation } from 'react-router';
import { Receipt } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';

import EmiNav from './EmiNav';
import { AppNavItem, appNavItems, isNavItemActive } from './nav.config';
import SidebarUser from './SidebarUser';

const SidebarNavLink = ({ item }: { item: AppNavItem }) => {
    const { pathname } = useLocation();
    const { isMobile, setOpenMobile } = useSidebar();
    const Icon = item.icon;
    const isActive = isNavItemActive(pathname, item);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                <Link
                    to={item.href}
                    onClick={() => {
                        if (isMobile) setOpenMobile(false);
                    }}
                >
                    <Icon />
                    <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
};

const AppSidebar = (props: React.ComponentProps<typeof Sidebar>) => {
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <Link
                    to="/"
                    onClick={() => {
                        if (isMobile) setOpenMobile(false);
                    }}
                    className={cn(
                        'flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-sidebar-accent',
                        'group-data-[collapsible=icon]:p-0!'
                    )}
                >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Receipt className="size-4" />
                    </span>
                    <span className="truncate text-base font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
                        Emitrax
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {appNavItems.map((item) => (
                                <SidebarNavLink key={item.id} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator />
                <EmiNav />
            </SidebarContent>
            <SidebarFooter>
                <SidebarUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
};

export default AppSidebar;
