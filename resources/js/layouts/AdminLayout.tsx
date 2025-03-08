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

  // Improved Menu Structure based on web.php routes
  const menuItems = [
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
      submenu: [
        { title: 'All Employees', path: '/employees' },
        { title: 'Add Employee', path: '/employees/create' },
        { title: 'Organization Chart', path: '/organization-chart' },
      ]
    },
    {
      title: 'Branch Management',
      icon: <Building className="w-5 h-5" />,
      path: '/branches',
      hasSubmenu: true,
      submenu: [
        { title: 'All Branches', path: '/branches' },
        { title: 'Add Branch', path: '/branches/create' },
      ]
    },
    {
      title: 'Department & Designation',
      icon: <Briefcase className="w-5 h-5" />,
      path: '/departments',
      hasSubmenu: true,
      submenu: [
        { title: 'Departments', path: '/departments' },
        { title: 'Add Department', path: '/departments/create' },
        { title: 'Designations', path: '/designations' },
        { title: 'Add Designation', path: '/designations/create' },
      ]
    },
    {
      title: 'Attendance',
      icon: <ClipboardList className="w-5 h-5" />,
      path: '/attendance',
      hasSubmenu: true,
      submenu: [
        { title: 'Daily Attendance', path: '/attendance' },
        { title: 'Monthly View', path: '/attendance/monthly' },
        { title: 'Report', path: '/attendance/report' },
        { title: 'Add Attendance', path: '/attendance/create' },
        { title: 'Attendance Devices', path: '/attendance/devices' },
        { title: 'Device Settings', path: '/attendance/settings' },
        { title: 'ZKTeco Integration', path: '/zkteco' },
      ]
    },
    {
      title: 'Leave Management',
      icon: <Calendar className="w-5 h-5" />,
      path: '/leave',
      hasSubmenu: true,
      submenu: [
        { title: 'Leave Applications', path: '/leave/applications' },
        { title: 'Apply for Leave', path: '/leave/applications/create' },
        { title: 'Leave Types', path: '/leave/types' },
        { title: 'Leave Balance', path: '/leave/balances' },
        { title: 'Bulk Allocate', path: '/leave/balances/allocate-bulk' },
        { title: 'Leave Report', path: '/leave/applications/report' },
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
        { title: 'New Transfer', path: '/transfers/create' },
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
        { title: 'Add Holiday', path: '/holidays/create' },
        { title: 'Holiday Calendar', path: '/holiday-calendar' },
      ]
    },
    {
      title: 'Reports',
      icon: <BarChart className="w-5 h-5" />,
      path: '/reports',
      hasSubmenu: true,
      submenu: [
        { title: 'Overview', path: '/reports' },
        { title: 'Attendance Report', path: '/reports/attendance' },
        { title: 'Leave Report', path: '/reports/leave' },
        { title: 'Movement Report', path: '/reports/movement' },
        { title: 'Transfer Report', path: '/reports/transfer' },
        { title: 'Employee Report', path: '/reports/employee' },
      ]
    },
    {
      title: 'User Management',
      icon: <User className="w-5 h-5" />,
      path: '/admin/users',
      hasSubmenu: true,
      submenu: [
        { title: 'All Users', path: '/admin/users' },
        { title: 'Add User', path: '/admin/users/create' },
        { title: 'Roles & Permissions', path: '/admin/roles' },
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

  // Desktop sidebar menu item component - improved with tooltip for collapsed state
  const DesktopMenuItem = ({ item }: { item: any }) => (
    item.hasSubmenu ? (
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
            {item.submenu.map((subItem: any, idx: number) => (
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
    )
  );

  // Mobile sidebar menu item component
  const MobileMenuItem = ({ item }: { item: any }) => (
    item.hasSubmenu ? (
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
          {item.submenu.map((subItem: any, idx: number) => (
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
    )
  );

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
