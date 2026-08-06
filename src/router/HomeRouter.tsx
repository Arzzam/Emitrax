import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import Layout from '@/layout/Layout';

const Home = lazy(() => import('@/router/pages/Home'));
const Settings = lazy(() => import('@/router/pages/Settings'));
const CreditCards = lazy(() => import('@/router/pages/CreditCards'));
const EMIDetails = lazy(() => import('@/router/pages/EMIDetails'));
const AmortizationSchedule = lazy(() => import('@/router/pages/AmortizationSchedule'));
const ShareEMI = lazy(() => import('@/router/pages/ShareEMI'));
const SplitEMI = lazy(() => import('@/router/pages/SplitEMI'));
const EMIScenarios = lazy(() => import('@/router/pages/EMIScenarios'));
const NotFoundPage = lazy(() => import('@/router/pages/NotFoundPage'));
const OAuth = lazy(() => import('@/router/pages/OAuthRoute').then((module) => ({ default: module.OAuth })));

const RouteLoadingFallback = () => (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading page...</div>
);

const HomeRouter = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                    <Route path="/auth/callback" element={<OAuth />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/credit-cards" element={<CreditCards />} />
                        <Route path="/emi/:id" element={<EMIDetails />} />
                        <Route path="/emi/:id/amortization" element={<AmortizationSchedule />} />
                        <Route path="/emi/:id/share" element={<ShareEMI />} />
                        <Route path="/emi/:id/split" element={<SplitEMI />} />
                        <Route path="/emi/:id/scenarios" element={<EMIScenarios />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default HomeRouter;
