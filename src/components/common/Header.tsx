import { Separator } from '@/components/ui/separator';
import { useUser } from '@/hooks/useUser';
import { ModeToggle } from './ModeToggle';
import LoginModal from '../login/AuthModal';
import UserMenu from './UserMenu';

const Header = ({ title }: { title: string }) => {
    const { data: userData } = useUser();
    const user = userData?.user;

    return (
        <>
            <div className="flex p-3 pl-4 pr-4 text-gray-950 dark:text-gray-200 flex-row items-center justify-between gap-4 w-full">
                <h3 className="text-2xl font-extrabold capitalize leading-snug tracking-tight truncate">{title}</h3>
                <div className="flex flex-row gap-4">
                    <ModeToggle />
                    {user ? <UserMenu /> : <LoginModal />}
                </div>
            </div>
            <Separator />
        </>
    );
};

export default Header;
