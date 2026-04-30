import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, FileText, Plus, ArrowUpRight } from 'lucide-react';

type LeaveBalance = {
    id: number;
    year: number;
    leave_type: {
        id: number;
        name: string;
        days_allowed: number;
    };
    leave_applications?: Array<{
        id: number;
        start_date: string;
        end_date: string;
        days: number;
        status: string;
    }>;
};

type LeaveApplication = {
    id: number;
    leave_type: { name: string };
    start_date: string;
    end_date: string;
    status: string;
};

type Props = {
    employee: any;
    leaveBalances: LeaveBalance[];
    recentLeaves: LeaveApplication[];
};

export default function LeaveEmployeeDashboard({ employee, leaveBalances, recentLeaves }: Props) {
    const { auth } = usePage().props as any;

    const totalAllowed = (leaveBalances || []).reduce((sum, b) => sum + Number(b.leave_type?.days_allowed || 0), 0);
    const totalTaken = (leaveBalances || []).reduce((sum, b) => {
        const taken = (b.leave_applications || [])
            .filter((x) => String(x.status).toLowerCase() === 'approved')
            .reduce((s, x) => s + Number(x.days || 0), 0);
        return sum + taken;
    }, 0);
    const remaining = Math.max(0, totalAllowed - totalTaken);

    return (
        <Layout>
            <Head title="Leave" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                            EMPLOYEE LEAVE
                        </Badge>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            My Leave Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Track balances and recent applications.
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                            {auth?.user?.name} • {employee?.department?.name ?? 'Department'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                        <Button asChild className="text-xs bg-green-600 hover:bg-green-700">
                            <Link href="/leave/applications/create?section=leave">
                                <Plus className="mr-2 h-4 w-4" />
                                Apply leave
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">ALLOWED</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{totalAllowed}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">TAKEN (APPROVED)</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{totalTaken}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">REMAINING</p>
                            <p className="mt-1 text-2xl font-bold text-green-700">{remaining}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Recent applications</CardTitle>
                            <CardDescription className="text-xs">Your latest leave requests</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                                    {x.leave_type?.name ?? 'Leave'}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {new Date(x.start_date).toLocaleDateString()} – {new Date(x.end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                {x.status}
                                            </Badge>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                        No recent applications
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Quick links</CardTitle>
                            <CardDescription className="text-xs">Common actions</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/leave/applications?section=leave">
                                    My applications <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/employee/leaves?section=leave">
                                    Leave balance <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/my-notices?section=leave">
                                    Notices <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

