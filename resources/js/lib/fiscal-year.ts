export function formatFiscalYear(startYear: number | string | null | undefined): string {
    const start = Number(startYear);
    if (!Number.isFinite(start)) {
        return String(startYear ?? '');
    }

    return `${start}-${start + 1}`;
}

/** Last completed Bangladesh fiscal year start (July–June). */
export function lastCompletedFiscalStartYear(date = new Date()): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    return month >= 7 ? year - 1 : year - 2;
}

export function fiscalYearOptions(startYears: number[]): { value: string; label: string }[] {
    return startYears.map((year) => ({
        value: String(year),
        label: formatFiscalYear(year),
    }));
}
