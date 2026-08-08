import { QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';

import StoreProvider from './context/StoreProvider/StoreProvider';
import { ThemeProvider } from './context/ThemeProvider/themeProvider';
import { queryClient } from './hooks/queryClient';
import HomeRouter from './router/HomeRouter';

function App() {
    return (
        <StoreProvider>
            <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <QueryClientProvider client={queryClient}>
                    <HomeRouter />
                    <Analytics />
                </QueryClientProvider>
                <Toaster />
            </ThemeProvider>
        </StoreProvider>
    );
}

export default App;
