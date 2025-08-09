import { BrowserRouter, Route, Routes } from 'react-router';

import Layout from '@/layout/Layout';
import Home from '@/router/pages/Home';
import EMIDetails from '@/router/pages/EMIDetails';
import AmortizationSchedule from '@/router/pages/AmortizationSchedule';
import NotFoundPage from '@/router/pages/NotFoundPage';
import { OAuth } from '@/router/pages/OAuthRoute';

const HomeRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth/callback" element={<OAuth />} />
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="/emi/:id" element={<EMIDetails />} />
                    <Route path="/emi/:id/amortization" element={<AmortizationSchedule />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default HomeRouter;
