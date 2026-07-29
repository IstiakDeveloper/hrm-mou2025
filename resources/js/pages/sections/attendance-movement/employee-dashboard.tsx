import React, { useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useSelfAttendanceCheck } from '@/hooks/use-self-attendance-check';
import { GeofenceVerificationOverlay } from '@/components/attendance/GeofenceVerificationOverlay';
import {
    ArrowUpRight,
    CalendarDays,
    ChevronRight,
    Clock,
    LayoutGrid,
    LogIn,
    LogOut,
    Plus,
    UserRound,
    XCircle,
    AlertCircle,
    Loader2,
    AlertTriangle,
    MapPin,
    CheckCircle2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

type AttendanceRow = {
    date?: string;
    status?: string | null;
    check_in?: string | null;
    check_out?: string | null;
};

type MovementRow = {
    id: number;
    purpose?: string | null;
    from_datetime?: string | null;
    status?: string | null;
};

type EmployeeLite = {
    id: number;
    department?: { name?: string } | null;
};

export type AttendanceMovementEmployeeDashboardProps = {
    employee: EmployeeLite;
    todayAttendance: AttendanceRow | null;
    recentAttendance: AttendanceRow[];
    recentMovements: MovementRow[];
};

type AttendanceMovementEmployeeDashboardViewProps = AttendanceMovementEmployeeDashboardProps & {
    embedded?: boolean;
};

function formatDay(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = parseISO(iso.length <= 10 ? `${iso}T12:00:00` : iso);
        return isValid(d) ? format(d, 'EEE d MMM yyyy') : '—';
    } catch {
        return '—';
    }
}

function formatClock(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = parseISO(iso);
        return isValid(d) ? format(d, 'h:mm a') : '—';
    } catch {
        return '—';
    }
}

function statusLabel(s?: string | null): string {
    if (!s || !String(s).trim()) return 'No record';
    return String(s).replace(/_/g, ' ');
}

/** Subtle top accent — works on light AdminLayout */
function statusTopBorder(status?: string | null): string {
    const s = String(status ?? '').toLowerCase();
    if (s === 'present' || s === 'on_duty') return 'border-t-emerald-500';
    if (s === 'late') return 'border-t-amber-500';
    if (s === 'absent') return 'border-t-rose-500';
    if (s === 'leave' || s === 'holiday' || s === 'weekend') return 'border-t-violet-400';
    return 'border-t-sky-500';
}

function attendanceRowBorder(status?: string | null): string {
    const s = String(status ?? '').toLowerCase();
    if (s === 'present' || s === 'on_duty') return 'border-l-emerald-500';
    if (s === 'late') return 'border-l-amber-500';
    if (s === 'absent') return 'border-l-rose-500';
    if (s === 'leave' || s === 'holiday' || s === 'weekend') return 'border-l-violet-500';
    return 'border-l-zinc-300';
}

function listStatusBadgeClass(status?: string | null): string {
    const s = String(status ?? '').toLowerCase();
    if (s === 'present' || s === 'on_duty') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (s === 'late') return 'border-amber-200 bg-amber-50 text-amber-900';
    if (s === 'absent') return 'border-rose-200 bg-rose-50 text-rose-900';
    if (s === 'leave' || s === 'holiday' || s === 'weekend') return 'border-violet-200 bg-violet-50 text-violet-900';
    return 'border-zinc-200 bg-zinc-50 text-zinc-800';
}

