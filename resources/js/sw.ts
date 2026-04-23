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
    let imageFromPayload: string | undefined;

    try {
        if (event.data) {
            const parsed = event.data.json() as {
                title?: string;
                body?: string;
                url?: string;
                /** Optional absolute HTTPS URL, or site path starting with / */
                image?: string;
            };
            if (typeof parsed.title === 'string') {
                title = parsed.title;
            }
            if (typeof parsed.body === 'string') {
                body = parsed.body;
            }
            if (typeof parsed.url === 'string' && parsed.url !== '') {
                url = parsed.url;
            }
            if (typeof parsed.image === 'string' && parsed.image !== '') {
                imageFromPayload = parsed.image;
            }
        }
    } catch {
        const text = event.data?.text();
        if (text) {
            body = text;
        }
    }

    // Floating “heads-up” / banner on Android is NOT controllable from JS: the OS + per-app
    // notification settings (e.g. Samsung “Show as pop-up”, Chrome “Pop on screen”) decide that.
    // Absolute URLs + image + vibrate help visibility in the shade and on some devices.
    const origin = self.location.origin;
    const iconUrl = `${origin}/icons/icon-192x192.png`;
    const badgeUrl = `${origin}/icons/icon-72x72.png`;
    const defaultImageUrl = `${origin}/icons/icon-384x384.png`;
    let imageUrl = defaultImageUrl;
    if (imageFromPayload) {
        if (imageFromPayload.startsWith('https://') || imageFromPayload.startsWith('http://')) {
            imageUrl = imageFromPayload;
        } else if (imageFromPayload.startsWith('/')) {
            imageUrl = `${origin}${imageFromPayload}`;
        }
    }

    const notificationId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: iconUrl,
            badge: badgeUrl,
            image: imageUrl,
            tag: `hrm-${notificationId}`,
            silent: false,
            timestamp: Date.now(),
            vibrate: [280, 120, 280, 120, 280],
            requireInteraction: false,
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
