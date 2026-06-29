/**
 * Bangladeshi amount display — lakh/crore grouping (e.g. 12,34,567 not 1,234,567).
 *
 * Uses en-IN locale (Indian numbering). en-BD incorrectly uses million-style grouping.
 */
const BD_AMOUNT_LOCALE = 'en-IN';

export function formatTakaAmount(
    n: number | string | null | undefined,
    decimals = 0,
): string {
    const v = Number(n ?? 0);
    if (!Number.isFinite(v)) {
        return decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0';
    }
    return v.toLocaleString(BD_AMOUNT_LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** Whole taka — no decimal places (payroll default). */
export function formatTakaWhole(n: number | string | null | undefined): string {
    return formatTakaAmount(n, 0);
}

/** Amount with ৳ prefix. */
export function formatTakaWithSymbol(
    n: number | string | null | undefined,
    decimals = 0,
): string {
    return `৳${formatTakaAmount(n, decimals)}`;
}

/** Salary-sheet style: zero shows as dash. */
export function formatTakaSheetCell(n: unknown): string {
    const v = Number(n);
    if (!Number.isFinite(v)) {
        return '-';
    }
    const rounded = Math.round(v);
    return rounded === 0 ? '-' : formatTakaWhole(rounded);
}
