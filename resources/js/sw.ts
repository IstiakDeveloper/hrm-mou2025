/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
    // Injected by vite-plugin-pwa at build time
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});

self.addEventListener('push', (event: PushEvent) => {
    let title = 'Notification';
    let body = '';
    let url = '/';

    try {
        if (event.data) {
            const parsed = event.data.json() as { title?: string; body?: string; url?: string };
            if (typeof parsed.title === 'string') {
                title = parsed.title;
            }
            if (typeof parsed.body === 'string') {
                body = parsed.body;
            }
            if (typeof parsed.url === 'string' && parsed.url !== '') {
                url = parsed.url;
            }
        }
    } catch {
        const text = event.data?.text();
        if (text) {
            body = text;
        }
    }

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: { url },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const raw = event.notification.data?.url;
    const path = typeof raw === 'string' && raw.startsWith('/') ? raw : '/';
    const targetUrl = new URL(path, self.location.origin).href;

    event.waitUntil(
        (async () => {
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of clients) {
                if (client.url.split('#')[0] === targetUrl && 'focus' in client) {
                    await (client as WindowClient).focus();
                    return;
                }
            }
            await self.clients.openWindow(targetUrl);
        })(),
    );
});
