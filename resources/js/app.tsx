import '../css/app.css';

import InertiaNotificationGate from '@/components/inertia-notification-gate';
import PWAManager from '@/components/PWAManager';
import PwaRoot from '@/components/pwa-root';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { Fragment, type ComponentType } from 'react';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'HRM Admin';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: async (name) => {
        const page = await resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx'));
        const mod = page as Record<string, unknown> & { default: ComponentType<Record<string, unknown>> };
        const Page = mod.default;

        return {
            ...mod,
            default: function PageWithNotificationGate(pageProps: Record<string, unknown>) {
                return (
                    <InertiaNotificationGate>
                        <Page {...pageProps} />
                    </InertiaNotificationGate>
                );
            },
        };
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <Fragment>
                <PwaRoot />
                <PWAManager showInstallBanner={true} />
                <App {...props} />
            </Fragment>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
