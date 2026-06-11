/** Employee loan amounts are whole numbers — no decimal places in display. */
export function fmtLoanAmount(n: number | string | null | undefined): string {
    const v = Math.round(Number(n ?? 0));
    if (!Number.isFinite(v)) {
        return '0';
    }
    return v.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function roundLoanAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}
