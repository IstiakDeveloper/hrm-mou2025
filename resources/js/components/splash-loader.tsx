import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';

type SplashLoaderProps = {
  /** Keep a tiny minimum duration to avoid flicker. */
  minDurationMs?: number;
};

export default function SplashLoader({ minDurationMs = 450 }: SplashLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'show' | 'hide'>('show');

  const show = () => {
    setPhase('show');
    setVisible(true);
  };

  const hide = () => {
    setPhase('hide');
    window.setTimeout(() => setVisible(false), 260);
  };

  // Initial app load splash
  useEffect(() => {
    const afterReady = () => window.setTimeout(hide, minDurationMs);

    if (document.readyState === 'complete') {
      afterReady();
      return;
    }

    window.addEventListener('load', afterReady, { once: true });
    return () => window.removeEventListener('load', afterReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inertia navigations
  useEffect(() => {
    let startedAt = 0;

    const offStart = router.on('start', () => {
      startedAt = Date.now();
      show();
    });

    const offFinish = router.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minDurationMs - elapsed);
      window.setTimeout(hide, remaining);
    });

    return () => {
      offStart();
      offFinish();
    };
  }, [minDurationMs]);

  const rootClassName = useMemo(() => {
    if (phase === 'hide') {
      return 'opacity-0 scale-[1.02]';
    }
    return 'opacity-100 scale-100';
  }, [phase]);

  if (!visible) return null;

  return (
    <div
      className={[
        'fixed inset-0 z-[9999] flex items-center justify-center',
        'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        'transition-all duration-300 ease-out',
        rootClassName,
      ].join(' ')}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      {/* subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/10 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-6">
        <div className="relative grid place-items-center">
          {/* rotating ring */}
          <div className="absolute h-28 w-28 animate-spin rounded-full border border-white/10 border-t-white/70" />
          {/* pulsing ring */}
          <div className="absolute h-28 w-28 animate-ping rounded-full border border-white/10 opacity-30" />

          {/* logo card */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur">
            <img
              src="/logo.png"
              alt="Loading"
              className="h-12 w-12 select-none object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-sm font-medium tracking-wide text-white/85">Loading…</div>
          <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[splash-bar_1.05s_ease-in-out_infinite] rounded-full bg-white/70" />
          </div>
        </div>

        <style>{`
          @keyframes splash-bar {
            0% { transform: translateX(-120%); opacity: .55; }
            50% { opacity: .95; }
            100% { transform: translateX(320%); opacity: .55; }
          }
        `}</style>
      </div>
    </div>
  );
}

