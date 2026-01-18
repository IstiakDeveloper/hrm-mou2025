import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';

interface PWAManagerProps {
  title?: string;
  showInstallBanner?: boolean;
}

export default function PWAManager({ title = 'HRM System', showInstallBanner = true }: PWAManagerProps) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA registered:', registration.scope);
        })
        .catch((error) => {
          console.error('PWA registration failed:', error);
        });
    }

    // Install Prompt Handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setShowInstallPrompt(true);

      // Store the event for later use
      (window as any).deferredPrompt = e;
    };

    // Online/Offline Status
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
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installed');
      }

      setShowInstallPrompt(false);
      (window as any).deferredPrompt = null;
    }
  };

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={title} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* PWA Install Banner */}
      {showInstallBanner && showInstallPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>📱</span>
            <span className="text-sm">Install this app for better experience!</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          📡 You're offline - PWA mode active
        </div>
      )}

      {/* PWA Install Button (Floating) */}
      {showInstallPrompt && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-40"
          title="Install App"
        >
          📱
        </button>
      )}
    </>
  );
}
