import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock, FileText } from 'lucide-react';

interface LeaveApplication {
    id: number;
    employee: { first_name: string; last_name: string };
    leave_type: { name: string };
    start_date: string;
    end_date: string;
    status: string;
}

type Props = {
    leaveStats: { pending: number; approved: number; todayOnLeave: number };
    recentLeaves: LeaveApplication[];
    userRole: string;
};

function Stat({
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
    return (
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
                <Link
                    href={href || '#'}
                    className={href ? 'block' : 'block pointer-events-none'}
                >
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
                </Link>
            </CardContent>
        </Card>
    );
}

export default function LeaveDashboard({ leaveStats, recentLeaves, userRole }: Props) {
    const { auth } = usePage().props as any;

    return (
        <Layout>
            <Head title="Leave" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                                LEAVE DASHBOARD
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-1">
                                {userRole || 'User'}
                            </Badge>
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            Leave Overview
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Requests, approvals and quick access to leave operations.
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                            Welcome back, <span className="font-semibold text-gray-700">{auth?.user?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                        <Button asChild className="text-xs bg-green-600 hover:bg-green-700">
                            <Link href="/leave/applications/create?section=leave">Apply leave</Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Stat
                        title="PENDING REQUESTS"
                        value={leaveStats.pending}
                        icon={<Clock className="h-6 w-6" />}
                        href="/leave/applications?section=leave"
                    />
                    <Stat
                        title="APPROVED (THIS MONTH)"
                        value={leaveStats.approved}
                        icon={<CheckCircle2 className="h-6 w-6" />}
                        href="/leave/applications?section=leave"
                    />
                    <Stat
                        title="TODAY ON LEAVE"
                        value={leaveStats.todayOnLeave}
                        icon={<CalendarDays className="h-6 w-6" />}
                        href="/leave/applications?section=leave"
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Recent leave applications</CardTitle>
                            <CardDescription className="text-xs">Latest activity on leave requests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="list">
                                <TabsList className="bg-gray-100 p-1 rounded-lg">
                                    <TabsTrigger value="list" className="text-xs">
                                        <FileText className="mr-2 h-4 w-4" />
                                        List
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="list" className="mt-4">
                                    <div className="space-y-3">
                                        {recentLeaves?.length ? recentLeaves.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={`/leave/applications/${x.id}?section=leave`}
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
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Quick links</CardTitle>
                            <CardDescription className="text-xs">Shortcuts for leave setup and reports</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/leave/applications?section=leave">
                                    Applications <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/leave/types?section=leave">
                                    Leave types <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/leave/applications/report?section=leave">
                                    Report <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

