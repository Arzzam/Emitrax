import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { errorToast, successToast } from '@/utils/toast.utils';
import { exchange } from '@/utils/utils';

import LoadingDetails from '@/components/common/LoadingDetails';

export const OAuth = () => {
    const location = useLocation();
    const navigate = useNavigate();

    if (!location.hash) navigate('/');

    useEffect(() => {
        const exchangeTokenForUser = async () => {
            const params = new URLSearchParams(location.hash.slice(1));
            const accessToken = params.get('access_token');

            try {
                if (accessToken) {
                    const user = await exchange(accessToken);
                    if (user) {
                        navigate('/');
                        successToast('Logged in successfully!');
                    } else {
                        navigate('/');
                        errorToast('Failed to log in');
                    }
                } else {
                    let urlError = '';
                    let errorCode = '';
                    let errorDescription = '';
                    if (params) {
                        urlError = params.get('error') || '';
                        errorCode = params.get('error_code') || '';
                        errorDescription = params.get('error_description') || '';

                        if (errorDescription !== null) {
                            errorDescription = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
                        }
                    }
                    navigate('/');
                    setTimeout(() => {
                        errorToast(`${urlError}: ${errorDescription} (${errorCode})`);
                    }, 100);
                }
            } catch (error) {
                errorToast(`${error}`);
            }
        };

        exchangeTokenForUser();
    }, [location.hash, navigate]);

    return (
        <>
            <LoadingDetails
                title="Authenticating..."
                description="Please wait while we authenticate your account."
                description2="Please wait, while we take you to your dashboard..."
            />
        </>
    );
};
