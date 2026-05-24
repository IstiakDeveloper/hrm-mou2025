import React from 'react';
import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeft,
    ArrowUpRight,
    Boxes,
    Layers,
    TrendingDown,
    Trash2,
    UserCheck,
    Wrench,
    FileBarChart2,
    Upload,
    AlertTriangle,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePage } from '@inertiajs/react';

type Stats = {
    totalAssets: number;
    purchaseValue: number;
    bookValue: number;
    active: number;
    inTransit: number;
    underMaintenance: number;
    disposed: number;
    categories: number;
    branches: number;
    pendingDisposals: number;
    activeAssignments: number;
    openMaintenance: number;
    depreciableAssets: number;
    topBranches: { branch: string; asset_count: number }[];
};

type Props = {
    stats: Stats;
    branchScoped: boolean;
};

const section = '?section=fixed-asset';
const kpiGrid = 'grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4';
const shortcutGrid = 'grid grid-cols-1 min-[320px]:grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4';

function fmtMoney(n: number) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    sub?: string;
    href?: string;
    icon: LucideIcon;
}) {
    const inner = (
        <div className="group relative flex min-h-[5rem] flex-col rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15">
                    <Icon className="h-4 w-4" />
                </span>
                {href ? <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-emerald-600" /> : null}
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">{value}</p>
            {sub ? <p className="text-[10px] text-zinc-500">{sub}</p> : null}
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
            className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/50"
        >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Link>
    );
}

export default function FixedAssetDashboard({ stats, branchScoped }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);

    return (
        <Layout>
            <Head title="Fixed Asset" />
            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Fixed Asset</h1>
                        <p className="text-xs text-zinc-500">Overview across branches and categories</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs border-zinc-200 bg-white">
                        <Link href="/sections">Sections</Link>
                    </Button>
                </div>

                {branchScoped && (
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertTitle>Branch view</AlertTitle>
                        <AlertDescription>Statistics are limited to your branch.</AlertDescription>
                    </Alert>
                )}

                <section className="mb-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Overview</h2>
                    <div className={kpiGrid}>
                        <KpiCard label="Total assets" value={stats.totalAssets} href={`/fixed-assets${section}`} icon={Boxes} />
                        <KpiCard label="Purchase value" value={fmtMoney(stats.purchaseValue)} sub="৳ total" icon={Layers} />
                        <KpiCard label="Book value" value={fmtMoney(stats.bookValue)} sub="৳ total" icon={TrendingDown} />
                        <KpiCard label="Active" value={stats.active} href={`/fixed-assets${section}&status=active`} icon={Boxes} />
                        <KpiCard label="Pending disposal" value={stats.pendingDisposals} href={`/asset-disposals${section}`} icon={Trash2} />
                        <KpiCard label="Open maintenance" value={stats.openMaintenance} href={`/asset-maintenances${section}`} icon={Wrench} />
                        <KpiCard label="Assigned" value={stats.activeAssignments} href={`/asset-assignments${section}`} icon={UserCheck} />
                        <KpiCard label="Depreciable" value={stats.depreciableAssets} href={`/asset-depreciation${section}`} icon={TrendingDown} />
                    </div>
                </section>

                {stats.pendingDisposals > 0 && (
                    <Card className="mb-6 border-amber-200 bg-amber-50/80">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm text-amber-900">
                                <AlertTriangle className="h-4 w-4" /> Pending disposal approvals
                            </CardTitle>
                            <CardDescription className="text-xs text-amber-800">
                                {stats.pendingDisposals} request(s) waiting for review.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild size="sm" className="h-8 bg-amber-700 text-xs hover:bg-amber-800">
                                <Link href={`/asset-disposals${section}`}>Review disposals</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {!branchScoped && stats.topBranches.length > 0 && (
                    <section className="mb-6">
                        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Top branches by assets</h2>
                        <Card>
                            <CardContent className="pt-4">
                                <ul className="space-y-2 text-sm">
                                    {stats.topBranches.map((b) => (
                                        <li key={b.branch} className="flex justify-between border-b border-zinc-100 pb-2 last:border-0">
                                            <span>{b.branch}</span>
                                            <span className="font-semibold tabular-nums">{b.asset_count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </section>
                )}

                <section>
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Shortcuts</h2>
                    <div className={cn(shortcutGrid)}>
                        {can('fixed-assets.view') && <ShortcutTile href={`/asset-categories${section}`} title="Categories" icon={Layers} />}
                        {can('fixed-assets.view') && <ShortcutTile href={`/fixed-assets${section}`} title="Asset register" icon={Boxes} />}
                        {can('fixed-assets.create') && <ShortcutTile href={route('fixed-assets.import.index')} title="Bulk import (CSV)" icon={Upload} />}
                        {can('fixed-assets.view') && <ShortcutTile href={`/asset-transfers${section}`} title="Transfers" icon={ArrowRightLeft} />}
                        {can('fixed-assets.view') && <ShortcutTile href={`/asset-depreciation${section}`} title="Depreciation" icon={TrendingDown} />}
                        {can('fixed-assets.view') && (
                            <ShortcutTile href={`/fixed-asset/reports/asset-tracking${section}`} title="Asset tracking report" icon={FileBarChart2} />
                        )}
                    </div>
                </section>
            </PageSurface>
        </Layout>
    );
}
