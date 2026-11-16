import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
<<<<<<< HEAD
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
=======
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        watch: {
            ignored: ['**/data/**', '**/storage/**', '**/database/**', '**/.git/**'],
        },
    },
>>>>>>> feature/flutter-mobile-app
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
<<<<<<< HEAD
            refresh: true,
        }),
        react(),
        tailwindcss(),
=======
            refresh: [
                'resources/css/**',
                'resources/js/**',
                'routes/**',
                'app/Http/**',
            ],
        }),
        react(),
        tailwindcss(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'sw.ts',
            registerType: 'prompt',
            injectRegister: false,
            manifest: false,
            buildBase: '/build/',
            includeAssets: ['icons/**/*.png', 'manifest.json', 'fav.png'],
            includeManifestIcons: false,
            injectManifest: {
                rollupFormat: 'iife',
                globPatterns: ['**/*.{js,css,wasm,woff2}'],
                maximumFileSizeToCacheInBytes: 6000000,
            },
            devOptions: {
                enabled: false,
            },
        }),
>>>>>>> feature/flutter-mobile-app
    ],
    esbuild: {
        jsx: 'automatic',
    },
<<<<<<< HEAD
=======
    optimizeDeps: {
        include: ['leaflet', 'leaflet.markercluster', 'react-leaflet'],
    },
    build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }
                    // Keep react + inertia together to avoid circular vendor chunks / OOM pressure
                    if (
                        id.includes('react-dom') ||
                        id.includes('/react/') ||
                        id.includes('\\react\\') ||
                        id.includes('@inertiajs')
                    ) {
                        return 'vendor-react';
                    }
                    if (id.includes('date-fns')) {
                        return 'vendor-date-fns';
                    }
                    if (id.includes('lucide-react')) {
                        return 'vendor-icons';
                    }
                    if (id.includes('@radix-ui')) {
                        return 'vendor-radix';
                    }
                    if (id.includes('@headlessui')) {
                        return 'vendor-headlessui';
                    }
                },
            },
        },
    },
>>>>>>> feature/flutter-mobile-app
});
