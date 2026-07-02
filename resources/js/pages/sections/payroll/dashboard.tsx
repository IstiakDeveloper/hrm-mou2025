import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    Award,
    Banknote,
    BriefcaseBusiness,
    Building2,
    Calculator,
    Layers,
    ListOrdered,
    Pencil,
    Settings2,
    Wallet,
    FileBarChart2,
    HandCoins,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
    stats: {
        payscales: number;
        grades: number;
        steps: number;
        heads: number;
        structures: number;
        branchBanks: number;
        branchesUnmapped: number;
        processedRuns: number;
        postedRuns: number;
    };
    userRole: string;
};

const kpiGrid = 'grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4';
const shortcutGrid = 'grid grid-cols-1 min-[320px]:grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4';

function KpiCard({
    label,
    value,
    href,
    icon: Icon,
}: {
    label: string;
    value: number;
    href?: string;
    icon: LucideIcon;
}) {
    const inner = (
        <div className="group relative flex min-h-[5rem] flex-col rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm transition-all hover:border-violet-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-600/15">
                    <Icon className="h-4 w-4" />
                </span>
                {href ? <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-violet-600" /> : null}
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">{Number(value || 0).toLocaleString()}</p>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
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
            className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50/50"
        >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Link>
    );
}

export default function PayrollDashboard({ stats, userRole }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);
    const section = '?section=payroll';

    return (
        <Layout>
            <Head title="Payroll" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Payroll setup</h1>
                        <p className="text-xs text-zinc-500">
                            {userRole} · Master data before monthly payroll
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs border-zinc-200 bg-white">
                        <Link href="/sections">Sections</Link>
                    </Button>
                </div>

                <section className="mb-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Overview</h2>
                    <div className={kpiGrid}>
                        <KpiCard label="Payscales" value={stats.payscales} href={`/payscales${section}`} icon={BriefcaseBusiness} />
                        <KpiCard label="Grades" value={stats.grades} href={`/salary-grades${section}`} icon={Layers} />
                        <KpiCard label="Steps" value={stats.steps} href={`/salary-steps${section}`} icon={ListOrdered} />
                        <KpiCard label="Salary heads" value={stats.heads} href={`/salary-heads${section}`} icon={Wallet} />
                        <KpiCard label="Structures" value={stats.structures} href={`/salary-structures${section}`} icon={Settings2} />
                        <KpiCard label="Branch banks" value={stats.branchBanks} href={`/branch-payroll-banks${section}`} icon={Building2} />
                    </div>
                </section>

                {stats.branchesUnmapped > 0 && (
                    <Card className="mb-6 border-amber-200 bg-amber-50/80">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-amber-900">Branches without payroll bank</CardTitle>
                            <CardDescription className="text-xs text-amber-800">
                                {stats.branchesUnmapped} branch(es) still need a disbursement bank account configured.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {can('payroll.create') && (
                                <Button asChild size="sm" className="h-8 bg-amber-700 text-xs hover:bg-amber-800">
                                    <Link href={`/branch-payroll-banks/create${section}`}>Add branch bank</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                <section className="mb-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Payroll setup</h2>
                    <div className={cn(shortcutGrid)}>
                        {can('payroll.view') && <ShortcutTile href={`/payscales${section}`} title="Payscales" icon={BriefcaseBusiness} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-grades${section}`} title="Grades" icon={Layers} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-steps${section}`} title="Steps" icon={ListOrdered} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-heads${section}`} title="Salary heads" icon={Wallet} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-structures/manual${section}`} title="Salary structure (manual)" icon={Settings2} />}
                        {can('payroll.view') && <ShortcutTile href={`/branch-payroll-banks${section}`} title="Branch wise bank" icon={Building2} />}
                        {can('payroll.view') && <ShortcutTile href={`/probation-salary${section}`} title="Probation salary" icon={Banknote} />}
                        {can('payroll.view') && <ShortcutTile href={`/fixed-salary${section}`} title="Fixed salary" icon={Banknote} />}
                    </div>
                </section>

                <section className="mb-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Reports</h2>
                    <div className={cn(shortcutGrid)}>
                        {can('payroll.view') && (
                            <ShortcutTile href={`/payroll/reports${section}`} title="All payroll reports" icon={FileBarChart2} />
                        )}
                    </div>
                </section>

                <section className="mb-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Salary</h2>
                    <div className={cn(shortcutGrid)}>
                        {can('payroll.view') && <ShortcutTile href={`/salary-head-modifications${section}`} title="Head modification" icon={Pencil} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-withheld${section}`} title="Salary withheld" icon={Banknote} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-process${section}`} title="Salary process" icon={Calculator} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-post${section}`} title="Salary post" icon={Wallet} />}
                        {can('payroll.view') && <ShortcutTile href={`/salary-rollback${section}`} title="Salary rollback" icon={Calculator} />}
                    </div>
                </section>

                <section>
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Bonus</h2>
                    <div className={cn(shortcutGrid)}>
                        {can('payroll.view') && <ShortcutTile href={`/bonus-types${section}`} title="Bonus type" icon={Award} />}
                        {can('payroll.view') && <ShortcutTile href={`/bonus-configurations${section}`} title="Bonus configuration" icon={Settings2} />}
                        {can('payroll.view') && <ShortcutTile href={`/bonus-calculation${section}`} title="Bonus calculation" icon={Award} />}
                        {can('payroll.view') && (
                            <ShortcutTile
                                href={`/bonus-post${section}`}
                                title="Bonus post"
                                icon={Award}
                            />
                        )}
                    </div>
                </section>
            </PageSurface>
        </Layout>
    );
}
