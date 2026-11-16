<<<<<<< HEAD
import React, { useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
=======
import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { hasAppPermission } from '@/lib/permissions';
>>>>>>> feature/flutter-mobile-app
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Layout from '@/layouts/AdminLayout';
import {
  Users,
  Building,
<<<<<<< HEAD
  LayoutDashboard,
  Clock,
  CalendarOff,
  CalendarCheck,
  FileText,
  ArrowLeftRight,
=======
  Clock,
  CalendarOff,
>>>>>>> feature/flutter-mobile-app
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
<<<<<<< HEAD
  Briefcase
} from 'lucide-react';

interface LeaveApplication {
  id: number;
  employee: {
    first_name: string;
    last_name: string;
  };
=======
  Briefcase,
  ArrowLeftRight,
  FileText,
  ChevronRight
} from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface LeaveApplication {
  id: number;
  employee: EmployeeNameFields;
>>>>>>> feature/flutter-mobile-app
  leave_type: {
    name: string;
  };
  start_date: string;
  end_date: string;
  status: string;
}

interface Movement {
  id: number;
<<<<<<< HEAD
  employee: {
    first_name: string;
    last_name: string;
  };
=======
  employee: EmployeeNameFields;
>>>>>>> feature/flutter-mobile-app
  purpose: string;
  from_datetime: string;
  status: string;
}

interface Transfer {
  id: number;
<<<<<<< HEAD
  employee: {
    first_name: string;
    last_name: string;
  };
=======
  employee: EmployeeNameFields;
>>>>>>> feature/flutter-mobile-app
  from_branch: {
    name: string;
  };
  to_branch: {
    name: string;
  };
  effective_date: string;
  status: string;
}

interface DashboardProps {
  stats: {
    totalEmployees: number;
    totalBranches: number;
    totalDepartments: number;
  };
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
  };
  leaveStats: {
    pending: number;
    approved: number;
    todayOnLeave: number;
  };
  movementStats: {
    pending: number;
    ongoing: number;
  };
  transferStats: {
    pending: number;
    approved: number;
  };
  recentLeaves: LeaveApplication[];
  recentMovements: Movement[];
  recentTransfers: Transfer[];
  userRole: string;
}

export default function Dashboard({
  stats,
  attendanceStats,
  leaveStats,
  movementStats,
  transferStats,
  recentLeaves,
  recentMovements,
  recentTransfers,
  userRole
}: DashboardProps) {
  const { auth } = usePage().props as any;

<<<<<<< HEAD
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

    return parsedPermissions?.includes(permission) || false;
  };

  // Log permissions for debugging
  useEffect(() => {
    console.log('Auth user:', auth?.user);
    console.log('User role:', auth?.user?.role);

    const rolePermissions = auth?.user?.role?.permissions;
    console.log('Role permissions (raw):', rolePermissions);
  }, []);
=======
  const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);
