import type { LucideIcon } from 'lucide-react';
import { ArrowDownToLine, FileBarChart2, Package, Send } from 'lucide-react';

export const INVENTORY_SECTION_ID = 'inventory' as const;

export type InventoryNavItem = {
    title: string;
    path: string;
    permission?: string;
    description?: string;
};

export type InventoryNavGroup = {
    id: 'products' | 'operations' | 'reports';
    title: string;
    icon: LucideIcon;
    defaultPath: string;
    items: InventoryNavItem[];
};

export const INVENTORY_NAV_GROUPS: InventoryNavGroup[] = [
    {
        id: 'products',
        title: 'Products',
        icon: Package,
        defaultPath: '/inventory/products',
        items: [
            { title: 'Product List', path: '/inventory/products', description: 'Item master with unit selection' },
        ],
    },
    {
        id: 'operations',
        title: 'Stock & Disburse',
        icon: ArrowDownToLine,
        defaultPath: '/inventory/operations',
        items: [
            { title: 'Stock In / Disburse', path: '/inventory/operations', description: 'One page — stock in & employee disburse' },
        ],
    },
    {
        id: 'reports',
        title: 'Reports',
        icon: FileBarChart2,
        defaultPath: '/inventory/reports/stock-ledger',
        items: [
            { title: 'Stock Ledger', path: '/inventory/reports/stock-ledger', description: 'All products summary by date range' },
            { title: 'Single Product Ledger', path: '/inventory/reports/product-ledger', description: 'Stock in & disburse tables for one product' },
        ],
    },
];

export function inventoryPath(path: string): string {
    return path;
}
