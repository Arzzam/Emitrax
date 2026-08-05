import { CreditCard, LayoutDashboard, LucideIcon, UserCog } from 'lucide-react';

export type AppNavItem = {
    id: string;
    href: string;
    label: string;
    icon: LucideIcon;
    /** 'exact' matches the path only; 'prefix' also matches nested routes. */
    match: 'exact' | 'prefix';
};

/**
 * Single source of truth for top-level navigation. Drives both the sidebar's
 * active state and the app header's default page title.
 */
export const appNavItems: AppNavItem[] = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
    { id: 'credit-cards', href: '/credit-cards', label: 'Credit Cards', icon: CreditCard, match: 'prefix' },
    { id: 'settings', href: '/settings', label: 'Settings', icon: UserCog, match: 'prefix' },
];

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
    if (item.match === 'exact') {
        return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Returns the nav item owning the current route, or undefined for routes with no
 * top-level entry (e.g. /emi/:id), which fall back to a page-supplied title.
 */
export function getActiveNavItem(pathname: string): AppNavItem | undefined {
    return appNavItems.find((item) => isNavItemActive(pathname, item));
}
