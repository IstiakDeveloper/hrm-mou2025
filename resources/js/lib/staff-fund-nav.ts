import type { LucideIcon } from 'lucide-react';
import { FileBarChart2, Gift, HandCoins, Landmark, List, Percent, Wallet } from 'lucide-react';

export const STAFF_FUND_SECTION_ID = 'staff-fund' as const;

export type StaffFundNavItem = {
    title: string;
    path: string;
    permission?: string;
    description?: string;
};

export type StaffFundNavGroup = {
    id: 'pf' | 'gratuity' | 'settlement';
    title: string;
    icon: LucideIcon;
    defaultPath: string;
    items: StaffFundNavItem[];
};

/** Append `section=staff-fund` so the sidebar stays in Staff Fund context. */
export function staffFundPath(path: string): string {
    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('section', STAFF_FUND_SECTION_ID);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

export const STAFF_FUND_NAV_GROUPS: StaffFundNavGroup[] = [
    {
        id: 'pf',
        title: 'PF',
        icon: Landmark,
        defaultPath: '/provident-fund',
        items: [
            {
                title: 'PF Register',
                path: '/provident-fund',
                description: 'Employee PF register — initial balance, manual PF, ledger',
            },
            {
                title: 'PF Interest',
                path: '/provident-fund/interest',
                description: 'Yearly interest by PF balance share — 50% own / 50% org',
            },
            {
                title: 'PF Withdrawal',
                path: '/provident-fund/withdrawals',
                description: 'PF payment to employees',
            },
        ],
    },
    {
        id: 'gratuity',
        title: 'Gratuity',
        icon: Gift,
        defaultPath: '/gratuity',
        items: [
            {
                title: 'Entitlements',
                path: '/gratuity',
                description: 'Calculated gratuity by tenure × basic salary',
            },
            {
                title: 'Payment records',
                path: '/gratuity/payments',
            },
            {
                title: 'Gratuity rules',
                path: '/gratuity/rules',
            },
        ],
    },
    {
        id: 'settlement',
        title: 'Settlement',
        icon: HandCoins,
        defaultPath: '/final-payments',
        items: [
            {
                title: 'Final Payment',
                path: '/final-payments',
                description: 'Separation settlement — PF, gratuity & loan clearance',
            },
        ],
    },
];

export const STAFF_FUND_DASHBOARD_SHORTCUTS = {
    pf: [
        { title: 'PF Register', href: '/provident-fund', icon: List },
        { title: 'PF Interest', href: '/provident-fund/interest', icon: Percent },
        { title: 'PF Withdrawal', href: '/provident-fund/withdrawals', icon: Wallet },
    ],
    gratuity: [
        { title: 'Entitlements', href: '/gratuity', icon: Gift },
        { title: 'Payment records', href: '/gratuity/payments', icon: Wallet },
        { title: 'Gratuity rules', href: '/gratuity/rules', icon: FileBarChart2 },
    ],
    settlement: [{ title: 'Final Payment', href: '/final-payments', icon: HandCoins }],
} as const;
