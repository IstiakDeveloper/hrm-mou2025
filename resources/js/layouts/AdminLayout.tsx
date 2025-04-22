import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    User,
    Home,
    Users,
    Building,
    Briefcase,
    ClipboardList,
    Calendar,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Settings,
    BarChart,
    Bell,
    UserPlus,
    BookOpen,
    FileText,
    Activity,
    LayoutDashboard,
    Award
} from 'lucide-react';

import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';

import { Toast, ToastAction } from '@/Components/ui/toast';
import { useToast } from '@/Components/ui/use-toast';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/Components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/Components/ui/sheet";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/Components/ui/collapsible";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Badge } from "@/Components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";

interface AdminLayoutProps {
    children: React.ReactNode;
}

interface MenuItemType {
    title: string;
    icon: React.ReactNode;
    path: string;
    hasSubmenu: boolean;
    permission?: string;
    submenu?: {
        title: string;
        path: string;
        permission?: string;
    }[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { auth, notifications } = usePage().props as any;
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    // Get current path for highlighting active menu
    const currentPath = window.location.pathname;
    const employee = auth?.employee;
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;

    // Toggle mobile navigation
    const toggleMobileNav = () => {
        setIsMobileNavOpen(!isMobileNavOpen);
    };

    // Toggle sidebar collapse state
    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    // Toggle menu items with submenu
    const toggleMenu = (menu: string) => {
        setActiveMenu(activeMenu === menu ? null : menu);
    };

    // Check if a menu item is active - more precise implementation
    const isActive = (path: string) => {
        // For exact matches or path followed by slash or nothing
        return currentPath === path ||
            (path !== '/' &&
                (currentPath.startsWith(path + '/') ||
                    currentPath === path));
    };

    // Get initials from name for Avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase();
    };

    // Replace the hasPermission function with this updated version
    const hasPermission = (permission?: string): boolean => {
        if (!permission) return true;

        // If user has no roles, they have no permissions
        if (!auth?.user?.roles || auth.user.roles.length === 0) {
            return false;
        }

        // Check each role for the permission
        for (const role of auth.user.roles) {
            let rolePermissions = role.permissions;

            // Handle case where permissions are stored as a JSON string
            if (typeof rolePermissions === 'string') {
                try {
                    rolePermissions = JSON.parse(rolePermissions);
                } catch (e) {
                    console.error('Error parsing permissions for role:', role.name, e);
                    continue; // Skip this role if we can't parse permissions
                }
            }

            // If this role has the permission, return true
            if (rolePermissions && rolePermissions.includes(permission)) {
                return true;
            }
        }

        // No role had the required permission
        return false;
    };

    // Update useEffect to log roles info (for debugging)
    useEffect(() => {
        if (auth?.user?.roles) {
            console.log('User roles:', auth.user.roles);

            auth.user.roles.forEach((role, index) => {
                const rolePermissions = role.permissions;

                // Try to parse if it's a string
                if (typeof rolePermissions === 'string') {
                    try {
                        const parsed = JSON.parse(rolePermissions);
                        console.log(`Role ${index + 1} (${role.name}) permissions:`, parsed);
                    } catch (e) {
                        console.error(`Could not parse permissions for role ${index + 1} (${role.name}):`, e);
                    }
                } else {
                    console.log(`Role ${index + 1} (${role.name}) permissions:`, rolePermissions);
                }
            });
        } else {
            console.log('User has no roles assigned');
        }
    }, []);

