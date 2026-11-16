/**
 * Parse dates from Excel import: yyyy-mm-dd, dd/mm/yyyy, Excel serial numbers.
 */
export function parseImportDate(value: unknown): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const serial = Number(trimmed);
        if (serial >= 1 && serial <= 200000) {
            const utcMs = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
            const d = new Date(utcMs);
            if (!Number.isNaN(d.getTime())) {
                return d.toISOString().slice(0, 10);
            }
        }
    }

    const normalized = trimmed.replace(/[.\-]/g, '/');
    const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    return '';
}

export function isValidImportDate(value: string): boolean {
    return parseImportDate(value) !== '';
}
