import React from 'react';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Layout from '@/layouts/AdminLayout';
import {
  Users,
  Building,
  LayoutDashboard,
  Clock,
  CalendarOff,
  CalendarCheck,
  FileText,
  ArrowLeftRight,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';

interface LeaveApplication {
  id: number;
  employee: {
    first_name: string;
    last_name: string;
  };
  leave_type: {
    name: string;
  };
  start_date: string;
  end_date: string;
  status: string;
}

interface Movement {
  id: number;
  employee: {
    first_name: string;
    last_name: string;
  };
  purpose: string;
  from_datetime: string;
  status: string;
}

interface Transfer {
  id: number;
  employee: {
    first_name: string;
    last_name: string;
  };
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
  return (
    <Layout>
      <Head title="Dashboard" />

      <div className="container mx-auto py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">
              Welcome to the HRM system dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="font-medium">
              Role: {userRole}
            </Badge>
            <Badge variant="outline" className="font-medium">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={<Users size={30} className="text-indigo-500" />}
            description="Registered employees"
          />
          <StatsCard
            title="Total Branches"
            value={stats.totalBranches}
            icon={<Building size={30} className="text-emerald-500" />}
            description="Active office branches"
          />
          <StatsCard
            title="Total Departments"
            value={stats.totalDepartments}
            icon={<LayoutDashboard size={30} className="text-amber-500" />}
            description="Company departments"
          />
        </div>

        {/* Attendance Overview */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-gray-500" />
                <CardTitle>Today's Attendance Overview</CardTitle>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave and Movement Stats */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <CalendarOff className="mr-2 h-5 w-5 text-gray-500" />
                <CardTitle>Leave Status</CardTitle>
              </div>
              <CardDescription>Employee leave overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StatusItem
                  label="Pending Leave Applications"
                  value={leaveStats.pending}
                  color="amber"
                />
                <StatusItem
                  label="Approved (This Month)"
                  value={leaveStats.approved}
                  color="green"
                />
                <StatusItem
                  label="Today On Leave"
                  value={leaveStats.todayOnLeave}
                  color="blue"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                <CardTitle>Movement & Transfer</CardTitle>
              </div>
              <CardDescription>Staff movements overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StatusItem
                  label="Pending Movements"
                  value={movementStats.pending}
                  color="amber"
                />
                <StatusItem
                  label="Ongoing Movements"
                  value={movementStats.ongoing}
                  color="blue"
                />
                <StatusItem
                  label="Pending Transfers"
                  value={transferStats.pending}
                  color="purple"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest staff activities and requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="leaves" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="leaves" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Leave Applications
                  </TabsTrigger>
                  <TabsTrigger value="movements" className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    Movements
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="flex items-center">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Transfers
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="leaves" className="mt-4">
                  {recentLeaves.length > 0 ? (
                    <div className="space-y-3">
                      {recentLeaves.map((leave) => (
                        <ActivityCard
                          key={leave.id}
                          title={`${leave.employee.first_name} ${leave.employee.last_name}`}
                          description={`${leave.leave_type.name} (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()})`}
                          status={leave.status}
                          icon={<User className="h-5 w-5 text-indigo-500" />}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No recent leave applications" />
                  )}
                </TabsContent>

                <TabsContent value="movements" className="mt-4">
                  {recentMovements.length > 0 ? (
                    <div className="space-y-3">
                      {recentMovements.map((movement) => (
                        <ActivityCard
                          key={movement.id}
                          title={`${movement.employee.first_name} ${movement.employee.last_name}`}
                          description={`${movement.purpose} (${new Date(movement.from_datetime).toLocaleDateString()})`}
                          status={movement.status}
                          icon={<MapPin className="h-5 w-5 text-purple-500" />}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No recent movements" />
                  )}
                </TabsContent>

                <TabsContent value="transfers" className="mt-4">
                  {recentTransfers.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransfers.map((transfer) => (
                        <ActivityCard
                          key={transfer.id}
                          title={`${transfer.employee.first_name} ${transfer.employee.last_name}`}
                          description={`${transfer.from_branch.name} → ${transfer.to_branch.name} (${new Date(transfer.effective_date).toLocaleDateString()})`}
                          status={transfer.status}
                          icon={<ArrowLeftRight className="h-5 w-5 text-blue-500" />}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No recent transfers" />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <a
                href="/reports"
                className="text-sm font-medium text-primary hover:underline"
              >
                View All Reports →
              </a>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Reusable Components

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className="mr-4 rounded-full bg-gray-100 p-3">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold">{value.toLocaleString()}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusItemProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}

function StatusItem({ label, value, color }: StatusItemProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <Badge className={colorClasses[color]}>
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
}

function ActivityCard({ title, description, status, icon }: ActivityCardProps) {
  const statusClasses = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const statusClass = statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm transition-colors hover:bg-gray-50">
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
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <FileText className="mb-2 h-8 w-8 text-gray-400" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
