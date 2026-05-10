import { useAccountDetails } from '@/hooks/useAccount';
import { useUser } from '@/hooks/useUser';

import { AccountForm } from '@/components/account/AccountForm';
import LoginCard from '@/components/cards/LoginCard';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import LoadingDetails from '@/components/common/LoadingDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Account = () => {
    const { data: userData, isLoading: isUserLoading } = useUser();
    const hasUser = !!userData?.user;
    const { data: account, isLoading: isAccountLoading, isError, refetch } = useAccountDetails({ enabled: hasUser });

    if (isUserLoading) {
        return (
            <LoadingDetails
                title="Account"
                description="Loading account..."
                description2="Please wait while we verify your session."
            />
        );
    }

    return (
        <>
            <Header title="Account" />
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[{ label: 'Dashboard', link: '/' }, { label: `Account` }]}
            />
            <MainContainer className="max-w-6xl h-[calc(100vh-100px)]">
                {!hasUser ? (
                    <LoginCard />
                ) : isAccountLoading ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <div className="h-8 w-56 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-80 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                            <div className="h-72 animate-pulse rounded-xl border bg-card" />
                            <div className="space-y-4">
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                                <div className="h-44 animate-pulse rounded-xl border bg-card" />
                            </div>
                        </div>
                    </div>
                ) : account ? (
                    <AccountForm account={account} />
                ) : isError ? (
                    <Card className="max-w-2xl mx-auto mt-10">
                        <CardHeader>
                            <CardTitle>Unable to load account</CardTitle>
                            <CardDescription>
                                We could not fetch your profile settings right now. Retry in a moment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => refetch()} variant="outline">
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}
            </MainContainer>
        </>
    );
};

export default Account;
