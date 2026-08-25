import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowLeftRight,
    Award,
    BarChart,
    BarChart3,
    Bell,
    Boxes,
    BriefcaseBusiness,
    Building2,
    Calendar,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    Coins,
    FileSpreadsheet,
    HandCoins,
    Home,
    KeyRound,
    LayoutDashboard,
    LayoutGrid,
    LogOut,
    MapPin,
    Menu,
    MonitorSmartphone,
    Package,
    PanelLeft,
    Settings,
    SlidersHorizontal,
    User,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

function getSubNavIcon(title: string, path: string): React.ReactNode {
    const t = title.toLowerCase();
    const p = path.toLowerCase();

    if (t.includes('dashboard') || t.includes('overview') || t.includes('my hr') || t.includes('my staff fund') || t.includes('my loan') || t.includes('my payroll')) {
        return <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('daily attendance') || t.includes('attendance') || t.includes('punches')) {
        return <Users className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('monthly') || t.includes('calendar') || t.includes('holiday')) {
        return <CalendarDays className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('sheet') || t.includes('export')) {
        return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('report') || t.includes('summary')) {
        return <BarChart3 className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('movement') || t.includes('transfer') || t.includes('location')) {
        return <MapPin className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('device') || t.includes('terminal') || t.includes('sync')) {
        return <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('employee') || t.includes('user') || t.includes('profile')) {
        return <User className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('leave') || t.includes('application')) {
        return <Calendar className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('loan') || t.includes('installment')) {
        return <HandCoins className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('fund') || t.includes('pf') || t.includes('gratuity')) {
        return <Coins className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('payroll') || t.includes('salary') || t.includes('payslip') || t.includes('bonus')) {
        return <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('asset') || t.includes('custodian')) {
        return <Boxes className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('inventory') || t.includes('product') || t.includes('stock')) {
        return <Package className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('password')) {
        return <KeyRound className="h-3.5 w-3.5 shrink-0" />;
    }
    if (t.includes('admin') || t.includes('role') || t.includes('setting')) {
        return <Settings className="h-3.5 w-3.5 shrink-0" />;
    }

    return <Activity className="h-3.5 w-3.5 shrink-0" />;
}

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

import ActiveMovementBanner from '@/components/active-movement-banner';
import NotificationDropdown from '@/components/notification-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { getActiveSectionId, getMenuKeysForSection, getSectionById, withSectionParam, type AdminSectionId } from '@/lib/admin-sections';
import { EMPLOYEE_LOAN_NAV_GROUPS, employeeLoanPath } from '@/lib/employee-loan-nav';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { EMPLOYEE_LOAN_REPORT_NAV, employeeLoanReportPath } from '@/lib/employee-loan-reports';
import { FIXED_ASSET_NAV_GROUPS, fixedAssetPath, isBranchFixedAssetMenuPath } from '@/lib/fixed-asset-nav';
import { GRATUITY_REPORT_NAV, gratuityReportPath } from '@/lib/gratuity-reports';
import { INVENTORY_NAV_GROUPS, inventoryPath } from '@/lib/inventory-nav';
import { hasAppPermission, isAccountant, isBranchAccount, isDepartmentHead } from '@/lib/permissions';
import { PF_REPORT_NAV, pfReportPath } from '@/lib/pf-reports';
import { STAFF_FUND_NAV_GROUPS, staffFundPath } from '@/lib/staff-fund-nav';
import { useNavLayout } from '@/lib/nav-layout';
import { cn } from '@/lib/utils';
import { CloseMovementModal } from '@/components/close-movement-modal';
import { format } from 'date-fns';

interface AdminLayoutProps {
    children: React.ReactNode;
}

interface MenuItemType {
    title: string;
    /** Stable id for section-scoped sidebar filtering (unique across all sections). */
    menuKey?: string;
    icon: React.ReactNode;
    path: string;
    hasSubmenu: boolean;
    permission?: string;
    hrOnly?: boolean;
    /** Show if user has ANY of these permissions (top-level menu). */
    anyPermissions?: string[];
    /** Visible only when the logged-in user has a linked employee profile. */
    employeeOnly?: boolean;
    submenu?: {
        title: string;
        path: string;
        permission?: string;
        hrOnly?: boolean;
        isGroupLabel?: boolean;
        /** Show if user has ANY of these permissions (omit to ignore). */
        anyPermissions?: string[];
        /** Show only if user has ALL of these permissions (omit to ignore). */
        allPermissions?: string[];
    }[];
}

