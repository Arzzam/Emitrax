import { useNavigate } from 'react-router';
import { CircleCheckBigIcon, Tag, User, ArchiveIcon, ArchiveRestoreIcon, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { formatAmount } from '@/utils/utils';
import { IEmi } from '@/types/emi.types';
import { cn } from '@/lib/utils';
import { EmiService } from '@/utils/EMIService';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const EMICard = (props: IEmi) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        id,
        itemName,
        billDate,
        endDate,
        emi,
        isCompleted,
        isArchived,
        tag,
        amortizationSchedules,
        tenure,
        remainingTenure,
        isOwner,
        sharedWith,
    } = props;
    const isPersonal = !tag || tag === 'Personal';
    const isShared = sharedWith && sharedWith.length > 0;
    const isSharedWithMe = !isOwner;

    const formattedBillDate = new Date(billDate).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

    const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

    const handleClick = () => {
        navigate(`/emi/${id}`);
    };

    const handleArchiveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click navigation
        try {
            if (isArchived) {
                await EmiService.unarchiveEmi(id);
            } else {
                await EmiService.archiveEmi(id);
            }
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['emis'] });
        } catch (error) {
            console.error('Failed to toggle archive status:', error);
        }
    };

    const emiWithGST = emi + amortizationSchedules[tenure - remainingTenure]?.gst || 0;

    return (
        <Card
            className={cn(
                'hover:bg-accent/50 transition-colors relative',
                !isPersonal && 'border-primary/30 bg-primary/5',
                isSharedWithMe && 'border-blue-300/50 bg-blue-50/30 dark:bg-blue-950/20'
            )}
        >
            <div className="absolute top-2 left-2 flex items-center gap-1">
                {isCompleted && <CircleCheckBigIcon className="w-4 h-4 text-green-500" />}
                {isShared && (
                    <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {sharedWith.length}
                    </Badge>
                )}
                {isSharedWithMe && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        Shared
                    </Badge>
                )}
            </div>
            <div className="absolute top-2 right-2">
                {/* Show archive button for completed EMIs or if already archived */}
                {(isCompleted || isArchived) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
                        onClick={handleArchiveToggle}
                        title={isArchived ? 'Unarchive EMI' : 'Archive EMI'}
                    >
                        {isArchived ? (
                            <ArchiveRestoreIcon className="w-3 h-3 text-blue-500" />
                        ) : (
                            <ArchiveIcon className="w-3 h-3 text-muted-foreground hover:text-orange-500" />
                        )}
                    </Button>
                )}
            </div>
            <CardContent className="pt-6 cursor-pointer" onClick={handleClick}>
                <div className="flex flex-col gap-2 px-2">
                    <div className="flex flex-row justify-between text-muted-foreground tracking-wide">
                        <CardTitle className="font-semibold text-xs">Bill Date</CardTitle>
                        <span className="text-xs">{formattedBillDate}</span>
                    </div>
                    <div className="font-bold flex flex-row justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className={'flex items-center text-lg'}>{itemName}</CardTitle>
                            {tag && (
                                <Badge
                                    variant={isPersonal ? 'outline' : 'secondary'}
                                    className="flex items-center gap-1 w-fit"
                                >
                                    {isPersonal ? <Tag className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    <span className="text-xs">{tag}</span>
                                </Badge>
                            )}
                        </div>
                        <span className="flex items-center text-base text-end">
                            {`\u20B9`}
                            {formatAmount(emiWithGST)}
                        </span>
                    </div>
                    <div className="flex flex-row justify-between text-muted-foreground tracking-wide">
                        <CardTitle className="font-semibold text-xs">End Date</CardTitle>
                        <span className="text-xs">{formattedEndDate}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EMICard;
