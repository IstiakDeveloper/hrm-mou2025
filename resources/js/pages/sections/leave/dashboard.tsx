import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileText,
    Layers,
    LayoutDashboard,
    ListChecks,
    Settings2,
    User,
    Wallet,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveEmployeeDashboardView, type LeaveEmployeeDashboardProps } from '@/pages/sections/leave/employee-dashboard';

type LeaveApplication = {
    id: number;
    employee: EmployeeNameFields;
    leave_type?: { name: string };
    leaveType?: { name: string };
    start_date: string;
    end_date: string;
    status: string;
};

type Props = {
    leaveStats: { pending: number; approved: number; todayOnLeave: number };
    recentLeaves: LeaveApplication[];
    userRole: string;
    showEmployeeTab?: boolean;
    employeeDashboard?: LeaveEmployeeDashboardProps | null;
};

function leaveTypeLabel(x: LeaveApplication): string {
    return x.leave_type?.name ?? x.leaveType?.name ?? '—';
}

/* ── KPI STAT CARD ─────────────────────────────────────────────────────── */
function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
    accent,
}: {
    label: string;
    value: number;
    sub?: string;
    href?: string;
    icon: LucideIcon;
    accent: 'emerald' | 'amber' | 'sky' | 'rose';
}) {
    const colors = {
        emerald: {
            iconBg: 'bg-emerald-100 text-emerald-700',
            bar: 'bg-emerald-500',
            arrow: 'group-hover:text-emerald-600',
            val: 'text-emerald-700',
        },
        amber: {
            iconBg: 'bg-amber-100 text-amber-700',
            bar: 'bg-amber-400',
            arrow: 'group-hover:text-amber-600',
            val: 'text-amber-700',
        },
        sky: {
            iconBg: 'bg-sky-100 text-sky-700',
            bar: 'bg-sky-400',
            arrow: 'group-hover:text-sky-600',
            val: 'text-sky-700',
        },
        rose: {
            iconBg: 'bg-rose-100 text-rose-700',
            bar: 'bg-rose-400',
            arrow: 'group-hover:text-rose-600',
            val: 'text-rose-700',
        },
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-all duration-150 hover:shadow-md hover:border-slate-300',
                href && 'cursor-pointer',
            )}
        >
            {/* accent bar left */}
            <div className={cn('absolute left-0 top-0 h-full w-[3px] rounded-l-lg', colors.bar)} />

            <div className="flex items-center justify-between pl-1">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', colors.iconBg)}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                {href && (
                    <ArrowUpRight className={cn('h-3.5 w-3.5 text-slate-300 transition-colors', colors.arrow)} />
                )}
            </div>

            <div className="pl-1">
                <p className={cn('text-xl font-bold tabular-nums leading-none', colors.val)}>
                    {Number(value || 0).toLocaleString()}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
                {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                {inner}
            </Link>
        );
    }
    return inner;
}

/* ── QUICK ACTION TILE ─────────────────────────────────────────────────── */
function QuickTile({ href, title, icon: Icon }: { href: string; title: string; icon: LucideIcon }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800"
        >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 group-hover:bg-emerald-200">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">{title}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-emerald-500" />
        </Link>
    );
}

/* ── STATUS BADGE ──────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
    const s = (status ?? '').toLowerCase();
    const cls: Record<string, string> = {
        pending:   'bg-amber-50 text-amber-700 ring-amber-300/60',
        approved:  'bg-emerald-50 text-emerald-700 ring-emerald-300/60',
        rejected:  'bg-rose-50 text-rose-700 ring-rose-300/60',
        cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
    };
    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset', cls[s] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>
            {status}
        </span>
    );
}

/* ── SECTION LABEL ─────────────────────────────────────────────────────── */
function SLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-2 flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</span>
        </div>
    );
}

