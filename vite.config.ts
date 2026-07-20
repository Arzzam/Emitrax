import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vitest/config';

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
            chunkSizeWarningLimit: 500,
        },
        test: {
            environment: 'node',
            include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
    };
});
