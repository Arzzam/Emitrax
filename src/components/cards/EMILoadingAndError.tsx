import { AlertCircle } from 'lucide-react';

import { useEmis } from '@/hooks/useEmi';

import { Card, CardHeader } from '../ui/card';
import EMICardSkeleton from '../emi/EMICardSkeleton';

const EMILoadingAndError = () => {
    const { isLoading, isError } = useEmis();
    return (
        <>
            {isLoading && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Card key={index} className="animate-pulse">
                                <CardHeader className="h-24 bg-muted rounded-t-xl" />
                            </Card>
                        ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <EMICardSkeleton key={index} />
                        ))}
                    </div>
                </>
            )}
            {isError && (
                <Card className="mt-4 p-4 bg-destructive/10 text-destructive">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <p>Error loading EMI data. Please try again.</p>
                    </div>
                </Card>
            )}
        </>
    );
};

export default EMILoadingAndError;
