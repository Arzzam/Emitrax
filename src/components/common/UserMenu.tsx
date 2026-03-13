import { Link } from 'react-router';
import { BadgeCheckIcon, LogOutIcon } from 'lucide-react';

import { useLogout, useUser } from '@/hooks/useUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const UserMenu = () => {
    const { data: userData } = useUser();
    const logoutMutation = useLogout();

    const user = userData?.user;
    if (!user) {
        return null;
    }

    const email = user.email || '';
    const displayName = getDisplayName(email, user.user_metadata);
    const avatarUrl = getAvatarUrl(user.user_metadata);
    const initials = getInitials(displayName);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link to="/account">
                            <BadgeCheckIcon />
                            My Account
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                >
                    <LogOutIcon />
                    {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
