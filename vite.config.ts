import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

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
                    manualChunks(id) {
                        if (!id.includes('node_modules')) return;

                        // React core
                        if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                            return 'react-core';
                        }

                        // Router
                        if (id.includes('react-router')) {
                            return 'router';
                        }

                        // Tanstack
                        if (id.includes('@tanstack')) {
                            return 'tanstack';
                        }

                        // Radix
                        if (id.includes('@radix-ui')) {
                            return 'radix';
                        }

                        // Supabase
                        if (id.includes('@supabase')) {
                            return 'supabase';
                        }

                        // State
                        if (id.includes('redux') || id.includes('react-redux') || id.includes('@rematch')) {
                            return 'state';
                        }

                        // Utils
                        if (
                            id.includes('lodash') ||
                            id.includes('clsx') ||
                            id.includes('tailwind-merge') ||
                            id.includes('class-variance-authority')
                        ) {
                            return 'utils';
                        }

                        // Date
                        if (id.includes('date-fns')) {
                            return 'date-utils';
                        }

                        // UI
                        if (
                            id.includes('cmdk') ||
                            id.includes('lucide-react') ||
                            id.includes('sonner') ||
                            id.includes('react-day-picker')
                        ) {
                            return 'ui-utils';
                        }

                        return 'vendor';
                    },
                },
            },
            chunkSizeWarningLimit: 500,
        },
    };
});
