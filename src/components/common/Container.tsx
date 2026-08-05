import { cn } from '@/lib/utils';

const MainContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <div className={cn('container mx-auto w-full p-4', className)}>{children}</div>;
};

export default MainContainer;
