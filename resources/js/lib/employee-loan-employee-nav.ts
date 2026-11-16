export const EMPLOYEE_LOAN_SECTION_ID = 'employee-loan' as const;

export function employeeLoanEmployeePath(path: string): string {
    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('section', EMPLOYEE_LOAN_SECTION_ID);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
