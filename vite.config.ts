import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            react(),
            tailwindcss(),
            {
                name: 'simpleanalytics',
                transformIndexHtml(html) {
                    const file = mode === 'development' ? 'latest.dev.js' : 'latest.js';
                    return {
                        html,
                        tags: [
                            {
                                tag: 'script',
                                attrs: {
                                    async: true,
                                    src: `https://scripts.simpleanalyticscdn.com/${file}`,
                                },
                                injectTo: 'head',
                            },
                        ],
                    };
                },
            },
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3002,
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        react: ['react', 'react-dom'],
                        router: ['react-router'],
                        radix: [
                            '@radix-ui/react-alert-dialog',
                            '@radix-ui/react-dialog',
                            '@radix-ui/react-label',
                            '@radix-ui/react-popover',
                            '@radix-ui/react-select',
                            '@radix-ui/react-separator',
                            '@radix-ui/react-slot',
                            '@radix-ui/react-switch',
                            '@radix-ui/react-toggle',
                            '@radix-ui/react-toggle-group',
                            '@radix-ui/react-tooltip',
                            'sonner',
                        ],
                        redux: [
                            'redux',
                            'react-redux',
                            'redux-persist',
                            '@rematch/core',
                            '@rematch/loading',
                            '@rematch/persist',
                        ],
                        icons: ['lucide-react'],
                        query: ['@tanstack/react-query'],
                        lodash: ['lodash'],
                        supabase: ['@supabase/supabase-js'],
                    },
                },
            },
        },
    };
});
