import { employeeLoanPath } from '@/lib/employee-loan-nav';

/** Keep in sync with config/employee_loan_reports.php */
export const EMPLOYEE_LOAN_REPORT_NAV = [
    { slug: 'loan-ledger', title: 'Loan Ledger' },
    { slug: 'loan-disburse-register', title: 'Loan Disburse Register (Employee Wise)' },
    { slug: 'loan-recoverable', title: 'Loan Recoverable' },
    { slug: 'loan-collection-register', title: 'Loan Collection Register' },
    { slug: 'loan-pf-balance', title: 'Loan and PF Balance' },
    { slug: 'full-paid-register', title: 'Full Paid Register' },
    { slug: 'rebate-register', title: 'Rebate Register' },
    { slug: 'loan-statement-employee', title: 'Loan Statement (Employee Wise)' },
    { slug: 'loan-statement-component', title: 'Loan Statement (Component Wise)' },
    { slug: 'loan-statement-branch', title: 'Loan Statement (Branch Wise)' },
] as const;

export function employeeLoanReportPath(slug: string): string {
    return employeeLoanPath(`/employee-loan/reports/${slug}`);
}
