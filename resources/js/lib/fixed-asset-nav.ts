import type { LucideIcon } from 'lucide-react';
import { Boxes, ClipboardList, FileBarChart2, Layers, Package, ShieldCheck, ShoppingCart, Trash2, TrendingDown, Truck, UserCheck, Wrench } from 'lucide-react';
import { withSectionParam } from '@/lib/admin-sections';
import { FIXED_ASSET_REPORT_NAV, fixedAssetReportPath } from '@/lib/fixed-asset-reports';

export const FIXED_ASSET_SECTION_ID = 'fixed-asset' as const;

export type FixedAssetNavItem = {
    title: string;
    path: string;
    permission?: string;
    description?: string;
};

export type FixedAssetNavGroup = {
    id: 'settings' | 'custodian' | 'purchase' | 'asset' | 'stock' | 'depreciation' | 'transfer' | 'disposal' | 'reports';
    title: string;
    icon: LucideIcon;
    defaultPath: string;
    items: FixedAssetNavItem[];
};

export const FIXED_ASSET_NAV_GROUPS: FixedAssetNavGroup[] = [
    {
        id: 'settings',
        title: 'Settings',
        icon: Boxes,
        defaultPath: '/fixed-asset/settings/financial-years',
        items: [
            { title: 'Financial Year', path: '/fixed-asset/settings/financial-years', description: 'Bangladesh FY (July–June)' },
            { title: 'Vendor', path: '/fixed-asset/settings/vendors', description: 'Asset suppliers and vendors' },
            { title: 'Category', path: '/fixed-asset/settings/categories', description: 'Asset categories and depreciation defaults' },
            { title: 'Sub Category', path: '/fixed-asset/settings/sub-categories', description: 'Sub categories under main categories' },
        ],
    },
    {
        id: 'custodian',
        title: 'Custodian',
        icon: UserCheck,
        defaultPath: '/fixed-asset/custodian/custodians',
        items: [
            { title: 'Department', path: '/fixed-asset/custodian/departments', description: 'Custodian departments' },
            { title: 'Designation', path: '/fixed-asset/custodian/designations', description: 'Custodian designations' },
            { title: 'Custodian', path: '/fixed-asset/custodian/custodians', description: 'Custodian register' },
            { title: 'Custodian Change', path: '/fixed-asset/custodian/changes', description: 'Assign or release custodians' },
        ],
    },
    {
        id: 'purchase',
        title: 'Purchases',
        icon: ShoppingCart,
        defaultPath: '/fixed-asset/purchases',
        items: [
            { title: 'Purchase List', path: '/fixed-asset/purchases', description: 'All asset purchases' },
            { title: 'New Purchase', path: '/fixed-asset/purchases/create', permission: 'fixed-assets.create', description: 'Record purchase and create assets' },
        ],
    },
    {
        id: 'asset',
        title: 'Asset Register',
        icon: Package,
        defaultPath: '/fixed-assets',
        items: [
            { title: 'Asset Register', path: '/fixed-assets', description: 'Browse, search, view, and edit fixed assets' },
            { title: 'Register New Asset', path: '/fixed-assets/create', permission: 'fixed-assets.create', description: 'Create a fixed asset manually' },
            { title: 'Import Assets', path: '/fixed-assets/import', permission: 'fixed-assets.create', description: 'Bulk import assets from CSV' },
            { title: 'Asset Tracking', path: '/fixed-asset/assets/tracking', description: 'Track assets by branch, project, category' },
            { title: 'Assignments', path: '/asset-assignments', description: 'Assign assets to employees and manage releases' },
            { title: 'Maintenance', path: '/asset-maintenances', description: 'Maintenance register and work history' },
            { title: 'Insurance', path: '/fixed-asset/assets/insurance', description: 'Insurance policies for assets' },
            { title: 'Warranties', path: '/fixed-asset/assets/warranties', description: 'Warranty records' },
            { title: 'Guarantees', path: '/fixed-asset/assets/guarantees', description: 'Guarantee records' },
            { title: 'Not In Use', path: '/fixed-asset/assets/not-in-use', description: 'Idle or temporarily inactive assets' },
        ],
    },
    {
        id: 'stock',
        title: 'Stock',
        icon: Layers,
        defaultPath: '/fixed-asset/stock/category-wise',
        items: [
            { title: 'Category Wise', path: '/fixed-asset/stock/category-wise', description: 'Stock summary by category and sub category' },
            { title: 'Branch Wise', path: '/fixed-asset/stock/branch-wise', description: 'Stock summary by branch' },
        ],
    },
    {
        id: 'depreciation',
        title: 'Depreciation',
        icon: TrendingDown,
        defaultPath: '/fixed-asset/depreciation',
        items: [
            { title: 'Overview', path: '/fixed-asset/depreciation', description: 'Monthly depreciation runs and summaries' },
            { title: 'Calculation', path: '/fixed-asset/depreciation/calculation', description: 'Preview depreciation before posting' },
            { title: 'Posting', path: '/fixed-asset/depreciation/posting', description: 'Post monthly depreciation for a FY period' },
            { title: 'Rollback', path: '/fixed-asset/depreciation/rollback', permission: 'fixed-assets.edit', description: 'Reverse auto-posted depreciation' },
            { title: 'Manual', path: '/fixed-asset/depreciation/manual', permission: 'fixed-assets.edit', description: 'One-off manual depreciation entry' },
        ],
    },
    {
        id: 'transfer',
        title: 'Transfers',
        icon: Truck,
        defaultPath: '/fixed-asset/transfer/branch',
        items: [
            { title: 'Branch Transfers', path: '/fixed-asset/transfer/branch', description: 'Transfer assets between branches' },
            { title: 'Project Transfer', path: '/fixed-asset/transfer/project/create', permission: 'fixed-assets.edit', description: 'Move assets between projects' },
            { title: 'Custodian Transfer', path: '/fixed-asset/transfer/custodian/create', permission: 'fixed-assets.edit', description: 'Transfer custodian responsibility' },
            { title: 'Transfer History', path: '/fixed-asset/transfer/history', description: 'All transfer history' },
        ],
    },
    {
        id: 'disposal',
        title: 'Disposals',
        icon: Trash2,
        defaultPath: '/fixed-asset/disposal/requests',
        items: [
            { title: 'Disposal Register', path: '/fixed-asset/disposals', description: 'Approved and completed disposal history' },
            { title: 'Disposal Requests', path: '/fixed-asset/disposal/requests', description: 'Submit disposal for approval' },
            { title: 'Disposal Reasons', path: '/fixed-asset/disposal/reasons', description: 'Master disposal reasons' },
            { title: 'Dispose Asset', path: '/fixed-asset/disposal/dispose/create', permission: 'fixed-assets.delete', description: 'Directly dispose a single asset' },
            { title: 'Batch Dispose', path: '/fixed-asset/disposal/batch/create', permission: 'fixed-assets.delete', description: 'Dispose multiple assets at once' },
        ],
    },
    {
        id: 'reports',
        title: 'Reports',
        icon: FileBarChart2,
        defaultPath: fixedAssetReportPath(FIXED_ASSET_REPORT_NAV[0].slug),
        items: FIXED_ASSET_REPORT_NAV.map((report) => ({
            title: report.title,
            path: fixedAssetReportPath(report.slug),
            description: 'Generate, preview, print, or export',
        })),
    },
];

