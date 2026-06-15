/** PF amounts are whole taka — no decimal places in display. */
export function formatPfAmount(n: number | string | null | undefined): string {
    const v = Math.round(Number(n ?? 0));
    if (!Number.isFinite(v)) {
        return '0';
    }
    return v.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function roundPfAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}
