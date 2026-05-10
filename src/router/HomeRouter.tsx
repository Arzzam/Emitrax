import { BrowserRouter, Route, Routes } from 'react-router';

import Layout from '@/layout/Layout';
import Account from '@/router/pages/Account';
import AmortizationSchedule from '@/router/pages/AmortizationSchedule';
import EMIDetails from '@/router/pages/EMIDetails';
import Home from '@/router/pages/Home';
import NotFoundPage from '@/router/pages/NotFoundPage';
import { OAuth } from '@/router/pages/OAuthRoute';
import ShareEMI from '@/router/pages/ShareEMI';
import SplitEMI from '@/router/pages/SplitEMI';

const HomeRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth/callback" element={<OAuth />} />
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/emi/:id" element={<EMIDetails />} />
                    <Route path="/emi/:id/amortization" element={<AmortizationSchedule />} />
                    <Route path="/emi/:id/share" element={<ShareEMI />} />
                    <Route path="/emi/:id/split" element={<SplitEMI />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default HomeRouter;