/* ── ADMIN BODY ────────────────────────────────────────────────────────── */
function LeaveAdminBody({ leaveStats, recentLeaves, hasPermission }: Props & { hasPermission: (p?: string) => boolean }) {
    return (
        <div className="space-y-5">
            {/* KPI */}
            <section>
                <SLabel>Overview</SLabel>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <KpiCard
                        label="Pending Approvals"
                        value={leaveStats.pending}
                        href="/leave/applications?section=leave&status=pending"
                        icon={Clock}
                        accent="amber"
                        sub="Awaiting action"
                    />
                    <KpiCard
                        label="Approved (Month)"
                        value={leaveStats.approved}
                        href="/leave/applications?section=leave"
                        icon={CheckCircle2}
                        accent="emerald"
                        sub="Calendar month"
                    />
                    <KpiCard
                        label="On Leave Today"
                        value={leaveStats.todayOnLeave}
                        href="/leave/applications?section=leave"
                        icon={CalendarDays}
                        accent="sky"
                        sub="Active absences"
                    />
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <SLabel>Quick Actions</SLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {hasPermission('leave-applications.view') && (
                        <QuickTile href="/leave/applications?section=leave" title="Applications" icon={FileText} />
                    )}
                    {hasPermission('leave-balances.view') && (
                        <QuickTile href="/leave/balances?section=leave" title="Balances" icon={Wallet} />
                    )}
                    {hasPermission('leave-types.view') && (
                        <>
                            <QuickTile href="/leave/types?section=leave" title="Leave Types" icon={Layers} />
                            <QuickTile href="/leave/settings?section=leave" title="Approval Settings" icon={Settings2} />
                        </>
                    )}
                    {hasPermission('leave-balances.admin') && (
                        <QuickTile href="/leave/balances/allocate-bulk?section=leave" title="Bulk Allocate" icon={ListChecks} />
                    )}
                    {hasPermission('reports.view') && (
                        <QuickTile href="/leave/applications/report?section=leave" title="Leave Report" icon={BarChart3} />
                    )}
                </div>
            </section>

            {/* Recent Applications */}
            <section>
                <div className="mb-2 flex items-center justify-between">
                    <SLabel>Recent Applications</SLabel>
                    {hasPermission('leave-applications.view') && (
                        <Link
                            href="/leave/applications?section=leave"
                            className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"
                        >
                            View all <ArrowUpRight className="h-2.5 w-2.5" />
                        </Link>
                    )}
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    {recentLeaves?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                                        <th className="hidden px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Type</th>
                                        <th className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dates</th>
                                        <th className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="w-8 px-2.5 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentLeaves.map((x) => (
                                        <tr key={x.id} className="group transition-colors hover:bg-emerald-50/30">
                                            <td className="px-3 py-2">
                                                <Link
                                                    href={`/leave/applications/${x.id}?section=leave`}
                                                    className="text-xs font-medium text-slate-800 hover:text-emerald-700 transition-colors"
                                                >
                                                    {employeeDisplayName(x.employee)}
                                                </Link>
                                                <p className="truncate text-[10px] text-slate-400 sm:hidden">{leaveTypeLabel(x)}</p>
                                            </td>
                                            <td className="hidden max-w-[130px] truncate px-2.5 py-2 text-[11px] text-slate-500 sm:table-cell">
                                                {leaveTypeLabel(x)}
                                            </td>
                                            <td className="whitespace-nowrap px-2.5 py-2 text-[11px] tabular-nums text-slate-500">
                                                {new Date(x.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                {' – '}
                                                {new Date(x.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-2.5 py-2">
                                                <StatusPill status={x.status} />
                                            </td>
                                            <td className="px-2.5 py-2">
                                                <Link href={`/leave/applications/${x.id}?section=leave`}>
                                                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:opacity-100 group-hover:text-emerald-500" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <FileText className="mb-2 h-7 w-7 text-slate-300" />
                            <p className="text-xs font-medium text-slate-400">No recent leave applications.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ── PAGE ROOT ─────────────────────────────────────────────────────────── */
export default function LeaveDashboard(props: Props) {
    const { auth, pendingLeaveCount } = usePage<SharedData>().props;
    const pendingLeave = (pendingLeaveCount as number) ?? props.leaveStats.pending;
    const { userRole, showEmployeeTab: showEmployeeTabProp, employeeDashboard } = props;
    const showEmployeeTab = Boolean(showEmployeeTabProp && employeeDashboard);
    const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>('admin');
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    return (
        <Layout>
            <Head title="Leave Dashboard" />

            <PageSurface className="max-w-7xl bg-slate-50/40 px-3 py-4 sm:px-4 sm:py-5">
                {/* Header */}
                <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
                            <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-slate-900">Leave Dashboard</h1>
                            <p className="text-[10px] text-slate-500">{userRole || 'User'} · {auth?.user?.name}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 hover:border-slate-300"
                        >
                            <Link href="/sections">← Sections</Link>
                        </Button>

                        {pendingLeave > 0 && hasPermission('leave-applications.view') && (
                            <Button
                                asChild
                                size="sm"
                                className="h-7 gap-1 bg-amber-500 px-2.5 text-[11px] font-semibold text-white shadow-sm hover:bg-amber-600"
                            >
                                <Link href="/leave/applications?section=leave&status=pending">
                                    <Clock className="h-3 w-3" />
                                    {pendingLeave > 99 ? '99+' : pendingLeave} Pending
                                </Link>
                            </Button>
                        )}

                        {hasPermission('leave-applications.create') && (
                            <Button
                                asChild
                                size="sm"
                                className="h-7 bg-emerald-600 px-2.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
                            >
                                <Link href="/leave/applications/create?section=leave">+ Apply Leave</Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs or direct body */}
                {showEmployeeTab ? (
                    <Tabs
                        value={dashboardMode}
                        onValueChange={(v) => setDashboardMode(v as 'admin' | 'employee')}
                        className="w-full"
                    >
                        <TabsList className="mb-4 h-8 w-fit gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            <TabsTrigger
                                value="admin"
                                className="h-7 min-w-[5.5rem] rounded-md px-3 text-[11px] font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                                Admin View
                            </TabsTrigger>
                            <TabsTrigger
                                value="employee"
                                className="h-7 min-w-[5.5rem] gap-1.5 rounded-md px-3 text-[11px] font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                                <User className="h-3 w-3" />
                                My Leave
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="employee" className="mt-0 outline-none">
                            {employeeDashboard ? <LeaveEmployeeDashboardView embedded {...employeeDashboard} /> : null}
                        </TabsContent>

                        <TabsContent value="admin" className="mt-0 outline-none">
                            <LeaveAdminBody {...props} hasPermission={hasPermission} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <LeaveAdminBody {...props} hasPermission={hasPermission} />
                )}
            </PageSurface>
        </Layout>
    );
}
