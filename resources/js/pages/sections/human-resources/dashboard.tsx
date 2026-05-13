import React, { useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeftRight,
    ArrowUpRight,
    Award,
    Building2,
    CheckCircle2,
    CircleHelp,
    Factory,
    FolderKanban,
    GitBranch,
    LayoutGrid,
    Layers,
    MapPinned,
    Palmtree,
    Tags,
    Umbrella,
    UserPlus,
    Users,
    UserX,
    UserCheck,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, isValid } from 'date-fns';

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
    employee: { first_name: string; last_name: string };
    from_branch?: { name: string };
    to_branch?: { name: string };
    fromBranch?: { name: string };
    toBranch?: { name: string };
    effective_date: string;
    status: string;
};

type RecentEmployeeRow = {
    id: number;
    first_name: string;
    last_name: string;
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

type Props = {
    stats: HrStats;
    organizationHierarchy: OrganizationHierarchy;
    recentEmployees?: RecentEmployeeRow[];
    transferStats: { pending: number; approved: number };
    recentTransfers: HrTransferRow[];
    userRole: string;
};

function num(n: number | undefined): number {
    return Number(n ?? 0);
}

const kpiGrid = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

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
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/15',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-500/10',
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex h-full min-h-[5rem] flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm',
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
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-600" />
                ) : null}
            </div>
            <p className="mt-2 pl-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="pl-1 text-xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-2xl">{value}</p>
            {sub ? <p className="mt-auto pl-1 pt-1 text-[10px] leading-tight text-zinc-500">{sub}</p> : null}
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
            className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/40 hover:text-emerald-900"
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

function formatShortDate(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = parseISO(iso);
        return isValid(d) ? format(d, 'd MMM yyyy') : '—';
    } catch {
        return '—';
    }
}

