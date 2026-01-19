import { Outlet } from 'react-router';
// import TooltipSidebar from '@/components/sidebar/Sidebar';

const Layout = () => {
    // const navigation = useNavigation();
    // const isNavigating = Boolean(navigation.location);
    return (
        <div className="min-w-screen min-h-screen overflow-hidden">
            <Outlet />
        </div>
    );
};

export default Layout;
