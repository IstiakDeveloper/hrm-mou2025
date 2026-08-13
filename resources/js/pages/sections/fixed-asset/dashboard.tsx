import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    Boxes,
    Layers,
    TrendingDown,
    Trash2,
    AlertTriangle,
    ShoppingCart,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { hasAppPermission, isBranchAccount } from '@/lib/permissions';
import { branchFixedAssetNavGroups, FIXED_ASSET_NAV_GROUPS } from '@/lib/fixed-asset-nav';
import { formatTakaWhole } from '@/lib/taka-format';
import { type SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Stats = {
    totalAssets: number;
    purchaseValue: number;
    bookValue: number;
    active: number;
    inTransit: number;
    underMaintenance: number;
    notInUse?: number;
    disposed: number;
    categories: number;
    branches: number;
    pendingDisposals: number;
    depreciableAssets: number;
    topBranches: { branch: string; asset_count: number }[];
};

type Props = {
    stats: Stats;
    branchScoped: boolean;
};

const section = '?section=fixed-asset';
const kpiGrid = 'grid grid-cols-1 min-[340px]:grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

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
        <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-xs h-full">
            <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600 transition-all duration-200">
                    <Icon className="h-4.5 w-4.5" />
                </span>
                {href ? (
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-50 text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                ) : null}
            </div>
            <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-extrabold tracking-tight text-zinc-950 tabular-nums">{value}</span>
                    {sub ? <span className="text-[10px] font-medium text-zinc-400">{sub}</span> : null}
                </div>
            </div>
        </div>
    );
    if (href) {
        return (
            <Link href={href} className="block rounded-xl focus:outline-none">
                {inner}
            </Link>
        );
    }
    return inner;
}

export default function FixedAssetDashboard({ stats, branchScoped }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);
    const branchAccount = isBranchAccount(auth);
    const navGroups = branchAccount ? branchFixedAssetNavGroups() : FIXED_ASSET_NAV_GROUPS;

    const maxVal = Math.max(...stats.topBranches.map((b) => b.asset_count), 1);

    return (
        <Layout>
            <Head title="Fixed Asset" />
            <AssetPage>
                <AssetPageHeader
                    icon={Boxes}
                    title="Fixed Assets"
                    description={
                        branchAccount
                            ? 'Purchase, stock, depreciation and reports for your branch.'
                            : 'General overview, metrics, and shortcuts across all branches.'
                    }
                >
                    <Link href="/sections">
                        <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer">
                            All Sections
                        </Button>
                    </Link>
                </AssetPageHeader>

                {branchScoped && (
                    <Alert className="border-blue-100 bg-blue-50/40 text-blue-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-blue-800">Branch view</AlertTitle>
                        <AlertDescription className="text-xs text-blue-700 mt-1">Statistics and asset registries are filtered to your assigned branch.</AlertDescription>
                    </Alert>
                )}

                {stats.pendingDisposals > 0 && can('fixed-assets.delete') && (
                    <Alert className="border-amber-100 bg-amber-50/40 text-amber-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" /> Pending approvals
                        </AlertTitle>
                        <AlertDescription className="text-xs text-amber-700 mt-1.5 flex items-center justify-between">
                            <span>{stats.pendingDisposals} asset disposal request(s) are waiting for your review.</span>
                            <Link href={`/fixed-asset/disposal/requests${section}&status=pending`}>
                                <Button size="xs" className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-2xs h-7.5 rounded-md cursor-pointer">
                                    Review now
                                </Button>
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                <section>
                    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Key Performance Metrics</h2>
                    <div className={kpiGrid}>
                        <KpiCard
                            label="Total assets"
                            value={stats.totalAssets}
                            href={branchAccount ? `/fixed-asset/stock/category-wise${section}` : `/fixed-asset/assets/tracking${section}`}
                            icon={Boxes}
                        />
                        <KpiCard label="Purchase value" value={formatTakaWhole(stats.purchaseValue)} sub="৳ total" href={`/fixed-asset/purchases${section}`} icon={Layers} />
                        <KpiCard label="Book value" value={formatTakaWhole(stats.bookValue)} sub="৳ total" icon={TrendingDown} />
                        <KpiCard
                            label="Active"
                            value={stats.active}
                            href={branchAccount ? `/fixed-asset/stock/category-wise${section}` : `/fixed-asset/assets/tracking${section}&status=active`}
                            icon={Boxes}
                        />
                        {!branchAccount && (
                            <KpiCard label="Pending disposal" value={stats.pendingDisposals} href={`/fixed-asset/disposal/requests${section}&status=pending`} icon={Trash2} />
                        )}
                        <KpiCard label="Depreciable" value={stats.depreciableAssets} href={`/fixed-asset/depreciation/calculation${section}`} icon={TrendingDown} />
                        {!branchAccount && (
                            <KpiCard label="Categories" value={stats.categories} href={`/fixed-asset/settings/categories${section}`} icon={Layers} />
                        )}
                        {can('fixed-assets.create') ? (
                            <KpiCard label="New purchase" value="+" href={`/fixed-asset/purchases/create${section}`} icon={ShoppingCart} />
                        ) : null}
                    </div>
                </section>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <section className="h-full">
                            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Module Shortcuts</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {navGroups.map((group) => {
                                    const items = group.items.filter((item) => can(item.permission ?? 'fixed-assets.view'));
                                    if (items.length === 0) return null;
                                    const Icon = group.icon;
                                    return (
                                        <div key={group.id} className="rounded-xl border border-zinc-200/80 bg-white shadow-2xs hover:border-zinc-300 transition-colors p-4 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                                                        <Icon className="h-4 w-4" />
                                                    </span>
                                                    <h3 className="text-xs font-bold text-zinc-800 tracking-tight">{group.title}</h3>
                                                </div>
                                                <ul className="space-y-1">
                                                    {items.map((item) => (
                                                        <li key={item.path}>
                                                            <Link href={`${item.path}${section}`} className="group/item flex items-center justify-between py-1 text-xs text-zinc-600 hover:text-emerald-700 transition-colors">
                                                                <span className="truncate">{item.title}</span>
                                                                <ArrowUpRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover/item:opacity-100 group-hover/item:text-emerald-600 transition-all" />
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {!branchScoped && stats.topBranches.length > 0 && (
                        <div className="md:col-span-1">
                            <section className="h-full flex flex-col">
                                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Top Branches</h2>
                                <AssetSectionCard title="Branch Asset Distribution" className="flex-1">
                                    <div className="space-y-4">
                                        {stats.topBranches.map((b) => {
                                            const pct = (b.asset_count / maxVal) * 100;
                                            return (
                                                <div key={b.branch} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-semibold text-zinc-800">
                                                        <span className="truncate pr-2">{b.branch}</span>
                                                        <span className="font-mono text-zinc-950 shrink-0">{b.asset_count} assets</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-600/80 transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AssetSectionCard>
                            </section>
                        </div>
                    )}
                </div>
            </AssetPage>
        </Layout>
    );
}