export function AttendanceMovementEmployeeDashboardView({
    employee,
    todayAttendance,
    recentAttendance,
    recentMovements,
    embedded = false,
}: AttendanceMovementEmployeeDashboardViewProps) {
    const { auth } = usePage().props as { auth?: { user?: { name?: string } } };

    const {
        actionType,
        isSubmitting,
        attendanceError,
        locationStatus,
        locationProgress,
        locationPreview,
        handleCheckIn,
        handleCheckOut,
        handleDismissError,
    } = useSelfAttendanceCheck();

    const todayStatus = useMemo(() => statusLabel(todayAttendance?.status), [todayAttendance?.status]);
    const checkIn = formatClock(todayAttendance?.check_in ?? null);
    const checkOut = formatClock(todayAttendance?.check_out ?? null);
    const topBorder = useMemo(() => statusTopBorder(todayAttendance?.status), [todayAttendance?.status]);

    const dashboardBody = (
            <div className={embedded ? '' : 'contents'}>

                {/* Compact light header + today stats */}
                <Card
                    className={cn(
                        'overflow-hidden border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 shadow-xs',
                        'border-t-4',
                        topBorder,
                    )}
                >
                    <CardContent className="space-y-3 p-2.5 sm:p-3.5">
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                    Attendance & movement · {format(new Date(), 'EEE d MMM yyyy')}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900">
                                        My overview
                                    </h1>
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <UserRound className="h-3 w-3 text-zinc-400" />
                                        <span className="font-medium text-zinc-700">{auth?.user?.name ?? '—'}</span>
                                        <span className="text-zinc-300">·</span>
                                        <span className="truncate">{employee?.department?.name ?? 'Department'}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                                <Button asChild variant="outline" size="sm" className="h-6.5 border-zinc-200 bg-white px-2 text-[10px] text-zinc-700 hover:bg-zinc-50">
                                    <Link href="/sections">Sections</Link>
                                </Button>
                                <Button asChild size="sm" className="h-6.5 bg-sky-600 px-2.5 text-[10px] font-medium text-white hover:bg-sky-700">
                                    <Link href="/movements/create?section=attendance-movement">
                                        <Plus className="mr-1 h-3 w-3" />
                                        Movement
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Today</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <span className="text-xs font-bold capitalize text-zinc-900 truncate">{todayStatus}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                    <LogIn className="h-3 w-3 text-emerald-600 shrink-0" />
                                    In
                                </p>
                                <p className="mt-0.5 font-mono text-xs sm:text-base font-bold tabular-nums text-zinc-900">
                                    {checkIn}
                                </p>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                    <LogOut className="h-3 w-3 text-sky-600 shrink-0" />
                                    Out
                                </p>
                                <p className="mt-0.5 font-mono text-xs sm:text-base font-bold tabular-nums text-zinc-900">
                                    {checkOut}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                    Self attendance
                                </span>
                                <span className="text-[10px] text-zinc-400">Device GPS (geofence)</span>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                {(!todayAttendance || !todayAttendance.check_in) && (
                                    <Button
                                        type="button"
                                        className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-medium shadow-xs active:scale-95 transition-all"
                                        onClick={handleCheckIn}
                                        disabled={isSubmitting}
                                    >
                                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                                        {isSubmitting ? 'GPS...' : 'Check in'}
                                    </Button>
                                )}
                                {todayAttendance?.check_in && (
                                    <Button
                                        type="button"
                                        className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-medium shadow-xs active:scale-95 transition-all"
                                        onClick={handleCheckOut}
                                        disabled={isSubmitting}
                                    >
                                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                                        {isSubmitting ? 'GPS...' : 'Check out'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="grid grid-cols-1 gap-3 lg:col-span-8 lg:grid-cols-2">
                        <Card className="overflow-hidden border-zinc-200/90 shadow-xs">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                                            Recent attendance
                                        </CardTitle>
                                        <CardDescription className="text-[10px] text-zinc-500">Last 10 records</CardDescription>
                                    </div>
                                    <CalendarDays className="hidden h-3.5 w-3.5 text-zinc-400 sm:block" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {recentAttendance?.length ? (
                                    <ul className="divide-y divide-zinc-100">
                                        {recentAttendance.map((x, idx) => (
                                            <li
                                                key={`${x.date ?? idx}-${idx}`}
                                                className={cn(
                                                    'border-l-4 px-2.5 py-2 transition-colors hover:bg-zinc-50/80',
                                                    attendanceRowBorder(x.status),
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="text-xs font-semibold text-zinc-900">
                                                        {formatDay(x.date ?? null)}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-[9px] font-semibold uppercase py-0 px-1.5',
                                                            listStatusBadgeClass(x.status),
                                                        )}
                                                    >
                                                        {statusLabel(x.status)}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                                    <span className="font-medium text-zinc-700">In</span>{' '}
                                                    {formatClock(x.check_in ?? null)}
                                                    <span className="mx-1 text-zinc-300">·</span>
                                                    <span className="font-medium text-zinc-700">Out</span>{' '}
                                                    {formatClock(x.check_out ?? null)}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-3 py-6 text-center text-xs text-zinc-500">
                                        No attendance records found.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-zinc-200/90 shadow-xs">
                            <CardHeader className="border-b border-zinc-100 bg-indigo-50/40 px-3 py-2">
                                <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">Recent movements</CardTitle>
                                <CardDescription className="text-[10px] text-zinc-500">Open a request for details</CardDescription>
                            </CardHeader>
                            <CardContent className="p-2.5 sm:p-3">
                                {recentMovements?.length ? (
                                    <div className="space-y-1.5">
                                        {recentMovements.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={route('movements.show', x.id)}
                                                className="group flex items-center gap-2 rounded-lg border border-zinc-100 bg-white p-2 shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-2.5"
                                            >
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                    <Clock className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-zinc-900 group-hover:text-indigo-900">
                                                        {x.purpose?.trim() ? x.purpose : 'Movement'}
                                                    </p>
                                                    <p className="truncate text-[10px] text-zinc-500">
                                                        {x.from_datetime
                                                            ? format(parseISO(x.from_datetime), 'd MMM, h:mm a')
                                                            : ''}
                                                        {x.status ? ` · ${x.status}` : ''}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 group-hover:text-indigo-400" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-500">
                                        No movement records found.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4">
                        <Card className="border-zinc-200/90 shadow-xs lg:sticky lg:top-4">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                    <LayoutGrid className="h-3.5 w-3.5 text-zinc-500" />
                                    <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">Quick links</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-1.5 p-2 lg:grid-cols-1">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-between rounded-lg border-zinc-200 px-2.5 text-xs font-medium"
                                >
                                    <Link href={route('employee.dashboard')}>
                                        Full report
                                        <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-between rounded-lg border-zinc-200 px-2.5 text-xs font-medium"
                                >
                                    <Link href="/employee/movements?section=attendance-movement">
                                        My movements
                                        <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-between rounded-lg border-zinc-200 px-2.5 text-xs font-medium col-span-2 lg:col-span-1"
                                >
                                    <Link href="/employee/attendance?section=attendance-movement">
                                        PWA attendance
                                        <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
    );

    return (
        <>
            <GeofenceVerificationOverlay
                isOpen={!!actionType}
                locationStatus={locationStatus}
                locationProgress={locationProgress}
                locationPreview={locationPreview}
                attendanceError={attendanceError}
                onDismissError={handleDismissError}
                actionType={actionType}
            />
            {embedded ? (
                dashboardBody
            ) : (
                <Layout>
                    <Head title="My attendance & movements" />
                    <PageSurface className="max-w-7xl space-y-2.5 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                        {dashboardBody}
                    </PageSurface>
                </Layout>
            )}
        </>
    );
}

export default function AttendanceMovementEmployeeDashboard(props: AttendanceMovementEmployeeDashboardProps) {
    return <AttendanceMovementEmployeeDashboardView {...props} />;
}
