import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeftRight,
    ArrowUpRight,
    Building2,
    CalendarDays,
    CheckCircle,
    Clock,
    MapPin,
    Users,
} from 'lucide-react';

interface LeaveApplication {
    id: number;
    employee: { first_name: string; last_name: string };
    leave_type: { name: string };
    start_date: string;
    end_date: string;
    status: string;
}

interface Movement {
    id: number;
    employee: { first_name: string; last_name: string };
    purpose: string;
    from_datetime: string;
    status: string;
}

interface Transfer {
    id: number;
    employee: { first_name: string; last_name: string };
    from_branch: { name: string };
    to_branch: { name: string };
    effective_date: string;
    status: string;
}

type Props = {
    stats: { totalEmployees: number; totalBranches: number; totalDepartments: number };
    attendanceStats: { present: number; absent: number; late: number };
    leaveStats: { pending: number; approved: number; todayOnLeave: number };
    movementStats: { pending: number; ongoing: number };
    transferStats: { pending: number; approved: number };
    recentLeaves: LeaveApplication[];
    recentMovements: Movement[];
    recentTransfers: Transfer[];
    userRole: string;
};

function StatTile({
    title,
    value,
    icon,
    href,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    href?: string;
}) {
    const body = (
        <div className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-2xl bg-green-50 border border-green-100 grid place-items-center text-green-700">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 tracking-wide">{title}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{Number(value || 0).toLocaleString()}</p>
            </div>
            {href && (
                <div className="ml-auto text-green-700">
                    <ArrowUpRight className="h-5 w-5" />
                </div>
            )}
        </div>
    );

    return (
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            {href ? (
                <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-green-500/30 rounded-xl">
                    <CardContent className="p-0">{body}</CardContent>
                </Link>
            ) : (
                <CardContent className="p-0">{body}</CardContent>
            )}
        </Card>
    );
}

function MiniKpi({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{Number(value || 0).toLocaleString()}</p>
        </div>
    );
}

export default function HumanResourcesDashboard(props: Props) {
    const { auth } = usePage().props as any;
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    return (
        <Layout>
            <Head title="Human Resources" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                                HR DASHBOARD
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-1">
                                {props.userRole || 'User'}
                            </Badge>
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            Human Resources Overview
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            A modern summary of core HR operations and quick access to key modules.
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                            Welcome back, <span className="font-semibold text-gray-700">{auth?.user?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                        {hasPermission('employees.create') && (
                            <Button asChild className="text-xs bg-green-600 hover:bg-green-700">
                                <Link href="/employees/create?section=human-resources">Add employee</Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Core stats */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hasPermission('employees.view') && (
                        <StatTile
                            title="TOTAL EMPLOYEES"
                            value={props.stats.totalEmployees}
                            icon={<Users className="h-6 w-6" />}
                            href="/employees?section=human-resources"
                        />
                    )}
                    {hasPermission('branches.view') && (
                        <StatTile
                            title="TOTAL BRANCHES"
                            value={props.stats.totalBranches}
                            icon={<Building2 className="h-6 w-6" />}
                            href="/branches?section=human-resources"
                        />
                    )}
                    {hasPermission('departments.view') && (
                        <StatTile
                            title="TOTAL DEPARTMENTS"
                            value={props.stats.totalDepartments}
                            icon={<CalendarDays className="h-6 w-6" />}
                            href="/departments?section=human-resources"
                        />
                    )}
                </div>

                {/* Operational KPIs */}
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Operations Snapshot</CardTitle>
                            <CardDescription className="text-xs">
                                Today’s key indicators (based on your permissions)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {hasPermission('attendance.view') && (
                                    <MiniKpi label="Present" value={props.attendanceStats.present} />
                                )}
                                {hasPermission('leave-applications.view') && (
                                    <MiniKpi label="Leave pending" value={props.leaveStats.pending} />
                                )}
                                {hasPermission('movements.view') && (
                                    <MiniKpi label="Ongoing movements" value={props.movementStats.ongoing} />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Quick links</CardTitle>
                            <CardDescription className="text-xs">Jump to common tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/employees?section=human-resources">
                                    Employees <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/branches?section=human-resources">
                                    Branches <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/holidays?section=human-resources">
                                    Holidays <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Activity */}
                <div className="mt-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Recent activities</CardTitle>
                            <CardDescription className="text-xs">
                                Latest leave, movement and transfer requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={hasPermission('leave-applications.view') ? 'leaves' : (hasPermission('movements.view') ? 'movements' : 'transfers')}>
                                <TabsList className="bg-gray-100 p-1 rounded-lg">
                                    {hasPermission('leave-applications.view') && (
                                        <TabsTrigger value="leaves" className="text-xs">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Leaves
                                        </TabsTrigger>
                                    )}
                                    {hasPermission('movements.view') && (
                                        <TabsTrigger value="movements" className="text-xs">
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Movements
                                        </TabsTrigger>
                                    )}
                                    {hasPermission('transfers.view') && (
                                        <TabsTrigger value="transfers" className="text-xs">
                                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                                            Transfers
                                        </TabsTrigger>
                                    )}
                                </TabsList>

                                {hasPermission('leave-applications.view') && (
                                    <TabsContent value="leaves" className="mt-4">
                                        <div className="space-y-3">
                                            {props.recentLeaves?.length ? props.recentLeaves.map((x) => (
                                                <Link
                                                    key={x.id}
                                                    href={`/leave/applications/${x.id}?section=human-resources`}
                                                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {x.employee.first_name} {x.employee.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-600 truncate">
                                                                {x.leave_type.name} • {new Date(x.start_date).toLocaleDateString()} – {new Date(x.end_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {x.status}
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            )) : (
                                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                                    No recent leave applications
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                )}

                                {hasPermission('movements.view') && (
                                    <TabsContent value="movements" className="mt-4">
                                        <div className="space-y-3">
                                            {props.recentMovements?.length ? props.recentMovements.map((x) => (
                                                <Link
                                                    key={x.id}
                                                    href={`/movements/${x.id}?section=human-resources`}
                                                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {x.employee.first_name} {x.employee.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-600 truncate">
                                                                {x.purpose} • {new Date(x.from_datetime).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {x.status}
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            )) : (
                                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                                    No recent movements
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                )}

                                {hasPermission('transfers.view') && (
                                    <TabsContent value="transfers" className="mt-4">
                                        <div className="space-y-3">
                                            {props.recentTransfers?.length ? props.recentTransfers.map((x) => (
                                                <Link
                                                    key={x.id}
                                                    href={`/transfers/${x.id}?section=human-resources`}
                                                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {x.employee.first_name} {x.employee.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-600 truncate">
                                                                {x.from_branch.name} → {x.to_branch.name} • {new Date(x.effective_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {x.status}
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            )) : (
                                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                                    No recent transfers
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

