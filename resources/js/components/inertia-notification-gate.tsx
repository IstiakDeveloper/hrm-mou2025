import NotificationPermissionGate from '@/components/notification-permission-gate';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type GatePageProps = {
    auth?: { user?: unknown } | null;
    push?: {
        subscriptionCount?: number;
        vapidPublicKey?: string | null;
        configured?: boolean;
    } | null;
};

/** Logged-in Android PWA users: gate until permission + push subscription are done. */
export default function InertiaNotificationGate({ children }: PropsWithChildren) {
    const { auth, push } = usePage().props as GatePageProps;

    if (!auth?.user) {
        return <>{children}</>;
    }

    return (
        <NotificationPermissionGate
            subscriptionCount={push?.subscriptionCount ?? 0}
            vapidPublicKey={push?.vapidPublicKey ?? null}
            pushConfigured={push?.configured === true}
        >
            {children}
        </NotificationPermissionGate>
    );
}
