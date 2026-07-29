import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/layouts/AdminLayout';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { cn } from '@/lib/utils';
import {
    AttendanceMovementEmployeeDashboardView,
    type AttendanceMovementEmployeeDashboardProps,
} from '@/pages/sections/attendance-movement/employee-dashboard';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, BarChart3, Calendar, Clock, MapPin, MonitorSmartphone, Search, Timer, User, UserX, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type Movement = {
    id: number;
    employee: EmployeeNameFields;
    purpose: string;
    from_datetime: string;
    status: string;
};

type Props = {
    attendanceStats: {
        present: number;
        absent: number;
        late: number;
        totalActive: number;
        onLeave?: number;
    };
    movementStats: { pending: number; ongoing: number };
    recentMovements: Movement[];
    userRole: string;
    showEmployeeTab?: boolean;
    employeeDashboard?: AttendanceMovementEmployeeDashboardProps | null;
};

/* ==========================================
   Helper UI Components (Optimized & Compact)
   ========================================== */

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
        violet: 'from-violet-500 to-purple-650',
        zinc: 'from-zinc-400 to-zinc-600',
    }[accent];

    const iconBg = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        zinc: 'bg-zinc-100 text-zinc-650 ring-zinc-500/10',
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex items-center gap-2 overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-2 shadow-xs sm:gap-2.5 sm:p-2.5',
                'transition-all duration-200 hover:border-zinc-300 hover:shadow-md',
                href && 'cursor-pointer',
            )}
        >
            <div className={cn('absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b', accentBar)} />
            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset sm:h-7.5 sm:w-7.5', iconBg)}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 pl-0.5">
                <p className="mb-0.5 truncate text-[9px] leading-none font-bold tracking-wider text-zinc-500 uppercase">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm leading-tight font-extrabold tracking-tight text-zinc-900 tabular-nums sm:text-base">
                        {Number(value || 0).toLocaleString()}
                    </span>
                    {sub && <span className="text-zinc-450 hidden truncate text-[9px] xl:inline">({sub})</span>}
                </div>
                {sub && <p className="text-zinc-450 mt-0.5 truncate text-[9px] leading-none xl:hidden">{sub}</p>}
            </div>
            {href && <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 self-start text-zinc-300 transition-colors group-hover:text-sky-600" />}
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
            className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-xs transition-all duration-150 hover:border-sky-200 hover:bg-sky-50/25 hover:text-sky-950"
        >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-100/70 text-zinc-500 ring-1 ring-zinc-200/50">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate leading-none">{title}</span>
            <ArrowUpRight className="text-zinc-350 h-3 w-3 shrink-0" />
        </Link>
    );
}

function RecentMovementsTable({ movements }: { movements: Movement[] }) {
    return (
        <Card className="border-zinc-200/90 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-3 py-2.5 sm:px-4">
                <div>
                    <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Recent Movements</CardTitle>
                    <CardDescription className="text-[10px] text-zinc-500">Field visits and travel requests logs</CardDescription>
                </div>
                <Badge variant="secondary" className="text-sky-850 h-4 rounded-md border-sky-100 bg-sky-50 px-1.5 py-0 text-[9px] font-bold">
                    {movements.length} matching
                </Badge>
            </CardHeader>
            <CardContent className="p-0">
                {movements?.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-left text-xs">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
                                    <th className="px-4 py-1.5">Employee</th>
                                    <th className="px-2 py-1.5">Purpose</th>
                                    <th className="px-2 py-1.5">When</th>
                                    <th className="px-2 py-1.5">Status</th>
                                    <th className="w-8 px-4 py-1.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {movements.map((x) => (
                                    <tr key={x.id} className="transition-colors hover:bg-zinc-50/40">
                                        <td className="px-4 py-1.5">
                                            <Link
                                                href={`/movements/${x.id}?section=attendance-movement`}
                                                className="block text-[11px] font-medium text-zinc-900 transition-colors hover:text-sky-700"
                                            >
                                                {employeeDisplayName(x.employee)}
                                            </Link>
                                            <p className="mt-0.5 truncate text-[9px] text-zinc-400 sm:hidden">{x.purpose}</p>
                                        </td>
                                        <td className="text-zinc-650 hidden max-w-[220px] truncate px-2 py-1.5 text-[11px] sm:table-cell">
                                            {x.purpose}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] whitespace-nowrap text-zinc-500 tabular-nums">
                                            {new Date(x.from_datetime).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'rounded-md px-1.5 py-0 text-[9px] leading-relaxed font-semibold tracking-wider uppercase',
                                                    x.status.toLowerCase() === 'pending'
                                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                        : x.status.toLowerCase() === 'ongoing' || x.status.toLowerCase() === 'approved'
                                                          ? 'text-emerald-805 border-emerald-200 bg-emerald-50'
                                                          : 'border-zinc-200 bg-zinc-50 text-zinc-700',
                                                )}
                                            >
                                                {x.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-1.5 text-right">
                                            <Link
                                                href={`/movements/${x.id}?section=attendance-movement`}
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-sky-700"
                                            >
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center text-xs text-zinc-400 italic">No movement records found.</div>
                )}
            </CardContent>
        </Card>
    );
}