export default function HumanResourcesDashboard(props: Props) {
    const { auth } = usePage<SharedData>().props;
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);
    const s = props.stats;
    const zones = props.organizationHierarchy?.zones ?? [];
    const recentEmployees = (props.recentEmployees ?? []) as RecentEmployeeRow[];

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

    const structureLines = useMemo(() => {
        const list = props.organizationHierarchy?.zones ?? [];
        const lines: string[] = [];
        for (const z of list) {
            lines.push(`▸ ${z.name}${z.code ? ` (${z.code})` : ''}`);
            if (!z.regionalOffices.length) {
                lines.push(`   (no regional offices)`);
                continue;
            }
            for (const ro of z.regionalOffices) {
                lines.push(
                    `   └ ${ro.name} — ${ro.branchOperational} work + ${ro.branchHeadOffice} HO = ${ro.branchTotal}`,
                );
                for (const b of ro.branchesPreview) {
                    lines.push(`      · ${b.name}${b.isHeadOffice ? ' [HO]' : ''}`);
                }
                if (ro.branchesMoreCount > 0) {
                    lines.push(`      … +${ro.branchesMoreCount} more`);
                }
            }
        }
        return lines.join('\n');
    }, [props.organizationHierarchy]);

    const showStructure =
        zones.length > 0 &&
        (hasPermission('zones.view') || hasPermission('regional-offices.view') || hasPermission('branches.view'));

    const structureText = showStructure ? structureLines : '';

    const shortcutGrid = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

    const hrSummaryLines = useMemo(() => {
        const lines: string[] = [];
        if (hasPermission('employees.view') && totalEmp > 0) {
            lines.push(
                `${activeEmp.toLocaleString()} active of ${totalEmp.toLocaleString()} total employees${onLeaveEmp ? `; ${onLeaveEmp.toLocaleString()} currently on leave` : ''}.`,
            );
        }
        if (hasPermission('branches.view') && branchesOp > 0) {
            lines.push(`${branchesOp.toLocaleString()} operational branches in your scope (excluding head office where applicable).`);
        }
        if (hasPermission('transfers.view')) {
            const p = num(props.transferStats?.pending);
            if (p > 0) {
                lines.push(`${p} transfer request${p === 1 ? '' : 's'} awaiting attention.`);
            }
        }
        if (lines.length === 0) {
            lines.push('Use the metrics and shortcuts below to manage employees, structure, and transfers.');
        }
        return lines;
    }, [
        activeEmp,
        branchesOp,
        hasPermission,
        onLeaveEmp,
        props.transferStats?.pending,
        totalEmp,
    ]);

    return (
        <Layout>
            <Head title="Human Resources" />

            <PageSurface className="max-w-7xl py-4 md:py-5">
                {/* Header */}
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-white to-emerald-50/30 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700/80">Human resources</p>
                        <h1 className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">HR dashboard</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            {props.userRole || 'User'} · {auth?.user?.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 border-zinc-200 bg-white text-xs">
                            <Link href="/sections">Sections</Link>
                        </Button>
                        {hasPermission('employees.create') && (
                            <Button asChild size="sm" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700">
                                <Link href="/employees/create?section=human-resources">
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Add employee
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>


                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-3 h-9 w-fit min-w-0 gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
                        <TabsTrigger
                            value="overview"
                            className="h-8 min-w-[5.5rem] flex-none rounded-md px-3 text-xs data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="structure"
                            className="h-8 min-w-[5.5rem] flex-none rounded-md px-3 text-xs data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                        >
                            Structure
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-0 space-y-4 outline-none">
                        {hasPermission('employees.view') && (
                            <section>
                                <SectionLabel>Workforce</SectionLabel>
                                <div className={kpiGrid}>
                                    <KpiCard
                                        label="Total employees"
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
                                    <KpiCard label="On leave" value={onLeaveEmp.toLocaleString()} icon={Umbrella} accent="amber" />
                                    <KpiCard
                                        label="Inactive & terminated"
                                        value={inactiveTerminated.toLocaleString()}
                                        sub={`Inactive ${inactiveEmp.toLocaleString()} · Terminated ${terminatedEmp.toLocaleString()}`}
                                        href="/employees?section=human-resources"
                                        icon={UserX}
                                        accent="rose"
                                    />
                                    <KpiCard
                                        label="Transferred"
                                        value={transferredEmp.toLocaleString()}
                                        sub="New branch posting"
                                        href={hasPermission('transfers.view') ? '/transfers?section=human-resources' : undefined}
                                        icon={ArrowLeftRight}
                                        accent="sky"
                                    />
                                </div>
                            </section>
                        )}


                        {hasPermission('transfers.view') && (
                            <section>
                                <SectionLabel>Transfer requests</SectionLabel>
                                <div className={kpiGrid}>
                                    <KpiCard
                                        label="Pending"
                                        value={num(props.transferStats?.pending).toLocaleString()}
                                        href="/transfers?section=human-resources"
                                        icon={ArrowLeftRight}
                                        accent="violet"
                                    />
                                    <KpiCard
                                        label="Approved (month)"
                                        value={num(props.transferStats?.approved).toLocaleString()}
                                        sub="This calendar month"
                                        href="/transfers?section=human-resources"
                                        icon={CheckCircle2}
                                        accent="zinc"
                                    />
                                </div>
                                {props.recentTransfers?.length ? (
                                    <Card className="mt-3 border-zinc-200/90 shadow-sm">
                                        <CardHeader className="border-b border-zinc-100 py-3">
                                            <CardTitle className="text-sm font-semibold text-zinc-900">Recent transfers</CardTitle>
                                            <CardDescription className="text-xs text-zinc-500">
                                                Branch posting changes
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase tracking-wide text-zinc-500">
                                                            <th className="px-3 py-2 font-medium">Employee</th>
                                                            <th className="hidden px-2 py-2 font-medium md:table-cell">Route</th>
                                                            <th className="px-2 py-2 font-medium">Effective</th>
                                                            <th className="px-2 py-2 font-medium">Status</th>
                                                            <th className="w-8 px-2 py-2" />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {props.recentTransfers.map((x) => (
                                                            <tr key={x.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                                                                <td className="px-3 py-2">
                                                                    <Link
                                                                        href={`/transfers/${x.id}?section=human-resources`}
                                                                        className="font-medium text-zinc-900 hover:text-emerald-700"
                                                                    >
                                                                        {x.employee.first_name} {x.employee.last_name}
                                                                    </Link>
                                                                    <p className="truncate text-[10px] text-zinc-500 md:hidden">
                                                                        {transferFromName(x)} → {transferToName(x)}
                                                                    </p>
                                                                </td>
                                                                <td className="hidden max-w-[200px] truncate px-2 py-2 text-zinc-600 md:table-cell">
                                                                    {transferFromName(x)} → {transferToName(x)}
                                                                </td>
                                                                <td className="whitespace-nowrap px-2 py-2 tabular-nums text-zinc-600">
                                                                    {new Date(x.effective_date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                                        {x.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <Link href={`/transfers/${x.id}?section=human-resources`}>
                                                                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 hover:text-emerald-600" />
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </section>
                        )}

                        <section>
                            <SectionLabel>Organization</SectionLabel>
                            <div className={kpiGrid}>
                                {hasPermission('zones.view') && (
                                    <KpiCard
                                        label="Zones"
                                        value={num(s.totalZones).toLocaleString()}
                                        href="/zones?section=human-resources"
                                        icon={LayoutGrid}
                                        accent="violet"
                                    />
                                )}
                                {hasPermission('regional-offices.view') && (
                                    <KpiCard
                                        label="Regional offices"
                                        value={num(s.totalRegionalOffices).toLocaleString()}
                                        href="/regional-offices?section=human-resources"
                                        icon={MapPinned}
                                        accent="violet"
                                    />
                                )}
                                {hasPermission('branches.view') && (
                                    <KpiCard
                                        label="Work branches"
                                        value={branchesOp.toLocaleString()}
                                        sub="Excludes head office"
                                        href="/branches?section=human-resources"
                                        icon={Building2}
                                        accent="sky"
                                    />
                                )}
                                {hasPermission('departments.view') && (
                                    <KpiCard
                                        label="Departments"
                                        value={num(s.totalDepartments).toLocaleString()}
                                        href="/departments?section=human-resources"
                                        icon={Factory}
                                        accent="zinc"
                                    />
                                )}
                                {hasPermission('designations.view') && (
                                    <KpiCard
                                        label="Designations"
                                        value={num(s.totalDesignations).toLocaleString()}
                                        href="/designations?section=human-resources"
                                        icon={Award}
                                        accent="zinc"
                                    />
                                )}
                            </div>
                        </section>

                        <section>
                            <SectionLabel>Quick actions</SectionLabel>
                            <div className={shortcutGrid}>
                                {hasPermission('employees.view') && (
                                    <ShortcutTile href="/employees?section=human-resources" title="Employee directory" icon={Users} />
                                )}
                                <ShortcutTile href="/holidays?section=human-resources" title="Holidays" icon={Palmtree} />
                                {hasPermission('employees.view') && (
                                    <ShortcutTile href="/organization-chart?section=human-resources" title="Org chart" icon={GitBranch} />
                                )}
                                {hasPermission('branches.view') && (
                                    <ShortcutTile href="/branches?section=human-resources" title="Branches" icon={Building2} />
                                )}
                                {hasPermission('departments.view') && (
                                    <>
                                        <ShortcutTile href="/employee-types?section=human-resources" title="Employee types" icon={Tags} />
                                        <ShortcutTile href="/programs?section=human-resources" title="Programs" icon={Layers} />
                                        <ShortcutTile href="/projects?section=human-resources" title="Projects" icon={FolderKanban} />
                                    </>
                                )}
                                {hasPermission('transfers.view') && (
                                    <ShortcutTile href="/transfers?section=human-resources" title="Transfers" icon={ArrowLeftRight} />
                                )}
                            </div>
                        </section>
                    </TabsContent>

                    <TabsContent value="structure" className="mt-0 outline-none">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Zone → Regional office → Branch</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">HO = head office.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[min(16rem,45vh)] w-full">
                                    <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-zinc-800">
                                        {structureText || 'No hierarchy (permissions or empty setup).'}
                                    </pre>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {showStructure && zones.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {zones.map((z) => {
                                    const roCount = z.regionalOffices.length;
                                    const branchCount = z.regionalOffices.reduce((a, ro) => a + ro.branchTotal, 0);
                                    return (
                                        <div
                                            key={z.id}
                                            className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm"
                                        >
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Zone</p>
                                            <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">{z.name}</p>
                                            <p className="mt-2 text-[11px] text-zinc-600">
                                                {roCount} regional · {branchCount} branches
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </PageSurface>
        </Layout>
    );
}