    // Improved Menu Structure based on web.php routes with permissions
    const menuItems: MenuItemType[] = [
        {
            title: 'Dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
            path: '/dashboard',
            hasSubmenu: false,
        },
        {
            title: 'Employee Management',
            icon: <Users className="w-5 h-5" />,
            path: '/employees',
            hasSubmenu: true,
            permission: 'employees.view',
            submenu: [
                { title: 'All Employees', path: '/employees', permission: 'employees.view' },
                { title: 'Organization Chart', path: '/organization-chart', permission: 'employees.view' },
                { title: 'Employee Report', path: '/employee/dashboard', permission: 'employees.view' },
            ]
        },
        {
            title: 'HRM Admin Setup',
            icon: <Building className="w-5 h-5" />,
            path: '/branches',
            hasSubmenu: true,
            permission: 'branches.view',
            submenu: [
                { title: 'Branches', path: '/branches', permission: 'branches.view' },
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
                { title: 'Report', path: '/attendance/report', permission: 'leaves_type.view' },
                { title: 'Attendance Devices', path: '/attendance/devices', permission: 'leaves_type.view' },
                { title: 'Device Settings', path: '/attendance/settings', permission: 'leaves_type.view' },
                { title: 'ZKTeco Integration', path: '/zkteco', permission: 'leaves_type.view' },
            ]
        },
        {
            title: 'Leave Management',
            icon: <Calendar className="w-5 h-5" />,
            path: '/leave',
            hasSubmenu: true,
            permission: 'leaves.view',
            submenu: [
                { title: 'Leave Applications', path: '/leave/applications', permission: 'leaves.view' },
                { title: 'Leave Types', path: '/leave/types', permission: 'leaves_type.view' },
                { title: 'Leave Balance', path: '/leave/balances', permission: 'leaves_type.view' },
                { title: 'Bulk Allocate', path: '/leave/balances/allocate-bulk', permission: 'leaves_type.view' },
                { title: 'Leave Report', path: '/leave/applications/report', permission: 'leaves.view' },
            ]
        },
        {
            title: 'Movement & Transfer',
            icon: <Activity className="w-5 h-5" />,
            path: '/movements',
            hasSubmenu: true,
            submenu: [
                { title: 'Movements', path: '/movements' },
                { title: 'Transfers', path: '/transfers', permission: 'transfers.edit' },
            ]
        },
        {
            title: 'Holidays',
            icon: <Award className="w-5 h-5" />,
            path: '/holidays',
            hasSubmenu: true,
            submenu: [
                { title: 'All Holidays', path: '/holidays', permission: 'leaves_type.view' },
                { title: 'Holiday Calendar', path: '/holiday-calendar' },
            ]
        },
        {
            title: 'Reports',
            icon: <BarChart className="w-5 h-5" />,
            path: '/reports',
            hasSubmenu: true,
            permission: 'reports.view',
            submenu: [
                { title: 'Overview', path: '/reports', permission: 'reports.view' },
                { title: 'Attendance Report', path: '/reports/attendance', permission: 'reports.view' },
                { title: 'Leave Report', path: '/reports/leave', permission: 'reports.view' },
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
            permission: 'users.view',
            submenu: [
                { title: 'All Users', path: '/admin/users', permission: 'users.view' },
                { title: 'Add User', path: '/admin/users/create', permission: 'users.create' },
                { title: 'Roles & Permissions', path: '/admin/roles', permission: 'users.view' },
            ]
        },
        {
            title: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            path: '/profile',
            hasSubmenu: true,
            submenu: [
                { title: 'Profile', path: '/profile' },
                { title: 'Change Password', path: '/profile' },
            ]
        },
    ];

    // Desktop sidebar menu item component - improved with tooltip for collapsed state and permission checks
    const DesktopMenuItem = ({ item }: { item: MenuItemType }) => {
        // Skip rendering if user doesn't have permission
        if (item.permission && !hasPermission(item.permission)) return null;

        // Filter submenu items based on permissions
        const permittedSubmenu = item.submenu?.filter(subItem => !subItem.permission || hasPermission(subItem.permission));

        // Don't render menu with empty submenu after filtering
        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        return item.hasSubmenu ? (
            <Collapsible
                open={!collapsed && activeMenu === item.title}
                onOpenChange={() => !collapsed && toggleMenu(item.title)}
                className="w-full"
            >
                <CollapsibleTrigger asChild>
                    <div
                        className={`flex items-center justify-between w-full p-2 rounded-md cursor-pointer transition-colors duration-200 group ${isActive(item.path)
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                    >
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                                        <div className={`${isActive(item.path)
                                                ? 'text-blue-700'
                                                : 'text-gray-600 group-hover:text-gray-900'
                                            }`}>
                                            {item.icon}
                                        </div>
                                        {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                                    </div>
                                </TooltipTrigger>
                                {collapsed && <TooltipContent side="right" className="bg-blue-800 text-white font-semibold">{item.title}</TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                        {!collapsed && (
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'
                                } ${activeMenu === item.title ? 'transform rotate-180' : ''}`} />
                        )}
                    </div>
                </CollapsibleTrigger>
                {!collapsed && (
                    <CollapsibleContent className="pl-8 space-y-1 mt-1">
                        {permittedSubmenu?.map((subItem, idx) => (
                            <Link
                                key={idx}
                                href={subItem.path}
                                className={`block p-2 rounded-md text-sm transition-colors duration-200 ${currentPath === subItem.path
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {subItem.title}
                            </Link>
                        ))}
                    </CollapsibleContent>
                )}
            </Collapsible>
        ) : (
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.path}
                            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md transition-colors duration-200 ${isActive(item.path)
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                        >
                            <div className={`${isActive(item.path)
                                    ? 'text-blue-700'
                                    : 'text-gray-600'
                                }`}>
                                {item.icon}
                            </div>
                            {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                        </Link>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right" className="bg-blue-800 text-white font-semibold">{item.title}</TooltipContent>}
                </Tooltip>
            </TooltipProvider>
        );
    };

    // Mobile sidebar menu item component with permission checks
    const MobileMenuItem = ({ item }: { item: MenuItemType }) => {
        // Skip rendering if user doesn't have permission
        if (item.permission && !hasPermission(item.permission)) return null;

        // Filter submenu items based on permissions
        const permittedSubmenu = item.submenu?.filter(subItem => !subItem.permission || hasPermission(subItem.permission));

        // Don't render menu with empty submenu after filtering
        if (item.hasSubmenu && (!permittedSubmenu || permittedSubmenu.length === 0)) return null;

        return item.hasSubmenu ? (
            <Collapsible
                open={activeMenu === item.title}
                onOpenChange={() => toggleMenu(item.title)}
                className="w-full"
            >
                <CollapsibleTrigger asChild>
                    <div
                        className={`flex items-center justify-between w-full p-3 rounded-md cursor-pointer transition-colors duration-200 ${isActive(item.path)
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`${isActive(item.path)
                                    ? 'text-blue-700'
                                    : 'text-gray-600'
                                }`}>
                                {item.icon}
                            </div>
                            <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeMenu === item.title ? 'transform rotate-180' : ''
                            } ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                    {permittedSubmenu?.map((subItem, idx) => (
                        <Link
                            key={idx}
                            href={subItem.path}
                            className={`block p-3 rounded-md text-sm transition-colors duration-200 ${currentPath === subItem.path
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                className={`flex items-center gap-3 p-3 rounded-md transition-colors duration-200 ${isActive(item.path)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                onClick={toggleMobileNav}
            >
                <div className={`${isActive(item.path)
                        ? 'text-blue-700'
                        : 'text-gray-600'
                    }`}>
                    {item.icon}
                </div>
                <span className="text-sm font-medium">{item.title}</span>
            </Link>
        );
    };

    const { flash } = usePage().props as any;
    const { toast } = useToast();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        // Set initial visibility based on flash messages
        if (flash.success) {
            setShowSuccess(true);
            // Auto-close after 5 seconds
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
        <div className="flex h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex flex-col border-r bg-white shadow-sm transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
                <div className={`py-5 px-4 border-b flex ${collapsed ? 'justify-center' : 'justify-between'} items-center bg-blue-700 text-white`}>
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-white" />
                            <span className="text-xl font-bold">HRM Mousumi</span>
                        </Link>
                    )}
                    {collapsed && (
                        <Link href="/dashboard">
                            <BookOpen className="w-6 h-6 text-white" />
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className={`${collapsed ? 'hidden' : ''} hover:bg-blue-600 text-white`}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-1.5">
                        {/* Only render menu items that the user has permission to see */}
                        {menuItems.map((item, idx) => (
                            <DesktopMenuItem key={idx} item={item} />
                        ))}
                    </nav>
                </ScrollArea>

                <div className={`p-4 border-t bg-gray-50 ${collapsed ? 'flex justify-center' : ''}`}>
                    {collapsed ? (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="w-8 h-8 cursor-pointer border-2 border-blue-500">
                                        <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                        <AvatarFallback className="bg-blue-700 text-white">{getInitials(auth.user.name)}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-blue-800 text-white">
                                    <p className="font-medium">{auth.user.name}</p>
                                    <p className="text-xs text-blue-100">{auth.user.email}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Link href="/profile" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                            <Avatar className="w-8 h-8 border-2 border-blue-500">
                                <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                <AvatarFallback className="bg-blue-700 text-white">{getInitials(auth.user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <p className="text-sm font-medium text-gray-900">{auth.user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{auth.user.email}</p>
                            </div>
                        </Link>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 border-r-0">
                    <div className="p-4 border-b bg-blue-700 text-white">
                        <div className="flex items-center justify-between">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-white" />
                                <span className="text-xl font-bold">HRM Admin</span>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={toggleMobileNav} className="text-white hover:bg-blue-600">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[calc(100vh-160px)] px-3 py-4">
                        <nav className="space-y-1.5">
                            {/* Only render menu items that the user has permission to see */}
                            {menuItems.map((item, idx) => (
                                <MobileMenuItem key={idx} item={item} />
                            ))}
                        </nav>
                    </ScrollArea>

                    <div className="p-4 border-t bg-gray-50">
                        <Link href="/profile" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200" onClick={toggleMobileNav}>
                            <Avatar className="w-8 h-8 border-2 border-blue-500">
                                <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                <AvatarFallback className="bg-blue-700 text-white">{getInitials(auth.user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{auth.user.name}</p>
                                <p className="text-xs text-gray-500">{auth.user.email}</p>
                            </div>
                        </Link>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Top Navbar */}
                <header className="bg-white border-b shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center md:hidden">
                            <Button variant="ghost" size="icon" onClick={toggleMobileNav} className="text-gray-700">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="md:hidden flex items-center">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-blue-700" />
                                <span className="text-xl font-bold text-gray-900">HRM Admin</span>
                            </Link>
                        </div>

                        <div className="hidden md:block">
                            {collapsed && (
                                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-700 hover:bg-gray-100">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center ml-auto gap-3">
                            {/* Notifications */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative text-gray-700 hover:bg-gray-100">
                                        <Bell className="w-5 h-5" />
                                        {notifications && notifications.length > 0 && (
                                            <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center bg-blue-600 text-white">
                                                {notifications.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 border shadow-lg rounded-md">
                                    <DropdownMenuLabel className="font-semibold text-gray-900">Notifications</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {notifications && notifications.length > 0 ? (
                                        <ScrollArea className="h-80">
                                            {notifications.map((notification: any, idx: number) => (
                                                <DropdownMenuItem key={idx} className="p-3 cursor-pointer hover:bg-gray-100">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{notification.title}</p>
                                                        <p className="text-sm text-gray-600">{notification.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </ScrollArea>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            <p>No new notifications</p>
                                        </div>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="p-2 text-center cursor-pointer">
                                        <Link href="/notifications" className="w-full text-blue-600 font-medium">
                                            View all notifications
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                                        <Avatar className="w-8 h-8 border-2 border-blue-500">
                                            <AvatarImage src={photoUrl || ''} alt={auth.user.name} />
                                            <AvatarFallback className="bg-blue-700 text-white">{getInitials(auth.user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="hidden md:block text-left">
                                            <p className="text-sm font-medium text-gray-900">{auth.user.name}</p>
                                            <p className="text-xs text-gray-500">{auth.user.email}</p>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer">
                                            <User className="w-4 h-4 mr-2" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings" className="cursor-pointer">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
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
                </header>

                {/* Flash Messages/Alerts */}
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
                    {showSuccess && (
                        <Alert variant="success" className="bg-green-50 border-green-200 text-green-800 animate-in fade-in slide-in-from-top-5">
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
                        <Alert variant="warning" className="bg-yellow-50 border-yellow-200 text-yellow-800 animate-in fade-in slide-in-from-top-5">
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
                        <Alert variant="info" className="bg-blue-50 border-blue-200 text-blue-800 animate-in fade-in slide-in-from-top-5">
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
                <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t py-4 bg-white">
                    <div className="container mx-auto px-4 text-center text-sm text-gray-600">
                        <p>&copy; {new Date().getFullYear()} HRM Admin. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;
