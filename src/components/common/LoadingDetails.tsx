import { Loader2 } from 'lucide-react';

import MainContainer from './Container';
import Header from './Header';

const LoadingDetails = ({
    title,
    description,
    description2,
}: {
    title: string;
    description: string;
    description2?: string;
}) => {
    return (
        <>
            <Header title={title} />
            <MainContainer>
                <div className="flex flex-col items-center justify-center h-[70vh]">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <h2 className="text-xl font-medium">{title}</h2>
                    <p className="text-muted-foreground mt-2">{description}</p>
                    {description2 && <p className="text-muted-foreground mt-2">{description2}</p>}
                </div>
            </MainContainer>
        </>
    );
};

export default LoadingDetails;
