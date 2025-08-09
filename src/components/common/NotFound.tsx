import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '../ui/button';
import MainContainer from './Container';
import Header from './Header';

const NotFound = ({
    title,
    description,
    description2,
    redirectTo,
    redirectText,
}: {
    title: string;
    description: string;
    description2?: string;
    redirectTo?: string;
    redirectText?: string;
}) => {
    const navigate = useNavigate();
    return (
        <>
            <Header title={title} />
            <MainContainer>
                <div className="flex flex-col items-center justify-center h-[70vh]">
                    <div className="bg-primary/10 p-6 rounded-full mb-4">
                        <AlertCircle className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-muted-foreground text-center mb-6">{description}</p>
                    <p className="text-muted-foreground text-center mb-6">
                        {description2 || 'Redirecting to dashboard in a few seconds...'}
                    </p>
                    <Button onClick={() => navigate(redirectTo || '/')}>{redirectText || 'Go to Dashboard Now'}</Button>
                </div>
            </MainContainer>
        </>
    );
};

export default NotFound;
