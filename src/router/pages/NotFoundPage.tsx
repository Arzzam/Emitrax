import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import NotFound from '@/components/common/NotFound';

const NotFoundPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const redirectTimer = setTimeout(() => {
            navigate('/');
        }, 5000);

        return () => clearTimeout(redirectTimer);
    }, [navigate]);

    return (
        <NotFound
            title="Page Not Found"
            description="The page you are looking for doesn't exist or has been moved."
            description2="You might have mistyped the address or the page may have been removed."
        />
    );
};

export default NotFoundPage;
