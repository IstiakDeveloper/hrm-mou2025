import { staffFundPath } from '@/lib/staff-fund-nav';

/** Keep in sync with config/pf_reports.php */
export const PF_REPORT_NAV = [
    { slug: 'pf-ledger', title: 'PF Ledger' },
    { slug: 'pf-contribution-loan-deduction', title: 'PF Contribution and Loan Deduction' },
    { slug: 'pf-deduction-register', title: 'PF Deduction Register' },
    { slug: 'pf-interest-register', title: 'PF Interest Register' },
    { slug: 'pf-refund-register', title: 'PF Refund Register' },
    { slug: 'pf-balance-register', title: 'PF Balance Register' },
    { slug: 'pf-balance-register-details', title: 'PF Balance Register (Details)' },
    { slug: 'pf-balance-by-branch', title: 'PF Balance Register (Branch Wise)' },
    { slug: 'pf-transaction-register', title: 'PF Transaction Register' },
    { slug: 'pf-balance-by-department', title: 'PF Balance by Department' },
] as const;

export function pfReportPath(slug: string): string {
    return staffFundPath(`/provident-fund/reports/${slug}`);
}

export function pfReportsIndexPath(): string {
    return staffFundPath('/provident-fund/reports');
}
