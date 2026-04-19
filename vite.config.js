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
});