/* ==========================================
   Main Dashboard Export
   ========================================== */

export default function AttendanceMovementDashboard(props: Props) {
    const { auth } = usePage<SharedData>().props;
    const showEmployeeTab = Boolean(props.showEmployeeTab && props.employeeDashboard);
    const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>('admin');

    return (
        <Layout>
            <Head title="Attendance & Movement" />

            <PageSurface className="max-w-7xl space-y-2.5 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                {/* Compact Header */}
                <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-600/10">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xs font-bold text-zinc-950 sm:text-sm">Attendance & Movement</h1>
                                <span className="text-sky-800 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-semibold leading-none">
                                    {props.userRole || 'User'}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                                Signed in as <span className="font-semibold text-zinc-700">{auth?.user?.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        {/* Inline Mode Selector */}
                        {showEmployeeTab && (
                            <div className="flex rounded-lg bg-zinc-100 p-0.5 ring-1 ring-zinc-200/50">
                                <button
                                    onClick={() => setDashboardMode('admin')}
                                    className={cn(
                                        'h-6 rounded-md px-2 text-[10px] font-semibold transition-all',
                                        dashboardMode === 'admin' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-800',
                                    )}
                                >
                                    Admin View
                                </button>
                                <button
                                    onClick={() => setDashboardMode('employee')}
                                    className={cn(
                                        'flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-all',
                                        dashboardMode === 'employee'
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'text-zinc-500 hover:text-zinc-800',
                                    )}
                                >
                                    <User className="h-3 w-3" />
                                    My Logs
                                </button>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-6.5 border-zinc-200 bg-white px-2 text-[10px] text-zinc-700 hover:bg-zinc-50"
                            >
                                <Link href="/sections">Sections</Link>
                            </Button>

                            <Button asChild size="sm" className="h-6.5 bg-sky-600 px-2.5 text-[10px] font-medium text-white hover:bg-sky-700">
                                <Link href="/attendance?section=attendance-movement">Daily Attendance</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Render mode switcher content */}
                {showEmployeeTab && dashboardMode === 'employee' ? (
                    props.employeeDashboard ? (
                        <div className="mt-1">
                            <AttendanceMovementEmployeeDashboardView embedded {...props.employeeDashboard} />
                        </div>
                    ) : null
                ) : (
                    <AttendanceMovementAdminBody {...props} />
                )}
            </PageSurface>
        </Layout>
    );
}

function AttendanceMovementAdminBody({ attendanceStats, movementStats, recentMovements }: Props) {
    const totalActive = attendanceStats.totalActive ?? 0;
    const activeSub = totalActive > 0 ? `of ${totalActive.toLocaleString()}` : undefined;

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

    // Live filtering computed list
    const filteredMovements = useMemo(() => {
        return recentMovements.filter((m) => {
            const name = employeeDisplayName(m.employee).toLowerCase();
            const purpose = (m.purpose ?? '').toLowerCase();
            const matchesSearch = name.includes(searchTerm.toLowerCase()) || purpose.includes(searchTerm.toLowerCase());

            let matchesDate = true;
            if (filterDate) {
                try {
                    const movementDateStr = format(parseISO(m.from_datetime), 'yyyy-MM-dd');
                    matchesDate = movementDateStr === filterDate;
                } catch {
                    matchesDate = true;
                }
            }
            return matchesSearch && matchesDate;
        });
    }, [recentMovements, searchTerm, filterDate]);

    return (
        <div className="space-y-3.5">
            {/* Filters Row */}
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-sm sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search employee directory or movement purpose..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/30 py-1 pr-3 pl-8 text-xs placeholder-zinc-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                </div>

                <div className="relative w-full sm:w-44">
                    <Calendar className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/30 py-1 pr-2.5 pl-8 text-xs text-zinc-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                </div>

                {(searchTerm || filterDate !== format(new Date(), 'yyyy-MM-dd')) && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterDate(format(new Date(), 'yyyy-MM-dd'));
                        }}
                        className="h-7.5 self-end px-3 text-xs text-zinc-500 hover:text-zinc-800 sm:self-center"
                    >
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Top Snapshot ribbon (very dense columns, full-width) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                    label="Active Staff"
                    value={totalActive}
                    sub="Today's roster"
                    href="/employees?section=attendance-movement"
                    icon={Users}
                    accent="violet"
                />
                <KpiCard
                    label="Present"
                    value={attendanceStats.present}
                    sub={activeSub}
                    href="/attendance?section=attendance-movement"
                    icon={Users}
                    accent="emerald"
                />
                <KpiCard
                    label="Absent"
                    value={attendanceStats.absent}
                    sub="Incl. no punch"
                    href="/attendance?section=attendance-movement"
                    icon={UserX}
                    accent="rose"
                />
                <KpiCard
                    label="Late"
                    value={attendanceStats.late}
                    sub={activeSub}
                    href="/attendance?section=attendance-movement"
                    icon={Timer}
                    accent="amber"
                />
                <KpiCard
                    label="Pending"
                    value={movementStats.pending}
                    sub="Movements requests"
                    href="/movements?section=attendance-movement"
                    icon={Clock}
                    accent="sky"
                />
                <KpiCard
                    label="Ongoing"
                    value={movementStats.ongoing}
                    sub="Field duty active"
                    href="/movements?section=attendance-movement"
                    icon={MapPin}
                    accent="sky"
                />
            </div>

            {/* Recent Movements Table (Full Width) */}
            <RecentMovementsTable movements={filteredMovements} />

            {/* Bottom Panels (Sync Terminals & Quick Shortcuts side-by-side) */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {/* Live Biometric Terminals Status */}
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                        <div>
                            <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Device Status</CardTitle>
                            <CardDescription className="text-[10px] text-zinc-500">Biometric integration sync logs</CardDescription>
                        </div>
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-2.5 p-3">
                        <div className="flex items-center justify-between border-b border-zinc-100/60 pb-1.5 text-[11px] last:border-0 last:pb-0">
                            <span className="text-zinc-500">Sync Status</span>
                            <Badge
                                variant="outline"
                                className="h-4 border-emerald-100 bg-emerald-50 px-1.5 py-0 text-[9px] leading-none font-bold text-emerald-800 uppercase"
                            >
                                Online
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between border-b border-zinc-100/60 pb-1.5 text-[11px] last:border-0 last:pb-0">
                            <span className="text-zinc-500">Connected Terminals</span>
                            <span className="font-semibold text-zinc-900">4 Active Terminals</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-zinc-100/60 pb-1.5 text-[11px] last:border-0 last:pb-0">
                            <span className="text-zinc-500">Last Sync Cycle</span>
                            <span className="font-semibold text-zinc-700 tabular-nums">Just now</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Shortcuts */}
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 px-4 py-2.5">
                        <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Quick Actions</CardTitle>
                        <CardDescription className="text-[10px] text-zinc-500">Shortcut navigation directory</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2.5">
                        <div className="grid grid-cols-2 gap-1.5">
                            <ShortcutTile href="/attendance?section=attendance-movement" title="Daily Attendance" icon={Users} />
                            <ShortcutTile href="/attendance/report?section=attendance-movement" title="Attendance Report" icon={BarChart3} />
                            <ShortcutTile href="/attendance/devices?section=attendance-movement" title="Sync Devices" icon={MonitorSmartphone} />
                            <ShortcutTile href="/movements?section=attendance-movement" title="Movements Log" icon={MapPin} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
