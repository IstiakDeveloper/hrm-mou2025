import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem, type SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notifications',
        href: '/settings/notifications',
    },
];

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

export default function NotificationsSettings({ subscriptionCount }: { subscriptionCount: number }) {
    const { push, flash } = usePage<SharedData>().props;
    const vapidPublicKey = push?.vapidPublicKey ?? null;
    const serverConfigured = push?.configured === true;

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.success || flash?.warning || flash?.error) {
            setBusy(false);
        }
    }, [flash?.success, flash?.warning, flash?.error]);

    const subscribe = useCallback(async () => {
        setError(null);

        if (!vapidPublicKey) {
            setError('Push is not configured on the server.');
            return;
        }

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setError('This browser does not support Web Push.');
            return;
        }

        setBusy(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setError('Notification permission was not granted.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
            }

            const payload = subscription.toJSON();
            if (!payload.endpoint || !payload.keys?.auth || !payload.keys?.p256dh) {
                setError('Could not read push subscription from the browser.');
                return;
            }

            router.post(
                route('settings.notifications.store'),
                {
                    endpoint: payload.endpoint,
                    keys: {
                        auth: payload.keys.auth,
                        p256dh: payload.keys.p256dh,
                    },
                },
                {
                    preserveScroll: true,
                    onFinish: () => setBusy(false),
                },
            );
        } catch (e) {
            setBusy(false);
            setError(e instanceof Error ? e.message : 'Something went wrong while enabling push.');
        }
    }, [vapidPublicKey]);

    const unsubscribe = useCallback(() => {
        setBusy(true);
        router.delete(route('settings.notifications.destroy'), {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    }, []);

    const sendTest = useCallback(() => {
        setBusy(true);
        router.post(
            route('settings.notifications.test'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Push notifications"
                        description="Receive alerts on this device when the app is in the background. Requires HTTPS in production."
                    />

                    {flash?.success && (
                        <Alert>
                            <AlertTitle>Done</AlertTitle>
                            <AlertDescription>{flash.success}</AlertDescription>
                        </Alert>
                    )}

                    {flash?.warning && (
                        <Alert>
                            <AlertTitle>Notice</AlertTitle>
                            <AlertDescription>{flash.warning}</AlertDescription>
                        </Alert>
                    )}

                    {flash?.error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{flash.error}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Could not update</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!serverConfigured && (
                        <Alert>
                            <AlertTitle>Server not ready</AlertTitle>
                            <AlertDescription>
                                Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY in the application environment before users can
                                subscribe.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <Button type="button" disabled={busy || !serverConfigured || !vapidPublicKey} onClick={() => void subscribe()}>
                            Enable on this device
                        </Button>
                        <Button type="button" variant="outline" disabled={busy || subscriptionCount === 0} onClick={unsubscribe}>
                            Remove all my devices
                        </Button>
                        <Button type="button" variant="secondary" disabled={busy || subscriptionCount === 0 || !serverConfigured} onClick={sendTest}>
                            Send test notification
                        </Button>
                    </div>

                    <p className="text-muted-foreground text-sm">
                        Active subscriptions for your account: <strong>{subscriptionCount}</strong>
                    </p>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
