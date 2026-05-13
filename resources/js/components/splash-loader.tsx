import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';

type SplashLoaderProps = {
  /** Keep a tiny minimum duration to avoid flicker. */
  minDurationMs?: number;
};

export default function SplashLoader({ minDurationMs = 450 }: SplashLoaderProps) {
  const [mounted, setMounted] = useState(true);
  const [phase, setPhase] = useState<'enter' | 'show' | 'leave'>('enter');

  const show = () => {
    setMounted(true);
    setPhase('enter');
    // next tick -> transition to 'show'
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setPhase('show'));
    });
  };

  const hide = () => {
    setPhase('leave');
    window.setTimeout(() => setMounted(false), 520);
  };

  // Initial app load splash
  useEffect(() => {
    // play enter animation on first paint
    window.requestAnimationFrame(() => setPhase('show'));

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

  const overlayClass = useMemo(() => {
    if (phase === 'show') return 'opacity-100 backdrop-blur-md';
    // enter (before raf) and leave both use the faded-out state
    return 'opacity-0 backdrop-blur-0';
  }, [phase]);

  const cardClass = useMemo(() => {
    if (phase === 'show') return 'opacity-100 scale-100 translate-y-0';
    if (phase === 'leave') return 'opacity-0 scale-[0.96] translate-y-1';
    return 'opacity-0 scale-[0.96] -translate-y-1';
  }, [phase]);

  if (!mounted) return null;

  return (
    <div
      className={[
        'fixed inset-0 z-[9999] flex items-center justify-center',
        // soft frosted glass over whatever is behind (no more solid black)
        'bg-white/30 supports-[backdrop-filter]:bg-white/20',
        'transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'motion-reduce:transition-none',
        overlayClass,
      ].join(' ')}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      {/* gentle colored glow behind the card so it doesn't feel flat */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/15 blur-2xl" />
      </div>

      <div
        className={[
          'relative flex flex-col items-center gap-5 px-6 py-7 rounded-3xl',
          'bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-xl',
          'border border-white/60 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)]',
          'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          cardClass,
        ].join(' ')}
      >
        <div className="relative grid place-items-center">
          {/* rotating ring */}
          <div className="absolute h-28 w-28 animate-spin rounded-full border border-emerald-500/15 border-t-emerald-500/70 [animation-duration:1.2s]" />
          {/* pulsing ring */}
          <div className="absolute h-28 w-28 animate-ping rounded-full border border-emerald-400/30 opacity-40 [animation-duration:1.8s]" />

          {/* logo card */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 border border-emerald-100 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.35)] backdrop-blur">
            <img
              src="/logo.png"
              alt="Loading"
              className="h-12 w-12 select-none object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.25)] animate-[splash-logo_2.4s_ease-in-out_infinite]"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold tracking-wide text-slate-700">Loading…</div>
          <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-slate-200/70">
            <div className="h-full w-1/3 animate-[splash-bar_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
          </div>
        </div>

        <style>{`
          @keyframes splash-bar {
            0% { transform: translateX(-120%); opacity: .55; }
            50% { opacity: 1; }
            100% { transform: translateX(320%); opacity: .55; }
          }
          @keyframes splash-logo {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
        `}</style>
      </div>
    </div>
  );
}
