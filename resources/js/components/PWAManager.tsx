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
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
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
        await deferredPrompt.userChoice;

        setShowInstallPrompt(false);
        window.deferredPwaInstall = undefined;
    };

    return (
        <>
            {showInstallBanner && showInstallPrompt && (
                <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-blue-600 p-3 text-white">
                    <div className="flex items-center space-x-2">
                        <span>📱</span>
                        <span className="text-sm">Install this app for a better experience.</span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={handleInstallClick}
                            className="rounded bg-white px-3 py-1 text-sm font-medium text-blue-600 hover:bg-gray-100"
                        >
                            Install
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInstallPrompt(false)}
                            className="text-white hover:text-gray-200"
                            aria-label="Dismiss install prompt"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {!isOnline && (
                <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-red-500 px-4 py-2 text-white shadow-lg">
                    You are offline — some actions may not work until you reconnect.
                </div>
            )}

            {showInstallPrompt && (
                <button
                    type="button"
                    onClick={handleInstallClick}
                    className="fixed right-4 bottom-4 z-40 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700"
                    title="Install app"
                >
                    📱
                </button>
            )}
        </>
    );
}
