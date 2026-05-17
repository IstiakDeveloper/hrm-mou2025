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
    /** Which `AdminLayout` menu item titles belong to this section. */
    menuTitles?: string[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
    {
        id: 'human-resources',
        title: 'HUMAN RESOURCES',
        description: 'Employee, organization & transfers',
        icon: Users,
        href: '/sections/human-resources',
        menuTitles: ['Employee Management', 'Organization Setup', 'Holidays', 'Transfers', 'Reports'],
    },
    {
        id: 'attendance-movement',
        title: 'ATTENDANCE & MOVEMENT',
        description: 'Attendance and field movement',
        icon: ClipboardList,
        href: '/sections/attendance-movement',
        menuTitles: ['Attendance', 'Movement', 'Reports'],
    },
    {
        id: 'leave',
        title: 'LEAVE',
        description: 'Leave applications & settings',
        icon: CalendarDays,
        href: '/sections/leave',
        menuTitles: ['Leave Management', 'Reports'],
    },
    {
        id: 'employee-loan',
        title: 'EMPLOYEE LOAN',
        description: 'Loans & installments',
        icon: HandCoins,
    },
    {
        id: 'staff-fund',
        title: 'STUFF FUND',
        description: 'Staff fund operations',
        icon: Coins,
    },
    {
        id: 'payroll',
        title: 'PAYROLL',
        description: 'Salary setup & payslips',
        icon: BriefcaseBusiness,
        href: '/sections/payroll',
        menuTitles: ['Payroll Setup', 'Salary', 'Reports'],
    },
    {
        id: 'fixed-asset',
        title: 'FIXED ASSET',
        description: 'Asset tracking',
        icon: Boxes,
    },
    {
        id: 'inventory',
        title: 'INVENTORY',
        description: 'Stock, items & issuance',
        icon: Package,
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
        menuTitles: ['User Management', 'Reports', 'Settings'],
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
    if (p.startsWith('/transfers')) return 'human-resources';
    if (p.startsWith('/reports/attendance')) return 'attendance-movement';
    if (p.startsWith('/reports/leave')) return 'leave';
    if (p.startsWith('/reports/movement')) return 'attendance-movement';
    if (p.startsWith('/reports/transfer')) return 'human-resources';
    if (p.startsWith('/reports/employee')) return 'human-resources';
    if (p.startsWith('/attendance') || p.startsWith('/movements') || p.startsWith('/zkteco')) {
        return 'attendance-movement';
    }
    if (
        p.startsWith('/employees') ||
        p.startsWith('/branches') ||
        p.startsWith('/zones') ||
        p.startsWith('/regional-offices') ||
        p.startsWith('/departments') ||
        p.startsWith('/designations') ||
        p.startsWith('/holidays') ||
        p.startsWith('/organization-chart') ||
        p.startsWith('/employee-types') ||
        p.startsWith('/programs') ||
        p.startsWith('/projects') ||
        p.startsWith('/employee/')
    ) {
        return 'human-resources';
    }
    if (p.startsWith('/admin/') || p.startsWith('/reports') || p.startsWith('/settings')) return 'administration';
    if (
        p.startsWith('/payscales') ||
        p.startsWith('/salary-grades') ||
        p.startsWith('/salary-steps') ||
        p.startsWith('/salary-heads') ||
        p.startsWith('/salary-structures') ||
        p.startsWith('/branch-payroll-banks')
    ) {
        return 'payroll';
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

export function getMenuTitlesForSection(sectionId: AdminSectionId | null): string[] | null {
    const s = getSectionById(sectionId);
    if (!s?.menuTitles?.length) return null;
    return s.menuTitles;
}

