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

    // Check if a menu item is active
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
                        className={`flex items-center justify-between w-full p-2 rounded-md cursor-pointer group ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                    >
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                                        <div className={`${isActive(item.path) ? 'text-primary' : ''}`}>
                                            {item.icon}
                                        </div>
                                        {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                                    </div>
                                </TooltipTrigger>
                                {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                        {!collapsed && <ChevronDown className={`w-4 h-4 transition-transform ${activeMenu === item.title ? 'transform rotate-180' : ''}`} />}
                    </div>
                </CollapsibleTrigger>
                {!collapsed && (
                    <CollapsibleContent className="pl-8 space-y-1 mt-1">
                        {permittedSubmenu?.map((subItem, idx) => (
                            <Link
                                key={idx}
                                href={subItem.path}
                                className={`block p-2 rounded-md text-sm ${currentPath === subItem.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
                            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                        >
                            {item.icon}
                            {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                        </Link>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
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
                        className={`flex items-center justify-between w-full p-3 rounded-md cursor-pointer ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {item.icon}
                            <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${activeMenu === item.title ? 'transform rotate-180' : ''}`} />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                    {permittedSubmenu?.map((subItem, idx) => (
                        <Link
                            key={idx}
                            href={subItem.path}
                            className={`block p-3 rounded-md text-sm ${currentPath === subItem.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
                className={`flex items-center gap-3 p-3 rounded-md ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                onClick={toggleMobileNav}
            >
                {item.icon}
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
            <aside className={`hidden md:flex flex-col border-r bg-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
                <div className={`p-4 border-b flex ${collapsed ? 'justify-center' : 'justify-between'} items-center`}>
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary" />
                            <span className="text-xl font-bold">HRM Admin</span>
                        </Link>
                    )}
                    {collapsed && (
                        <BookOpen className="w-6 h-6 text-primary" />
                    )}
                    <Button variant="ghost" size="sm" onClick={toggleSidebar} className={`${collapsed ? 'hidden' : ''}`}>
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-1">
                        {/* Only render menu items that the user has permission to see */}
                        {menuItems.map((item, idx) => (
                            <DesktopMenuItem key={idx} item={item} />
                        ))}
                    </nav>
                </ScrollArea>

                <div className={`p-4 border-t ${collapsed ? 'flex justify-center' : ''}`}>
                    {collapsed ? (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="w-8 h-8 cursor-pointer">
                                        <AvatarImage src={auth.user.avatar || ''} alt={auth.user.name} />
                                        <AvatarFallback>{getInitials(auth.user.name)}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="font-medium">{auth.user.name}</p>
                                    <p className="text-xs text-muted-foreground">{auth.user.email}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Link href="/profile" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={auth.user.avatar || ''} alt={auth.user.name} />
                                <AvatarFallback>{getInitials(auth.user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <p className="text-sm font-medium">{auth.user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{auth.user.email}</p>
                            </div>
                        </Link>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" />
                                <span className="text-xl font-bold">HRM Admin</span>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={toggleMobileNav}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[calc(100vh-160px)] px-3 py-4">
                        <nav className="space-y-1">
                            {/* Only render menu items that the user has permission to see */}
                            {menuItems.map((item, idx) => (
                                <MobileMenuItem key={idx} item={item} />
                            ))}
                        </nav>
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <Link href="/profile" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted" onClick={toggleMobileNav}>
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={auth.user.avatar || ''} alt={auth.user.name} />
                                <AvatarFallback>{getInitials(auth.user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{auth.user.name}</p>
                                <p className="text-xs text-muted-foreground">{auth.user.email}</p>
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
                            <Button variant="ghost" size="icon" onClick={toggleMobileNav}>
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="md:hidden flex items-center">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" />
                                <span className="text-xl font-bold">HRM Admin</span>
                            </Link>
                        </div>

                        <div className="hidden md:block">
                            {collapsed && (
                                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                                    <Menu className="w-5 h-5" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center ml-auto gap-3">
                            {/* Notifications */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="w-5 h-5" />
                                        {notifications && notifications.length > 0 && (
                                            <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center">
                                                {notifications.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80">
                                    <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {notifications && notifications.length > 0 ? (
                                        <ScrollArea className="h-80">
                                            {notifications.map((notification: any, idx: number) => (
                                                <DropdownMenuItem key={idx} className="p-3 cursor-pointer">
                                                    <div>
                                                        <p className="font-medium">{notification.title}</p>
                                                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </ScrollArea>
                                    ) : (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No new notifications
                                        </div>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/admin/notifications" className="w-full text-center">
                                            View all notifications
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={auth.user.avatar || ''} alt={auth.user.name} />
                                            <AvatarFallback>{getInitials(auth.user.name)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">Settings</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/logout" method="post" as="button" className="w-full text-left text-red-500 hover:text-red-600">
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Logout
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
                    <div className="mb-4 space-y-2">
                        {flash.success && showSuccess && (
                            <Alert variant="success" className="border-green-500 bg-green-50 relative">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <AlertDescription>{flash.success}</AlertDescription>
                                <button
                                    onClick={() => setShowSuccess(false)}
                                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-green-100"
                                >
                                    <X className="h-4 w-4 text-green-500" />
                                </button>
                            </Alert>
                        )}
                        {flash.error && showError && (
                            <Alert variant="destructive" className="relative">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{flash.error}</AlertDescription>
                                <button
                                    onClick={() => setShowError(false)}
                                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-700"
                                >
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </Alert>
                        )}
                        {flash.warning && showWarning && (
                            <Alert className="border-amber-500 bg-amber-50 relative">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <AlertDescription>{flash.warning}</AlertDescription>
                                <button
                                    onClick={() => setShowWarning(false)}
                                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-100"
                                >
                                    <X className="h-4 w-4 text-amber-500" />
                                </button>
                            </Alert>
                        )}
                        {flash.info && showInfo && (
                            <Alert className="border-blue-500 bg-blue-50 relative">
                                <Info className="h-4 w-4 text-blue-500" />
                                <AlertDescription>{flash.info}</AlertDescription>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-100"
                                >
                                    <X className="h-4 w-4 text-blue-500" />
                                </button>
                            </Alert>
                        )}
                    </div>

                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
