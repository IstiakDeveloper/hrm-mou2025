// resources/js/Layouts/AdminLayout.tsx
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
  const isActive = (path: string) => {
    return currentPath.startsWith(path);
  };

  // Get initials from name for Avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Check if user has permission
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;


    // Get permissions from user's role
    const rolePermissions = auth?.user?.role?.permissions;

    // Handle case where permissions are stored as a JSON string
    let parsedPermissions = rolePermissions;
    if (typeof rolePermissions === 'string') {
      try {
        parsedPermissions = JSON.parse(rolePermissions);
      } catch (e) {
        console.error('Error parsing permissions:', e);
        return false;
      }
    }

    // If we couldn't parse permissions or they don't exist, return false
    if (!parsedPermissions) {
      // During development, you might want to return true for all permissions
      // return true;
      return false;
    }

    return parsedPermissions.includes(permission);
  };

  // Log user and role info on component mount
  useEffect(() => {

    const rolePermissions = auth?.user?.role?.permissions;

    // Try to parse if it's a string
    if (typeof rolePermissions === 'string') {
      try {
        const parsed = JSON.parse(rolePermissions);
      } catch (e) {
        console.error('Could not parse permissions:', e);
      }
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
        { title: 'Add Employee', path: '/employees/create', permission: 'employees.create' },
        { title: 'Edit Employee', path: '/employees/:id/edit', permission: 'employees.edit' },
        { title: 'Organization Chart', path: '/organization-chart', permission: 'employees.view' },
      ]
    },
    {
      title: 'Branch Management',
      icon: <Building className="w-5 h-5" />,
      path: '/branches',
      hasSubmenu: true,
      permission: 'branches.view',
      submenu: [
        { title: 'All Branches', path: '/branches', permission: 'branches.view' },
        { title: 'Add Branch', path: '/branches/create', permission: 'branches.create' },
        { title: 'Edit Branch', path: '/branches/:id/edit', permission: 'branches.edit' },
      ]
    },
    {
      title: 'Department & Designation',
      icon: <Briefcase className="w-5 h-5" />,
      path: '/departments',
      hasSubmenu: true,
      permission: 'departments.view',
      submenu: [
        { title: 'Departments', path: '/departments', permission: 'departments.view' },
        { title: 'Add Department', path: '/departments/create', permission: 'departments.create' },
        { title: 'Designations', path: '/designations', permission: 'designations.view' },
        { title: 'Add Designation', path: '/designations/create', permission: 'designations.create' },
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
        { title: 'Report', path: '/attendance/report', permission: 'attendance.view' },
        { title: 'Add Attendance', path: '/attendance/create', permission: 'attendance.create' },
        { title: 'Attendance Devices', path: '/attendance/devices', permission: 'attendance.view' },
        { title: 'Device Settings', path: '/attendance/settings', permission: 'attendance.view' },
        { title: 'ZKTeco Integration', path: '/zkteco', permission: 'attendance.view' },
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
        { title: 'Apply for Leave', path: '/leave/applications/create' },
        { title: 'Leave Types', path: '/leave/types', permission: 'leaves.view' },
        { title: 'Add Leave Type', path: '/leave/types/create', permission: 'leaves.create' },
        { title: 'Leave Balance', path: '/leave/balances', permission: 'leaves.view' },
        { title: 'Bulk Allocate', path: '/leave/balances/allocate-bulk', permission: 'leaves.create' },
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
        { title: 'New Movement', path: '/movements/create' },
        { title: 'Movement Report', path: '/movements/report' },
        { title: 'Transfers', path: '/transfers' },
        { title: 'New Transfer', path: '/transfers/create', permission: 'transfers.create' },
        { title: 'Transfer Report', path: '/transfers/report' },
      ]
    },
    {
      title: 'Holidays',
      icon: <Award className="w-5 h-5" />,
      path: '/holidays',
      hasSubmenu: true,
      submenu: [
        { title: 'All Holidays', path: '/holidays' },
        { title: 'Add Holiday', path: '/holidays/create', permission: 'holidays.create' },
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
            className={`flex items-center justify-between w-full p-2 rounded-md cursor-pointer group ${
              isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
                className={`block p-2 rounded-md text-sm ${
                  currentPath === subItem.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md ${
                isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
            className={`flex items-center justify-between w-full p-3 rounded-md cursor-pointer ${
              isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
              className={`block p-3 rounded-md text-sm ${
                currentPath === subItem.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
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
        className={`flex items-center gap-3 p-3 rounded-md ${
          isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
        }`}
        onClick={toggleMobileNav}
      >
        {item.icon}
        <span className="text-sm font-medium">{item.title}</span>
      </Link>
    );
  };

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
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
