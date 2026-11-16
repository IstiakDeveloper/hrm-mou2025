import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Phase = 'show' | 'leave';

export default function SplashLoader() {
    const [visible, setVisible] = useState(true);
    const [phase, setPhase] = useState<Phase>('show');

    useEffect(() => {
        let hideTimer = 0;

        const reveal = () => {
            window.clearTimeout(hideTimer);
            setPhase('show');
            setVisible(true);
        };

        const dismiss = () => {
            setPhase('leave');
            hideTimer = window.setTimeout(() => setVisible(false), 160);
        };

        const firstHide = window.setTimeout(dismiss, document.readyState === 'complete' ? 280 : 480);

        let showTimer = 0;
        const offStart = router.on('start', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }
            window.clearTimeout(firstHide);
            window.clearTimeout(showTimer);
            showTimer = window.setTimeout(reveal, 120);
        });

        const offFinish = router.on('finish', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }
            window.clearTimeout(showTimer);
            dismiss();
        });

        return () => {
            window.clearTimeout(firstHide);
            window.clearTimeout(showTimer);
            window.clearTimeout(hideTimer);
            offStart();
            offFinish();
        };
    }, []);

    if (!visible) {
        return null;
    }

    const shown = phase === 'show';

    return (
        <div
            className={[
                'pointer-events-none fixed inset-0 z-[80] flex items-center justify-center',
                'transition-opacity duration-150',
                shown ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-emerald-100">
                <div className="h-full w-1/3 animate-[nav-loader_0.9s_ease-in-out_infinite] rounded-full bg-emerald-600" />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg shadow-slate-900/10">
                <span className="relative grid h-9 w-9 place-items-center">
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-600 [animation-duration:0.7s]" />
                    <img src="/logo.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
                </span>
                <span className="text-sm font-medium tracking-wide text-slate-700">Loading</span>
            </div>
            <style>{`
                @keyframes nav-loader {
                    0% { transform: translateX(-120%); }
                    100% { transform: translateX(320%); }
                }
            `}</style>
        </div>
    );
}
