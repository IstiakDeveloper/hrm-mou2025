import type { LucideIcon } from 'lucide-react';
import { Boxes, Calculator, CalendarRange, FileBarChart2, Layers, Package, PenLine, RotateCcw, ShoppingCart, Trash2, TrendingDown, Truck, UserCheck } from 'lucide-react';
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
        title: 'Purchase Asset',
        icon: ShoppingCart,
        defaultPath: '/fixed-asset/purchases',
        items: [
            { title: 'Purchase List', path: '/fixed-asset/purchases', description: 'All asset purchases' },
            { title: 'New Purchase', path: '/fixed-asset/purchases/create', permission: 'fixed-assets.create', description: 'Record purchase and create assets' },
        ],
    },
    {
        id: 'asset',
        title: 'Asset',
        icon: Package,
        defaultPath: '/fixed-asset/assets/tracking',
        items: [
            { title: 'Asset Tracking', path: '/fixed-asset/assets/tracking', description: 'Track assets by branch, project, category' },
            { title: 'Asset Insurance', path: '/fixed-asset/assets/insurance', description: 'Insurance policies for assets' },
            { title: 'Asset Warranty', path: '/fixed-asset/assets/warranties', description: 'Warranty records' },
            { title: 'Asset Guaranty', path: '/fixed-asset/assets/guarantees', description: 'Guarantee records' },
            { title: 'Asset Not in Use', path: '/fixed-asset/assets/not-in-use', description: 'Idle / not-in-use assets' },
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
        defaultPath: '/fixed-asset/depreciation/calculation',
        items: [
            { title: 'Calculation', path: '/fixed-asset/depreciation/calculation', description: 'Preview depreciation before posting' },
            { title: 'Posting', path: '/fixed-asset/depreciation/posting', description: 'Post monthly depreciation for a FY period' },
            { title: 'Rollback', path: '/fixed-asset/depreciation/rollback', permission: 'fixed-assets.edit', description: 'Reverse auto-posted depreciation' },
            { title: 'Manual', path: '/fixed-asset/depreciation/manual', permission: 'fixed-assets.edit', description: 'One-off manual depreciation entry' },
        ],
    },
    {
        id: 'transfer',
        title: 'Transfer',
        icon: Truck,
        defaultPath: '/fixed-asset/transfer/branch',
        items: [
            { title: 'Branch', path: '/fixed-asset/transfer/branch', description: 'Transfer assets between branches' },
            { title: 'Project', path: '/fixed-asset/transfer/project/create', permission: 'fixed-assets.edit', description: 'Move assets between projects' },
            { title: 'Custodian', path: '/fixed-asset/transfer/custodian/create', permission: 'fixed-assets.edit', description: 'Transfer custodian responsibility' },
            { title: 'History', path: '/fixed-asset/transfer/history', description: 'All transfer history' },
        ],
    },
    {
        id: 'disposal',
        title: 'Disposal',
        icon: Trash2,
        defaultPath: '/fixed-asset/disposal/requests',
        items: [
            { title: 'Disposal Reason', path: '/fixed-asset/disposal/reasons', description: 'Master disposal reasons' },
            { title: 'Disposal Request', path: '/fixed-asset/disposal/requests', description: 'Submit disposal for approval' },
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

export function fixedAssetPath(path: string): string {
    return path;
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
