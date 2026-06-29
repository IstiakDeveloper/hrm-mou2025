/** Employee loan amounts are whole numbers — no decimal places in display. */
import { formatTakaWhole } from '@/lib/taka-format';

export function fmtLoanAmount(n: number | string | null | undefined): string {
    return formatTakaWhole(n);
}

export function roundLoanAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}
