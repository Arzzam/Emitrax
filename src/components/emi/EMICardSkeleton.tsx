import { Card, CardContent, CardTitle } from '../ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const EMICardSkeleton = () => {
    return (
        <Card className="relative">
            <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-row justify-between text-muted-foreground tracking-wide">
                        <CardTitle className="font-semibold text-xs">Bill Date</CardTitle>
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="font-bold flex flex-row justify-between gap-4">
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex flex-row justify-between text-muted-foreground tracking-wide">
                        <CardTitle className="font-semibold text-xs">End Date</CardTitle>
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EMICardSkeleton;
