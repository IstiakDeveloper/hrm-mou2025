import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createOrGetPushSubscription, postPushSubscriptionToServer } from '@/lib/push-subscription';
import { type SharedData } from '@/types';
import AdminLayout from '@/layouts/AdminLayout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

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

            const subscription = await createOrGetPushSubscription(vapidPublicKey);
            await postPushSubscriptionToServer(subscription);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong while enabling push.');
        } finally {
            setBusy(false);
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
        <AdminLayout>
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
                        <Button
                            type="button"
                            disabled={busy || !serverConfigured || !vapidPublicKey || subscriptionCount > 0}
                            onClick={() => void subscribe()}
                        >
                            {subscriptionCount > 0 ? 'Enabled' : 'Enable on this device'}
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
        </AdminLayout>
    );
}
