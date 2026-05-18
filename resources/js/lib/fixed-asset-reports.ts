/** Sidebar / navigation entries — keep in sync with config/fixed_asset_reports.php */
export const FIXED_ASSET_REPORT_NAV = [
    { slug: 'asset-tracking', title: 'Asset Tracking' },
    { slug: 'asset-vendor-list', title: 'Asset Vendor List' },
    { slug: 'purchase-list-branch-wise', title: 'Asset Purchase List (Branch Wise)' },
    { slug: 'purchase-list-category-wise', title: 'Asset Purchase List (Category Wise)' },
    { slug: 'purchase-list-month-wise', title: 'Asset Purchase List (Month Wise)' },
    { slug: 'asset-repair-list', title: 'Asset Repair List' },
    { slug: 'asset-transfer-list', title: 'Asset Transfer List' },
    { slug: 'salvaged-asset-list', title: 'Salvaged Asset List' },
    { slug: 'disposal-asset-list', title: 'Disposal Asset List' },
    { slug: 'category-wise-schedule', title: 'Category Wise Schedule' },
    { slug: 'branch-wise-schedule', title: 'Branch Wise Schedule' },
    { slug: 'category-wise-schedule-2', title: 'Category Wise Schedule-2' },
    { slug: 'branch-wise-schedule-2', title: 'Branch Wise Schedule-2' },
    { slug: 'category-wise-schedule-audit', title: 'Category Wise Schedule (Audit)' },
    { slug: 'branch-wise-schedule-audit', title: 'Branch Wise Schedule (Audit)' },
] as const;

export function fixedAssetReportPath(slug: string): string {
    return `/fixed-asset/reports/${slug}`;
}
