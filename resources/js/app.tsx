import '../css/app.css';

import InertiaNotificationGate from '@/components/inertia-notification-gate';
import PWAManager from '@/components/PWAManager';
import PwaRoot from '@/components/pwa-root';
import { shouldHideGlobalChromeForInertiaPage } from '@/lib/print-only-inertia-pages';
import { syncCsrfMetaToken } from '@/lib/csrf';
import { installPreventNumberInputWheelScroll } from '@/lib/prevent-number-input-wheel-scroll';
import { createInertiaApp, router, usePage } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { type ComponentType } from 'react';
import { initializeTheme } from './hooks/use-appearance';
import SplashLoader from '@/components/splash-loader';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'HRM Admin';

function AppGlobalChrome() {
    const { component } = usePage();
    if (shouldHideGlobalChromeForInertiaPage(component)) {
        return null;
    }
    return (
        <>
            <PwaRoot />
            <PWAManager showInstallBanner={true} />
        </>
    );
}

router.on('navigate', (event) => {
    const token = event.detail.page.props?.csrf_token;
    if (typeof token === 'string' && token !== '') {
        syncCsrfMetaToken(token);
    }
});

router.on('invalid', (event) => {
    if (event.detail.response?.status === 419) {
        event.preventDefault();
        window.location.reload();
    }
});

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
                        <AppGlobalChrome />
                        <Page {...pageProps} />
                    </InertiaNotificationGate>
                );
            },
        };
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <SplashLoader />
                <App {...props} />
            </>,
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();

installPreventNumberInputWheelScroll();
installHoverPrefetch();

function installHoverPrefetch(): void {
    let timer = 0;
    let lastHref = '';

    const schedule = (anchor: HTMLAnchorElement, immediate: boolean) => {
        if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
            return;
        }

        const raw = anchor.getAttribute('href');
        if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
            return;
        }

        let url: URL;
        try {
            url = new URL(raw, window.location.href);
        } catch {
            return;
        }

        if (url.origin !== window.location.origin || url.pathname === '/logout') {
            return;
        }

        if (/\.(pdf|xlsx|xls|csv|zip)$/i.test(url.pathname) || /\/(export|download|print|pdf)(\/|$)/i.test(url.pathname)) {
            return;
        }

        const next = `${url.pathname}${url.search}`;
        if (next === window.location.pathname + window.location.search || next === lastHref) {
            return;
        }

        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            lastHref = next;
            router.prefetch(next, {}, { cacheFor: 15_000 });
        }, immediate ? 0 : 90);
    };

    document.addEventListener(
        'mouseover',
        (event) => {
            const anchor = (event.target as Element | null)?.closest?.('a');
            if (anchor instanceof HTMLAnchorElement) {
                schedule(anchor, false);
            }
        },
        { passive: true },
    );

    document.addEventListener(
        'touchstart',
        (event) => {
            const anchor = (event.target as Element | null)?.closest?.('a');
            if (anchor instanceof HTMLAnchorElement) {
                schedule(anchor, true);
            }
        },
        { passive: true },
    );
}
