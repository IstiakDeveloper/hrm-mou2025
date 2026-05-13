import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    User,
    Users,
    ClipboardList,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    Settings,
    BarChart,
    Bell,
    Activity,
    Award,
    CalendarDays,
    MapPin,
    Building2,
    ChevronsLeft,
    ArrowLeftRight,
    LayoutDashboard,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toast, ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationDropdown from '@/components/notification-dropdown';
import { hasAppPermission } from '@/lib/permissions';
import { getActiveSectionId, getMenuTitlesForSection, getSectionById, type AdminSectionId } from '@/lib/admin-sections';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
}

interface MenuItemType {
    title: string;
    icon: React.ReactNode;
    path: string;
    hasSubmenu: boolean;
    permission?: string;
    hrOnly?: boolean;
    submenu?: {
        title: string;
        path: string;
        permission?: string;
        hrOnly?: boolean;
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
                    title: 'Employee report',
                    path: '/employee/dashboard',
                    anyPermissions: [
                        'employees.view',
                        'leave-applications.view',
                        'movements.view',
                        'transfers.view',
                        'attendance.view',
                    ],
                },
                {
                    title: 'Employee report',
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
                { title: 'Attendance Report', path: '/attendance/report', permission: 'attendance.view' },
                { title: 'Attendance sheet report', path: '/attendance/sheet-report', permission: 'reports.view' },
            ];
        case 'leave':
            return [
                { title: 'Leave applications report', path: '/leave/applications/report', permission: 'reports.view' },
                { title: 'Leave summary report', path: '/reports/leave', permission: 'reports.view' },
            ];
        case 'administration':
            return [{ title: 'Reports overview', path: '/reports', permission: 'reports.view' }];
        default:
            return [{ title: 'Reports overview', path: '/reports', permission: 'reports.view' }];
    }
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { auth, notifications, activeMovement } = usePage().props as any;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showCloseMovementDialog, setShowCloseMovementDialog] = useState(false);
    const [closeMovementId, setCloseMovementId] = useState<number | null>(null);
    const [forgotReturnTime, setForgotReturnTime] = useState(false);
    const [customReturnTime, setCustomReturnTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [closeError, setCloseError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);

    // Get current path for highlighting active menu
    const currentPath = window.location.pathname;
    const activeSectionId = getActiveSectionId(window.location);
    const activeSection = getSectionById(activeSectionId);
    const employee = auth?.employee;
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
            .map(word => word[0])
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

    const canCloseOwnMovement = Boolean(activeMovement?.id && auth?.employee?.id && activeMovement.employee_id === auth.employee.id);

    const openCloseMovementDialog = (movementId?: number) => {
        setCloseError(null);
        setForgotReturnTime(false);
        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setCloseMovementId(typeof movementId === 'number' ? movementId : (activeMovement?.id ?? null));
        setShowCloseMovementDialog(true);
    };

    const handleCloseMovement = () => {
        setCloseError(null);
        const movementId = closeMovementId ?? activeMovement?.id;
        if (!movementId) return;

        if (forgotReturnTime && !customReturnTime?.trim()) {
            setCloseError('Please select the actual date and time you returned.');
            return;
        }

        setClosing(true);
        router.post(route('movements.complete', movementId), {
            forgot_return_time: forgotReturnTime ? '1' : '0',
            actual_return_datetime: forgotReturnTime ? customReturnTime : null,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setClosing(false);
                setShowCloseMovementDialog(false);
            }
        });
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

    const administrationSectionDashboardAny: string[] = [
        'admin.access',
        'roles.view',
        'users.view',
        'reports.view',
    ];

    // Organized Menu Structure with EXACT permission names matching web.php
    const baseMenuItems = useMemo<MenuItemType[]>(
        () => [
        {
            title: 'My Notices',
            icon: <Bell className="w-5 h-5" />,
            path: '/my-notices',
            hasSubmenu: false,
        },
        {
            title: 'Employee Management',
            icon: <Users className="w-5 h-5" />,
            path: '/employees',
            hasSubmenu: true,
            submenu: [
                { title: 'All Employees', path: '/employees', permission: 'employees.view', hrOnly: true },
                { title: 'Organization Chart', path: '/organization-chart', permission: 'employees.view', hrOnly: true },
            ]
        },
        {
            title: 'Organization Setup',
            icon: <Building2 className="w-5 h-5" />,
            path: '/branches',
            hasSubmenu: true,
            permission: 'branches.view',
            hrOnly: true,
            submenu: [
                { title: 'Branches', path: '/branches', permission: 'branches.view' },
                { title: 'Zones', path: '/zones', permission: 'zones.view' },
                { title: 'Regional Offices', path: '/regional-offices', permission: 'regional-offices.view' },
                { title: 'Departments', path: '/departments', permission: 'departments.view' },
                { title: 'Designations', path: '/designations', permission: 'designations.view' },
                { title: 'Employee Types', path: '/employee-types', permission: 'departments.view' },
                { title: 'Programs', path: '/programs', permission: 'departments.view' },
                { title: 'Projects', path: '/projects', permission: 'departments.view' },
            ]
        },
        {
            title: 'Attendance',
            icon: <ClipboardList className="w-5 h-5" />,
            path: '/attendance',
            hasSubmenu: true,
            permission: 'attendance.view',
            submenu: [
                { title: 'Daily Attendance', path: '/attendance', permission: 'attendance.view' },
                { title: 'Attendance Devices', path: '/attendance/devices', permission: 'attendance.admin' },
                { title: 'Device Settings', path: '/attendance/settings', permission: 'attendance.admin' },
                { title: 'ZKTeco Integration', path: '/zkteco', permission: 'attendance.admin' },
            ]
        },
        {
            title: 'Leave Management',
            icon: <CalendarDays className="w-5 h-5" />,
            path: '/leave',
            hasSubmenu: true,
            permission: 'leave-applications.view',
            submenu: [
                { title: 'Leave Applications', path: '/leave/applications', permission: 'leave-applications.view' },
                { title: 'Leave Settings', path: '/leave/settings', permission: 'leave-types.view', hrOnly: true },
                { title: 'Leave Types', path: '/leave/types', permission: 'leave-types.view', hrOnly: true },
                { title: 'Leave Balances', path: '/leave/balances', permission: 'leave-balances.view', hrOnly: true },
                { title: 'Bulk Allocate', path: '/leave/balances/allocate-bulk', permission: 'leave-balances.admin', hrOnly: true },
            ]
        },
        {
            title: 'Movement',
            icon: <Activity className="w-5 h-5" />,
            path: '/movements',
            hasSubmenu: true,
            permission: 'movements.view',
            submenu: [
                { title: 'Movements', path: '/movements', permission: 'movements.view' },
            ]
        },
        {
            title: 'Transfers',
            icon: <ArrowLeftRight className="w-5 h-5" />,
            path: '/transfers',
            hasSubmenu: true,
            permission: 'transfers.view',
            submenu: [
                { title: 'All Transfers', path: '/transfers', permission: 'transfers.view' },
            ]
        },
        {
            title: 'Holidays',
            icon: <Award className="w-5 h-5" />,
            path: '/holidays',
            hasSubmenu: true,
            permission: 'holidays.view',
            submenu: [
                { title: 'All Holidays', path: '/holidays', permission: 'holidays.view' },
                { title: 'Holiday Calendar', path: '/holidays/calendar', permission: 'holidays.view' },
            ]
        },
        {
            title: 'User Management',
            icon: <User className="w-5 h-5" />,
            path: '/admin/users',
            hasSubmenu: true,
            permission: 'admin.access',
            hrOnly: true,
            submenu: [
                { title: 'All Users', path: '/admin/users', permission: 'users.view' },
                { title: 'Add User', path: '/admin/users/create', permission: 'users.create' },
                { title: 'Roles & Permissions', path: '/admin/roles', permission: 'roles.view' },
                { title: 'Notices', path: '/admin/notices', permission: 'admin.access' },
                { title: 'Send notice', path: '/admin/notices/create', permission: 'admin.access' },
            ]
        },
        {
            title: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            path: '/settings',
            hasSubmenu: true,
            submenu: [
                { title: 'Profile', path: '/settings/profile' },
                { title: 'Password', path: '/settings/password' },
                { title: 'Notifications', path: '/settings/notifications' },
            ]
        },
        ],
        [],
    );

    const menuItemsForLayout = useMemo(() => {
        const sub = buildReportsSubmenu(activeSectionId);
        const reportsPath = sub[0]?.path ?? '/reports';
        const reportsItem: MenuItemType = {
            title: 'Reports',
            icon: <BarChart className="w-5 h-5" />,
            path: reportsPath,
            hasSubmenu: true,
            submenu: sub,
        };
        const idx = baseMenuItems.findIndex((m) => m.title === 'User Management');
        if (idx === -1) {
            return [...baseMenuItems, reportsItem];
        }
        return [...baseMenuItems.slice(0, idx), reportsItem, ...baseMenuItems.slice(idx)];
    }, [activeSectionId, baseMenuItems]);

    const visibleMenuItems = useMemo(() => {
        const titles = getMenuTitlesForSection(activeSectionId);
        if (!titles) {
            return menuItemsForLayout;
        }
        return titles
            .map((title) => menuItemsForLayout.find((m) => m.title === title))
            .filter((x): x is MenuItemType => Boolean(x));
    }, [activeSectionId, menuItemsForLayout]);

    /** All sidebar link paths — longest-prefix wins so /leave/applications does not swallow /leave/applications/report */
    const menuNavPaths = useMemo(() => {
        const paths = new Set<string>();
        for (const item of menuItemsForLayout) {
            if (item.hasSubmenu && item.submenu) {
                for (const s of item.submenu) {
                    if (s.path) paths.add(s.path);
                }
            } else if (item.path) {
                paths.add(item.path);
            }
        }
        return Array.from(paths);
    }, [menuItemsForLayout]);

    const isActive = useCallback(
        (path: string) => {
            if (!path || path === '/') return currentPath === path;
            if (currentPath === path) return true;
            const candidates = menuNavPaths.filter(
                (p) => currentPath === p || (p !== '/' && currentPath.startsWith(p + '/')),
            );
            if (candidates.length === 0) return false;
            const best = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
            return best === path;
        },
        [currentPath, menuNavPaths],
    );

    const hasAnyDashboardPerm = (perms: string[]) => perms.some((p) => hasPermission(p));

    /** Same gate as `DashboardController::humanResources` admin branch — those users see org HR, not personal My HR. */
    const showsAdminHrDashboard = hasAnyDashboardPerm(hrSectionDashboardAny);
    const canSeePersonalHrDashboard = Boolean(employee?.id) && !showsAdminHrDashboard;

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
                return hasAnyDashboardPerm(administrationSectionDashboardAny)
                    ? [{ title: 'Administration', path: '/sections/administration' }]
                    : [];
            default:
                return [];
        }
    })();

    // Automatically expand the menu item if a child is active
    useEffect(() => {
        if (!activeMenu) {
            const activeParent = visibleMenuItems.find(item =>
                item.hasSubmenu && item.submenu?.some(subItem => isActive(subItem.path))
            );
            if (activeParent) {
                setActiveMenu(activeParent.title);
            }
        }
    }, [currentPath, visibleMenuItems, activeMenu, isActive]);

    const MobileMenuItem = ({ item }: { item: MenuItemType }) => {
        if (item.hrOnly && !isHRUser) return null;
        if (item.permission && !hasPermission(item.permission)) return null;

        const permittedSubmenu = item.submenu?.filter(subItem =>
            (!subItem.hrOnly || isHRUser)
            && (!subItem.permission || hasPermission(subItem.permission))
            && (!subItem.anyPermissions?.length
                || subItem.anyPermissions.some((p) => hasPermission(p)))
            && (!subItem.allPermissions?.length
                || subItem.allPermissions.every((p) => hasPermission(p)))
        );

        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        const submenuSectionActive = permittedSubmenu?.some((s) => isActive(s.path)) ?? false;
        const isMenuOpen = activeMenu === item.title;

        return item.hasSubmenu ? (
            <div className="mb-1 relative group">
                <button
                    onClick={() => toggleMenu(item.title)}
                    title={!isSidebarOpen && !isMobileSidebarOpen ? item.title : undefined}
                    className={`flex items-center transition-all duration-300 text-[13px] font-medium ${isSidebarOpen || isMobileSidebarOpen
                            ? 'w-full justify-between px-3 py-2.5 rounded-lg'
                            : 'w-11 h-11 justify-center mx-auto rounded-xl'
                        } ${submenuSectionActive || isActive(item.path)
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
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
                    )}
                </button>
                {isMenuOpen && (isSidebarOpen || isMobileSidebarOpen) && (
                    <div className="ml-9 mt-1 space-y-0.5 border-l border-emerald-500/20 pl-4 py-1">
                        {permittedSubmenu?.map((subItem, idx) => (
                            <Link
                                key={idx}
                                href={subItem.path}
                                className={`block px-3 py-2 rounded-md text-[12px] transition-all duration-200 tracking-wide ${isActive(subItem.path)
                                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                                onClick={closeMobileSidebar}
                            >
                                {subItem.title}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <Link
                href={item.path}
                title={!isSidebarOpen && !isMobileSidebarOpen ? item.title : undefined}
                className={`flex items-center transition-all duration-300 text-[13px] font-medium mb-1 ${isSidebarOpen || isMobileSidebarOpen
                        ? 'w-full gap-3 px-3 py-2.5 rounded-lg'
                        : 'w-11 h-11 justify-center mx-auto rounded-xl'
                    } ${isActive(item.path)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                onClick={closeMobileSidebar}
            >
                <div className={`${isActive(item.path) ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-[18px] h-[18px]' })}
                </div>
                {(isSidebarOpen || isMobileSidebarOpen) && <span className="truncate tracking-wide">{item.title}</span>}
            </Link>
        );
    };

    // Flash message handling
    const { flash } = usePage().props as any;
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
        if (flash.error) {
            setShowError(true);
            const timer = setTimeout(() => setShowError(false), 5000);
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
    }, [flash]);

    useEffect(() => {
        if (flash.success) {
            toast({
                title: "Success",
                description: flash.success,
                variant: "success"
            });
        }
        if (flash.error) {
            toast({
                title: "Error",
                description: flash.error,
                variant: "destructive"
            });
        }
        if (flash.warning) {
            toast({
                title: "Warning",
                description: flash.warning,
                variant: "warning"
            });
        }
        if (flash.info) {
            toast({
                title: "Information",
                description: flash.info,
                variant: "info"
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
            `}</style>
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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
                    className={`hidden md:flex flex-col bg-white/95 backdrop-blur border-r border-emerald-900/15 transition-all duration-300 z-20 shadow-sm relative ${isSidebarOpen ? 'w-[260px]' : 'w-[84px]'
                        }`}
                >
                    {/* Toggle Button */}
                    <button
                        onClick={toggleSidebar}
                        className="absolute -right-3.5 top-6 bg-white/90 backdrop-blur border border-emerald-900/10 shadow-sm rounded-full p-1 text-slate-400 hover:text-emerald-700 hover:border-emerald-300/60 hover:bg-emerald-50/80 transition-all z-50 flex items-center justify-center"
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Sidebar Header */}
                    <div className={`h-16 border-b border-emerald-900/10 bg-white/90 backdrop-blur flex items-center transition-all ${isSidebarOpen ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
                        <Link href="/sections" className="flex items-center gap-3 min-w-0" title={!isSidebarOpen ? "Mousumi ERP" : undefined}>
                            <div className="bg-emerald-50 p-1.5 rounded-lg flex items-center justify-center border border-emerald-100 shrink-0">
                                <img src="/logo.png" className="w-6 h-6 rounded-md object-contain" alt="Logo" />
                            </div>
                            {isSidebarOpen && (
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-bold text-slate-800 tracking-wide truncate">Mousumi ERP</p>
                                    <p className="text-[10px] text-emerald-600 font-semibold truncate uppercase tracking-widest">{activeSection?.title || 'System'}</p>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Sidebar Menu */}
                    <ScrollArea className="flex-1 px-3 py-5">
                        {sectionDashboardEntries.length > 0 && (
                            <div className={cn('mb-4', isSidebarOpen ? 'px-0' : 'px-0')}>
                                {isSidebarOpen && (
                                    <p className="mb-1.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</p>
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
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300',
                                            )}
                                        >
                                            {isSidebarOpen ? (
                                                <>
                                                    <LayoutDashboard className="h-4 w-4 shrink-0 text-emerald-600" />
                                                    <span className="min-w-0 truncate">{d.title}</span>
                                                </>
                                            ) : (
                                                <LayoutDashboard
                                                    className={cn(
                                                        'h-[18px] w-[18px]',
                                                        isActive(d.path) ? 'text-emerald-600' : 'text-slate-500',
                                                    )}
                                                />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mb-3 px-3">
                            <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${!isSidebarOpen && 'text-center'}`}>
                                {isSidebarOpen ? 'Main Menu' : '•••'}
                            </p>
                        </div>
                        <nav className="space-y-0.5">
                            {visibleMenuItems.map((item, idx) => (
                                <MobileMenuItem key={idx} item={item} />
                            ))}
                        </nav>
                    </ScrollArea>

                    {/* Sidebar Footer - Logout */}
                    <div className="p-4 border-t border-slate-200">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            title={!isSidebarOpen ? "Sign Out" : undefined}
                            className={`flex items-center transition-all duration-200 font-medium text-[13px] tracking-wide text-red-600 hover:bg-red-50 hover:text-red-700 ${isSidebarOpen
                                    ? 'w-full gap-3 px-3 py-2.5 rounded-lg'
                                    : 'w-11 h-11 justify-center mx-auto rounded-xl'
                                }`}
                        >
                            <LogOut className="w-[18px] h-[18px]" />
                            {isSidebarOpen && 'Sign Out'}
                        </Link>
                    </div>
                </aside>

                {/* Mobile Sidebar Sheet */}
                <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    <SheetContent side="left" className="w-72 p-0 border-r-0 md:hidden bg-white text-slate-800">
                        <div className="px-4 border-b border-slate-200 h-16 flex items-center justify-between">
                            <Link href="/sections" className="flex items-center gap-3">
                                <div className="bg-emerald-50 p-1.5 rounded-lg flex items-center justify-center border border-emerald-100">
                                    <img src="/logo.png" className="w-6 h-6 rounded-md object-contain" alt="Logo" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-[14px] font-bold text-slate-800 tracking-wide">Mousumi ERP</p>
                                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest">{activeSection?.title || 'System'}</p>
                                </div>
                            </Link>
                        </div>

                        <ScrollArea className="h-[calc(100vh-130px)] px-3 py-5">
                            {sectionDashboardEntries.length > 0 && (
                                <div className="mb-4 px-0">
                                    <p className="mb-1.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</p>
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
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300',
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
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Main Menu
                                </p>
                            </div>
                            <nav className="space-y-0.5">
                                {visibleMenuItems.map((item, idx) => (
                                    <MobileMenuItem key={idx} item={item} />
                                ))}
                            </nav>
                        </ScrollArea>

                        <div className="p-4 border-t border-slate-200 absolute bottom-0 left-0 right-0 md:hidden">
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-[13px] font-medium tracking-wide text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                            >
                                <LogOut className="h-[18px] w-[18px]" />
                                Sign Out
                            </Link>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Top Header */}
                        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-emerald-900/15 shadow-sm px-4 lg:px-6 z-10 sticky top-0">
                        <div className="h-full flex items-center justify-between gap-4">
                            {/* Left: Mobile Menu Button */}
                            <div className="flex items-center gap-3 md:hidden">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMobileSidebar}
                                        className="text-slate-600 hover:bg-emerald-50/80 hover:text-emerald-800"
                                >
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Right: User Menu & Notifications */}
                            <div className="flex items-center gap-4 ml-auto">
                                {canCloseOwnMovement && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="hidden sm:inline-flex border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500/50 shadow-sm transition-all text-xs font-semibold tracking-wide h-8"
                                        onClick={() => openCloseMovementDialog()}
                                    >
                                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                        Close Movement
                                    </Button>
                                )}

                                <NotificationDropdown />

                                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="flex items-center gap-2.5 hover:bg-slate-100/80 px-2 rounded-full py-1 h-auto transition-colors">
                                            <Avatar className="w-8 h-8 border-2 border-white shadow-sm ring-1 ring-slate-200">
                                                <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                                <AvatarFallback className="bg-emerald-600 text-white text-[11px] font-bold tracking-wider">
                                                    {getInitials(auth.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="hidden sm:block text-left leading-tight pr-1">
                                                <p className="text-[13px] font-bold text-slate-700 tracking-wide">{auth.user.name}</p>
                                                <p className="text-[11px] font-medium text-slate-500">{auth.user.email}</p>
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 shadow-xl shadow-slate-200/50">
                                        <DropdownMenuLabel className="font-bold text-slate-700 text-[13px]">My Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-100" />
                                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                                            <Link href="/settings" className="flex items-center text-[13px] font-medium text-slate-600">
                                                <Settings className="w-4 h-4 mr-2.5 text-slate-400" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                                            <Link href="/settings/notifications" className="flex items-center text-[13px] font-medium text-slate-600">
                                                <Bell className="w-4 h-4 mr-2.5 text-slate-400" />
                                                Notifications
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-100" />
                                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-red-50 focus:bg-red-50 transition-colors">
                                            <Link href="/logout" method="post" as="button" className="w-full text-left flex items-center text-[13px] font-medium text-red-600">
                                                <LogOut className="w-4 h-4 mr-2.5 text-red-500" />
                                                Sign out
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 overflow-auto bg-transparent px-4 lg:px-6 py-6 lg:py-8">
                        <div className="w-full rounded-2xl border border-slate-200/70 bg-white/75 backdrop-blur shadow-sm shadow-slate-200/40 p-4 lg:p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {/* Flash Messages */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
                {showSuccess && (
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 animate-in fade-in slide-in-from-top-5 pointer-events-auto shadow-md">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{flash.success}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 text-green-800 hover:bg-green-100 h-6 w-6"
                            onClick={() => setShowSuccess(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showError && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-in fade-in slide-in-from-top-5 pointer-events-auto shadow-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{flash.error}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 text-red-800 hover:bg-red-100 h-6 w-6"
                            onClick={() => setShowError(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showWarning && (
                    <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 animate-in fade-in slide-in-from-top-5 pointer-events-auto shadow-md">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{flash.warning}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 text-yellow-800 hover:bg-yellow-100 h-6 w-6"
                            onClick={() => setShowWarning(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
                {showInfo && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 animate-in fade-in slide-in-from-top-5 pointer-events-auto shadow-md">
                        <Info className="h-4 w-4" />
                        <AlertDescription>{flash.info}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 text-blue-800 hover:bg-blue-100 h-6 w-6"
                            onClick={() => setShowInfo(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                )}
            </div>

            {/* Global Close Movement Dialog */}
            <Dialog
                open={showCloseMovementDialog}
                onOpenChange={(open) => {
                    setShowCloseMovementDialog(open);
                    if (open) {
                        setCloseError(null);
                        setForgotReturnTime(false);
                        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close Movement</DialogTitle>
                        <DialogDescription>
                            You are confirming that you have returned from your movement. Your actual return time will be recorded.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            By default, your return is recorded at <strong>the current time</strong> when you confirm.
                        </p>

                        <div className="flex items-start space-x-3 rounded-md border p-3">
                            <Checkbox
                                id="forgotReturnTimeGlobal"
                                checked={forgotReturnTime}
                                onCheckedChange={(checked) => {
                                    setForgotReturnTime(checked === true);
                                    setCloseError(null);
                                    if (checked === true) {
                                        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                                    }
                                }}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="forgotReturnTimeGlobal" className="cursor-pointer font-medium">
                                    I forgot to close earlier — set actual return date &amp; time
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Check this if you already returned but did not close the movement. Then pick when you actually came back.
                                </p>
                            </div>
                        </div>

                        {forgotReturnTime && (
                            <div className="space-y-2">
                                <Label htmlFor="customTimeGlobal">Actual return date &amp; time</Label>
                                <Input
                                    id="customTimeGlobal"
                                    type="datetime-local"
                                    value={customReturnTime}
                                    onChange={(e) => setCustomReturnTime(e.target.value)}
                                />
                            </div>
                        )}

                        {closeError && (
                            <p className="text-sm font-medium text-red-600">{closeError}</p>
                        )}

                        <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-blue-700">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                This will mark your movement as completed and update your attendance records.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseMovementDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCloseMovement}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={closing}
                        >
                            {closing ? 'Processing...' : 'Confirm Return'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminLayout;