export const BRANCH_FIXED_ASSET_NAV_GROUP_IDS = ['purchase', 'stock', 'depreciation', 'reports'] as const;

const BRANCH_STOCK_PATHS = new Set(['/fixed-asset/stock/category-wise']);
const BRANCH_DEPRECIATION_PATHS = new Set([
    '/fixed-asset/depreciation',
    '/fixed-asset/depreciation/calculation',
]);

function itemPathBase(path: string): string {
    return path.split('?')[0];
}

export function filterFixedAssetNavGroupForBranch(group: FixedAssetNavGroup): FixedAssetNavGroup | null {
    if (!BRANCH_FIXED_ASSET_NAV_GROUP_IDS.includes(group.id as (typeof BRANCH_FIXED_ASSET_NAV_GROUP_IDS)[number])) {
        return null;
    }

    const items = group.items.filter((item) => {
        const base = itemPathBase(item.path);
        if (group.id === 'stock') {
            return BRANCH_STOCK_PATHS.has(base);
        }
        if (group.id === 'depreciation') {
            return BRANCH_DEPRECIATION_PATHS.has(base);
        }
        if (group.id === 'reports') {
            return !base.includes('branch-wise');
        }
        return true;
    });

    if (items.length === 0) {
        return null;
    }

    return { ...group, items, defaultPath: items[0].path };
}

export function branchFixedAssetNavGroups(): FixedAssetNavGroup[] {
    return FIXED_ASSET_NAV_GROUPS.map(filterFixedAssetNavGroupForBranch).filter(
        (group): group is FixedAssetNavGroup => group !== null,
    );
}

export function isBranchFixedAssetMenuPath(path: string, menuKey: string): boolean {
    const base = itemPathBase(path);
    if (menuKey === 'fa-stock') {
        return BRANCH_STOCK_PATHS.has(base);
    }
    if (menuKey === 'fa-depreciation') {
        return BRANCH_DEPRECIATION_PATHS.has(base);
    }
    if (menuKey === 'fa-reports') {
        return !base.includes('branch-wise');
    }
    return true;
}

export function fixedAssetPath(path: string): string {
    return withSectionParam(path, FIXED_ASSET_SECTION_ID);
}

/** Flat shortcuts for section dashboards */
export const FIXED_ASSET_DASHBOARD_LINKS = FIXED_ASSET_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
        group: group.title,
        label: item.title,
        href: item.path,
        permission: item.permission ?? 'fixed-assets.view',
    })),
);
