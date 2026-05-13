import React from 'react';
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
    ListChecks,
    Settings2,
    Wallet,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LeaveApplication = {
    id: number;
    employee: { first_name: string; last_name: string };
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
};

const kpiGrid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
const shortcutGrid = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

function leaveTypeLabel(x: LeaveApplication): string {
    return x.leave_type?.name ?? x.leaveType?.name ?? '—';
}

function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
    accent = 'amber',
}: {
    label: string;
    value: number;
    sub?: string;
    href?: string;
    icon: LucideIcon;
    accent?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'zinc';
}) {
    const accentBar = {
        emerald: 'from-emerald-500 to-teal-500',
        sky: 'from-sky-500 to-blue-600',
        amber: 'from-amber-500 to-orange-500',
        rose: 'from-rose-500 to-red-500',
        violet: 'from-violet-500 to-purple-600',
        zinc: 'from-zinc-400 to-zinc-600',
    }[accent];

    const iconBg = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/15',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
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
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-amber-600" />
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
            <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40">
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
            className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-950"
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

export default function LeaveDashboard({ leaveStats, recentLeaves, userRole }: Props) {
    const { auth } = usePage<SharedData>().props;
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    return (
        <Layout>
            <Head title="Leave" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Leave</h1>
                        <p className="text-xs text-zinc-500">
                            {userRole || 'User'} · {auth?.user?.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 border-zinc-200 bg-white text-xs">
                            <Link href="/sections">Sections</Link>
                        </Button>
                        {hasPermission('leave-applications.create') && (
                            <Button asChild size="sm" className="h-8 bg-amber-600 text-xs text-white hover:bg-amber-700">
                                <Link href="/leave/applications/create?section=leave">Apply leave</Link>
                            </Button>
                        )}
                    </div>
                </div>

                <section className="mb-6">
                    <SectionLabel>Today &amp; pipeline</SectionLabel>
                    <div className={kpiGrid}>
                        <KpiCard
                            label="Pending"
                            value={leaveStats.pending}
                            href="/leave/applications?section=leave"
                            icon={Clock}
                            accent="amber"
                        />
                        <KpiCard
                            label="Approved (month)"
                            value={leaveStats.approved}
                            sub="This calendar month"
                            href="/leave/applications?section=leave"
                            icon={CheckCircle2}
                            accent="emerald"
                        />
                        <KpiCard
                            label="On leave today"
                            value={leaveStats.todayOnLeave}
                            href="/leave/applications?section=leave"
                            icon={CalendarDays}
                            accent="sky"
                        />
                    </div>
                </section>

                <section className="mb-6">
                    <SectionLabel>Quick actions</SectionLabel>
                    <div className={shortcutGrid}>
                        {hasPermission('leave-applications.view') && (
                            <ShortcutTile href="/leave/applications?section=leave" title="Applications" icon={FileText} />
                        )}
                        {hasPermission('leave-balances.view') && (
                            <ShortcutTile href="/leave/balances?section=leave" title="Balances" icon={Wallet} />
                        )}
                        {hasPermission('leave-types.view') && (
                            <>
                                <ShortcutTile href="/leave/types?section=leave" title="Leave types" icon={Layers} />
                                <ShortcutTile href="/leave/settings?section=leave" title="Approval settings" icon={Settings2} />
                            </>
                        )}
                        {hasPermission('leave-balances.admin') && (
                            <ShortcutTile href="/leave/balances/allocate-bulk?section=leave" title="Bulk allocate" icon={ListChecks} />
                        )}
                        {hasPermission('reports.view') && (
                            <ShortcutTile href="/leave/applications/report?section=leave" title="Leave report" icon={BarChart3} />
                        )}
                    </div>
                </section>

                <section>
                    <SectionLabel>Recent applications</SectionLabel>
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Latest requests</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Newest leave applications in your scope</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentLeaves?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase tracking-wide text-zinc-500">
                                                <th className="px-3 py-2 font-medium">Employee</th>
                                                <th className="hidden px-2 py-2 font-medium sm:table-cell">Type</th>
                                                <th className="px-2 py-2 font-medium">Dates</th>
                                                <th className="px-2 py-2 font-medium">Status</th>
                                                <th className="w-8 px-2 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentLeaves.map((x) => (
                                                <tr key={x.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                                                    <td className="px-3 py-2">
                                                        <Link
                                                            href={`/leave/applications/${x.id}?section=leave`}
                                                            className="font-medium text-zinc-900 hover:text-amber-700"
                                                        >
                                                            {x.employee.first_name} {x.employee.last_name}
                                                        </Link>
                                                        <p className="truncate text-[10px] text-zinc-500 sm:hidden">{leaveTypeLabel(x)}</p>
                                                    </td>
                                                    <td className="hidden max-w-[140px] truncate px-2 py-2 text-zinc-600 sm:table-cell">
                                                        {leaveTypeLabel(x)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-zinc-600">
                                                        {new Date(x.start_date).toLocaleDateString()} –{' '}
                                                        {new Date(x.end_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Badge variant="outline" className="text-[10px] font-normal">
                                                            {x.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Link href={`/leave/applications/${x.id}?section=leave`}>
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 hover:text-amber-600" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="px-4 py-8 text-center text-xs text-zinc-500">No recent leave applications.</p>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </PageSurface>
        </Layout>
    );
}
