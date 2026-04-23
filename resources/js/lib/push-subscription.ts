import { router } from '@inertiajs/react';

function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function waitForRegistrationActive(reg: ServiceWorkerRegistration, timeoutMs = 12000): Promise<ServiceWorkerRegistration> {
    if (reg.active?.state === 'activated') {
        return Promise.resolve(reg);
    }

    const worker = reg.installing ?? reg.waiting ?? reg.active;
    if (!worker) {
        return Promise.reject(new Error('Service worker registration has no worker.'));
    }

    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error('Service worker did not activate in time. Refresh and try again.'));
        }, timeoutMs);

        const done = () => {
            window.clearTimeout(timeoutId);
            worker.removeEventListener('statechange', onStateChange);
            resolve(reg);
        };

        const onStateChange = () => {
            if (worker.state === 'activated') {
                done();
            }
        };

        worker.addEventListener('statechange', onStateChange);

        if (worker.state === 'activated') {
            done();
        }
    });
}

export async function ensureServiceWorkerRegistration(timeoutMs = 12000): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/build/');
    if (existing) {
        return waitForRegistrationActive(existing, timeoutMs);
    }

    const reg = await navigator.serviceWorker.register('/build/sw.js');
    return waitForRegistrationActive(reg, timeoutMs);
}

/** Create or reuse a PushManager subscription (caller should ensure Notification permission is granted). */
export async function createOrGetPushSubscription(vapidPublicKey: string): Promise<PushSubscription> {
    const registration = await ensureServiceWorkerRegistration();

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
    }

    return subscription;
}

export function postPushSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    const payload = subscription.toJSON();
    if (!payload.endpoint || !payload.keys?.auth || !payload.keys?.p256dh) {
        return Promise.reject(new Error('Could not read push subscription from the browser.'));
    }

    return new Promise((resolve, reject) => {
        router.post(
            route('settings.notifications.store'),
            {
                endpoint: payload.endpoint,
                keys: {
                    auth: payload.keys.auth,
                    p256dh: payload.keys.p256dh,
                },
                contentEncoding: payload.contentEncoding ?? 'aesgcm',
            },
            {
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error('Could not save subscription on the server.')),
            },
        );
    });
}
