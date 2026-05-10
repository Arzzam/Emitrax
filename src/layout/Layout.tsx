import { Outlet } from 'react-router';

import { useAccountDataBootstrap } from '@/hooks/useAccountDataBootstrap';
// import TooltipSidebar from '@/components/sidebar/Sidebar';

const Layout = () => {
    // const navigation = useNavigation();
    // const isNavigating = Boolean(navigation.location);

    useAccountDataBootstrap();

    return (
        <div className="min-w-screen min-h-screen overflow-hidden">
            <Outlet />
        </div>
    );
};

export default Layout;
