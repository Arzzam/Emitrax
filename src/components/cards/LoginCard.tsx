import { Icons } from '@/assets/icons';
import { useLogin, useUser } from '@/hooks/useUser';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const LoginCard = () => {
    const loginMutation = useLogin();
    const { isLoading } = useUser();
    const userLoading = loginMutation.isPending || isLoading;
    return (
        <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle className="text-2xl text-center">Welcome to EmiTrax</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground text-center">
                    Track and manage all your EMIs in one place. Login to get started.
                </p>
                <Button
                    size="lg"
                    variant="outline"
                    type="button"
                    disabled={loginMutation.isPending || userLoading}
                    onClick={() => loginMutation.mutate()}
                    className="w-full max-w-xs"
                >
                    {loginMutation.isPending || userLoading ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Icons.google className="mr-2 h-4 w-4" />
                    )}{' '}
                    Continue with Google
                </Button>
            </CardContent>
        </Card>
    );
};

export default LoginCard;
