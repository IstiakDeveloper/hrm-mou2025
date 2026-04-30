import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    User,
    Users,
    ClipboardList,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Settings,
    BarChart,
    Bell,
    Activity,
    Award,
    CalendarDays,
    MapPin,
    Building2
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
import { getActiveSectionId, getMenuTitlesForSection, getSectionById } from '@/lib/admin-sections';
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
    }[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { auth, notifications, activeMovement } = usePage().props as any;
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
    const toggleMobileNav = () => setIsMobileNavOpen(!isMobileNavOpen);
    const toggleMenu = (menu: string) => setActiveMenu(activeMenu === menu ? null : menu);

    // Check if a menu item is active
    const isActive = (path: string) => {
        return currentPath === path ||
            (path !== '/' && (currentPath.startsWith(path + '/') || currentPath === path));
    };

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

    // Organized Menu Structure with EXACT permission names matching web.php
    const menuItems: MenuItemType[] = [
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
                {
                    title: 'Employee Dashboard',
                    path: '/employee/dashboard',
                    anyPermissions: [
                        'employees.view',
                        'leave-applications.view',
                        'movements.view',
                        'transfers.view',
                        'attendance.view',
                    ],
                },
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
                { title: 'Monthly View', path: '/attendance/monthly', permission: 'attendance.view' },
                { title: 'Attendance Report', path: '/attendance/report', permission: 'attendance.view' },
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
                { title: 'Leave Report', path: '/leave/applications/report', permission: 'reports.view' },
            ]
        },
        {
            title: 'Movement & Transfer',
            icon: <Activity className="w-5 h-5" />,
            path: '/movements',
            hasSubmenu: true,
            permission: 'movements.view',
            submenu: [
                { title: 'Movements', path: '/movements', permission: 'movements.view' },
                { title: 'Movement Report', path: '/movements/report', permission: 'reports.view' },
                { title: 'Transfers', path: '/transfers', permission: 'transfers.view' },
                { title: 'Transfer Report', path: '/transfers/report', permission: 'reports.view' },
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
            title: 'Reports',
            icon: <BarChart className="w-5 h-5" />,
            path: '/reports',
            hasSubmenu: true,
            permission: 'reports.view',
            submenu: [
                { title: 'Attendance Report', path: '/attendance/sheet-report', permission: 'reports.view' },
                { title: 'Leave Report', path: '/leave/applications/report', permission: 'reports.view' },
                { title: 'Movement Report', path: '/reports/movement', permission: 'reports.view' },
                { title: 'Transfer Report', path: '/reports/transfer', permission: 'reports.view' },
                { title: 'Employee Report', path: '/reports/employee', permission: 'reports.view' },
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
    ];

    const sectionMenuTitles = getMenuTitlesForSection(activeSectionId);
    const visibleMenuItems = sectionMenuTitles
        ? menuItems.filter((item) => sectionMenuTitles.includes(item.title))
        : menuItems;

    const MobileMenuItem = ({ item }: { item: MenuItemType }) => {
        if (item.hrOnly && !isHRUser) return null;
        if (item.permission && !hasPermission(item.permission)) return null;

        const permittedSubmenu = item.submenu?.filter(subItem =>
            (!subItem.hrOnly || isHRUser)
            && (!subItem.permission || hasPermission(subItem.permission))
            && (!subItem.anyPermissions?.length
                || subItem.anyPermissions.some((p) => hasPermission(p)))
        );

        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        return item.hasSubmenu ? (
            <Collapsible
                open={activeMenu === item.title}
                onOpenChange={() => toggleMenu(item.title)}
                className="w-full"
            >
                <CollapsibleTrigger asChild>
                    <div
                        className={`flex items-center justify-between w-full p-3 rounded-lg cursor-pointer transition-all duration-200 ${isActive(item.path)
                                ? 'bg-green-50 text-green-700 font-medium'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`${isActive(item.path) ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                {item.icon}
                            </div>
                            <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeMenu === item.title ? 'transform rotate-180' : ''
                            } ${isActive(item.path) ? 'text-green-700' : 'text-gray-500'}`} />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-2">
                    {permittedSubmenu?.map((subItem, idx) => (
                        <Link
                            key={idx}
                            href={subItem.path}
                            className={`block p-3 rounded-md text-sm transition-all duration-200 ${currentPath === subItem.path
                                    ? 'bg-green-50 text-green-700 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            onClick={toggleMobileNav}
                        >
                            {subItem.title}
                        </Link>
                    ))}
                </CollapsibleContent>
            </Collapsible>
        ) : (
            <Link
                href={item.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive(item.path)
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                onClick={toggleMobileNav}
            >
                <div className={`${isActive(item.path) ? 'text-green-700' : 'text-gray-600'
                    }`}>
                    {item.icon}
                </div>
                <span className="text-sm font-medium">{item.title}</span>
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
        <div className="flex h-screen flex-col bg-gray-50">
            {/* Mobile Navigation */}
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0 border-r-0">
                    <div className="px-4 border-b bg-white/90 backdrop-blur text-gray-900">
                        <div className="flex items-center justify-between">
                            <Link href="/sections" className="flex items-center gap-2">
                                <img src='/logo.png' className="w-8 h-8 rounded-xl" alt="Logo" />
                                <div className="leading-tight">
                                    <p className="text-sm font-semibold">Mousumi Erp</p>
                                    {activeSection ? (
                                        <p className="text-[11px] text-gray-600">{activeSection.title}</p>
                                    ) : (
                                        <p className="text-[11px] text-gray-600">Select a section</p>
                                    )}
                                </div>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMobileNav}
                                className="text-gray-700 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[calc(100vh-220px)] px-3 py-4">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">MENU</p>
                            <Link
                                href="/sections"
                                className="text-xs font-medium text-green-700 hover:text-green-800 underline underline-offset-4"
                                onClick={toggleMobileNav}
                            >
                                Change section
                            </Link>
                        </div>
                        <nav className="space-y-2">
                            {visibleMenuItems.map((item, idx) => (
                                <MobileMenuItem key={idx} item={item} />
                            ))}
                        </nav>
                    </ScrollArea>

                    <div className="p-4 border-t bg-gray-50">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={toggleMobileNav}
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Link>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Top Header + Horizontal Navigation */}
            <header className="bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
                <div className="w-full px-4">
                    <div className="h-14 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMobileNav}
                                className="md:hidden text-gray-700 hover:bg-gray-100"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <Link href="/sections" className="flex items-center gap-2 min-w-0">
                                <img src="/logo.png" className="w-9 h-9 rounded-xl" alt="Logo" />
                                <div className="min-w-0 leading-tight">
                                    <p className="text-sm font-semibold text-gray-900">Mousumi Erp</p>
                                    {activeSection ? (
                                        <div className="flex items-center gap-2">
                                            <p className="text-[11px] text-gray-600 truncate">{activeSection.title}</p>
                                            <span className="text-[11px] text-gray-300">•</span>
                                            <Link
                                                href="/sections"
                                                className="text-[11px] font-medium text-green-700 hover:text-green-800 underline underline-offset-4"
                                            >
                                                Change
                                            </Link>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-gray-600">Select a section</p>
                                    )}
                                </div>
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            {canCloseOwnMovement && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden sm:inline-flex border-green-600 text-green-700 hover:bg-green-50 text-xs"
                                    onClick={() => openCloseMovementDialog()}
                                >
                                    <MapPin className="w-4 h-4 mr-2" />
                                    Close Movement
                                </Button>
                            )}

                            <NotificationDropdown />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                                        <Avatar className="w-8 h-8 border-2 border-green-500">
                                            <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                            <AvatarFallback className="bg-green-700 text-white text-xs">
                                                {getInitials(auth.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="hidden md:block text-left leading-tight">
                                            <p className="text-xs font-semibold text-gray-900">{auth.user.name}</p>
                                            <p className="text-[11px] text-gray-500">{auth.user.email}</p>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings" className="cursor-pointer">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings/notifications" className="cursor-pointer">
                                            <Bell className="w-4 h-4 mr-2" />
                                            Push notifications
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/logout" method="post" as="button" className="cursor-pointer w-full text-left">
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Logout
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Desktop Horizontal Menu */}
                    <div className="hidden md:block">
                        <div className="border-t border-gray-200 py-2">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            {visibleMenuItems.map((item, idx) => {
                                if (item.hrOnly && !isHRUser) return null;
                                if (item.permission && !hasPermission(item.permission)) return null;

                                const permittedSubmenu = item.submenu?.filter(subItem =>
                                    (!subItem.hrOnly || isHRUser)
                                    && (!subItem.permission || hasPermission(subItem.permission))
                                    && (!subItem.anyPermissions?.length
                                        || subItem.anyPermissions.some((p) => hasPermission(p)))
                                );

                                if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

                                return item.hasSubmenu ? (
                                    <DropdownMenu key={idx}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-9 px-3 rounded-full text-xs font-medium ${isActive(item.path) ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <span className="mr-2">{item.icon}</span>
                                                {item.title}
                                                <ChevronDown className="ml-1 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-64">
                                            <DropdownMenuLabel className="text-xs">{item.title}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {permittedSubmenu?.map((subItem, subIdx) => (
                                                <DropdownMenuItem key={subIdx} asChild>
                                                    <Link href={subItem.path} className="cursor-pointer text-sm">
                                                        {subItem.title}
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Button
                                        key={idx}
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 px-3 rounded-full text-xs font-medium ${isActive(item.path) ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Link href={item.path}>
                                            <span className="mr-2">{item.icon}</span>
                                            {item.title}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </div>
                        </div>
                    </div>
                </div>
            </header>

                {/* Flash Messages */}
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
                    {showSuccess && (
                        <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 animate-in fade-in slide-in-from-top-5">
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
                        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-in fade-in slide-in-from-top-5">
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
                        <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 animate-in fade-in slide-in-from-top-5">
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
                        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 animate-in fade-in slide-in-from-top-5">
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

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto bg-gray-50 px-4">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t py-3 bg-white">
                    <div className="container mx-auto px-4 text-center text-sm text-gray-600">
                        <p>&copy; {new Date().getFullYear()} Mousumi Erp. All rights reserved.</p>
                    </div>
                </footer>

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
