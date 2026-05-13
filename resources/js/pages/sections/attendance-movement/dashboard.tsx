import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, BarChart3, Clock, MapPin, MonitorSmartphone, Timer, UserX, Users } from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Movement = {
    id: number;
    employee: { first_name: string; last_name: string };
    purpose: string;
    from_datetime: string;
    status: string;
};

type Props = {
    attendanceStats: { present: number; absent: number; late: number };
    movementStats: { pending: number; ongoing: number };
    recentMovements: Movement[];
    userRole: string;
};

const kpiGrid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
    accent = 'sky',
}: {
    label: string;
    value: number;
    sub?: string;
    href?: string;
    icon: LucideIcon;
    accent?: 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'zinc';
}) {
    const accentBar = {
        emerald: 'from-emerald-500 to-teal-500',
        rose: 'from-rose-500 to-red-500',
        amber: 'from-amber-500 to-orange-400',
        sky: 'from-sky-500 to-blue-600',
        violet: 'from-violet-500 to-purple-600',
        zinc: 'from-zinc-400 to-zinc-600',
    }[accent];

    const iconBg = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-500/10',
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex min-h-[5.25rem] flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm',
                'transition-all duration-200 hover:border-zinc-300 hover:shadow-md',
                href && 'cursor-pointer',
            )}
        >
            <div className={cn('absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b', accentBar)} />
            <div className="flex items-start justify-between gap-2 pl-1">
                <div className={cn('rounded-lg p-1.5 ring-1 ring-inset', iconBg)}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                {href ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-sky-600" />
                ) : null}
            </div>
            <p className="mt-2 pl-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="pl-1 text-xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-2xl">
                {Number(value || 0).toLocaleString()}
            </p>
            {sub ? <p className="mt-auto pl-1 pt-1 text-[10px] leading-tight text-zinc-500">{sub}</p> : null}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40">
                {inner}
            </Link>
        );
    }
    return inner;
}

function ShortcutTile({ href, title, icon: Icon }: { href: string; title: string; icon: LucideIcon }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50/50 hover:text-sky-950"
        >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Link>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{children}</h2>;
}

export default function AttendanceMovementDashboard(props: Props) {
    const { auth } = usePage<SharedData>().props;
    const shortcutGrid = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

    return (
        <Layout>
            <Head title="Attendance & Movement" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Attendance &amp; movement</h1>
                        <p className="text-xs text-zinc-500">
                            {props.userRole || 'User'} · {auth?.user?.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 border-zinc-200 bg-white text-xs">
                            <Link href="/sections">Sections</Link>
                        </Button>
                        <Button asChild size="sm" className="h-8 bg-sky-600 text-xs hover:bg-sky-700">
                            <Link href="/attendance?section=attendance-movement">Attendance</Link>
                        </Button>
                    </div>
                </div>

                <section className="mb-6">
                    <SectionLabel>Today&apos;s snapshot</SectionLabel>
                    <div className={kpiGrid}>
                        <KpiCard
                            label="Present"
                            value={props.attendanceStats.present}
                            href="/attendance?section=attendance-movement"
                            icon={Users}
                            accent="emerald"
                        />
                        <KpiCard
                            label="Absent"
                            value={props.attendanceStats.absent}
                            href="/attendance?section=attendance-movement"
                            icon={UserX}
                            accent="rose"
                        />
                        <KpiCard
                            label="Late"
                            value={props.attendanceStats.late}
                            href="/attendance?section=attendance-movement"
                            icon={Timer}
                            accent="amber"
                        />
                        <KpiCard
                            label="Movements pending"
                            value={props.movementStats.pending}
                            href="/movements?section=attendance-movement"
                            icon={Clock}
                            accent="sky"
                        />
                        <KpiCard
                            label="Movements ongoing"
                            value={props.movementStats.ongoing}
                            href="/movements?section=attendance-movement"
                            icon={MapPin}
                            accent="sky"
                        />
                    </div>
                </section>

                <section className="mb-6">
                    <SectionLabel>Quick actions</SectionLabel>
                    <div className={shortcutGrid}>
                        <ShortcutTile href="/attendance?section=attendance-movement" title="Daily attendance" icon={Users} />
                        <ShortcutTile href="/attendance/report?section=attendance-movement" title="Attendance report" icon={BarChart3} />
                        <ShortcutTile href="/attendance/devices?section=attendance-movement" title="Devices" icon={MonitorSmartphone} />
                        <ShortcutTile href="/movements?section=attendance-movement" title="Movements" icon={MapPin} />
                    </div>
                </section>

                <section>
                    <SectionLabel>Latest activity</SectionLabel>
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Recent movements</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Field visits and travel requests</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {props.recentMovements?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase tracking-wide text-zinc-500">
                                                <th className="px-3 py-2 font-medium">Employee</th>
                                                <th className="hidden px-2 py-2 font-medium sm:table-cell">Purpose</th>
                                                <th className="px-2 py-2 font-medium">When</th>
                                                <th className="px-2 py-2 font-medium">Status</th>
                                                <th className="w-8 px-2 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {props.recentMovements.map((x) => (
                                                <tr key={x.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                                                    <td className="px-3 py-2">
                                                        <Link
                                                            href={`/movements/${x.id}?section=attendance-movement`}
                                                            className="font-medium text-zinc-900 hover:text-sky-700"
                                                        >
                                                            {x.employee.first_name} {x.employee.last_name}
                                                        </Link>
                                                        <p className="truncate text-[10px] text-zinc-500 sm:hidden">{x.purpose}</p>
                                                    </td>
                                                    <td className="hidden max-w-[180px] truncate px-2 py-2 text-zinc-600 sm:table-cell">
                                                        {x.purpose}
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-zinc-600">
                                                        {new Date(x.from_datetime).toLocaleString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Badge variant="outline" className="text-[10px] font-normal">
                                                            {x.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Link href={`/movements/${x.id}?section=attendance-movement`}>
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 hover:text-sky-600" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="px-4 py-8 text-center text-xs text-zinc-500">No recent movements.</p>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </PageSurface>
        </Layout>
    );
}
