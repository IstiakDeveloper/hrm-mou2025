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
                        'overflow-hidden border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 shadow-sm',
                        'border-t-4',
                        topBorder,
                    )}
                >
                    <CardContent className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                    Attendance & movement · {format(new Date(), 'EEE d MMM yyyy')}
                                </p>
                                <h1 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                                    My overview
                                </h1>
                                <p className="mt-1 line-clamp-2 text-xs text-zinc-600 sm:text-sm">
                                    Today&apos;s punches and your latest records — same light theme as the rest of the
                                    app.
                                </p>
                                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-zinc-500">
                                    <UserRound className="inline h-3.5 w-3.5 text-zinc-400" />
                                    <span className="font-medium text-zinc-700">{auth?.user?.name ?? '—'}</span>
                                    <span className="text-zinc-300">·</span>
                                    <span className="truncate">{employee?.department?.name ?? 'Department'}</span>
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                                <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] sm:h-9 sm:px-3 sm:text-xs min-h-0">
                                    <Link href="/sections">Sections</Link>
                                </Button>
                                <Button asChild size="sm" className="h-7 px-2.5 text-[10px] sm:h-9 sm:px-3 sm:text-xs min-h-0 bg-indigo-600 hover:bg-indigo-700">
                                    <Link href="/movements/create?section=attendance-movement">
                                        <Plus className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                                        Movement
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                            <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Today</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold capitalize text-zinc-900">{todayStatus}</span>
                                    {todayAttendance?.status ? (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[10px] font-semibold capitalize',
                                                listStatusBadgeClass(todayAttendance.status),
                                            )}
                                        >
                                            {String(todayAttendance.status).replace(/_/g, ' ')}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                    <LogIn className="h-3 w-3 text-emerald-600" />
                                    In
                                </p>
                                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                                    {checkIn}
                                </p>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                    <LogOut className="h-3 w-3 text-sky-600" />
                                    Out
                                </p>
                                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                                    {checkOut}
                                </p>
                            </div>
                        </div>



                        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                    Self attendance
                                </span>
                                <span className="text-xs text-zinc-600">Uses your device location (geofence).</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(!todayAttendance || !todayAttendance.check_in) && (
                                    <Button
                                        type="button"
                                        className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 transition-all duration-200"
                                        onClick={handleCheckIn}
                                        disabled={isSubmitting}
                                    >
                                        <LogIn className="mr-2 h-4.5 w-4.5" />
                                        {isSubmitting ? 'Locking GPS...' : 'Check in'}
                                    </Button>
                                )}
                                {todayAttendance?.check_in && (
                                    <Button
                                        type="button"
                                        className="h-10 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold shadow-md shadow-rose-600/10 hover:shadow-lg hover:shadow-rose-600/20 active:scale-95 transition-all duration-200"
                                        onClick={handleCheckOut}
                                        disabled={isSubmitting}
                                    >
                                        <LogOut className="mr-2 h-4.5 w-4.5" />
                                        {isSubmitting ? 'Locking GPS...' : 'Check out'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="grid grid-cols-1 gap-4 lg:col-span-8 lg:grid-cols-2">
                        <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3 sm:px-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base font-semibold text-zinc-900">
                                            Recent attendance
                                        </CardTitle>
                                        <CardDescription className="text-xs">Last 10 records</CardDescription>
                                    </div>
                                    <CalendarDays className="hidden h-4 w-4 text-zinc-400 sm:block" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {recentAttendance?.length ? (
                                    <ul className="divide-y divide-zinc-100">
                                        {recentAttendance.map((x, idx) => (
                                            <li
                                                key={`${x.date ?? idx}-${idx}`}
                                                className={cn(
                                                    'border-l-4 px-3 py-3 transition-colors hover:bg-zinc-50/80 sm:px-4',
                                                    attendanceRowBorder(x.status),
                                                )}
                                            >
                                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                                    <p className="text-sm font-semibold text-zinc-900">
                                                        {formatDay(x.date ?? null)}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'w-fit text-[10px] font-semibold capitalize',
                                                            listStatusBadgeClass(x.status),
                                                        )}
                                                    >
                                                        {statusLabel(x.status)}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-zinc-600">
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
                                    <div className="px-4 py-10 text-center text-sm text-zinc-600">
                                        No attendance rows yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 bg-indigo-50/40 px-4 py-3 sm:px-5">
                                <CardTitle className="text-base font-semibold text-zinc-900">Recent movements</CardTitle>
                                <CardDescription className="text-xs">Open a request for details</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4">
                                {recentMovements?.length ? (
                                    <div className="space-y-1.5">
                                        {recentMovements.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={route('movements.show', x.id)}
                                                className="group flex min-h-[44px] items-center gap-2.5 rounded-lg border border-zinc-100 bg-white p-2.5 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 sm:gap-3 sm:p-3"
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                    <Clock className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-900">
                                                        {x.purpose?.trim() ? x.purpose : 'Movement'}
                                                    </p>
                                                    <p className="truncate text-[11px] text-zinc-500">
                                                        {x.from_datetime
                                                            ? format(parseISO(x.from_datetime), 'd MMM, h:mm a')
                                                            : ''}
                                                        {x.status ? ` · ${x.status}` : ''}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-indigo-400" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-600">
                                        No movements in this list.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4">
                        <Card className="border-zinc-200/90 shadow-sm lg:sticky lg:top-4">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-zinc-500" />
                                    <CardTitle className="text-sm font-semibold text-zinc-900">Quick links</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-1.5 p-3">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-10 justify-between rounded-lg border-zinc-200 px-3 text-xs font-medium"
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
                                    className="h-10 justify-between rounded-lg border-zinc-200 px-3 text-xs font-medium"
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
                                    className="h-10 justify-between rounded-lg border-zinc-200 px-3 text-xs font-medium"
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
                    <PageSurface className="px-3 sm:px-4">{dashboardBody}</PageSurface>
                </Layout>
            )}
        </>
    );
}

export default function AttendanceMovementEmployeeDashboard(props: AttendanceMovementEmployeeDashboardProps) {
    return <AttendanceMovementEmployeeDashboardView {...props} />;
}