function buildReportsSubmenu(sectionId: AdminSectionId | null): NonNullable<MenuItemType['submenu']> {
    switch (sectionId) {
        case 'human-resources':
            return [
                {
                    title: 'Employee Full Report',
                    path: '/employee/dashboard',
                    anyPermissions: ['employees.view', 'leave-applications.view', 'movements.view', 'transfers.view', 'attendance.view'],
                },
                {
                    title: 'Employee Report',
                    path: '/reports/employee',
                    allPermissions: ['reports.view', 'employees.view'],
                    hrOnly: true,
                },
                {
                    title: 'Branch transfer register',
                    path: '/reports/transfer',
                    allPermissions: ['reports.view', 'transfers.view'],
                },
            ];
        case 'attendance-movement':
            return [
                { title: 'Monthly View', path: '/attendance/monthly', permission: 'attendance.view' },
                { title: 'Daily branch summary', path: '/attendance/daily-branch-summary', permission: 'attendance.view' },
                { title: 'Attendance Report', path: '/attendance/report', permission: 'attendance.view' },
                { title: 'Attendance sheet report', path: '/attendance/sheet-report', permission: 'reports.view' },
            ];
        case 'leave':
            return [
                { title: 'Leave applications report', path: '/leave/applications/report', permission: 'reports.view' },
                { title: 'Leave summary report', path: '/reports/leave', permission: 'reports.view' },
            ];
        case 'administration':
            return [
                { title: 'Administration summary', path: withSectionParam('/reports/administration', 'administration'), permission: 'reports.view' },
            ];
        case 'employee-loan':
            return EMPLOYEE_LOAN_REPORT_NAV.map((r) => ({
                title: r.title,
                path: employeeLoanReportPath(r.slug),
                permission: 'employee-loan.view',
            }));
        case 'staff-fund':
            return [
                ...PF_REPORT_NAV.map((r) => ({
                    title: r.title,
                    path: pfReportPath(r.slug),
                    permission: 'staff-fund.view',
                })),
                ...GRATUITY_REPORT_NAV.map((r) => ({
                    title: r.title,
                    path: gratuityReportPath(r.slug),
                    permission: 'staff-fund.view',
                })),
                {
                    title: 'Final Payment Report',
                    path: staffFundPath('/payroll/reports/final-payment'),
                    permission: 'staff-fund.view',
                },
            ];
        case 'payroll':
            return [
                { title: 'Grade Step Calculation Report', path: '/payroll/reports/grade-step-calculation', permission: 'payroll.view' },
                { title: 'Salary Sheet (Posted)', path: '/payroll/reports/salary-sheet-posted', permission: 'payroll.view' },
                { title: 'Salary Sheet (Un-posted)', path: '/payroll/reports/salary-sheet-unposted', permission: 'payroll.view' },
                { title: 'Salary Sheet (Employee Wise Posted)', path: '/payroll/reports/salary-sheet-employee-posted', permission: 'payroll.view' },
                {
                    title: 'Salary Sheet (Employee Wise Unposted)',
                    path: '/payroll/reports/salary-sheet-employee-unposted',
                    permission: 'payroll.view',
                },
                { title: 'Salary Sheet (Date Range)', path: '/payroll/reports/salary-sheet-date-range', permission: 'payroll.view' },
                { title: 'Salary Sheet Report (Branch Wise)', path: '/payroll/reports/salary-sheet-branch-wise', permission: 'payroll.view' },
                { title: 'Salary Sheet Report (Month Wise)', path: '/payroll/reports/salary-sheet-month-wise', permission: 'payroll.view' },
                {
                    title: 'Salary Sheet Report (Designation Wise)',
                    path: '/payroll/reports/salary-sheet-designation-wise',
                    permission: 'payroll.view',
                },
                { title: 'Bank Advice Report', path: '/payroll/reports/bank-advice', permission: 'payroll.view' },
                { title: 'Bank Advice Bonus Report', path: '/payroll/reports/bank-advice-bonus', permission: 'payroll.view' },
                { title: 'Salary Addition Register', path: '/payroll/reports/addition-register', permission: 'payroll.view' },
                { title: 'Salary Deduction Register', path: '/payroll/reports/deduction-register', permission: 'payroll.view' },
                { title: 'Advance Salary Report', path: '/payroll/reports/advance-salary', permission: 'payroll.view' },
                { title: 'Bonus Register', path: '/payroll/reports/bonus-register', permission: 'payroll.view' },
                { title: 'Salary Certificate', path: '/payroll/reports/salary-certificate', permission: 'payroll.view' },
            ];
        default:
            return [{ title: 'Reports overview', path: '/reports', permission: 'reports.view' }];
    }
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const page = usePage();
    const { auth, notifications, activeMovement } = page.props as any;
    const inertiaUrl = page.url;
    const { navLayout, setNavLayout, toggleNavLayout, isTopNav, isSidebarNav } = useNavLayout();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showCloseMovementDialog, setShowCloseMovementDialog] = useState(false);
    const [closeMovementId, setCloseMovementId] = useState<number | null>(null);

    // Get current path for highlighting active menu (Inertia url so highlight updates on navigate)
    const { pathname: currentPath, search: currentSearch } = useMemo(() => {
        const raw = inertiaUrl || window.location.pathname + window.location.search;
        const qIndex = raw.indexOf('?');
        if (qIndex === -1) {
            return { pathname: raw, search: '' };
        }
        return { pathname: raw.slice(0, qIndex), search: raw.slice(qIndex) };
    }, [inertiaUrl]);
    const activeSectionId = getActiveSectionId({
        pathname: currentPath,
        search: currentSearch,
    } as Location);
    const activeSection = getSectionById(activeSectionId);
    const employee = auth?.employee;
    const branchAccount = isBranchAccount(auth);
    const departmentHead = isDepartmentHead(auth);
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;

    // Toggle functions
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
    const toggleMenu = (menu: string) => {
        setActiveMenu(activeMenu === menu ? null : menu);
    };
    const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

    // Get initials from name for Avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase();
    };

    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    // "HR users" = users allowed to manage employees / org setup / system configuration.
    // Organogram approvers may have approval permissions but should not see setup menus.
    const isHRUser = [
        'employees.create',
        'employees.edit',
        'employees.admin',
        'branches.create',
        'branches.edit',
        'departments.create',
        'departments.edit',
        'designations.create',
        'designations.edit',
        'leave-types.create',
        'leave-types.edit',
        'leave-balances.admin',
        'attendance.admin',
        'admin.access',
    ].some((p) => hasPermission(p));

    const isAccountsDeskUser =
        isAccountant(auth) ||
        (['employee-loan.view', 'staff-fund.view', 'fixed-assets.view', 'inventory.view'] as const).some((p) => hasPermission(p));

    const canSeeHrOnlyMenu = isHRUser || isAccountsDeskUser;

    const hasOwnActiveMovement = Boolean(activeMovement?.id && auth?.employee?.id && activeMovement.employee_id === auth.employee.id);

    const canCloseOwnMovement = Boolean(hasOwnActiveMovement && hasPermission('movements.complete'));

    const branchFallbackName = auth?.employee?.branch?.name || '';

    const openCloseMovementDialog = (movementId?: number) => {
        setCloseMovementId(typeof movementId === 'number' ? movementId : (activeMovement?.id ?? null));
        setShowCloseMovementDialog(true);
    };

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ movementId?: number }>;
            const movementId = ce?.detail?.movementId;
            openCloseMovementDialog(typeof movementId === 'number' ? movementId : undefined);
        };
        window.addEventListener('hrm:movement-close', handler as EventListener);
        return () => window.removeEventListener('hrm:movement-close', handler as EventListener);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMovement?.id]);

    /** Matches `DashboardController::humanResources` admin-like gate (+ transfers). */
    const hrSectionDashboardAny: string[] = [
        'employees.create',
        'employees.edit',
        'employees.admin',
        'branches.create',
        'branches.edit',
        'departments.create',
        'departments.edit',
        'designations.create',
        'designations.edit',
        'leave-types.create',
        'leave-types.edit',
        'leave-balances.admin',
        'attendance.admin',
        'admin.access',
        'transfers.view',
    ];

    const administrationSectionDashboardAny: string[] = ['admin.access', 'roles.view', 'users.view', 'sessions.view', 'reports.view'];

    const payrollSectionDashboardAny: string[] = ['payroll.view', 'payroll.create', 'payroll.edit', 'admin.access'];

    const staffFundSectionDashboardAny: string[] = ['staff-fund.view', 'payroll.view', 'payroll.edit', 'admin.access'];

    const fixedAssetSectionDashboardAny: string[] = ['fixed-assets.view', 'fixed-assets.create', 'fixed-assets.edit', 'admin.access'];

    // Organized Menu Structure with EXACT permission names matching web.php
    const baseMenuItems = useMemo<MenuItemType[]>(
        () => [
            {
                title: 'My Notices',
                menuKey: 'my-notices',
                icon: <Bell className="h-5 w-5" />,
                path: '/my-notices',
                hasSubmenu: false,
            },
            {
                title: 'Change Password',
                menuKey: 'change-password',
                icon: <KeyRound className="h-5 w-5" />,
                path: '/settings/password',
                hasSubmenu: false,
            },
            {
                title: 'My Assets',
                menuKey: 'my-assets',
                icon: <Boxes className="h-5 w-5" />,
                path: '/my-assets',
                hasSubmenu: false,
                employeeOnly: true,
            },
            {
                title: 'My Staff Fund',
                menuKey: 'sf-my-dashboard',
                icon: <Coins className="h-5 w-5" />,
                path: '/sections/staff-fund',
                hasSubmenu: true,
                employeeOnly: true,
                submenu: [
                    { title: 'PF Ledger', path: '/employee/staff-fund/pf-ledger' },
                    { title: 'Gratuity', path: '/employee/staff-fund/gratuity' },
                ],
            },
            {
                title: 'My Payroll',
                menuKey: 'payroll-my-dashboard',
                icon: <BriefcaseBusiness className="h-5 w-5" />,
                path: '/sections/payroll',
                hasSubmenu: true,
                employeeOnly: true,
                submenu: [
                    { title: 'Payslips', path: '/employee/payroll/payslips' },
                ],
            },
            {
                title: 'My Loan',
                menuKey: 'loan-my-dashboard',
                icon: <Wallet className="h-5 w-5" />,
                path: '/sections/employee-loan',
                hasSubmenu: true,
                employeeOnly: true,
                submenu: [
                    { title: 'My Loans', path: '/employee/loan' },
                ],
            },
            {
                title: 'Employee Management',
                menuKey: 'employee-management',
                icon: <Users className="h-5 w-5" />,
                path: '/employees',
                hasSubmenu: true,
                submenu: [
                    { title: 'All Employees', path: '/employees', permission: 'employees.view', hrOnly: true },
                    { title: 'Organization Chart', path: '/organization-chart', permission: 'employees.view', hrOnly: true },
                    { title: 'Confirmations', path: '/confirmations', permission: 'confirmations.view', hrOnly: true },
                    { title: 'Separations', path: '/separations', permission: 'separations.view', hrOnly: true },
                    { title: 'Disciplinary Actions', path: '/disciplinary-actions', permission: 'employees.edit', hrOnly: true },
                ],
            },
            {
                title: 'Organization Setup',
                menuKey: 'organization-setup',
                icon: <Building2 className="h-5 w-5" />,
                path: '/organization-structure',
                hasSubmenu: true,
                permission: 'branches.view',
                hrOnly: true,
                submenu: [
                    { title: 'Organization Structure', path: '/organization-structure', permission: 'branches.view' },
                    { title: 'Departments', path: '/departments', permission: 'departments.view' },
                    { title: 'Designations', path: '/designations', permission: 'designations.view' },
                    { title: 'Employee Types', path: '/employee-types', permission: 'departments.view' },
                    { title: 'Programs', path: '/programs', permission: 'departments.view' },
                    { title: 'Projects', path: '/projects', permission: 'departments.view' },
                ],
            },
            {
                title: 'Attendance',
                menuKey: 'attendance',
                icon: <ClipboardList className="h-5 w-5" />,
                path: '/attendance',
                hasSubmenu: true,
                permission: 'attendance.view',
                submenu: [
                    { title: 'Daily Attendance', path: '/attendance', permission: 'attendance.view' },
                    { title: 'Attendance Devices', path: '/attendance/devices', permission: 'attendance.admin' },
                    { title: 'Device Settings', path: '/attendance/settings', permission: 'attendance.admin' },
                    { title: 'ZKTeco Integration', path: '/zkteco', permission: 'attendance.admin' },
                ],
            },
            {
                title: 'Leave Management',
                menuKey: 'leave-management',
                icon: <CalendarDays className="h-5 w-5" />,
                path: '/leave',
                hasSubmenu: true,
                permission: 'leave-applications.view',
                submenu: [
                    { title: 'Leave Applications', path: '/leave/applications', permission: 'leave-applications.view' },
                    { title: 'Leave Settings', path: '/leave/settings', permission: 'leave-types.view', hrOnly: true },
                    { title: 'Leave Types', path: '/leave/types', permission: 'leave-types.view', hrOnly: true },
                    { title: 'Leave Balances', path: '/leave/balances', permission: 'leave-balances.view', hrOnly: true },
                    { title: 'Bulk Allocate', path: '/leave/balances/allocate-bulk', permission: 'leave-balances.admin', hrOnly: true },
                ],
            },
            {
                title: 'Movement',
                menuKey: 'movement',
                icon: <Activity className="h-5 w-5" />,
                path: '/movements',
                hasSubmenu: true,
                permission: 'movements.view',
                submenu: [
                    { title: 'Movements', path: '/movements', permission: 'movements.view' },
                    { title: 'Log Book Register', path: '/movement-log-books', permission: 'movements.view' },
                    { title: 'Log Book Payment', path: '/movement-log-book-payments', permission: 'movements.view' },
                    { title: 'Movement Penalties', path: '/movement-penalties', anyPermissions: ['admin.access', 'movements.approve', 'movements.view'] },
                ],
            },
            {
                title: 'Transfer & Promotion',
                menuKey: 'transfer-promotion',
                icon: <ArrowLeftRight className="h-5 w-5" />,
                path: '/transfers',
                hasSubmenu: true,
                submenu: [
                    { title: 'Transfers', path: '/transfers', permission: 'transfers.view' },
                    { title: 'Promotions', path: '/promotions', permission: 'promotions.view' },
                    { title: 'Demotions', path: '/demotions', permission: 'demotions.view' },
                ],
            },
            {
                title: 'Holidays',
                menuKey: 'holidays',
                icon: <Award className="h-5 w-5" />,
                path: '/holidays',
                hasSubmenu: true,
                permission: 'holidays.view',
                submenu: [
                    { title: 'All Holidays', path: '/holidays', permission: 'holidays.view' },
                    { title: 'Holiday Calendar', path: '/holidays/calendar', permission: 'holidays.view' },
                ],
            },
            {
                title: 'Payroll Setup',
                menuKey: 'payroll-setup',
                icon: <BriefcaseBusiness className="h-5 w-5" />,
                path: '/payscales',
                hasSubmenu: true,
                permission: 'payroll.view',
                hrOnly: true,
                submenu: [
                    { title: 'Payscales', path: '/payscales', permission: 'payroll.view' },
                    { title: 'Grades', path: '/salary-grades', permission: 'payroll.view' },
                    { title: 'Steps', path: '/salary-steps', permission: 'payroll.view' },
                    { title: 'Salary Components', path: '/salary-heads', permission: 'payroll.view' },
                    { title: 'Salary Structure', path: '/salary-structures/manual', permission: 'payroll.view' },
                    { title: 'Branch Wise Bank', path: '/branch-payroll-banks', permission: 'payroll.view' },
                    { title: 'Probation Salary', path: '/probation-salary', permission: 'payroll.view' },
                    { title: 'Fixed Salary', path: '/fixed-salary', permission: 'payroll.view' },
                ],
            },
            {
                title: 'Bonus',
                menuKey: 'bonus',
                icon: <Award className="h-5 w-5" />,
                path: '/bonus-types',
                hasSubmenu: true,
                permission: 'payroll.view',
                hrOnly: true,
                submenu: [
                    { title: 'Bonus Type', path: '/bonus-types', permission: 'payroll.view' },
                    { title: 'Bonus Configuration', path: '/bonus-configurations', permission: 'payroll.view' },
                    { title: 'Bonus Calculation', path: '/bonus-calculation', permission: 'payroll.view' },
                    { title: 'Bonus Withheld', path: '/salary-withheld?salary_type=bonus', permission: 'payroll.view' },
                    { title: 'Bonus Post', path: '/bonus-post', permission: 'payroll.view' },
                    { title: 'Bonus Rollback', path: '/salary-rollback?salary_type=bonus', permission: 'payroll.view' },
                ],
            },
            {
                title: 'Salary',
                menuKey: 'salary',
                icon: <Wallet className="h-5 w-5" />,
                path: '/salary-process',
                hasSubmenu: true,
                permission: 'payroll.view',
                hrOnly: true,
                submenu: [
                    { title: 'Head Modification', path: '/salary-head-modifications', permission: 'payroll.view' },
                    { title: 'Salary Withheld', path: '/salary-withheld', permission: 'payroll.view' },
                    { title: 'Salary Process', path: '/salary-process', permission: 'payroll.view' },
                    { title: 'Salary Post', path: '/salary-post', permission: 'payroll.view' },
                    { title: 'Salary Rollback', path: '/salary-rollback', permission: 'payroll.view' },
                ],
            },
            ...EMPLOYEE_LOAN_NAV_GROUPS.flatMap((group) => {
                const GroupIcon = group.icon;
                if (group.items.length === 1) {
                    const item = group.items[0];
                    return [
                        {
                            title: item.title,
                            menuKey: `el-${group.id}`,
                            icon: <GroupIcon className="h-5 w-5" />,
                            path: employeeLoanPath(item.path),
                            hasSubmenu: false as const,
                            permission: item.permission ?? 'employee-loan.view',
                        },
                    ];
                }

                return [
                    {
                        title: group.title,
                        menuKey: `el-${group.id}`,
                        icon: <GroupIcon className="h-5 w-5" />,
                        path: employeeLoanPath(group.defaultPath),
                        hasSubmenu: true as const,
                        permission: 'employee-loan.view',
                        submenu: group.items.map((item) => ({
                            title: item.title,
                            path: employeeLoanPath(item.path),
                            permission: item.permission ?? 'employee-loan.view',
                        })),
                    },
                ];
            }),
            ...STAFF_FUND_NAV_GROUPS.flatMap((group) => {
                const GroupIcon = group.icon;
                if (group.items.length === 1) {
                    const item = group.items[0];
                    return [
                        {
                            title: item.title,
                            menuKey: `sf-${group.id}`,
                            icon: <GroupIcon className="h-5 w-5" />,
                            path: staffFundPath(item.path),
                            hasSubmenu: false as const,
                            permission: item.permission ?? 'staff-fund.view',
                        },
                    ];
                }

                return [
                    {
                        title: group.title,
                        menuKey: `sf-${group.id}`,
                        icon: <GroupIcon className="h-5 w-5" />,
                        path: staffFundPath(group.defaultPath),
                        hasSubmenu: true as const,
                        permission: 'staff-fund.view',
                        submenu: group.items.map((item) => ({
                            title: item.title,
                            path: staffFundPath(item.path),
                            permission: item.permission ?? 'staff-fund.view',
                        })),
                    },
                ];
            }),
            ...FIXED_ASSET_NAV_GROUPS.flatMap((group) => {
                const GroupIcon = group.icon;

                return [
                    {
                        title: group.title,
                        menuKey: `fa-${group.id}`,
                        icon: <GroupIcon className="h-5 w-5" />,
                        path: fixedAssetPath(group.defaultPath),
                        hasSubmenu: true as const,
                        permission: 'fixed-assets.view',
                        submenu: group.items.map((item) => ({
                            title: item.title,
                            path: fixedAssetPath(item.path),
                            permission: item.permission ?? 'fixed-assets.view',
                        })),
                    },
                ];
            }),
            ...INVENTORY_NAV_GROUPS.flatMap((group) => {
                const GroupIcon = group.icon;

                return [
                    {
                        title: group.title,
                        menuKey: `inv-${group.id}`,
                        icon: <GroupIcon className="h-5 w-5" />,
                        path: inventoryPath(group.defaultPath),
                        hasSubmenu: true as const,
                        permission: 'inventory.view',
                        submenu: group.items.map((item) => ({
                            title: item.title,
                            path: inventoryPath(item.path),
                            permission: item.permission ?? 'inventory.view',
                        })),
                    },
                ];
            }),
            {
                title: 'User Management',
                menuKey: 'admin-user-management',
                icon: <User className="h-5 w-5" />,
                path: withSectionParam('/admin/users', 'administration'),
                hasSubmenu: true,
                anyPermissions: ['admin.access', 'users.view'],
                submenu: [
                    { title: 'All Users', path: withSectionParam('/admin/users', 'administration'), permission: 'users.view' },
                    { title: 'Add User', path: withSectionParam('/admin/users/create', 'administration'), permission: 'users.create' },
                    {
                        title: 'Active Sessions',
                        path: withSectionParam('/admin/sessions', 'administration'),
                        anyPermissions: ['admin.access', 'users.view'],
                    },
                    { title: 'Roles & Permissions', path: withSectionParam('/admin/roles', 'administration'), permission: 'roles.view' },
                    { title: 'Notices', path: withSectionParam('/admin/notices', 'administration'), permission: 'admin.access' },
                    { title: 'Send notice', path: withSectionParam('/admin/notices/create', 'administration'), permission: 'admin.access' },
                    { title: 'Movement Penalties', path: '/movement-penalties', anyPermissions: ['admin.access', 'movements.approve', 'movements.view'] },
                ],
            },
            {
                title: 'Settings',
                menuKey: 'admin-settings',
                icon: <Settings className="h-5 w-5" />,
                path: withSectionParam('/settings/profile', 'administration'),
                hasSubmenu: true,
                submenu: [
                    { title: 'Profile', path: withSectionParam('/settings/profile', 'administration') },
                    { title: 'Password', path: withSectionParam('/settings/password', 'administration') },
                    { title: 'Notifications', path: withSectionParam('/settings/notifications', 'administration') },
                ],
            },
        ],
        [],
    );

    const menuItemsForLayout = useMemo(() => {
        const sub = buildReportsSubmenu(activeSectionId);
        const reportsSub = branchAccount
            ? activeSectionId === 'payroll'
                ? sub.filter(
                      (item) =>
                          item.path === '/payroll/reports/salary-sheet-posted' ||
                          item.path === '/payroll/reports/salary-sheet-unposted',
                  )
                : sub.filter((item) => item.path === '/attendance/daily-branch-summary')
            : sub;

        if (reportsSub.length === 0) {
            return baseMenuItems;
        }

        const reportsPath = reportsSub[0]?.path ?? '/reports';
        const reportsItem: MenuItemType = {
            title: 'Reports',
            menuKey: 'section-reports',
            icon: <BarChart className="h-5 w-5" />,
            path: reportsPath,
            hasSubmenu: true,
            submenu: reportsSub,
        };
        const idx = baseMenuItems.findIndex((m) => m.title === 'User Management');
        if (idx === -1) {
            return [...baseMenuItems, reportsItem];
        }
        return [...baseMenuItems.slice(0, idx), reportsItem, ...baseMenuItems.slice(idx)];
    }, [activeSectionId, baseMenuItems, branchAccount]);

    const visibleMenuItems = useMemo(() => {
        if (branchAccount) {
            if (activeSectionId === 'attendance-movement') {
                const reports = menuItemsForLayout.find((m) => m.menuKey === 'section-reports');
                return reports ? [reports] : [];
            }
            if (activeSectionId === 'inventory') {
                const allowedKeys = new Set(['inv-products', 'inv-operations', 'inv-reports']);
                return menuItemsForLayout.filter((m) => m.menuKey != null && allowedKeys.has(m.menuKey));
            }
            if (activeSectionId === 'fixed-asset') {
                const allowedKeys = new Set(['fa-purchase', 'fa-stock', 'fa-depreciation', 'fa-reports']);
                return menuItemsForLayout
                    .filter((m) => m.menuKey != null && allowedKeys.has(m.menuKey))
                    .map((item) => {
                        if (!item.hasSubmenu || !item.submenu) {
                            return item;
                        }
                        const submenu = item.submenu.filter((sub) =>
                            isBranchFixedAssetMenuPath(sub.path ?? '', item.menuKey ?? ''),
                        );
                        return {
                            ...item,
                            submenu,
                            path: submenu[0]?.path ?? item.path,
                            hasSubmenu: submenu.length > 1,
                        };
                    });
            }
            if (activeSectionId === 'payroll') {
                const reports = menuItemsForLayout.find((m) => m.menuKey === 'section-reports');
                return reports ? [reports] : [];
            }
            return [];
        }

        const keys = getMenuKeysForSection(activeSectionId);
        if (!keys) {
            return menuItemsForLayout;
        }

        const changePasswordItem = menuItemsForLayout.find((m) => m.menuKey === 'change-password');
        const withChangePassword = (items: MenuItemType[]): MenuItemType[] => {
            if (!changePasswordItem || items.some((m) => m.menuKey === 'change-password')) {
                return items;
            }
            return [...items, changePasswordItem];
        };

        if (
            activeSectionId === 'staff-fund' &&
            employee?.id &&
            !hasPermission('staff-fund.view') &&
            !hasPermission('payroll.view') &&
            !hasPermission('admin.access')
        ) {
            const employeeStaffFundKeys = ['sf-my-dashboard'];
            return withChangePassword(
                employeeStaffFundKeys
                    .map((key) => menuItemsForLayout.find((m) => (m.menuKey ?? m.title) === key))
                    .filter((x): x is MenuItemType => Boolean(x)),
            );
        }

        if (
            activeSectionId === 'payroll' &&
            employee?.id &&
            !hasPermission('payroll.view') &&
            !hasPermission('admin.access')
        ) {
            const employeePayrollKeys = ['payroll-my-dashboard'];
            return withChangePassword(
                employeePayrollKeys
                    .map((key) => menuItemsForLayout.find((m) => (m.menuKey ?? m.title) === key))
                    .filter((x): x is MenuItemType => Boolean(x)),
            );
        }

        if (
            activeSectionId === 'employee-loan' &&
            employee?.id &&
            !hasPermission('employee-loan.view') &&
            !hasPermission('payroll.view') &&
            !hasPermission('admin.access')
        ) {
            const employeeLoanKeys = ['loan-my-dashboard'];
            return withChangePassword(
                employeeLoanKeys
                    .map((key) => menuItemsForLayout.find((m) => (m.menuKey ?? m.title) === key))
                    .filter((x): x is MenuItemType => Boolean(x)),
            );
        }

        const globalKeys: string[] = ['change-password'];
        const mergedKeys = [...keys.filter((k) => !globalKeys.includes(k)), ...globalKeys];
        return mergedKeys.map((key) => menuItemsForLayout.find((m) => (m.menuKey ?? m.title) === key)).filter((x): x is MenuItemType => Boolean(x));
    }, [activeSectionId, menuItemsForLayout, employee?.id, branchAccount]);

    /** Sidebar paths in the current section — longest-prefix wins within visible items only. */
    const menuNavPaths = useMemo(() => {
        const paths = new Set<string>();
        for (const item of visibleMenuItems) {
            if (item.hasSubmenu && item.submenu) {
                for (const s of item.submenu) {
                    if (s.path && !s.isGroupLabel) {
                        paths.add(s.path);
                    }
                }
            } else if (item.path) {
                paths.add(item.path);
            }
        }
        return Array.from(paths);
    }, [visibleMenuItems]);

    const isActive = useCallback(
        (path: string) => {
            const [pathBase, pathQuery] = path.split('?');
            const expectedParams = pathQuery ? new URLSearchParams(pathQuery) : null;

            const pathMatches = (base: string) => currentPath === base || (base !== '/' && currentPath.startsWith(`${base}/`));

            if (!pathBase || pathBase === '/') {
                return currentPath === pathBase;
            }

            if (expectedParams) {
                const actual = new URLSearchParams(currentSearch);
                const expectedSection = expectedParams.get('section');
                const sectionOnly = expectedSection !== null && [...expectedParams.keys()].every((key) => key === 'section');

                if (sectionOnly) {
                    const sectionMatches = actual.get('section') === expectedSection || activeSectionId === expectedSection;

                    if (!sectionMatches) {
                        return false;
                    }

                    // Staff-fund register links must not highlight on sibling sub-routes.
                    const staffFundExactPaths = ['/provident-fund', '/gratuity'];
                    if (staffFundExactPaths.includes(pathBase)) {
                        return currentPath === pathBase;
                    }

                    return pathMatches(pathBase);
                }

                if (!pathMatches(pathBase) && currentPath !== pathBase) {
                    return false;
                }

                for (const [key, value] of expectedParams) {
                    if (actual.get(key) !== value) {
                        return false;
                    }
                }

                return currentPath === pathBase || pathMatches(pathBase);
            }

            if (currentPath === pathBase) {
                return true;
            }

            const candidates = menuNavPaths.map((p) => p.split('?')[0]).filter((base) => pathMatches(base));
            if (candidates.length === 0) {
                return false;
            }
            const best = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
            return best === pathBase;
        },
        [currentPath, currentSearch, menuNavPaths, activeSectionId],
    );

    const hasAnyDashboardPerm = (perms: string[]) => perms.some((p) => hasPermission(p));

    /** Same gate as `DashboardController::humanResources` admin branch — those users see org HR, not personal My HR. */
    const showsAdminHrDashboard = hasAnyDashboardPerm(hrSectionDashboardAny);
    const canSeePersonalHrDashboard = Boolean(employee?.id) && !showsAdminHrDashboard;

    const showsAdminPayrollDashboard = hasAnyDashboardPerm(payrollSectionDashboardAny);
    const canSeePersonalPayrollDashboard = Boolean(employee?.id) && !showsAdminPayrollDashboard;
    const showsAdminStaffFundDashboard = hasAnyDashboardPerm(staffFundSectionDashboardAny);
    const canSeePersonalStaffFundDashboard = Boolean(employee?.id) && !showsAdminStaffFundDashboard;
    const showsAdminEmployeeLoanDashboard = hasAnyDashboardPerm(['employee-loan.view', 'payroll.view', 'admin.access']);
    const canSeePersonalEmployeeLoanDashboard = Boolean(employee?.id) && !showsAdminEmployeeLoanDashboard;

    const sectionDashboardEntries: { title: string; path: string }[] = (() => {
        if (!activeSectionId) {
            return [];
        }
        switch (activeSectionId) {
            case 'human-resources':
                if (showsAdminHrDashboard) {
                    return [{ title: 'HR dashboard', path: '/sections/human-resources' }];
                }
                if (canSeePersonalHrDashboard) {
                    return [{ title: 'My HR', path: '/sections/human-resources' }];
                }
                return [];
            case 'attendance-movement':
                return hasPermission('attendance.view') || hasPermission('movements.view')
                    ? [{ title: 'Attendance & movement', path: '/sections/attendance-movement' }]
                    : [];
            case 'leave':
                return hasPermission('leave-applications.view') ? [{ title: 'Leave dashboard', path: '/sections/leave' }] : [];
            case 'administration':
                return hasAnyDashboardPerm(administrationSectionDashboardAny) ? [{ title: 'Administration', path: '/sections/administration' }] : [];
            case 'payroll':
                if (branchAccount) {
                    return [{ title: 'Payroll Dashboard', path: '/sections/payroll' }];
                }
                if (!departmentHead && showsAdminPayrollDashboard) {
                    return [{ title: 'Payroll', path: '/sections/payroll' }];
                }
                if (canSeePersonalPayrollDashboard) {
                    return [{ title: 'My Payroll', path: '/sections/payroll' }];
                }
                return [];
            case 'staff-fund':
                if (!departmentHead && showsAdminStaffFundDashboard) {
                    return [{ title: 'Staff Fund', path: '/sections/staff-fund' }];
                }
                if (canSeePersonalStaffFundDashboard) {
                    return [{ title: 'My Staff Fund', path: '/sections/staff-fund' }];
                }
                return [];
            case 'employee-loan':
                if (!departmentHead && showsAdminEmployeeLoanDashboard) {
                    return [{ title: 'Employee Loan', path: '/sections/employee-loan' }];
                }
                if (canSeePersonalEmployeeLoanDashboard) {
                    return [{ title: 'My Loan', path: employeeLoanEmployeePath('/sections/employee-loan') }];
                }
                return [];
            case 'fixed-asset':
                return hasAnyDashboardPerm(fixedAssetSectionDashboardAny) ? [{ title: 'Fixed Asset', path: '/sections/fixed-asset' }] : [];
            case 'inventory':
                return hasPermission('inventory.view') || hasPermission('admin.access') ? [{ title: 'Inventory', path: '/sections/inventory' }] : [];
            default:
                return [];
        }
    })();

    const mobileSubNavItems = useMemo(() => {
        if (!activeSectionId) return [];

        const items: Array<{ title: string; href: string; icon: React.ReactNode }> = [];

        sectionDashboardEntries.forEach((entry) => {
            items.push({
                title: entry.title,
                href: entry.path,
                icon: getSubNavIcon(entry.title, entry.path),
            });
        });

        visibleMenuItems.forEach((item) => {
            if (item.hrOnly && !canSeeHrOnlyMenu) return;
            if (item.employeeOnly && !employee?.id) return;
            if (item.anyPermissions?.length) {
                if (!item.anyPermissions.some((p) => hasPermission(p))) return;
            } else if (item.permission && !hasPermission(item.permission)) {
                return;
            }

            if (item.hasSubmenu && item.submenu?.length) {
                const permittedSubmenu = item.submenu.filter(
                    (subItem) =>
                        !subItem.isGroupLabel &&
                        (!subItem.hrOnly || canSeeHrOnlyMenu) &&
                        (!subItem.permission || hasPermission(subItem.permission)) &&
                        (!subItem.anyPermissions?.length || subItem.anyPermissions.some((p) => hasPermission(p))) &&
                        (!subItem.allPermissions?.length || subItem.allPermissions.every((p) => hasPermission(p))),
                );
                permittedSubmenu.forEach((subItem) => {
                    items.push({
                        title: subItem.title,
                        href: subItem.path,
                        icon: getSubNavIcon(subItem.title, subItem.path),
                    });
                });
            } else {
                items.push({
                    title: item.title,
                    href: item.path,
                    icon: getSubNavIcon(item.title, item.path),
                });
            }
        });

        const seen = new Set<string>();
        return items.filter((item) => {
            const clean = item.href.split('?')[0];
            if (seen.has(clean)) return false;
            seen.add(clean);
            return true;
        });
    }, [activeSectionId, sectionDashboardEntries, visibleMenuItems, canSeeHrOnlyMenu, employee?.id]);

    // Automatically expand the menu item if a child is active
    useEffect(() => {
        const activeParent = visibleMenuItems.find(
            (item) => item.hasSubmenu && item.submenu?.some((subItem) => !subItem.isGroupLabel && isActive(subItem.path)),
        );
        if (activeParent) {
            setActiveMenu(activeParent.title);
        }
    }, [currentPath, currentSearch, visibleMenuItems, isActive]);

    const MobileMenuItem = ({ item }: { item: MenuItemType }) => {
        if (item.hrOnly && !canSeeHrOnlyMenu) return null;
        if (item.employeeOnly && !employee?.id) return null;
        if (item.anyPermissions?.length) {
            if (!item.anyPermissions.some((p) => hasPermission(p))) return null;
        } else if (item.permission && !hasPermission(item.permission)) {
            return null;
        }

        const permittedSubmenu = item.submenu
            ?.filter(
                (subItem) =>
                    subItem.isGroupLabel ||
                    ((!subItem.hrOnly || canSeeHrOnlyMenu) &&
                        (!subItem.permission || hasPermission(subItem.permission)) &&
                        (!subItem.anyPermissions?.length || subItem.anyPermissions.some((p) => hasPermission(p))) &&
                        (!subItem.allPermissions?.length || subItem.allPermissions.every((p) => hasPermission(p)))),
            )
            ?.filter((subItem, index, items) => {
                if (!subItem.isGroupLabel) {
                    return true;
                }
                return items.slice(index + 1).some((next) => !next.isGroupLabel);
            });

        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        const submenuSectionActive = permittedSubmenu?.some((s) => !s.isGroupLabel && isActive(s.path)) ?? false;
        const isMenuOpen = activeMenu === item.title;

        return item.hasSubmenu ? (
            <div className="group relative mb-1">
                <button
                    onClick={() => toggleMenu(item.title)}
                    title={!isSidebarOpen && !isMobileSidebarOpen ? item.title : undefined}
                    className={`flex items-center text-[13px] font-medium transition-all duration-300 ${
                        isSidebarOpen || isMobileSidebarOpen
                            ? 'w-full justify-between rounded-lg px-3 py-2.5'
                            : 'mx-auto h-11 w-11 justify-center rounded-xl'
                    } ${
                        submenuSectionActive || isActive(item.path)
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <div className={`flex items-center ${isSidebarOpen || isMobileSidebarOpen ? 'gap-3' : ''}`}>
                        <div className={`${submenuSectionActive || isActive(item.path) ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {React.cloneElement(item.icon as React.ReactElement, { className: 'w-[18px] h-[18px]' })}
                        </div>
                        {(isSidebarOpen || isMobileSidebarOpen) && <span className="truncate tracking-wide">{item.title}</span>}
                    </div>
                    {(isSidebarOpen || isMobileSidebarOpen) && (
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
                    )}
                </button>
                {isMenuOpen && (isSidebarOpen || isMobileSidebarOpen) && (
                    <div
                        className={cn(
                            'mt-1 ml-9 space-y-0.5 border-l border-emerald-500/20 py-1 pl-4',
                            (permittedSubmenu?.length ?? 0) > 8 && 'max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain pr-1',
                        )}
                    >
                        {permittedSubmenu?.map((subItem, idx) =>
                            subItem.isGroupLabel ? (
                                <p key={idx} className="px-3 pt-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase first:pt-0">
                                    {subItem.title}
                                </p>
                            ) : (
                                <Link
                                    key={idx}
                                    href={subItem.path}
                                    className={`block rounded-md px-3 py-2 text-[12px] tracking-wide transition-all duration-200 ${
                                        isActive(subItem.path)
                                            ? 'bg-emerald-50 font-semibold text-emerald-700'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                    onClick={closeMobileSidebar}
                                >
                                    {subItem.title}
                                </Link>
                            ),
                        )}
                    </div>
                )}
            </div>
        ) : (
            <Link
                href={item.path}
                title={!isSidebarOpen && !isMobileSidebarOpen ? item.title : undefined}
                className={`mb-1 flex items-center text-[13px] font-medium transition-all duration-300 ${
                    isSidebarOpen || isMobileSidebarOpen ? 'w-full gap-3 rounded-lg px-3 py-2.5' : 'mx-auto h-11 w-11 justify-center rounded-xl'
                } ${isActive(item.path) ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                onClick={closeMobileSidebar}
            >
                <div className={`${isActive(item.path) ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-[18px] h-[18px]' })}
                </div>
                {(isSidebarOpen || isMobileSidebarOpen) && <span className="truncate tracking-wide">{item.title}</span>}
            </Link>
        );
    };

    const DesktopTopMenuItem = ({ item }: { item: MenuItemType }) => {
        const [open, setOpen] = useState(false);
        const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
        const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

        const handleMouseEnter = () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
            if (!open) {
                openTimerRef.current = setTimeout(() => {
                    setOpen(true);
                }, 50);
            }
        };

        const handleMouseLeave = () => {
            if (openTimerRef.current) {
                clearTimeout(openTimerRef.current);
                openTimerRef.current = null;
            }
            closeTimerRef.current = setTimeout(() => {
                setOpen(false);
            }, 180);
        };

        useEffect(() => {
            return () => {
                if (openTimerRef.current) clearTimeout(openTimerRef.current);
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            };
        }, []);

        if (item.hrOnly && !canSeeHrOnlyMenu) return null;
        if (item.employeeOnly && !employee?.id) return null;
        if (item.anyPermissions?.length) {
            if (!item.anyPermissions.some((p) => hasPermission(p))) return null;
        } else if (item.permission && !hasPermission(item.permission)) {
            return null;
        }

        const permittedSubmenu = item.submenu
            ?.filter(
                (subItem) =>
                    subItem.isGroupLabel ||
                    ((!subItem.hrOnly || canSeeHrOnlyMenu) &&
                        (!subItem.permission || hasPermission(subItem.permission)) &&
                        (!subItem.anyPermissions?.length || subItem.anyPermissions.some((p) => hasPermission(p))) &&
                        (!subItem.allPermissions?.length || subItem.allPermissions.every((p) => hasPermission(p)))),
            )
            ?.filter((subItem, index, items) => {
                if (!subItem.isGroupLabel) {
                    return true;
                }
                return items.slice(index + 1).some((next) => !next.isGroupLabel);
            });

        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        const submenuSectionActive = permittedSubmenu?.some((s) => !s.isGroupLabel && isActive(s.path)) ?? false;
        const isItemActive = submenuSectionActive || isActive(item.path);

        if (item.hasSubmenu && permittedSubmenu && permittedSubmenu.length > 0) {
            return (
                <div
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="relative inline-flex items-center"
                >
                    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold tracking-wide transition-colors duration-150 select-none focus:outline-none',
                                    isItemActive
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/25'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                )}
                            >
                                <div className={cn(isItemActive ? 'text-emerald-600' : 'text-slate-500')}>
                                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                                </div>
                                <span className="whitespace-nowrap">{item.title}</span>
                                <ChevronDown
                                    className={cn(
                                        'h-3 w-3 text-slate-400 opacity-80 transition-transform duration-200',
                                        open && 'rotate-180',
                                    )}
                                />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            sideOffset={4}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            className="min-w-[215px] max-h-[min(480px,75vh)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200/90 bg-white/98 p-1.5 shadow-xl shadow-slate-300/30 backdrop-blur-sm"
                        >
                            {permittedSubmenu.map((subItem, idx) =>
                                subItem.isGroupLabel ? (
                                    <DropdownMenuLabel
                                        key={idx}
                                        className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase first:pt-1"
                                    >
                                        {subItem.title}
                                    </DropdownMenuLabel>
                                ) : (
                                    <DropdownMenuItem
                                        key={idx}
                                        asChild
                                        className="cursor-pointer rounded-lg text-xs font-medium transition-colors duration-150 hover:bg-slate-50 focus:bg-slate-50"
                                        onClick={() => setOpen(false)}
                                    >
                                        <Link
                                            href={subItem.path}
                                            className={cn(
                                                'flex w-full items-center justify-between px-2.5 py-1.5 tracking-wide',
                                                isActive(subItem.path)
                                                    ? 'bg-emerald-50 font-semibold text-emerald-700'
                                                    : 'text-slate-600 hover:text-slate-900',
                                            )}
                                        >
                                            <span>{subItem.title}</span>
                                            {isActive(subItem.path) && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                ),
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        }

        return (
            <Link
                href={item.path}
                className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold tracking-wide transition-colors duration-150 select-none focus:outline-none',
                    isActive(item.path)
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
            >
                <div className={cn(isActive(item.path) ? 'text-emerald-600' : 'text-slate-500')}>
                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                </div>
                <span className="whitespace-nowrap">{item.title}</span>
            </Link>
        );
    };

    // Flash message handling
    const { flash, errors } = usePage().props as any;
    const { toast } = useToast();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        if (flash.success) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
        if (flash.error || errors?.attendance || errors?.lat || errors?.lng) {
            setShowError(true);
            const timer = setTimeout(() => setShowError(false), 7000);
            return () => clearTimeout(timer);
        }
        if (flash.warning) {
            setShowWarning(true);
            const timer = setTimeout(() => setShowWarning(false), 5000);
            return () => clearTimeout(timer);
        }
        if (flash.info) {
            setShowInfo(true);
            const timer = setTimeout(() => setShowInfo(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash, errors]);

    useEffect(() => {
        if (flash.success) {
            toast({
                title: 'Success',
                description: flash.success,
                variant: 'success',
            });
        }
        if (flash.error) {
            toast({
                title: 'Error',
                description: flash.error,
                variant: 'destructive',
            });
        }
        if (flash.warning) {
            toast({
                title: 'Warning',
                description: flash.warning,
                variant: 'warning',
            });
        }
        if (flash.info) {
            toast({
                title: 'Information',
                description: flash.info,
                variant: 'info',
            });
        }
    }, [flash]);

    return (
        <div className="relative flex h-screen flex-col bg-slate-50">
            {/* Subtle animated background (light theme) */}
            <style>{`
                @keyframes hrm-bg-shift {
                    0% { transform: translate3d(-2%, -2%, 0) scale(1.02); filter: saturate(1.05); opacity: 0.95; }
                    50% { transform: translate3d(2%, 1%, 0) scale(1.06); filter: saturate(1.15); opacity: 1; }
                    100% { transform: translate3d(-2%, -2%, 0) scale(1.02); filter: saturate(1.05); opacity: 0.95; }
                }
                .sidebar-nav-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(16, 185, 129, 0.45) transparent;
                }
                .sidebar-nav-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .sidebar-nav-scroll::-webkit-scrollbar-thumb {
                    background: rgba(16, 185, 129, 0.35);
                    border-radius: 999px;
                }
                .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(16, 185, 129, 0.55);
                }
                @media print {
                    html, body, #app {
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        background: #ffffff !important;
                    }
                    .h-screen, .overflow-hidden, .overflow-auto, .overflow-y-auto {
                        height: auto !important;
                        overflow: visible !important;
                    }
                    aside, header, [role="navigation"], .no-print, .print\\:hidden {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    main > div {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                        border-radius: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(900px 520px at 14% 10%, rgba(16,185,129,0.20), rgba(16,185,129,0) 60%),' +
                            'radial-gradient(820px 520px at 86% 22%, rgba(34,197,94,0.14), rgba(34,197,94,0) 55%),' +
                            'radial-gradient(900px 620px at 52% 90%, rgba(59,130,246,0.08), rgba(59,130,246,0) 60%),' +
                            'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 35%, rgba(255,255,255,1) 100%)',
                        animation: 'hrm-bg-shift 18s ease-in-out infinite',
                    }}
                />
            </div>
            {/* Desktop Sidebar */}
            <div className="relative z-10 flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={cn(
                        'relative z-20 h-full min-h-0 shrink-0 flex-col border-r border-emerald-900/15 bg-white/95 shadow-sm backdrop-blur transition-all duration-300 print:hidden',
                        isTopNav ? 'hidden' : 'hidden md:flex',
                        isSidebarOpen ? 'w-[260px]' : 'w-[84px]',
                    )}
                >
                    {/* Toggle Button */}
                    <button
                        onClick={toggleSidebar}
                        className="absolute top-6 -right-3.5 z-50 flex items-center justify-center rounded-full border border-emerald-900/10 bg-white/90 p-1 text-slate-400 shadow-sm backdrop-blur transition-all hover:border-emerald-300/60 hover:bg-emerald-50/80 hover:text-emerald-700"
                    >
                        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Sidebar Header */}
                    <div
                        className={`flex h-16 shrink-0 items-center border-b border-emerald-900/10 bg-white/90 backdrop-blur transition-all ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}`}
                    >
                        <Link href="/sections" className="flex min-w-0 items-center gap-3" title={!isSidebarOpen ? 'Mousumi ERP' : undefined}>
                            <div className="flex shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 p-1.5">
                                <img src="/logo.png" className="h-6 w-6 rounded-md object-contain" alt="Logo" />
                            </div>
                            {isSidebarOpen && (
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-bold tracking-wide text-slate-800">Mousumi ERP</p>
                                    <p className="truncate text-[10px] font-semibold tracking-widest text-emerald-600 uppercase">
                                        {activeSection?.title || 'System'}
                                    </p>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Sidebar Menu — min-h-0 + overflow so long menus (e.g. Reports) scroll */}
                    <div className="sidebar-nav-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-5">
                        {sectionDashboardEntries.length > 0 && (
                            <div className={cn('mb-4', isSidebarOpen ? 'px-0' : 'px-0')}>
                                {isSidebarOpen && (
                                    <p className="mb-1.5 px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Dashboard</p>
                                )}
                                <div className={cn('flex flex-col gap-1', !isSidebarOpen && 'items-center')}>
                                    {sectionDashboardEntries.map((d) => (
                                        <Link
                                            key={d.path}
                                            href={d.path}
                                            title={!isSidebarOpen ? d.title : undefined}
                                            className={cn(
                                                'flex items-center font-semibold tracking-wide transition-all duration-200',
                                                isSidebarOpen
                                                    ? 'mx-3 w-[calc(100%-1.5rem)] gap-2 rounded-lg px-3 py-2.5 text-[12px]'
                                                    : 'mx-auto h-11 w-11 justify-center rounded-xl',
                                                isActive(d.path)
                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                            )}
                                        >
                                            {isSidebarOpen ? (
                                                <>
                                                    <LayoutDashboard className="h-4 w-4 shrink-0 text-emerald-600" />
                                                    <span className="min-w-0 truncate">{d.title}</span>
                                                </>
                                            ) : (
                                                <LayoutDashboard
                                                    className={cn('h-[18px] w-[18px]', isActive(d.path) ? 'text-emerald-600' : 'text-slate-500')}
                                                />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mb-3 px-3">
                            <p className={`text-[10px] font-bold tracking-widest text-slate-400 uppercase ${!isSidebarOpen && 'text-center'}`}>
                                {isSidebarOpen ? 'Main Menu' : '•••'}
                            </p>
                        </div>
                        <nav className="space-y-0.5">
                            {visibleMenuItems.map((item, idx) => (
                                <MobileMenuItem key={idx} item={item} />
                            ))}
                        </nav>
                    </div>

                    {/* Sidebar Footer - Logout */}
                    <div className="shrink-0 border-t border-slate-200 p-4">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            title={!isSidebarOpen ? 'Sign Out' : undefined}
                            className={`flex items-center text-[13px] font-medium tracking-wide text-red-600 transition-all duration-200 hover:bg-red-50 hover:text-red-700 ${
                                isSidebarOpen ? 'w-full gap-3 rounded-lg px-3 py-2.5' : 'mx-auto h-11 w-11 justify-center rounded-xl'
                            }`}
                        >
                            <LogOut className="h-[18px] w-[18px]" />
                            {isSidebarOpen && 'Sign Out'}
                        </Link>
                    </div>
                </aside>

                {/* Mobile Sidebar Sheet */}
                <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="flex h-full max-h-[100dvh] w-72 flex-col gap-0 border-r-0 bg-white p-0 text-slate-800 md:hidden"
                    >
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
                            <Link href="/sections" className="flex items-center gap-3">
                                <div className="flex items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 p-1.5">
                                    <img src="/logo.png" className="h-6 w-6 rounded-md object-contain" alt="Logo" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-[14px] font-bold tracking-wide text-slate-800">Mousumi ERP</p>
                                    <p className="text-[10px] font-semibold tracking-widest text-emerald-600 uppercase">
                                        {activeSection?.title || 'System'}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        <div className="sidebar-nav-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-5">
                            {sectionDashboardEntries.length > 0 && (
                                <div className="mb-4 px-0">
                                    <p className="mb-1.5 px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Dashboard</p>
                                    <div className="flex flex-col gap-1 px-3">
                                        {sectionDashboardEntries.map((d) => (
                                            <Link
                                                key={d.path}
                                                href={d.path}
                                                onClick={closeMobileSidebar}
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-200',
                                                    isActive(d.path)
                                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                                )}
                                            >
                                                <LayoutDashboard className="h-4 w-4 shrink-0 text-emerald-600" />
                                                <span className="min-w-0 truncate">{d.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-3 px-3">
                                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Main Menu</p>
                            </div>
                            <nav className="space-y-0.5">
                                {visibleMenuItems.map((item, idx) => (
                                    <MobileMenuItem key={idx} item={item} />
                                ))}
                            </nav>
                        </div>

                        <div className="shrink-0 border-t border-slate-200 p-4 md:hidden">
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-[13px] font-medium tracking-wide text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                            >
                                <LogOut className="h-[18px] w-[18px]" />
                                Sign Out
                            </Link>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Top Header */}
                    <header className="sticky top-0 z-10 h-14 border-b border-emerald-900/15 bg-white/90 px-2 shadow-sm backdrop-blur-md sm:h-16 sm:px-4 lg:px-6">
                        <div className="flex h-full items-center justify-between gap-2 sm:gap-4">
                            {/* Left: Mobile Menu Button, Brand Logo (in Top Nav Mode), & Home Icon */}
                            <div className="flex items-center gap-1 sm:gap-2.5">
                                <div className="md:hidden">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleMobileSidebar}
                                        className="h-9 w-9 text-slate-600 hover:bg-emerald-50/80 hover:text-emerald-800"
                                    >
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </div>

                                {isTopNav && (
                                    <Link
                                        href="/sections"
                                        className="group hidden min-w-0 items-center gap-2.5 pr-1 md:flex"
                                        title="Mousumi ERP - Home"
                                    >
                                        <div className="flex shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 p-1.5 transition-transform group-hover:scale-105">
                                            <img src="/logo.png" className="h-6 w-6 rounded-md object-contain" alt="Logo" />
                                        </div>
                                        <div className="flex min-w-0 flex-col">
                                            <p className="truncate text-[13px] font-bold tracking-wide text-slate-800 leading-tight">
                                                Mousumi ERP
                                            </p>
                                            <p className="truncate text-[9.5px] font-semibold tracking-widest text-emerald-600 uppercase leading-none">
                                                {activeSection?.title || 'System'}
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-slate-600 hover:bg-emerald-50/80 hover:text-emerald-800"
                                    title="Go to Home (Sections)"
                                >
                                    <Link href="/sections">
                                        <Home className="h-5 w-5" />
                                    </Link>
                                </Button>
                            </div>

                            {/* Right: User Menu, Navigation Switcher & Notifications */}
                            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
                                {/* Desktop Layout Mode Switcher */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleNavLayout}
                                    className="hidden items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:border-emerald-300/80 hover:bg-emerald-50/80 hover:text-emerald-800 transition-all md:inline-flex"
                                    title={isTopNav ? 'Switch to Left Sidebar Navigation' : 'Switch to Top Bar Horizontal Navigation'}
                                >
                                    {isTopNav ? (
                                        <>
                                            <PanelLeft className="h-3.5 w-3.5 text-emerald-600" />
                                            <span className="text-[11.5px] tracking-wide">Sidebar</span>
                                        </>
                                    ) : (
                                        <>
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                                            <span className="text-[11.5px] tracking-wide">Top Nav</span>
                                        </>
                                    )}
                                </Button>

                                <a
                                    href="https://app.mousumibd.org"
                                    target="_self"
                                    className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 p-2 text-white shadow-md transition-colors hover:bg-sky-600 sm:px-3 sm:py-1.5 dark:bg-sky-600 dark:hover:bg-sky-500"
                                    title="Return to Mousumi Apps"
                                >
                                    <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500 p-0.5 text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 dark:bg-white/20">
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="hidden tracking-wide text-xs font-bold sm:inline">Mousumi Apps</span>
                                </a>
                                <NotificationDropdown />

                                <div className="hidden h-6 w-px bg-slate-200 sm:block"></div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex h-auto items-center gap-2 rounded-full px-1 py-0.5 transition-colors hover:bg-slate-100/80 sm:gap-2.5 sm:px-2 sm:py-1"
                                        >
                                            <Avatar className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-200 sm:h-8 sm:w-8">
                                                <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                                <AvatarFallback className="bg-emerald-600 text-[11px] font-bold tracking-wider text-white">
                                                    {getInitials(auth.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="hidden pr-1 text-left leading-tight sm:block">
                                                <p className="text-[13px] font-bold tracking-wide text-slate-700">{auth.user.name}</p>
                                                <p className="text-[11px] font-medium text-slate-500">{auth.user.email}</p>
                                            </div>
                                            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 shadow-xl shadow-slate-200/50">
                                        <DropdownMenuLabel className="text-[13px] font-bold text-slate-700">My Account</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer rounded-lg transition-colors hover:bg-slate-50 focus:bg-slate-50"
                                        >
                                            <Link href="/settings/password" className="flex items-center text-[13px] font-medium text-slate-600">
                                                <KeyRound className="mr-2.5 h-4 w-4 text-slate-400" />
                                                {branchAccount ? 'Change Branch PIN' : 'Change Password'}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer rounded-lg transition-colors hover:bg-slate-50 focus:bg-slate-50"
                                        >
                                            <Link href="/settings" className="flex items-center text-[13px] font-medium text-slate-600">
                                                <Settings className="mr-2.5 h-4 w-4 text-slate-400" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer rounded-lg transition-colors hover:bg-slate-50 focus:bg-slate-50"
                                        >
                                            <Link href="/settings/notifications" className="flex items-center text-[13px] font-medium text-slate-600">
                                                <Bell className="mr-2.5 h-4 w-4 text-slate-400" />
                                                Notifications
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={toggleNavLayout}
                                            className="cursor-pointer rounded-lg transition-colors hover:bg-slate-50 focus:bg-slate-50"
                                        >
                                            <div className="flex w-full items-center justify-between text-[13px] font-medium text-slate-600">
                                                <span className="flex items-center">
                                                    {isTopNav ? (
                                                        <PanelLeft className="mr-2.5 h-4 w-4 text-slate-400" />
                                                    ) : (
                                                        <SlidersHorizontal className="mr-2.5 h-4 w-4 text-slate-400" />
                                                    )}
                                                    Nav Layout
                                                </span>
                                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                                                    {isTopNav ? 'Top Bar' : 'Sidebar'}
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-100" />
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer rounded-lg transition-colors hover:bg-red-50 focus:bg-red-50"
                                        >
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                className="flex w-full items-center text-left text-[13px] font-medium text-red-600"
                                            >
                                                <LogOut className="mr-2.5 h-4 w-4 text-red-500" />
                                                Sign out
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    {/* Desktop Top Bar Horizontal Navigation (When Top Nav layout mode is active) */}
                    {isTopNav && (
                        <div className="sticky top-14 z-20 hidden w-full border-b border-emerald-900/10 bg-white/95 px-3 py-1.5 shadow-xs backdrop-blur-md sm:top-16 md:block print:hidden">
                            <div className="sidebar-nav-scroll flex w-full items-center gap-1.5 overflow-x-auto py-0.5">
                                {sectionDashboardEntries.map((d) => (
                                    <Link
                                        key={d.path}
                                        href={d.path}
                                        className={cn(
                                            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                            isActive(d.path)
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/25'
                                                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                        )}
                                    >
                                        <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>{d.title}</span>
                                    </Link>
                                ))}

                                {sectionDashboardEntries.length > 0 && visibleMenuItems.length > 0 && (
                                    <div className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
                                )}

                                <nav className="flex items-center gap-1">
                                    {visibleMenuItems.map((item, idx) => (
                                        <DesktopTopMenuItem key={idx} item={item} />
                                    ))}
                                </nav>
                            </div>
                        </div>
                    )}

                    {/* Global Mobile Section Sub-Navigation Bar (Active for all sections on mobile viewports) */}
                    {mobileSubNavItems.length > 0 && (
                        <div className="sticky top-14 z-20 flex w-full items-center border-b border-slate-200/80 bg-white/95 px-2 py-1.5 shadow-xs backdrop-blur-md sm:top-16 md:hidden print:hidden">
                            <style>{`
                                .mobile-subnav-scroll {
                                    -ms-overflow-style: none;
                                    scrollbar-width: none;
                                }
                                .mobile-subnav-scroll::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            <div className="relative flex w-full items-center overflow-hidden">
                                <div className="mobile-subnav-scroll flex w-full items-center gap-1.5 overflow-x-auto scroll-smooth py-0.5 pr-8 pl-0.5">
                                    {mobileSubNavItems.map((item) => {
                                        const active = isActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 focus:outline-none ${
                                                    active
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                                                }`}
                                            >
                                                {item.icon}
                                                <span className="whitespace-nowrap leading-none">{item.title}</span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Right Gradient Overlay & Chevron hint indicating more swipeable items */}
                                <div aria-hidden className="pointer-events-none absolute top-0 right-0 bottom-0 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-0.5">
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-90" />
                                </div>
                            </div>
                        </div>
                    )}

                    {hasOwnActiveMovement && activeMovement && (
                        <div className="flex justify-center border-b border-slate-200/70 bg-white/60 px-4 py-2.5 backdrop-blur-sm print:hidden">
                            <ActiveMovementBanner
                                movement={activeMovement}
                                canClose={canCloseOwnMovement}
                                onClose={() => openCloseMovementDialog()}
                            />
                        </div>
                    )}

                    {/* Main Content */}
                    <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950 px-2.5 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
                        <div className="w-full rounded-2xl border border-slate-300/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-md shadow-slate-200/60 sm:p-5 lg:p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {/* Flash Messages */}
            <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 flex-col gap-2 print:hidden">
                {showSuccess && (
                    <Alert
                        variant="default"
                        className="animate-in fade-in slide-in-from-top-5 pointer-events-auto border-green-200 bg-green-50 text-green-800 shadow-md"
                    >
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{flash.success}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 text-green-800 hover:bg-green-100"
                            onClick={() => setShowSuccess(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showError && (
                    <Alert
                        variant="destructive"
                        className="animate-in fade-in slide-in-from-top-5 pointer-events-auto border-red-200 bg-red-50 text-red-800 shadow-md"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{flash.error || errors?.attendance || errors?.lat || errors?.lng || 'Validation failed.'}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 text-red-800 hover:bg-red-100"
                            onClick={() => setShowError(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showWarning && (
                    <Alert
                        variant="default"
                        className="animate-in fade-in slide-in-from-top-5 pointer-events-auto border-yellow-200 bg-yellow-50 text-yellow-800 shadow-md"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{flash.warning}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 text-yellow-800 hover:bg-yellow-100"
                            onClick={() => setShowWarning(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showInfo && (
                    <Alert
                        variant="default"
                        className="animate-in fade-in slide-in-from-top-5 pointer-events-auto border-blue-200 bg-blue-50 text-blue-800 shadow-md"
                    >
                        <Info className="h-4 w-4" />
                        <AlertDescription>{flash.info}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 text-blue-800 hover:bg-blue-100"
                            onClick={() => setShowInfo(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
            </div>

            {/* Global Close Movement Dialog */}
            <CloseMovementModal
                open={showCloseMovementDialog}
                onOpenChange={setShowCloseMovementDialog}
                movementId={closeMovementId ?? activeMovement?.id}
                movementType={activeMovement?.movement_type}
                startMeterReading={activeMovement?.last_end_meter_reading ?? activeMovement?.start_meter_reading}
                startPlace={activeMovement?.start_place}
                branchFallbackName={branchFallbackName}
            />
        </div>
    );
};

export default AdminLayout;
