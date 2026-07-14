/** Employee loan amounts are whole numbers — no decimal places in display. */
import { formatTakaWhole, formatTakaWithSymbol } from '@/lib/taka-format';

export function fmtLoanAmount(n: number | string | null | undefined): string {
    return formatTakaWhole(n);
}

/** Amortized EMI — two decimal places for display only. */
export function fmtLoanEmiExact(n: number | string | null | undefined): string {
    return formatTakaWithSymbol(n, 2);
}

export function roundLoanAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}
