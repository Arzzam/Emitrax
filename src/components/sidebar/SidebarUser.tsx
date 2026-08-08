import { ChevronsUpDown, LogInIcon, LogOutIcon } from 'lucide-react';

import { useLogin, useLogout, useUser } from '@/hooks/useUser';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

const getAvatarUrl = (rawMetadata: unknown): string => {
    if (!rawMetadata || typeof rawMetadata !== 'object') {
        return '';
    }

    const metadata = rawMetadata as Record<string, unknown>;
    const avatar = metadata.avatar_url ?? metadata.picture;
    return typeof avatar === 'string' ? avatar : '';
};

const getDisplayName = (email: string, rawMetadata: unknown): string => {
    if (rawMetadata && typeof rawMetadata === 'object') {
        const metadata = rawMetadata as Record<string, unknown>;
        const name = metadata.full_name ?? metadata.name;
        if (typeof name === 'string' && name.trim()) {
            return name.trim();
        }
    }

    if (email) {
        return email.split('@')[0];
    }

    return 'User';
};

const getInitials = (value: string): string => {
    const initials = value
        .split(' ')
        .map((part) => part.trim().charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return initials || 'U';
};

/**
 * Sidebar footer identity block. Collapses to just the avatar on the icon rail.
 * Sign-out lives here rather than in the header, which now carries only theme.
 */
const SidebarUser = () => {
    const { data: userData } = useUser();
    const { isMobile } = useSidebar();
    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    const user = userData?.user;

    if (!user) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Sign in"
                        disabled={loginMutation.isPending}
                        onClick={() => loginMutation.mutate()}
                    >
                        <LogInIcon />
                        <span>{loginMutation.isPending ? 'Signing in...' : 'Sign in'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    const email = user.email || '';
    const displayName = getDisplayName(email, user.user_metadata);
    const avatarUrl = getAvatarUrl(user.user_metadata);
    const initials = getInitials(displayName);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={displayName}
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8 rounded-lg">
                                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">{email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" aria-hidden />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                            <Avatar className="size-8 rounded-lg">
                                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">{email}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            disabled={logoutMutation.isPending}
                            onSelect={() => logoutMutation.mutate()}
                        >
                            <LogOutIcon />
                            {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};

export default SidebarUser;
