import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                    if (id.includes('/resources/js/pages/Procurement/')) {
                        return 'pages-procurement';
                    }
                    if (id.includes('/resources/js/pages/Exim/')) {
                        return 'pages-exim';
                    }
                    if (id.includes('/resources/js/pages/Warehouse/')) {
                        return 'pages-warehouse';
                    }
                    if (id.includes('/resources/js/pages/Admin/')) {
                        return 'pages-admin';
                    }
                },
            },
        },
    },
});
