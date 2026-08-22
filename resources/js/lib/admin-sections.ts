import type { LucideIcon } from 'lucide-react';
import {
    Boxes,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    ClipboardList,
    Coins,
    GraduationCap,
    HandCoins,
    Package,
    Settings,
    Users,
} from 'lucide-react';

export type AdminSectionId =
    | 'human-resources'
    | 'attendance-movement'
    | 'leave'
    | 'employee-loan'
    | 'staff-fund'
    | 'payroll'
    | 'fixed-asset'
    | 'inventory'
    | 'store'
    | 'recruitment'
    | 'training'
    | 'administration';

export type AdminSection = {
    id: AdminSectionId;
    title: string;
    description?: string;
    icon: LucideIcon;
    /** Route to jump into the module (if implemented). */
    href?: string;
    /** Stable keys matching `AdminLayout` menu items for this section. */
    menuKeys?: string[];
    /** @deprecated Use menuKeys — kept for backwards compatibility during migration. */
    menuTitles?: string[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
    {
        id: 'human-resources',
        title: 'HUMAN RESOURCES',
        description: 'Employee, organization & transfers',
        icon: Users,
        href: '/sections/human-resources',
        menuKeys: ['my-notices', 'employee-management', 'organization-setup', 'holidays', 'transfer-promotion', 'section-reports'],
    },
    {
        id: 'attendance-movement',
        title: 'ATTENDANCE & MOVEMENT',
        description: 'Attendance and field movement',
        icon: ClipboardList,
        href: '/sections/attendance-movement',
        menuKeys: ['attendance', 'movement', 'section-reports'],
    },
    {
        id: 'leave',
        title: 'LEAVE',
        description: 'Leave applications & settings',
        icon: CalendarDays,
        href: '/sections/leave',
        menuKeys: ['leave-management', 'section-reports'],
    },
    {
        id: 'employee-loan',
        title: 'EMPLOYEE LOAN',
        description: 'Loans & installments',
        icon: HandCoins,
        href: '/sections/employee-loan',
        menuKeys: ['el-setup', 'el-process', 'el-register', 'el-collection', 'section-reports'],
    },
    {
        id: 'staff-fund',
        title: 'STAFF FUND',
        description: 'Provident Fund & Gratuity',
        icon: Coins,
        href: '/sections/staff-fund',
        menuKeys: ['sf-pf', 'sf-gratuity', 'sf-settlement', 'section-reports'],
    },
    {
        id: 'payroll',
        title: 'PAYROLL',
        description: 'Salary setup & payslips',
        icon: BriefcaseBusiness,
        href: '/sections/payroll',
        menuKeys: ['payroll-setup', 'bonus', 'salary', 'section-reports'],
    },
    {
        id: 'fixed-asset',
        title: 'FIXED ASSET',
        description: 'Asset tracking across branches',
        icon: Boxes,
        href: '/sections/fixed-asset',
        menuKeys: ['my-assets', 'fa-settings', 'fa-custodian', 'fa-purchase', 'fa-asset', 'fa-stock', 'fa-depreciation', 'fa-transfer', 'fa-disposal', 'fa-reports'],
    },
    {
        id: 'inventory',
        title: 'INVENTORY',
        description: 'Stock, items & issuance',
        icon: Package,
        href: '/sections/inventory',
        menuKeys: ['inv-products', 'inv-operations', 'inv-reports'],
    },
    {
        id: 'store',
        title: 'STORE',
        description: 'Inventory & stock',
        icon: Package,
    },
    {
        id: 'recruitment',
        title: 'RECRUITMENT',
        description: 'Hiring pipeline',
        icon: Building2,
    },
    {
        id: 'training',
        title: 'TRAINING',
        description: 'Programs & attendance',
        icon: GraduationCap,
    },
    {
        id: 'administration',
        title: 'ADMINISTRATION',
        description: 'System & access control',
        icon: Settings,
        href: '/sections/administration',
        menuKeys: ['admin-user-management', 'section-reports', 'admin-settings'],
    },
];

const STORAGE_KEY = 'hrm.activeSection';

export function readStoredSection(): AdminSectionId | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return (ADMIN_SECTIONS.some((s) => s.id === raw) ? raw : null) as AdminSectionId | null;
    } catch {
        return null;
    }
}

export function storeSection(sectionId: AdminSectionId) {
    try {
        window.localStorage.setItem(STORAGE_KEY, sectionId);
    } catch {
        // ignore storage errors (private mode, etc.)
    }
}

export function getSectionFromSearch(search: string): AdminSectionId | null {
    const params = new URLSearchParams(search);
    const s = params.get('section');
    if (!s) return null;
    return (ADMIN_SECTIONS.some((x) => x.id === s) ? s : null) as AdminSectionId | null;
}

