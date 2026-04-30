import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, CalendarDays, Clock, MapPin, Plus } from 'lucide-react';

type Props = {
    employee: any;
    todayAttendance: any | null;
    recentAttendance: any[];
    recentMovements: any[];
};

function Pill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">{label}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
}

export default function AttendanceMovementEmployeeDashboard({
    employee,
    todayAttendance,
    recentAttendance,
    recentMovements,
}: Props) {
    const { auth } = usePage().props as any;

    const status = todayAttendance?.status ? String(todayAttendance.status) : 'N/A';
    const checkIn = todayAttendance?.check_in_time ? String(todayAttendance.check_in_time) : '—';
    const checkOut = todayAttendance?.check_out_time ? String(todayAttendance.check_out_time) : '—';

    return (
        <Layout>
            <Head title="Attendance & Movement" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                            EMPLOYEE DASHBOARD
                        </Badge>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            My Attendance & Movements
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Today’s status, recent attendance and movement history.
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
                            <Link href="/movements/create?section=attendance-movement">
                                <Plus className="mr-2 h-4 w-4" />
                                Request movement
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Pill label="TODAY STATUS" value={status} />
                    <Pill label="CHECK IN" value={checkIn} />
                    <Pill label="CHECK OUT" value={checkOut} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Recent attendance</CardTitle>
                            <CardDescription className="text-xs">Last 10 records</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentAttendance?.length ? recentAttendance.map((x, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {x.date ? new Date(x.date).toLocaleDateString() : 'Date'}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    Status: {x.status ?? '—'} • In: {x.check_in_time ?? '—'} • Out: {x.check_out_time ?? '—'}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                {String(x.status ?? '').toUpperCase() || '—'}
                                            </Badge>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                        No attendance records
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
                                <Link href="/employee/dashboard?section=attendance-movement">
                                    My dashboard <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/employee/movements?section=attendance-movement">
                                    My movements <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/employee/attendance?section=attendance-movement">
                                    Attendance (PWA) <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Recent movements</CardTitle>
                            <CardDescription className="text-xs">Last 8 requests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentMovements?.length ? recentMovements.map((x, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/movements/${x.id}?section=attendance-movement`}
                                        className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {x.purpose ?? 'Movement'}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {x.from_datetime ? new Date(x.from_datetime).toLocaleString() : ''} • {x.status ?? ''}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                {String(x.status ?? '').toUpperCase() || '—'}
                                            </Badge>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                                        No movement requests
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

