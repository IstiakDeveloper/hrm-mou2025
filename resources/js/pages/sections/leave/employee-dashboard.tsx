import React, { useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ArrowUpRight,
    CalendarHeart,
    ChevronRight,
    Leaf,
    PiggyBank,
    Plus,
    Sparkles,
    TreePine,
    UserRound,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

type LeaveBalanceRow = {
    id: number;
    year: number;
    allocated_days?: number | string | null;
    used_days?: number | string | null;
    remaining_days?: number | string | null;
    leave_type: {
        id: number;
        name: string;
        days_allowed?: number;
        is_paid?: boolean;
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

type EmployeeLite = {
    id: number;
    department?: { name?: string } | null;
};

export type LeaveEmployeeDashboardProps = {
    employee: EmployeeLite;
    leaveBalances: LeaveBalanceRow[];
    recentLeaves: LeaveApplication[];
};

type LeaveEmployeeDashboardViewProps = LeaveEmployeeDashboardProps & {
    embedded?: boolean;
};

function num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function formatRange(start: string, end: string): string {
    try {
        const a = parseISO(start);
        const b = parseISO(end);
        if (!isValid(a) || !isValid(b)) return `${start} – ${end}`;
        return `${format(a, 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`;
    } catch {
        return `${start} – ${end}`;
    }
}

function applicationStatusClass(status: string): string {
    const s = String(status).toLowerCase();
    if (s === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (s === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-900';
    if (s === 'pending') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-zinc-200 bg-zinc-50 text-zinc-800';
}

export function LeaveEmployeeDashboardView({
    employee,
    leaveBalances,
    recentLeaves,
    embedded = false,
}: LeaveEmployeeDashboardViewProps) {
    const { auth } = usePage().props as { auth?: { user?: { name?: string } } };

    const totals = useMemo(() => {
        const rows = leaveBalances || [];
        const allocated = rows.reduce((sum, b) => sum + num(b.allocated_days), 0);
        const used = rows.reduce((sum, b) => sum + num(b.used_days), 0);
        const remaining = rows.reduce((sum, b) => sum + num(b.remaining_days), 0);
        return { allocated, used, remaining };
    }, [leaveBalances]);

    const usedPct = useMemo(() => {
        if (totals.allocated <= 0) return 0;
        return Math.min(100, Math.round((totals.used / totals.allocated) * 100));
    }, [totals.allocated, totals.used]);

    const sortedBalances = useMemo(() => {
        return [...(leaveBalances || [])].sort((a, b) =>
            String(a.leave_type?.name ?? '').localeCompare(String(b.leave_type?.name ?? '')),
        );
    }, [leaveBalances]);

    const dashboardBody = (
            <div className="space-y-3">
                <Card className="overflow-hidden border-zinc-200/90 border-t-4 border-t-emerald-500 bg-gradient-to-b from-white to-emerald-50/30 shadow-xs">
                    <CardContent className="space-y-3 p-2.5 sm:p-3.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                                    <Leaf className="h-3 w-3" />
                                    Leave · {new Date().getFullYear()}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900">
                                        My leave
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
                                <Button asChild size="sm" className="h-6.5 bg-emerald-600 px-2.5 text-[10px] font-medium text-white hover:bg-emerald-700">
                                    <Link href="/leave/applications/create?section=leave">
                                        <Plus className="mr-1 h-3 w-3" />
                                        Apply
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                        Allocated
                                    </p>
                                    <TreePine className="h-3 w-3 text-emerald-600 shrink-0" />
                                </div>
                                <p className="mt-0.5 font-mono text-base sm:text-xl font-bold tabular-nums text-zinc-900">
                                    {totals.allocated}
                                </p>
                                <p className="text-[9px] text-zinc-400 truncate">Total days</p>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Used</p>
                                    <PiggyBank className="h-3 w-3 text-amber-600 shrink-0" />
                                </div>
                                <p className="mt-0.5 font-mono text-base sm:text-xl font-bold tabular-nums text-zinc-900">{totals.used}</p>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-100">
                                    <div
                                        className="h-full rounded-full bg-emerald-500/80"
                                        style={{ width: `${usedPct}%` }}
                                    />
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-3 shadow-xs">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                        Remaining
                                    </p>
                                    <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
                                </div>
                                <p className="mt-0.5 font-mono text-base sm:text-xl font-bold tabular-nums text-emerald-700">
                                    {totals.remaining}
                                </p>
                                <p className="text-[9px] text-zinc-400 truncate">Available</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {sortedBalances.length > 0 && (
                    <Card className="overflow-hidden border-zinc-200/90 shadow-xs">
                        <CardHeader className="border-b border-zinc-100 bg-emerald-50/50 px-3 py-2 sm:px-4">
                            <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">By leave type</CardTitle>
                            <CardDescription className="text-[10px] text-zinc-500">Remaining / allocated · used %</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 min-[640px]:grid-cols-3 gap-2 p-2.5 sm:p-3.5">
                            {sortedBalances.map((b) => {
                                const alloc = num(b.allocated_days);
                                const used = num(b.used_days);
                                const pct = alloc > 0 ? Math.min(100, (used / alloc) * 100) : 0;
                                return (
                                    <div
                                        key={`${b.leave_type?.id ?? 'lt'}-${b.year}`}
                                        className="rounded-lg border border-zinc-100 bg-white p-2 sm:p-2.5 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-zinc-900">
                                                    {b.leave_type?.name ?? 'Leave'}
                                                </p>
                                                <p className="text-[9px] text-zinc-400">
                                                    {b.leave_type?.is_paid ? 'Paid' : 'Unpaid'} · {b.year}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-900 ring-1 ring-emerald-100">
                                                {num(b.remaining_days)}
                                                <span className="font-normal text-emerald-600">/{alloc}</span>
                                            </span>
                                        </div>
                                        <div className="mt-1.5 space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-zinc-500">
                                                <span>Used {used}d</span>
                                                <span>{Math.round(pct)}%</span>
                                            </div>
                                            <Progress value={pct} className="h-1 bg-zinc-100" />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <Card className="overflow-hidden border-zinc-200/90 shadow-xs">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-2 sm:px-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                                            Recent applications
                                        </CardTitle>
                                        <CardDescription className="text-[10px] text-zinc-500">Tap to view application details</CardDescription>
                                    </div>
                                    <CalendarHeart className="hidden h-4 w-4 text-emerald-600 sm:block" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-2.5 sm:p-3">
                                {recentLeaves?.length ? (
                                    <div className="space-y-1.5">
                                        {recentLeaves.map((x) => (
                                            <Link
                                                key={x.id}
                                                href={`/leave/applications/${x.id}?section=leave`}
                                                className="group flex items-center gap-2 rounded-lg border border-zinc-100 bg-white p-2 shadow-xs transition-colors hover:border-emerald-200 hover:bg-emerald-50/20 sm:p-2.5"
                                            >
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                                    <CalendarHeart className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-zinc-900 group-hover:text-emerald-900">
                                                        {x.leave_type?.name ?? 'Leave'}
                                                    </p>
                                                    <p className="truncate text-[10px] text-zinc-500">
                                                        {formatRange(x.start_date, x.end_date)}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'shrink-0 text-[9px] font-semibold uppercase',
                                                        applicationStatusClass(x.status),
                                                    )}
                                                >
                                                    {x.status}
                                                </Badge>
                                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 group-hover:text-emerald-500" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-500">
                                        No applications found.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4">
                        <Card className="border-zinc-200/90 shadow-xs lg:sticky lg:top-4">
                            <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                                <CardTitle className="text-xs font-bold tracking-wider text-zinc-900 uppercase">Quick links</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-1.5 p-2 lg:grid-cols-1">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-between rounded-lg border-zinc-200 px-2.5 text-xs font-medium"
                                >
                                    <Link href="/leave/applications?section=leave">
                                        Applications
                                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-between rounded-lg border-zinc-200 px-2.5 text-xs font-medium"
                                >
                                    <Link href="/employee/leaves?section=leave">
                                        Balance
                                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
    );

    if (embedded) {
        return dashboardBody;
    }

    return (
        <Layout>
            <Head title="My leave" />
            <PageSurface className="max-w-7xl space-y-2.5 px-1.5 py-1.5 sm:px-3 sm:py-2.5">{dashboardBody}</PageSurface>
        </Layout>
    );
}

export default function LeaveEmployeeDashboard(props: LeaveEmployeeDashboardProps) {
    return <LeaveEmployeeDashboardView {...props} />;
}
