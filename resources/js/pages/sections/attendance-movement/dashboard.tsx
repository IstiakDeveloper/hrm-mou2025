import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, ArrowUpRight, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';

type Movement = {
    id: number;
    employee: { first_name: string; last_name: string };
    purpose: string;
    from_datetime: string;
    status: string;
};

type Transfer = {
    id: number;
    employee: { first_name: string; last_name: string };
    from_branch: { name: string };
    to_branch: { name: string };
    effective_date: string;
    status: string;
};

type Props = {
    attendanceStats: { present: number; absent: number; late: number };
    movementStats: { pending: number; ongoing: number };
    transferStats: { pending: number; approved: number };
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
    return (
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
                <Link href={href || '#'} className={href ? 'block' : 'block pointer-events-none'}>
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

export default function AttendanceMovementDashboard(props: Props) {
    const { auth } = usePage().props as any;

    return (
        <Layout>
            <Head title="Attendance & Movement" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                                ATTENDANCE & MOVEMENT
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-1">
                                {props.userRole || 'User'}
                            </Badge>
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            Operations Overview
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Today’s attendance snapshot and latest movement/transfer activity.
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
                            <Link href="/attendance?section=attendance-movement">Open attendance</Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatTile
                        title="PRESENT (TODAY)"
                        value={props.attendanceStats.present}
                        icon={<Users className="h-6 w-6" />}
                        href="/attendance?section=attendance-movement"
                    />
                    <StatTile
                        title="ONGOING MOVEMENTS"
                        value={props.movementStats.ongoing}
                        icon={<MapPin className="h-6 w-6" />}
                        href="/movements?section=attendance-movement"
                    />
                    <StatTile
                        title="TRANSFER PENDING"
                        value={props.transferStats.pending}
                        icon={<ArrowLeftRight className="h-6 w-6" />}
                        href="/transfers?section=attendance-movement"
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Latest activity</CardTitle>
                            <CardDescription className="text-xs">
                                Recent movements and transfers (based on your permissions)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={props.recentMovements?.length ? 'movements' : 'transfers'}>
                                <TabsList className="bg-gray-100 p-1 rounded-lg">
                                    <TabsTrigger value="movements" className="text-xs">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Movements
                                    </TabsTrigger>
                                    <TabsTrigger value="transfers" className="text-xs">
                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                        Transfers
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="movements" className="mt-4">
                                    <div className="space-y-3">
                                        {props.recentMovements?.length ? props.recentMovements.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={`/movements/${x.id}?section=attendance-movement`}
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

                                <TabsContent value="transfers" className="mt-4">
                                    <div className="space-y-3">
                                        {props.recentTransfers?.length ? props.recentTransfers.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={`/transfers/${x.id}?section=attendance-movement`}
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
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Quick links</CardTitle>
                            <CardDescription className="text-xs">Shortcuts for daily operations</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/attendance?section=attendance-movement">
                                    Daily attendance <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/movements?section=attendance-movement">
                                    Movements <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/transfers?section=attendance-movement">
                                    Transfers <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

