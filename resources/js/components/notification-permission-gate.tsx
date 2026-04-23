import { Button } from '@/components/ui/button';
import { createOrGetPushSubscription, postPushSubscriptionToServer } from '@/lib/push-subscription';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

const SKIP_KEY = 'hrm:push_gate_skip_until';
const DEFAULT_SKIP_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
}

function isStandaloneDisplayMode(): boolean {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches === true ||
        window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
        window.matchMedia?.('(display-mode: minimal-ui)').matches === true
    );
}

function supportsWebPush(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

type NotificationPermissionGateProps = PropsWithChildren<{
    subscriptionCount: number;
    vapidPublicKey: string | null;
    pushConfigured: boolean;
}>;

/**
 * Android installed PWA only: block until notification permission is granted
 * and this device has a saved push subscription. Both steps can be completed on this screen.
 */
export default function NotificationPermissionGate({
    children,
    subscriptionCount,
    vapidPublicKey,
    pushConfigured,
}: NotificationPermissionGateProps) {
    const [skipUntil, setSkipUntil] = useState<number>(() => {
        try {
            const raw = localStorage.getItem(SKIP_KEY);
            const n = raw ? Number(raw) : 0;
            return Number.isFinite(n) ? n : 0;
        } catch {
            return 0;
        }
    });

    const isSkipped = skipUntil > Date.now();
    const shouldGate = supportsWebPush() && isAndroid() && isStandaloneDisplayMode() && !isSkipped;

    const [permission, setPermission] = useState<NotificationPermission>(() =>
        typeof Notification !== 'undefined' ? Notification.permission : 'default',
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shouldGate) {
            return;
        }
        const id = window.setInterval(() => {
            setPermission(Notification.permission);
        }, 750);

        return () => window.clearInterval(id);
    }, [shouldGate]);

    const requestPermission = useCallback(async () => {
        if (!shouldGate) {
            return;
        }
        setError(null);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
        } catch {
            setPermission(Notification.permission);
        }
    }, [shouldGate]);

    const enablePushOnDevice = useCallback(async () => {
        setError(null);
        if (!vapidPublicKey || !pushConfigured) {
            setError('Push is not configured on the server.');
            return;
        }
        if (Notification.permission !== 'granted') {
            setError('Allow notifications first.');
            return;
        }

        setBusy(true);
        try {
            const subscription = await createOrGetPushSubscription(vapidPublicKey);
            await postPushSubscriptionToServer(subscription);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not enable push on this device.');
        } finally {
            setBusy(false);
        }
    }, [vapidPublicKey, pushConfigured]);

    const skipForNow = useCallback(() => {
        const until = Date.now() + DEFAULT_SKIP_MS;
        try {
            localStorage.setItem(SKIP_KEY, String(until));
        } catch {
            // ignore (storage blocked) — still allow skip for this session
        }
        setSkipUntil(until);
    }, []);

    if (!shouldGate) {
        return <>{children}</>;
    }

    if (permission === 'granted' && subscriptionCount > 0) {
        return <>{children}</>;
    }

    return (
        <div className="bg-background text-foreground fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center p-6">
            <div className="border-border w-full max-w-md rounded-xl border p-6 shadow-sm">
                <h1 className="text-lg font-semibold">Enable notifications</h1>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                    Allow alerts and register this device for push before you can use the app.
                </p>

                {permission === 'denied' ? (
                    <div className="mt-4 space-y-2 text-sm">
                        <p className="text-muted-foreground">Permission is blocked. To allow it:</p>
                        <ol className="text-muted-foreground list-inside list-decimal space-y-1">
                            <li>Open Android Settings</li>
                            <li>Apps → this app (HRM)</li>
                            <li>Notifications → Allow</li>
                        </ol>
                    </div>
                ) : null}

                {error ? <p className="text-destructive mt-4 text-sm font-medium">{error}</p> : null}

                {!pushConfigured || !vapidPublicKey ? (
                    <p className="text-muted-foreground mt-4 text-sm">
                        Push is not configured on the server (VAPID keys). Ask an administrator, then try again.
                    </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {permission !== 'granted' ? (
                        <Button type="button" disabled={busy} onClick={() => void requestPermission()}>
                            {permission === 'denied' ? 'Try again' : 'Allow notifications'}
                        </Button>
                    ) : (
                        <Button type="button" disabled={busy || !pushConfigured || !vapidPublicKey} onClick={() => void enablePushOnDevice()}>
                            {busy ? 'Working…' : 'Enable push on this device'}
                        </Button>
                    )}
                </div>

                <div className="mt-3">
                    <Button type="button" variant="ghost" disabled={busy} onClick={skipForNow} className="w-full">
                        Skip for now
                    </Button>
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                        If your phone can’t enable push, you can skip and use the app. You can try again later from Settings → Notifications.
                    </p>
                </div>

                <p className="text-muted-foreground mt-4 text-xs">
                    Step 1: allow notifications. Step 2: enable push on this device. You can change this later under Settings → Notifications.
                </p>
            </div>
        </div>
    );
}
