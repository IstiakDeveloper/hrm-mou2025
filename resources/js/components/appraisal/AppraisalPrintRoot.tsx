import { useLayoutEffect, useRef, type ReactNode } from 'react';

const PRINT_CSS = `
.appraisal-print-page {
  box-sizing: border-box;
  height: 270mm;
  max-height: 270mm;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
  margin: 0 0 1.25rem 0;
  padding-top: 2mm;
}
.appraisal-print-page > :first-child {
  box-sizing: border-box;
}
@media print {
  @page { size: A4 portrait; margin: 8mm; }
  .appraisal-print-page {
    height: 270mm !important;
    max-height: 270mm !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 2mm 0 0 0 !important;
    border: none !important;
    break-after: page;
    page-break-after: always;
  }
  .appraisal-print-page:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }
}
`;

function fitPages(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('.appraisal-print-page').forEach((frame) => {
        const inner = frame.firstElementChild as HTMLElement | null;
        if (!inner) return;

        inner.style.transform = 'none';
        inner.style.transformOrigin = 'top left';
        inner.style.width = '100%';
        inner.style.height = 'auto';

        const box = getComputedStyle(frame);
        const padTop = parseFloat(box.paddingTop) || 0;
        const padBottom = parseFloat(box.paddingBottom) || 0;
        const available = frame.clientHeight - padTop - padBottom;
        const needed = Math.max(inner.scrollHeight, inner.offsetHeight);
        if (available <= 0 || needed <= 0) return;

        const scale = Math.min(1, (available * 0.985) / needed);
        inner.style.width = scale < 0.995 ? `${100 / scale}%` : '100%';
        inner.style.transform = scale < 0.995 ? `scale(${Number(scale.toFixed(4))})` : 'none';
    });
}

export function AppraisalPrintRoot({ className, children }: { className?: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = ref.current;
        if (!root) return;

        const fit = () => fitPages(root);
        const onPrint = () => {
            fit();
            requestAnimationFrame(fit);
        };
        fit();
        const soon = window.setTimeout(fit, 60);
        const later = window.setTimeout(fit, 300);
        const images = Array.from(root.querySelectorAll('img'));
        images.forEach((img) => img.addEventListener('load', fit));
        window.addEventListener('beforeprint', onPrint);
        window.addEventListener('resize', fit);
        const media = window.matchMedia('print');
        media.addEventListener('change', onPrint);

        return () => {
            window.clearTimeout(soon);
            window.clearTimeout(later);
            images.forEach((img) => img.removeEventListener('load', fit));
            window.removeEventListener('beforeprint', onPrint);
            window.removeEventListener('resize', fit);
            media.removeEventListener('change', onPrint);
        };
    });

    return (
        <div ref={ref} className={className}>
            <style>{PRINT_CSS}</style>
            {children}
        </div>
    );
}
