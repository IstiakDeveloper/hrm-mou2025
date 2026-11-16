import { formatTakaWhole } from '@/lib/taka-format';

/** PF amounts are whole taka — no decimal places in display. */
export function formatPfAmount(n: number | string | null | undefined): string {
    return formatTakaWhole(n);
}

export function roundPfAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}
