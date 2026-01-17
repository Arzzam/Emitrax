import { useState } from 'react';

import { Icons } from '@/assets/icons';
import { useLogin, useLogout, useUser } from '@/hooks/useUser';

import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';

const LoginModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { data: userData } = useUser();
    const user = userData?.user;

    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    const handleOAuth = () => {
        loginMutation.mutate();
    };

    const handleLogout = () => {
        logoutMutation.mutate(undefined, {
            onSuccess: () => {
                setIsOpen(false);
            },
        });
    };

    const isLoggingOut = logoutMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{user ? <Button>Logout</Button> : <Button>Login</Button>}</DialogTrigger>
            <DialogContent>
                {!user ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Login</DialogTitle>
                            <DialogDescription>Login to your account to continue</DialogDescription>
                        </DialogHeader>
                        <Button
                            variant="outline"
                            type="button"
                            disabled={loginMutation.isPending}
                            onClick={handleOAuth}
                        >
                            {loginMutation.isPending ? (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.google className="mr-2 h-4 w-4" />
                            )}{' '}
                            Google
                        </Button>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Logout</DialogTitle>
                            <DialogDescription>Are you sure you want to logout?</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoggingOut}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
                                {isLoggingOut ? (
                                    <>
                                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Logging out...
                                    </>
                                ) : (
                                    'Logout'
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
