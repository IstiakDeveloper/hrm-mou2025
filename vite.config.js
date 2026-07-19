import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
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
    ],
    esbuild: {
        jsx: 'automatic',
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
});
