import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function PwaRoot() {
    const [needsRefresh, setNeedsRefresh] = useState(false);

    useEffect(() => {
        if (!import.meta.env.PROD) {
            return;
        }

        void import('virtual:pwa-register').then(({ registerSW }) => {
            registerSW({
                immediate: true,
                onNeedRefresh() {
                    setNeedsRefresh(true);
                },
            });
        });
    }, []);

    if (!needsRefresh) {
        return null;
    }

    return (
        <div className="border-border bg-background fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg">
            <p className="text-muted-foreground text-sm">A new version is ready.</p>
            <Button size="sm" onClick={() => window.location.reload()}>
                Reload
            </Button>
        </div>
    );
}
