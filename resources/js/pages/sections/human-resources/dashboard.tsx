import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/layouts/AdminLayout';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { hasAppPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { EmployeeDashboardView, type EmployeeDashboardProps } from '@/pages/employee-dashboard';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeftRight,
    ArrowUpRight,
    Award,
    Building2,
    Factory,
    FolderKanban,
    GitBranch,
    Layers,
    LayoutGrid,
    MapPinned,
    Palmtree,
    Tags,
    Umbrella,
    User,
    UserCheck,
    UserPlus,
    Users,
    UserX,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type BranchPreview = { id: number; name: string; isHeadOffice: boolean };

type RegionalOfficeNode = {
    id: number;
    name: string;
    branchTotal: number;
    branchOperational: number;
    branchHeadOffice: number;
    branchesPreview: BranchPreview[];
    branchesMoreCount: number;
};

type ZoneNode = {
    id: number;
    name: string;
    code?: string | null;
    regionalOffices: RegionalOfficeNode[];
};

type OrganizationHierarchy = {
    zones: ZoneNode[];
};

type HrTransferRow = {
    id: number;
    employee: EmployeeNameFields;
    from_branch?: { name: string };
    to_branch?: { name: string };
    fromBranch?: { name: string };
    toBranch?: { name: string };
    effective_date: string;
    status: string;
};

type RecentEmployeeRow = EmployeeNameFields & {
    id: number;
    employee_id: string;
    department?: string;
    branch?: string;
    joining_date?: string | null;
    created_at?: string | null;
};

type HrStats = {
    totalEmployees: number;
    totalBranches: number;
    totalDepartments: number;
    totalDesignations: number;
    totalZones: number;
    totalRegionalOffices: number;
    branchesTotal?: number;
    branchesOperational?: number;
    branchesHeadOffice?: number;
    employeeActive?: number;
    employeeTerminated?: number;
    employeeInactive?: number;
    employeeOnLeave?: number;
    employeesNonActive?: number;
    employeesTransferredPosting?: number;
};

type WorkforceBreakdown = {
    coreActive: number;
    projectActiveTotal: number;
    projectCounts: { id: number; name: string; activeEmployees: number }[];
};

type Props = {
    stats: HrStats;
    workforce?: WorkforceBreakdown;
    organizationHierarchy: OrganizationHierarchy;
    recentEmployees?: RecentEmployeeRow[];
    transferStats: { pending: number; approved: number };
    recentTransfers: HrTransferRow[];
    userRole: string;
    showEmployeeTab?: boolean;
    employeeDashboard?: EmployeeDashboardProps | null;
};

function num(n: number | undefined): number {
    return Number(n ?? 0);
}

function pct(part: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((part / total) * 100);
}

function formatShortDate(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = parseISO(iso);
        return isValid(d) ? format(d, 'd MMM yyyy') : '—';
    } catch {
        return '—';
    }
}

/* ==========================================
   Helper UI Components (Optimized & Compact)
   ========================================== */

function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
    accent = 'zinc',
}: {
    label: string;
    value: number | string;
    sub?: string;
    href?: string;
    icon: LucideIcon;
    accent?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'zinc';
}) {
    const accentBar = {
        emerald: 'from-emerald-500 to-teal-500',
        sky: 'from-sky-500 to-blue-500',
        amber: 'from-amber-500 to-orange-400',
        rose: 'from-rose-500 to-red-500',
        violet: 'from-violet-500 to-purple-500',
        zinc: 'from-zinc-400 to-zinc-500',
    }[accent];

    const iconBg = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-amber-650/15',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        zinc: 'bg-zinc-100 text-zinc-650 ring-zinc-500/10',
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-sm',
                'transition-all duration-250 hover:border-zinc-300 hover:shadow-md',
                href && 'cursor-pointer',
            )}
        >
            <div className={cn('absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b', accentBar)} />
            <div className={cn('flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', iconBg)}>
                <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 pl-0.5">
                <p className="mb-0.5 truncate text-[9px] leading-none font-bold tracking-wider text-zinc-500 uppercase">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-base leading-tight font-extrabold tracking-tight text-zinc-900 tabular-nums">{value}</span>
                    {sub && <span className="hidden truncate text-[9px] text-zinc-400 xl:inline">({sub})</span>}
                </div>
                {sub && <p className="mt-0.5 truncate text-[9px] leading-none text-zinc-400 xl:hidden">{sub}</p>}
            </div>
            {href && <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 self-start text-zinc-300 transition-colors group-hover:text-emerald-600" />}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
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
            className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all duration-150 hover:border-emerald-200 hover:bg-emerald-50/25 hover:text-emerald-950"
        >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-100/70 text-zinc-500 ring-1 ring-zinc-200/50">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate leading-none">{title}</span>
            <ArrowUpRight className="text-zinc-350 h-3 w-3 shrink-0" />
        </Link>
    );
}

