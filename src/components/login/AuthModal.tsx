import { useState } from 'react';

import { Icons } from '@/assets/icons';
import { useLogin, useLogout, useUser } from '@/hooks/useUser';

import { Button } from '../ui/button';
import ConfirmationModal from '../common/ConfirmationModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const LoginModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { data: userData } = useUser();
    const user = userData?.user;

    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    const handleOAuth = () => {
        loginMutation.mutate();
    };

    const handleLogout = (setOpen: (open: boolean) => void) => {
        logoutMutation.mutate();
        if (logoutMutation.isSuccess) {
            setOpen(false);
        }
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
                    <ConfirmationModal
                        title="Logout"
                        description="Are you sure you want to logout?"
                        onConfirm={handleLogout}
                        onCancel={() => setIsOpen(false)}
                        open={isOpen}
                        setOpen={setIsOpen}
                        isLoading={isLoggingOut}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