>>>>>>> feature/flutter-mobile-app

  return (
    <Layout>
      <Head title="Dashboard" />

<<<<<<< HEAD
      <div className="container mx-auto py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">
              Welcome back, {auth?.user?.name || 'User'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="font-medium">
              Role: {userRole || 'Member'}
            </Badge>
            <Badge variant="outline" className="font-medium">
=======
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, <span className="font-medium text-gray-800">{auth?.user?.name || 'User'}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-sm py-1.5 font-medium border-gray-300 text-gray-700 bg-gray-50">
              <User className="mr-1.5 h-3.5 w-3.5" />
              {userRole || 'Member'}
            </Badge>
            <Badge variant="outline" className="text-sm py-1.5 font-medium border-gray-300 text-gray-700 bg-gray-50">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
>>>>>>> feature/flutter-mobile-app
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Badge>
          </div>
        </div>

        {/* Stats Overview - Based on Permissions */}
<<<<<<< HEAD
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
=======
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
>>>>>>> feature/flutter-mobile-app
          {/* Employee stats - only if has employees.view permission */}
          {hasPermission('employees.view') && (
            <StatsCard
              title="Total Employees"
              value={stats.totalEmployees}
<<<<<<< HEAD
              icon={<Users size={30} className="text-indigo-500" />}
=======
              icon={<Users className="text-blue-600" />}
>>>>>>> feature/flutter-mobile-app
              description="Registered employees"
              linkTo="/employees"
            />
          )}

          {/* Branch stats - only if has branches.view permission */}
          {hasPermission('branches.view') && (
            <StatsCard
              title="Total Branches"
              value={stats.totalBranches}
<<<<<<< HEAD
              icon={<Building size={30} className="text-emerald-500" />}
=======
              icon={<Building className="text-indigo-600" />}
>>>>>>> feature/flutter-mobile-app
              description="Active office branches"
              linkTo="/branches"
            />
          )}

          {/* Department stats - only if has departments.view permission */}
          {hasPermission('departments.view') && (
            <StatsCard
              title="Total Departments"
              value={stats.totalDepartments}
<<<<<<< HEAD
              icon={<Briefcase size={30} className="text-amber-500" />}
=======
              icon={<Briefcase className="text-purple-600" />}
>>>>>>> feature/flutter-mobile-app
              description="Company departments"
              linkTo="/departments"
            />
          )}
        </div>

        {/* Attendance Overview - only if has attendance.view permission */}
        {hasPermission('attendance.view') && (
<<<<<<< HEAD
          <div className="mt-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-gray-500" />
                    <CardTitle>Today's Attendance Overview</CardTitle>
                  </div>
                  <a
                    href="/attendance"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View All
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center rounded-lg border border-green-100 bg-green-50 p-4">
                    <div className="mr-4 rounded-full bg-green-100 p-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600">Present</p>
                      <p className="mt-1 text-2xl font-bold text-green-800">{attendanceStats.present}</p>
                    </div>
                  </div>

                  <div className="flex items-center rounded-lg border border-red-100 bg-red-50 p-4">
                    <div className="mr-4 rounded-full bg-red-100 p-3">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Absent</p>
                      <p className="mt-1 text-2xl font-bold text-red-800">{attendanceStats.absent}</p>
                    </div>
                  </div>

                  <div className="flex items-center rounded-lg border border-amber-100 bg-amber-50 p-4">
                    <div className="mr-4 rounded-full bg-amber-100 p-3">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-600">Late</p>
                      <p className="mt-1 text-2xl font-bold text-amber-800">{attendanceStats.late}</p>
                    </div>
                  </div>
=======
          <div className="mb-8">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Clock className="mr-2.5 h-5 w-5 text-gray-500" />
                    <CardTitle className="text-xl font-bold text-gray-800">Today's Attendance Overview</CardTitle>
                  </div>
                  <a
                    href="/attendance"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <AttendanceCard
                    icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                    color="green"
                    label="Present"
                    value={attendanceStats.present}
                  />
                  <AttendanceCard
                    icon={<XCircle className="h-6 w-6 text-red-600" />}
                    color="red"
                    label="Absent"
                    value={attendanceStats.absent}
                  />
                  <AttendanceCard
                    icon={<AlertCircle className="h-6 w-6 text-amber-600" />}
                    color="amber"
                    label="Late"
                    value={attendanceStats.late}
                  />
>>>>>>> feature/flutter-mobile-app
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave and Movement Stats */}
<<<<<<< HEAD
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Leave stats - only if has leaves.view permission */}
          {hasPermission('leaves.view') && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarOff className="mr-2 h-5 w-5 text-gray-500" />
                    <CardTitle>Leave Status</CardTitle>
                  </div>
                  <a
                    href="/leave/applications"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View All
                  </a>
                </div>
                <CardDescription>Employee leave overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <StatusItem
=======
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
          {/* Leave stats - only if has leaves.view permission */}
          {hasPermission('leaves.view') && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CalendarOff className="mr-2.5 h-5 w-5 text-gray-500" />
                    <CardTitle className="text-xl font-bold text-gray-800">Leave Status</CardTitle>
                  </div>
                  <a
                    href="/leave/applications"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                <CardDescription className="text-gray-500">Employee leave overview</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <StatusItem
                    icon={<Calendar className="h-5 w-5 text-amber-600" />}
>>>>>>> feature/flutter-mobile-app
                    label="Pending Leave Applications"
                    value={leaveStats.pending}
                    color="amber"
                  />
                  <StatusItem
<<<<<<< HEAD
=======
                    icon={<CheckCircle className="h-5 w-5 text-green-600" />}
>>>>>>> feature/flutter-mobile-app
                    label="Approved (This Month)"
                    value={leaveStats.approved}
                    color="green"
                  />
                  <StatusItem
<<<<<<< HEAD
=======
                    icon={<CalendarOff className="h-5 w-5 text-blue-600" />}
>>>>>>> feature/flutter-mobile-app
                    label="Today On Leave"
                    value={leaveStats.todayOnLeave}
                    color="blue"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show movement & transfer card if user has either permission */}
          {(hasPermission('movements.view') || hasPermission('transfers.view')) && (
<<<<<<< HEAD
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                  <CardTitle>Movement & Transfer</CardTitle>
                </div>
                <CardDescription>Staff movements overview</CardDescription>
              </CardHeader>
              <CardContent>
=======
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MapPin className="mr-2.5 h-5 w-5 text-gray-500" />
                    <CardTitle className="text-xl font-bold text-gray-800">Movement & Transfer</CardTitle>
                  </div>
                  {hasPermission('movements.view') && (
                    <a
                      href="/movements"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  )}
                </div>
                <CardDescription className="text-gray-500">Staff movements overview</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
>>>>>>> feature/flutter-mobile-app
                <div className="space-y-4">
                  {/* Movement stats - only if has permissions */}
                  {hasPermission('movements.view') && (
                    <>
                      <StatusItem
<<<<<<< HEAD
=======
                        icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
>>>>>>> feature/flutter-mobile-app
                        label="Pending Movements"
                        value={movementStats.pending}
                        color="amber"
                      />
                      <StatusItem
<<<<<<< HEAD
=======
                        icon={<MapPin className="h-5 w-5 text-blue-600" />}
>>>>>>> feature/flutter-mobile-app
                        label="Ongoing Movements"
                        value={movementStats.ongoing}
                        color="blue"
                      />
                    </>
                  )}

                  {/* Transfer stats - only if has permissions */}
                  {hasPermission('transfers.view') && (
                    <StatusItem
<<<<<<< HEAD
=======
                      icon={<ArrowLeftRight className="h-5 w-5 text-purple-600" />}
>>>>>>> feature/flutter-mobile-app
                      label="Pending Transfers"
                      value={transferStats.pending}
                      color="purple"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activities - Only show if user has at least one of these permissions */}
        {(hasPermission('leaves.view') || hasPermission('movements.view') || hasPermission('transfers.view')) && (
<<<<<<< HEAD
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest staff activities and requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={getDefaultTab(hasPermission)} className="w-full">
                  <TabsList className={`grid w-full ${getTabsGridCols(hasPermission)}`}>
                    {hasPermission('leaves.view') && (
                      <TabsTrigger value="leaves" className="flex items-center">
=======
          <div className="mb-8">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-800">Recent Activities</CardTitle>
                <CardDescription className="text-gray-500">Latest staff activities and requests</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs defaultValue={getDefaultTab(hasPermission)} className="w-full">
                  <TabsList className="w-full bg-gray-100 p-1 rounded-md mb-6">
                    {hasPermission('leaves.view') && (
                      <TabsTrigger
                        value="leaves"
                        className="flex items-center px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                      >
>>>>>>> feature/flutter-mobile-app
                        <Calendar className="mr-2 h-4 w-4" />
                        Leave Applications
                      </TabsTrigger>
                    )}

                    {hasPermission('movements.view') && (
<<<<<<< HEAD
                      <TabsTrigger value="movements" className="flex items-center">
=======
                      <TabsTrigger
                        value="movements"
                        className="flex items-center px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                      >
>>>>>>> feature/flutter-mobile-app
                        <MapPin className="mr-2 h-4 w-4" />
                        Movements
                      </TabsTrigger>
                    )}

                    {hasPermission('transfers.view') && (
<<<<<<< HEAD
                      <TabsTrigger value="transfers" className="flex items-center">
=======
                      <TabsTrigger
                        value="transfers"
                        className="flex items-center px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                      >
>>>>>>> feature/flutter-mobile-app
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        Transfers
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {hasPermission('leaves.view') && (
<<<<<<< HEAD
                    <TabsContent value="leaves" className="mt-4">
                      {recentLeaves.length > 0 ? (
                        <div className="space-y-3">
                          {recentLeaves.map((leave) => (
                            <ActivityCard
                              key={leave.id}
                              title={`${leave.employee.first_name} ${leave.employee.last_name}`}
=======
                    <TabsContent value="leaves">
                      {recentLeaves.length > 0 ? (
                        <div className="space-y-4">
                          {recentLeaves.map((leave) => (
                            <ActivityCard
                              key={leave.id}
                              title={employeeDisplayName(leave.employee)}
>>>>>>> feature/flutter-mobile-app
                              description={`${leave.leave_type.name} (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()})`}
                              status={leave.status}
                              icon={<User className="h-5 w-5 text-indigo-500" />}
                              link={`/leave/applications/${leave.id}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState message="No recent leave applications" />
                      )}
                    </TabsContent>
                  )}

                  {hasPermission('movements.view') && (
<<<<<<< HEAD
                    <TabsContent value="movements" className="mt-4">
                      {recentMovements.length > 0 ? (
                        <div className="space-y-3">
                          {recentMovements.map((movement) => (
                            <ActivityCard
                              key={movement.id}
                              title={`${movement.employee.first_name} ${movement.employee.last_name}`}
=======
                    <TabsContent value="movements">
                      {recentMovements.length > 0 ? (
                        <div className="space-y-4">
                          {recentMovements.map((movement) => (
                            <ActivityCard
                              key={movement.id}
                              title={employeeDisplayName(movement.employee)}
>>>>>>> feature/flutter-mobile-app
                              description={`${movement.purpose} (${new Date(movement.from_datetime).toLocaleDateString()})`}
                              status={movement.status}
                              icon={<MapPin className="h-5 w-5 text-purple-500" />}
                              link={`/movements/${movement.id}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState message="No recent movements" />
                      )}
                    </TabsContent>
                  )}

                  {hasPermission('transfers.view') && (
<<<<<<< HEAD
                    <TabsContent value="transfers" className="mt-4">
                      {recentTransfers.length > 0 ? (
                        <div className="space-y-3">
                          {recentTransfers.map((transfer) => (
                            <ActivityCard
                              key={transfer.id}
                              title={`${transfer.employee.first_name} ${transfer.employee.last_name}`}
=======
                    <TabsContent value="transfers">
                      {recentTransfers.length > 0 ? (
                        <div className="space-y-4">
                          {recentTransfers.map((transfer) => (
                            <ActivityCard
                              key={transfer.id}
                              title={employeeDisplayName(transfer.employee)}
>>>>>>> feature/flutter-mobile-app
                              description={`${transfer.from_branch.name} → ${transfer.to_branch.name} (${new Date(transfer.effective_date).toLocaleDateString()})`}
                              status={transfer.status}
                              icon={<ArrowLeftRight className="h-5 w-5 text-blue-500" />}
                              link={`/transfers/${transfer.id}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState message="No recent transfers" />
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
              {hasPermission('reports.view') && (
<<<<<<< HEAD
                <CardFooter className="flex justify-center border-t pt-4">
                  <a
                    href="/reports"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View All Reports →
=======
                <CardFooter className="flex justify-center border-t border-gray-200 py-4 bg-gray-50">
                  <a
                    href="/reports"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View All Reports
                    <ChevronRight className="ml-1 h-4 w-4" />
>>>>>>> feature/flutter-mobile-app
                  </a>
                </CardFooter>
              )}
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Helper functions for conditionally rendering tabs
function getDefaultTab(hasPermission: (permission?: string) => boolean): string {
  if (hasPermission('leaves.view')) return 'leaves';
  if (hasPermission('movements.view')) return 'movements';
  if (hasPermission('transfers.view')) return 'transfers';
  return '';
}

<<<<<<< HEAD
function getTabsGridCols(hasPermission: (permission?: string) => boolean): string {
  let visibleTabs = 0;
  if (hasPermission('leaves.view')) visibleTabs++;
  if (hasPermission('movements.view')) visibleTabs++;
  if (hasPermission('transfers.view')) visibleTabs++;

  return `grid-cols-${visibleTabs}`;
}

=======
>>>>>>> feature/flutter-mobile-app
// Reusable Components

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  linkTo?: string;
}

function StatsCard({ title, value, icon, description, linkTo }: StatsCardProps) {
  const content = (
<<<<<<< HEAD
    <div className="flex items-center p-6">
      <div className="mr-4 rounded-full bg-gray-100 p-3">
=======
    <div className="h-full flex items-center p-6">
      <div className="mr-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 shadow-sm">
>>>>>>> feature/flutter-mobile-app
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
<<<<<<< HEAD
        <h3 className="text-2xl font-bold">{value.toLocaleString()}</h3>
=======
        <h3 className="text-2xl font-bold text-gray-900 my-1">{value.toLocaleString()}</h3>
>>>>>>> feature/flutter-mobile-app
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );

  return (
<<<<<<< HEAD
    <Card className="transition-all hover:shadow-md">
      {linkTo ? (
        <a href={linkTo} className="block">
          <CardContent className="p-0">
=======
    <Card className="shadow-sm border border-gray-200 h-full transition-all hover:shadow-md">
      {linkTo ? (
        <a href={linkTo} className="block h-full">
          <CardContent className="p-0 h-full">
>>>>>>> feature/flutter-mobile-app
            {content}
          </CardContent>
        </a>
      ) : (
<<<<<<< HEAD
        <CardContent className="p-0">
=======
        <CardContent className="p-0 h-full">
>>>>>>> feature/flutter-mobile-app
          {content}
        </CardContent>
      )}
    </Card>
  );
}

<<<<<<< HEAD
interface StatusItemProps {
=======
interface AttendanceCardProps {
  icon: React.ReactNode;
  color: 'green' | 'red' | 'amber';
  label: string;
  value: number;
}

function AttendanceCard({ icon, color, label, value }: AttendanceCardProps) {
  const colorMap = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-100',
      text: 'text-green-800',
      label: 'text-green-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'bg-red-100',
      text: 'text-red-800',
      label: 'text-red-600'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'text-amber-600'
    }
  };

  const classes = colorMap[color];

  return (
    <div className={`flex items-start rounded-lg border ${classes.border} ${classes.bg} p-6 shadow-sm`}>
      <div className={`mr-4 rounded-full ${classes.icon} p-3 shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium ${classes.label}`}>{label}</p>
        <p className={`mt-1 text-3xl font-bold ${classes.text}`}>{value}</p>
      </div>
    </div>
  );
}

interface StatusItemProps {
  icon: React.ReactNode;
>>>>>>> feature/flutter-mobile-app
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}

<<<<<<< HEAD
function StatusItem({ label, value, color }: StatusItemProps) {
=======
function StatusItem({ icon, label, value, color }: StatusItemProps) {
>>>>>>> feature/flutter-mobile-app
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
<<<<<<< HEAD
    <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <Badge className={colorClasses[color]}>
=======
    <div className="flex items-center justify-between rounded-md border border-gray-200 p-4 shadow-sm bg-white">
      <div className="flex items-center">
        <div className="mr-3 bg-gray-100 p-2 rounded-full">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <Badge className={`${colorClasses[color]} text-xs py-1 px-2.5 font-medium`}>
>>>>>>> feature/flutter-mobile-app
        {value}
      </Badge>
    </div>
  );
}

interface ActivityCardProps {
  title: string;
  description: string;
  status: string;
  icon: React.ReactNode;
  link?: string;
}

function ActivityCard({ title, description, status, icon, link }: ActivityCardProps) {
  const statusClasses = {
<<<<<<< HEAD
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const statusClass = statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';

  const content = (
    <>
      <div className="flex items-center">
        <div className="mr-3 rounded-full bg-gray-100 p-2">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Badge className={statusClass}>
=======
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const statusClass = statusClasses[status.toLowerCase() as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 border-gray-200';

  const content = (
    <>
      <div className="flex items-center flex-1 min-w-0 mr-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 mr-4 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">{title}</h4>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
      </div>
      <Badge className={`${statusClass} whitespace-nowrap px-2.5 py-1`}>
>>>>>>> feature/flutter-mobile-app
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </>
  );

  return (
<<<<<<< HEAD
    <div className="rounded-lg border p-4 shadow-sm transition-colors hover:bg-gray-50">
=======
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
>>>>>>> feature/flutter-mobile-app
      {link ? (
        <a href={link} className="flex items-center justify-between">
          {content}
        </a>
      ) : (
        <div className="flex items-center justify-between">
          {content}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
<<<<<<< HEAD
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <FileText className="mb-2 h-8 w-8 text-gray-400" />
      <p className="text-gray-500">{message}</p>
=======
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 border-dashed bg-gray-50 p-8 text-center">
      <FileText className="mb-3 h-10 w-10 text-gray-400" />
      <p className="text-gray-600 font-medium">{message}</p>
>>>>>>> feature/flutter-mobile-app
    </div>
  );
}