export function inferSectionFromPath(pathname: string): AdminSectionId | null {
    const p = pathname || '/';

    if (p.startsWith('/sections/')) {
        const seg = p.split('/').filter(Boolean)[1] || '';
        return (ADMIN_SECTIONS.some((s) => s.id === seg) ? seg : null) as AdminSectionId | null;
    }

    if (p.startsWith('/leave')) return 'leave';
    if (p.startsWith('/transfers') || p.startsWith('/promotions') || p.startsWith('/demotions')) {
        return 'human-resources';
    }
    if (p.startsWith('/reports/attendance')) return 'attendance-movement';
    if (p.startsWith('/reports/leave')) return 'leave';
    if (p.startsWith('/reports/movement')) return 'attendance-movement';
    if (p.startsWith('/reports/transfer')) return 'human-resources';
    if (p.startsWith('/reports/employee')) return 'human-resources';
    if (p.startsWith('/attendance') || p.startsWith('/movements') || p.startsWith('/movement-log-books') || p.startsWith('/movement-log-book-payments') || p.startsWith('/zkteco')) {
        return 'attendance-movement';
    }
    if (
        p.startsWith('/sections/staff-fund')
        || p.startsWith('/provident-fund')
        || p.startsWith('/gratuity')
        || p.startsWith('/final-payments')
        || p.startsWith('/employee/staff-fund')
        || p === '/payroll/reports/final-payment'
        || p.startsWith('/payroll/reports/final-payment/')
    ) {
        return 'staff-fund';
    }
    if (p.startsWith('/sections/payroll') || p.startsWith('/employee/payroll')) {
        return 'payroll';
    }
    if (p.startsWith('/employee/loan')) {
        return 'employee-loan';
    }
    if (
        p.startsWith('/employees') ||
        p.startsWith('/confirmations') ||
        p.startsWith('/separations') ||
        p.startsWith('/branches') ||
        p.startsWith('/organization-structure') ||
        p.startsWith('/zones') ||
        p.startsWith('/regional-offices') ||
        p.startsWith('/departments') ||
        p.startsWith('/designations') ||
        p.startsWith('/holidays') ||
        p.startsWith('/organization-chart') ||
        p.startsWith('/employee-types') ||
        p.startsWith('/programs') ||
        p.startsWith('/projects') ||
        p.startsWith('/my-notices') ||
        p.startsWith('/employee/')
    ) {
        return 'human-resources';
    }
    if (p.startsWith('/admin/') || p.startsWith('/reports')) return 'administration';
    if (
        p.startsWith('/inventory')
    ) {
        return 'inventory';
    }
    if (
        p.startsWith('/asset-categories') ||
        p.startsWith('/fixed-asset/settings') ||
        p.startsWith('/fixed-asset/custodian') ||
        p.startsWith('/fixed-asset/purchases') ||
        p.startsWith('/fixed-asset/assets') ||
        p.startsWith('/fixed-asset/stock') ||
        p.startsWith('/fixed-asset/depreciation') ||
        p.startsWith('/fixed-asset/transfer') ||
        p.startsWith('/fixed-asset/disposal') ||
        p.startsWith('/fixed-asset/disposals') ||
        p.startsWith('/fixed-assets') ||
        p.startsWith('/asset-assignments') ||
        p.startsWith('/asset-maintenances') ||
        p.startsWith('/asset-transfers') ||
        p.startsWith('/fixed-asset/reports')
    ) {
        return 'fixed-asset';
    }
    if (
        p.startsWith('/payscales') ||
        p.startsWith('/salary-grades') ||
        p.startsWith('/salary-steps') ||
        p.startsWith('/salary-heads') ||
        p.startsWith('/salary-structures') ||
        p.startsWith('/branch-payroll-banks') ||
        p.startsWith('/bonus-types') ||
        p.startsWith('/bonus-configurations') ||
        p.startsWith('/bonus-calculation') ||
        p.startsWith('/bonus-post') ||
        p.startsWith('/salary-head-modifications') ||
        p.startsWith('/probation-salary') ||
        p.startsWith('/fixed-salary') ||
        p.startsWith('/salary-withheld') ||
        p.startsWith('/salary-process') ||
        p.startsWith('/salary-post') ||
        p.startsWith('/salary-rollback') ||
        p.startsWith('/payroll/reports')
    ) {
        return 'payroll';
    }
    if (
        p.startsWith('/employee-loans')
        || p.startsWith('/employee/loan')
        || p.startsWith('/loan-policies')
        || p.startsWith('/loan-committees')
        || p.startsWith('/loan-applications')
        || p.startsWith('/loan-approval')
        || p.startsWith('/loan-disburse')
        || p.startsWith('/loan-migration')
        || p.startsWith('/loan-rollback')
        || p.startsWith('/loan-collection')
        || p.startsWith('/loan-transfer')
        || p.startsWith('/employee-loan/reports')
    ) {
        return 'employee-loan';
    }

    return null;
}

export function getActiveSectionId(location: Location): AdminSectionId | null {
    const fromQuery = getSectionFromSearch(location.search);
    if (fromQuery) {
        storeSection(fromQuery);
        return fromQuery;
    }

    const inferred = inferSectionFromPath(location.pathname);
    if (inferred) {
        storeSection(inferred);
        return inferred;
    }

    return readStoredSection();
}

export function getSectionById(sectionId: AdminSectionId | null) {
    if (!sectionId) return null;
    return ADMIN_SECTIONS.find((s) => s.id === sectionId) ?? null;
}

export function getMenuKeysForSection(sectionId: AdminSectionId | null): string[] | null {
    const s = getSectionById(sectionId);
    if (s?.menuKeys?.length) {
        return s.menuKeys;
    }
    if (s?.menuTitles?.length) {
        return s.menuTitles;
    }
    return null;
}

/** @deprecated Use getMenuKeysForSection */
export function getMenuTitlesForSection(sectionId: AdminSectionId | null): string[] | null {
    return getMenuKeysForSection(sectionId);
}

export function withSectionParam(path: string, sectionId: AdminSectionId): string {
    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('section', sectionId);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

