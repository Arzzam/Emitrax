import { useNavigate } from 'react-router';
import { CircleCheckBigIcon, Tag, User } from 'lucide-react';

import { formatAmount } from '@/utils/utils';
import { IEmi } from '@/types/emi.types';
import { cn } from '@/lib/utils';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardTitle } from '../ui/card';

const EMICard = (props: IEmi) => {
    const navigate = useNavigate();

    const { id, itemName, billDate, endDate, emi, isCompleted, tag, amortizationSchedules, tenure, remainingTenure } =
        props;
    const isPersonal = !tag || tag === 'Personal';

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

    const emiWithGST = emi + amortizationSchedules[tenure - remainingTenure]?.gst || 0;

    return (
        <Card
            className={cn(
                'cursor-pointer hover:bg-accent/50 transition-colors relative',
                !isPersonal && 'border-primary/30 bg-primary/5'
            )}
            onClick={handleClick}
        >
            {isCompleted && <CircleCheckBigIcon className="w-4 h-4 absolute top-2 right-2 text-green-500" />}
            <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
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
