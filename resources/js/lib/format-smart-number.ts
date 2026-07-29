/**
 * Format numbers without unnecessary decimals.
 * 12000.00 → "12,000" | 12500.22 → "12,500.22" | 12500.20 → "12,500.2"
 */
export function formatSmartNumber(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
        return '—';
    }

    if (Math.abs(num - Math.round(num)) < 1e-9) {
        return Math.round(num).toLocaleString();
    }

    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export function formatSmartKm(value: string | number | null | undefined): string {
    const formatted = formatSmartNumber(value);
    return formatted === '—' ? formatted : `${formatted} km`;
}
