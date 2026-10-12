import { Button } from '@/components/ui/button';
import { Download, WifiOff, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface PwaBeforeInstallEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAManagerProps {
    showInstallBanner?: boolean;
}

declare global {
    interface Window {
        deferredPwaInstall?: PwaBeforeInstallEvent;
    }
}

export default function PWAManager({ showInstallBanner = true }: PWAManagerProps) {
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isDismissed, setIsDismissed] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        // If already running in standalone PWA mode, don't show prompt
        const isStandalone =
            window.matchMedia?.('(display-mode: standalone)').matches ||
            Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone);

        if (isStandalone) {
            setShowInstallPrompt(false);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setShowInstallPrompt(true);
            window.deferredPwaInstall = e as PwaBeforeInstallEvent;
        };

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleInstallClick = async () => {
        const deferredPrompt = window.deferredPwaInstall;
        if (!deferredPrompt) {
            return;
        }

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
            setShowInstallPrompt(false);
            window.deferredPwaInstall = undefined;
        } else {
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        try {
            sessionStorage.setItem('pwa_prompt_dismissed', 'true');
        } catch {
            // ignore
        }
    };

    return (
        <>
            {/* Corner Install Prompt Notification */}
            {showInstallBanner && showInstallPrompt && (
                <div className="fixed right-4 bottom-4 z-50 transition-all duration-300 print:hidden sm:right-6 sm:bottom-6">
                    {!isDismissed ? (
                        <div className="bg-card text-card-foreground border-border/80 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all sm:w-88">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 p-1.5 shadow-xs">
                                        <img
                                            src="/logo.png"
                                            alt="App Logo"
                                            className="size-full object-contain select-none"
                                            draggable={false}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold tracking-tight text-foreground">
                                            Install HRM App
                                        </h4>
                                        <p className="text-muted-foreground text-xs leading-relaxed">
                                            Install for faster access, smoother navigation, and offline support.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                                    aria-label="Dismiss install prompt"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDismiss}
                                    className="text-muted-foreground hover:text-foreground h-8 text-xs font-normal"
                                >
                                    Not Now
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleInstallClick}
                                    className="h-8 gap-1.5 px-3.5 text-xs font-medium shadow-xs"
                                >
                                    <Download className="size-3.5" />
                                    Install
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsDismissed(false)}
                            className="bg-card border-border/80 hover:bg-accent flex size-12 items-center justify-center rounded-full border p-2 shadow-lg transition-transform hover:scale-105"
                            title="Install HRM App"
                            aria-label="Install HRM App"
                        >
                            <img
                                src="/logo.png"
                                alt="Install App"
                                className="size-full object-contain select-none"
                                draggable={false}
                            />
                        </button>
                    )}
                </div>
            )}

            {/* Offline Alert */}
            {!isOnline && (
                <div className="bg-destructive text-destructive-foreground fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium shadow-lg backdrop-blur-sm print:hidden sm:bottom-6 sm:left-6">
                    <WifiOff className="size-4 shrink-0" />
                    <span>You are offline — some features may require an internet connection.</span>
                </div>
            )}
        </>
    );
}
