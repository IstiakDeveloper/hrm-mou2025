import { staffFundPath } from '@/lib/staff-fund-nav';

/** Keep in sync with config/gratuity_reports.php */
export const GRATUITY_REPORT_NAV = [
    { slug: 'gratuity-ledger', title: 'Gratuity Ledger' },
    { slug: 'entitlements-register', title: 'Gratuity Entitlements Register' },
    { slug: 'eligible-employees', title: 'Eligible Employees List' },
    { slug: 'projected-liability', title: 'Projected Gratuity Liability' },
    { slug: 'liability-by-department', title: 'Gratuity Liability by Department' },
    { slug: 'unpaid-liability', title: 'Unpaid Gratuity Liability' },
    { slug: 'settlement-history', title: 'Gratuity Settlement History' },
    { slug: 'payment-summary', title: 'Gratuity Payment Summary' },
    { slug: 'gratuity-rules', title: 'Gratuity Rules & Tiers' },
] as const;

export function gratuityReportPath(slug: string): string {
    return staffFundPath(`/gratuity/reports/${slug}`);
}

export function gratuityReportsIndexPath(): string {
    return staffFundPath('/gratuity/reports');
}
