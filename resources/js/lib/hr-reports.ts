/** Keep in sync with config/hr_reports.php */
export const HR_REPORT_NAV = [
    {
        slug: 'staff-by-designation',
        title: 'Staff Report By Designation (Active & Inactive)',
        shortTitle: 'Staff Report by Designation',
        orientation: 'portrait',
    },
    {
        slug: 'active-staff-all-units',
        title: 'Active Staff Report (AU)',
        shortTitle: 'Active Staff Report (AU)',
        orientation: 'landscape',
    },
    {
        slug: 'branch-wise-active-staff',
        title: 'Branch-wise Active Staff Report',
        shortTitle: 'Branch-wise Active Staff',
        orientation: 'landscape',
    },
    {
        slug: 'branch-wise-active-staff-pksf',
        title: 'Branch-wise Active Staff Report (for PKSF)',
        shortTitle: 'Active Staff (for PKSF)',
        orientation: 'landscape',
    },
    {
        slug: 'microfinance-field-staff-summary',
        title: 'Microfinance Field Staff Summary (Without Head Office)',
        shortTitle: 'Microfinance Field Staff Summary',
        orientation: 'landscape',
    },
    {
        slug: 'microfinance-head-office-staff-summary',
        title: 'Microfinance Head Office Staff Summary',
        shortTitle: 'Head Office Staff Summary',
        orientation: 'landscape',
    },
    {
        slug: 'zone-region-wise-summary',
        title: 'Zone & Region-wise Summary',
        shortTitle: 'Zone & Region-wise Summary',
        orientation: 'landscape',
    },
    {
        slug: 'zone-wise-summary',
        title: 'Zone Wise Summary',
        shortTitle: 'Zone Wise Summary',
        orientation: 'landscape',
    },
    {
        slug: 'location-wise-summary-ratio',
        title: 'Location-Wise Summary & Ratio',
        shortTitle: 'Location-Wise Summary & Ratio',
        orientation: 'landscape',
    },
    {
        slug: 'designation-recruitment-separation-final-payment',
        title: 'Designation-wise Recruitment, Separation & Final Payment Report',
        shortTitle: 'Recruitment, Separation & Settlement',
        orientation: 'landscape',
    },
    {
        slug: 'branch-wise-probation-salary-increase',
        title: 'Branch Wise Active Staff Probation Period Salary Increase Report',
        shortTitle: 'Probation Salary Increase',
        orientation: 'landscape',
    },
    {
        slug: 'branch-wise-active-staff-confirmation',
        title: 'Branch Wise Active Staff Confirmation Report',
        shortTitle: 'Staff Confirmation Report',
        orientation: 'landscape',
    },
    {
        slug: 'branch-wise-active-promotion',
        title: 'Branch-wise Active Promotion Report',
        shortTitle: 'Active Promotion Report',
        orientation: 'landscape',
    },
] as const;

export type HrReportSlug = (typeof HR_REPORT_NAV)[number]['slug'];

export function hrReportPath(slug: string): string {
    return `/hr/reports/${slug}`;
}

export function hrReportsIndexPath(): string {
    return '/hr/reports';
}
