import { cn } from '@/lib/utils';

const MainContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn('container mx-auto p-4 h-[calc(100vh-65px)] overflow-y-auto', className)}>{children}</div>
    );
};

export default MainContainer;