function WorkforceCompositionPanel({
    coreActive,
    projectActiveTotal,
    projectCounts,
    activeTotal,
    employeesHref,
}: {
    coreActive: number;
    projectActiveTotal: number;
    projectCounts: { id: number; name: string; activeEmployees: number }[];
    activeTotal: number;
    employeesHref?: string;
}) {
    const compositionTotal = coreActive + projectActiveTotal;
    const corePct = pct(coreActive, compositionTotal);
    const projectPct = pct(projectActiveTotal, compositionTotal);

    const projectRows = useMemo(() => [...projectCounts].sort((a, b) => num(b.activeEmployees) - num(a.activeEmployees)), [projectCounts]);
    const maxProjectCount = projectRows.length ? Math.max(...projectRows.map((p) => num(p.activeEmployees))) : 0;

    return (
        <Card className="border-zinc-200/90 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                <div>
                    <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Workforce Breakdown</CardTitle>
                    <CardDescription className="text-[10px] text-zinc-500">Core vs. project active headcounts</CardDescription>
                </div>
                {employeesHref && (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50/50 hover:text-emerald-800"
                    >
                        <Link href={employeesHref} className="inline-flex items-center gap-0.5">
                            Directory
                            <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-3.5 md:grid-cols-12">
                {/* Core Employees */}
                <div className="flex flex-col justify-between border-zinc-100 pr-0 md:col-span-4 md:border-r md:pr-4">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-950">Core Employees</span>
                            {compositionTotal > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-55 h-4 rounded-md border-emerald-100 bg-emerald-50 px-1.5 py-0 text-[9px] font-bold text-emerald-800"
                                >
                                    {corePct}%
                                </Badge>
                            )}
                        </div>
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="leading-none">
                                <span className="text-base font-extrabold text-zinc-900 tabular-nums">{coreActive.toLocaleString()}</span>
                                <span className="mt-0.5 block text-[9px] text-zinc-400">Permanent headcount</span>
                            </div>
                        </div>
                    </div>
                    {compositionTotal > 0 && (
                        <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${corePct}%` }} />
                            </div>
                            <span className="block text-[9px] text-zinc-400">Share of total active workforce</span>
                        </div>
                    )}
                </div>

                {/* Project Employees */}
                <div className="flex flex-col justify-between border-zinc-100 pr-0 md:col-span-4 md:border-r md:pr-4">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-950">Project Staff</span>
                            {compositionTotal > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="h-4 rounded-md border-sky-100 bg-sky-50 px-1.5 py-0 text-[9px] font-bold text-sky-800"
                                >
                                    {projectPct}%
                                </Badge>
                            )}
                        </div>
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-600/10">
                                <FolderKanban className="h-4 w-4" />
                            </div>
                            <div className="leading-none">
                                <span className="text-base font-extrabold text-zinc-900 tabular-nums">{projectActiveTotal.toLocaleString()}</span>
                                <span className="mt-0.5 block text-[9px] text-zinc-400">Active project assignments</span>
                            </div>
                        </div>
                    </div>
                    {compositionTotal > 0 && (
                        <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${projectPct}%` }} />
                            </div>
                            <span className="block text-[9px] text-zinc-400">Share of total active workforce</span>
                        </div>
                    )}
                </div>

                {/* Active Projects Scroll */}
                <div className="flex flex-col justify-between md:col-span-4">
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-950">Active Projects</span>
                            <span className="text-[10px] font-medium text-zinc-400">({projectRows.length})</span>
                        </div>
                        <ScrollArea className="h-[76px] pr-2">
                            {projectRows.length ? (
                                <div className="space-y-1.5">
                                    {projectRows.map((p) => {
                                        const count = num(p.activeEmployees);
                                        const widthPct = maxProjectCount > 0 ? Math.max(6, Math.round((count / maxProjectCount) * 100)) : 0;

                                        return (
                                            <div key={p.id} className="text-[11px] leading-tight">
                                                <div className="mb-0.5 flex items-center justify-between text-zinc-700">
                                                    <span className="max-w-[125px] truncate font-medium text-zinc-800" title={p.name}>
                                                        {p.name}
                                                    </span>
                                                    <span className="font-semibold text-zinc-900 tabular-nums">{count}</span>
                                                </div>
                                                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                                                        style={{ width: `${widthPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-4 text-center text-[10px] text-zinc-400 italic">No active project staff.</div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TransferRequestsCard({
    transferStats,
    recentTransfers,
    transferFromName,
    transferToName,
}: {
    transferStats: Props['transferStats'];
    recentTransfers: Props['recentTransfers'];
    transferFromName: (x: HrTransferRow) => string;
    transferToName: (x: HrTransferRow) => string;
}) {
    return (
        <Card className="border-zinc-200/90 shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Transfer Requests</CardTitle>
                    <CardDescription className="text-[10px] text-zinc-500">Recent branch posting changes</CardDescription>
                </div>

                {/* Inline Stats Ribbon */}
                <div className="flex gap-1.5">
                    <Link
                        href="/transfers?section=human-resources"
                        className="flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50/50 px-2 py-0.5 text-xs transition-colors hover:bg-violet-100/50"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        <span className="text-[10px] font-medium text-violet-800">Pending:</span>
                        <span className="text-[10px] font-bold text-violet-950 tabular-nums">{num(transferStats?.pending)}</span>
                    </Link>
                    <Link
                        href="/transfers?section=human-resources"
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs transition-colors hover:bg-zinc-100"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                        <span className="text-[10px] font-medium text-zinc-800">Approved:</span>
                        <span className="text-[10px] font-bold text-zinc-950 tabular-nums">{num(transferStats?.approved)}</span>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {recentTransfers?.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-left text-xs">
                            <thead>
                                <tr className="bg-zinc-55 border-b border-zinc-100 bg-zinc-50/55 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
                                    <th className="px-4 py-1.5">Employee</th>
                                    <th className="px-2 py-1.5">Route</th>
                                    <th className="px-2 py-1.5">Effective Date</th>
                                    <th className="px-2 py-1.5">Status</th>
                                    <th className="w-8 px-4 py-1.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {recentTransfers.map((x) => (
                                    <tr key={x.id} className="transition-colors hover:bg-zinc-50/40">
                                        <td className="px-4 py-1.5">
                                            <Link
                                                href={`/transfers/${x.id}?section=human-resources`}
                                                className="block text-[11px] font-medium text-zinc-900 transition-colors hover:text-emerald-700"
                                            >
                                                {employeeDisplayName(x.employee)}
                                            </Link>
                                            <p className="mt-0.5 truncate text-[9px] text-zinc-400 md:hidden">
                                                {transferFromName(x)} → {transferToName(x)}
                                            </p>
                                        </td>
                                        <td className="hidden max-w-[220px] truncate px-2 py-1.5 text-[11px] text-zinc-600 md:table-cell">
                                            {transferFromName(x)} <span className="font-mono text-zinc-400">→</span> {transferToName(x)}
                                        </td>
                                        <td className="px-2 py-1.5 text-[11px] whitespace-nowrap text-zinc-500 tabular-nums">
                                            {formatShortDate(x.effective_date)}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'rounded-md px-1.5 py-0 text-[9px] leading-relaxed font-semibold tracking-wider uppercase',
                                                    x.status.toLowerCase() === 'pending'
                                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                        : x.status.toLowerCase() === 'approved'
                                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                          : 'border-zinc-200 bg-zinc-50 text-zinc-700',
                                                )}
                                            >
                                                {x.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-1.5 text-right">
                                            <Link
                                                href={`/transfers/${x.id}?section=human-resources`}
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-emerald-600"
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
                    <div className="py-6 text-center text-xs text-zinc-400 italic">No recent transfer requests.</div>
                )}
            </CardContent>
        </Card>
    );
}

function OrganizationHubCard({
    stats,
    branchesOp,
    hasPermission,
}: {
    stats: HrStats;
    branchesOp: number;
    hasPermission: (permission?: string) => boolean;
}) {
    const s = stats;
    return (
        <Card className="border-zinc-200/90 shadow-sm">
            <CardHeader className="border-b border-zinc-100 px-4 py-2.5">
                <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Organization Hub</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500">Corporate hierarchy stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
                <div className="grid grid-cols-2 gap-2">
                    {hasPermission('zones.view') && (
                        <Link
                            href="/zones?section=human-resources"
                            className="group flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-emerald-100 hover:bg-emerald-50/30"
                        >
                            <span className="group-hover:text-emerald-705 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-600/10 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-[9px] leading-tight font-medium text-zinc-500">Zones</span>
                                <span className="text-xs font-bold text-zinc-950 tabular-nums">{num(s.totalZones)}</span>
                            </div>
                        </Link>
                    )}
                    {hasPermission('regional-offices.view') && (
                        <Link
                            href="/regional-offices?section=human-resources"
                            className="group flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-emerald-100 hover:bg-emerald-50/30"
                        >
                            <span className="group-hover:text-emerald-705 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-600/10 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                <MapPinned className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-[9px] leading-tight font-medium text-zinc-500">Regions</span>
                                <span className="text-xs font-bold text-zinc-950 tabular-nums">{num(s.totalRegionalOffices)}</span>
                            </div>
                        </Link>
                    )}
                    {hasPermission('branches.view') && (
                        <Link
                            href="/branches?section=human-resources"
                            className="group col-span-2 flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-emerald-100 hover:bg-emerald-50/30"
                        >
                            <span className="group-hover:text-emerald-705 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-600/10 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                <Building2 className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-[9px] leading-tight font-medium text-zinc-500">Branches (Excl. Head Office)</span>
                                <span className="text-xs font-bold text-zinc-950 tabular-nums">{branchesOp}</span>
                            </div>
                        </Link>
                    )}
                    {hasPermission('departments.view') && (
                        <Link
                            href="/departments?section=human-resources"
                            className="group flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-emerald-100 hover:bg-emerald-50/30"
                        >
                            <span className="group-hover:text-emerald-705 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                <Factory className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-[9px] leading-tight font-medium text-zinc-500">Depts</span>
                                <span className="text-xs font-bold text-zinc-950 tabular-nums">{num(s.totalDepartments)}</span>
                            </div>
                        </Link>
                    )}
                    {hasPermission('designations.view') && (
                        <Link
                            href="/designations?section=human-resources"
                            className="group flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-emerald-100 hover:bg-emerald-50/30"
                        >
                            <span className="group-hover:text-emerald-705 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                <Award className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-[9px] leading-tight font-medium text-zinc-500">Roles</span>
                                <span className="text-xs font-bold text-zinc-950 tabular-nums">{num(s.totalDesignations)}</span>
                            </div>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function QuickActionsCard({ hasPermission }: { hasPermission: (permission?: string) => boolean }) {
    return (
        <Card className="border-zinc-200/90 shadow-sm">
            <CardHeader className="border-b border-zinc-100 px-4 py-2.5">
                <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Quick Actions</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500">Shortcut navigation directory</CardDescription>
            </CardHeader>
            <CardContent className="p-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                    {hasPermission('employees.view') && <ShortcutTile href="/employees?section=human-resources" title="Directory" icon={Users} />}
                    <ShortcutTile href="/holidays?section=human-resources" title="Holidays" icon={Palmtree} />
                    {hasPermission('employees.view') && (
                        <ShortcutTile href="/organization-chart?section=human-resources" title="Org Chart" icon={GitBranch} />
                    )}
                    {hasPermission('branches.view') && <ShortcutTile href="/branches?section=human-resources" title="Branches" icon={Building2} />}
                    {hasPermission('departments.view') && (
                        <>
                            <ShortcutTile href="/employee-types?section=human-resources" title="Emp Types" icon={Tags} />
                            <ShortcutTile href="/programs?section=human-resources" title="Programs" icon={Layers} />
                            <ShortcutTile href="/projects?section=human-resources" title="Projects" icon={FolderKanban} />
                        </>
                    )}
                    {hasPermission('transfers.view') && (
                        <ShortcutTile href="/transfers?section=human-resources" title="Transfers" icon={ArrowLeftRight} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/* ==========================================
   Main Dashboard Exports
   ========================================== */

export default function HumanResourcesDashboard(props: Props) {
    const { auth } = usePage<SharedData>().props;
    const showEmployeeTab = Boolean(props.showEmployeeTab && props.employeeDashboard);
    const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>('admin');
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth as any, permission);

    return (
        <Layout>
            <Head title="Human Resources" />

            <PageSurface className="max-w-7xl space-y-3 px-3 py-3 sm:px-4">
                {/* Compact Header */}
                <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold text-zinc-950">HR Dashboard</h1>
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] leading-none font-semibold text-emerald-800">
                                    {props.userRole || 'User'}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-zinc-500">
                                Signed in as <span className="font-semibold text-zinc-700">{auth?.user?.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Inline Mode Selector (Saves whole row compared to separate Tabs bar!) */}
                        {showEmployeeTab && (
                            <div className="flex rounded-lg bg-zinc-100 p-0.5 ring-1 ring-zinc-200/50">
                                <button
                                    onClick={() => setDashboardMode('admin')}
                                    className={cn(
                                        'h-6 rounded-md px-2.5 text-[10px] font-semibold transition-all',
                                        dashboardMode === 'admin' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                                    )}
                                >
                                    Admin View
                                </button>
                                <button
                                    onClick={() => setDashboardMode('employee')}
                                    className={cn(
                                        'flex h-6 items-center gap-1 rounded-md px-2.5 text-[10px] font-semibold transition-all',
                                        dashboardMode === 'employee' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                                    )}
                                >
                                    <User className="h-3 w-3" />
                                    My Profile
                                </button>
                            </div>
                        )}

                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 border-zinc-200 bg-white px-2.5 text-[10px] text-zinc-700 hover:bg-zinc-50"
                        >
                            <Link href="/sections">Sections</Link>
                        </Button>

                        {hasPermission('employees.create') && (
                            <Button asChild size="sm" className="h-7 bg-emerald-600 px-2.5 text-[10px] font-medium text-white hover:bg-emerald-700">
                                <Link href="/employees/create?section=human-resources">
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Employee
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Render mode switcher content */}
                {showEmployeeTab && dashboardMode === 'employee' ? (
                    props.employeeDashboard ? (
                        <div className="mt-1">
                            <EmployeeDashboardView embedded {...props.employeeDashboard} />
                        </div>
                    ) : null
                ) : (
                    <HrAdminDashboardBody {...props} hasPermission={hasPermission} />
                )}
            </PageSurface>
        </Layout>
    );
}

function HrAdminDashboardBody({
    stats,
    workforce,
    organizationHierarchy,
    recentEmployees: recentEmployeesProp,
    transferStats,
    recentTransfers,
    hasPermission,
}: Props & { hasPermission: (permission?: string) => boolean }) {
    const s = stats;
    const zones = organizationHierarchy?.zones ?? [];

    // Kept to avoid breakages in types if used
    const recentEmployees = (recentEmployeesProp ?? []) as RecentEmployeeRow[];

    const transferFromName = (x: HrTransferRow) => x.from_branch?.name ?? x.fromBranch?.name ?? '—';
    const transferToName = (x: HrTransferRow) => x.to_branch?.name ?? x.toBranch?.name ?? '—';

    const totalEmp = num(s.totalEmployees);
    const activeEmp = num(s.employeeActive);
    const terminatedEmp = num(s.employeeTerminated);
    const inactiveEmp = num(s.employeeInactive);
    const onLeaveEmp = num(s.employeeOnLeave);
    const transferredEmp = num(s.employeesTransferredPosting);
    const branchesOp = num(s.branchesOperational);
    const inactiveTerminated = inactiveEmp + terminatedEmp;

    const coreActive = num(workforce?.coreActive);
    const projectActiveTotal = num(workforce?.projectActiveTotal);
    const projectCounts = workforce?.projectCounts ?? [];

    const structureLines = useMemo(() => {
        const list = organizationHierarchy?.zones ?? [];
        const lines: string[] = [];
        for (const z of list) {
            lines.push(`▸ ${z.name}${z.code ? ` (${z.code})` : ''}`);
            if (!z.regionalOffices.length) {
                lines.push(`   (no regional offices)`);
                continue;
            }
            for (const ro of z.regionalOffices) {
                lines.push(`   └ ${ro.name} — ${ro.branchOperational} work + ${ro.branchHeadOffice} HO = ${ro.branchTotal}`);
                for (const b of ro.branchesPreview) {
                    lines.push(`      · ${b.name}${b.isHeadOffice ? ' [HO]' : ''}`);
                }
                if (ro.branchesMoreCount > 0) {
                    lines.push(`      … +${ro.branchesMoreCount} more`);
                }
            }
        }
        return lines.join('\n');
    }, [organizationHierarchy]);

    const showStructure =
        zones.length > 0 && (hasPermission('zones.view') || hasPermission('regional-offices.view') || hasPermission('branches.view'));

    const structureText = showStructure ? structureLines : '';

    return (
        <Tabs defaultValue="overview" className="w-full">
            {/* Extremely compact tab header */}
            <TabsList className="mb-3 h-8 w-fit min-w-0 gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 shadow-sm">
                <TabsTrigger
                    value="overview"
                    className="h-7 min-w-[5rem] rounded-md px-3 text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm"
                >
                    Overview
                </TabsTrigger>
                <TabsTrigger
                    value="structure"
                    className="h-7 min-w-[5rem] rounded-md px-3 text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm"
                >
                    Structure
                </TabsTrigger>
            </TabsList>

            {/* Overview Content (Full Width Stack) */}
            <TabsContent value="overview" className="mt-0 space-y-3.5 outline-none">
                {hasPermission('employees.view') && (
                    <div className="space-y-3.5">
                        {/* Top statistics bar (dense horizontal row) */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                            <KpiCard
                                label="Total Employees"
                                value={totalEmp.toLocaleString()}
                                href="/employees?section=human-resources"
                                icon={Users}
                                accent="emerald"
                            />
                            <KpiCard
                                label="Active"
                                value={activeEmp.toLocaleString()}
                                href="/employees?section=human-resources"
                                icon={UserCheck}
                                accent="emerald"
                            />
                            <KpiCard label="On Leave" value={onLeaveEmp.toLocaleString()} icon={Umbrella} accent="amber" />
                            <KpiCard
                                label="Inactive & Out"
                                value={inactiveTerminated.toLocaleString()}
                                sub={`Inactive ${inactiveEmp.toLocaleString()} · Terminated ${terminatedEmp.toLocaleString()}`}
                                href="/employees?section=human-resources"
                                icon={UserX}
                                accent="rose"
                            />
                            <KpiCard
                                label="Transferred"
                                value={transferredEmp.toLocaleString()}
                                sub="New branch postings"
                                href={hasPermission('transfers.view') ? '/transfers?section=human-resources' : undefined}
                                icon={ArrowLeftRight}
                                accent="sky"
                            />
                        </div>

                        <WorkforceCompositionPanel
                            coreActive={coreActive}
                            projectActiveTotal={projectActiveTotal}
                            projectCounts={projectCounts}
                            activeTotal={activeEmp}
                            employeesHref="/employees?section=human-resources"
                        />
                    </div>
                )}

                {hasPermission('transfers.view') && (
                    <TransferRequestsCard
                        transferStats={transferStats}
                        recentTransfers={recentTransfers}
                        transferFromName={transferFromName}
                        transferToName={transferToName}
                    />
                )}

                {/* Bottom Row (Organization Hub & Shortcuts side-by-side) */}
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    <OrganizationHubCard stats={s} branchesOp={branchesOp} hasPermission={hasPermission} />
                    <QuickActionsCard hasPermission={hasPermission} />
                </div>
            </TabsContent>

            {/* Structure Content (Full Width Stack) */}
            <TabsContent value="structure" className="mt-0 space-y-3.5 outline-none">
                {/* Monospace hierarchy visualization */}
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                        <div>
                            <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Hierarchy Structure Tree</CardTitle>
                            <CardDescription className="text-[10px] text-zinc-500">Corporate branch mapping hierarchy</CardDescription>
                        </div>
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            HO = Head Office
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[340px] w-full bg-zinc-950">
                            <pre className="p-4 font-mono text-[10px] leading-relaxed text-emerald-400/90 selection:bg-emerald-500/20 selection:text-emerald-300">
                                {structureText || 'No hierarchy layout loaded or insufficient permissions.'}
                            </pre>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Zone list card */}
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 px-4 py-2.5">
                        <CardTitle className="text-xs font-bold tracking-wider text-zinc-950 uppercase">Zones Listing</CardTitle>
                        <CardDescription className="text-[10px] text-zinc-500">Regional & branch distribution summary</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                        {showStructure && zones.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                                {zones.map((z) => {
                                    const roCount = z.regionalOffices.length;
                                    const branchCount = z.regionalOffices.reduce((a, ro) => a + ro.branchTotal, 0);
                                    return (
                                        <div
                                            key={z.id}
                                            className="hover:border-emerald-150 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 transition-all hover:border-emerald-200 hover:bg-emerald-50/15"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-xs font-bold text-zinc-900">{z.name}</p>
                                                {z.code && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-4 bg-zinc-200/80 px-1 py-0 text-[9px] font-semibold text-zinc-700"
                                                    >
                                                        {z.code}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[10px] leading-none text-zinc-500">
                                                {roCount} Regional {roCount === 1 ? 'Office' : 'Offices'} · {branchCount}{' '}
                                                {branchCount === 1 ? 'Branch' : 'Branches'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-xs text-zinc-400 italic">No zones to display.</div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
