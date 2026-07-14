export const PAYROLL_SECTION_ID = 'payroll' as const;

/** Append `section=payroll` so the sidebar stays in Payroll context. */
export function payrollEmployeePath(path: string): string {
    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('section', PAYROLL_SECTION_ID);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
