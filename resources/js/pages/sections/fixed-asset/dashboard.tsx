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
    Wallet,
    Package,
    ShieldCheck,
    CheckCircle2,
    Wrench,
    Truck,
    Clock,
    UserCheck,
    FileBarChart2,
    Building2,
    Plus,
    RotateCcw,
    FileText,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { hasAppPermission, isBranchAccount } from '@/lib/permissions';
import { branchFixedAssetNavGroups, FIXED_ASSET_NAV_GROUPS } from '@/lib/fixed-asset-nav';
import { formatTakaWhole } from '@/lib/taka-format';
import { type SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type RecentAsset = {
    id: number;
    asset_tag: string;
    name: string;
    category: string;
    branch: string;
    purchase_cost: number;
    book_value: number;
    status: string;
    purchase_date?: string | null;
};

type Stats = {
    totalAssets: number;
    purchaseValue: number;
    bookValue: number;
    accumulatedDepreciation?: number;
    active: number;
    inTransit: number;
    underMaintenance: number;
    notInUse?: number;
    disposed: number;
    categories: number;
    branches: number;
    pendingDisposals: number;
    activeAssignments?: number;
    openMaintenance?: number;
    depreciableAssets: number;
    topBranches: { branch: string; asset_count: number }[];
    recentAssets?: RecentAsset[];
};

type Props = {
    stats: Stats;
    branchScoped: boolean;
};

const section = '?section=fixed-asset';

function StatusPill({
    label,
    count,
    color,
    icon: Icon,
}: {
    label: string;
    count: number;
    color: 'emerald' | 'amber' | 'indigo' | 'slate' | 'rose';
    icon: LucideIcon;
}) {
    const colorStyles = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        slate: 'bg-slate-50 text-slate-700 border-slate-200/80',
        rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    };

    return (
        <div className={cn('flex items-center justify-between rounded-xl border p-2.5 shadow-2xs', colorStyles[color])}>
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{label}</span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums">{count}</span>
        </div>
    );
}

export default function FixedAssetDashboard({ stats, branchScoped }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);
    const branchAccount = isBranchAccount(auth);
    const navGroups = branchAccount ? branchFixedAssetNavGroups() : FIXED_ASSET_NAV_GROUPS;

    const maxVal = Math.max(...stats.topBranches.map((b) => b.asset_count), 1);
    const accumulatedDep = stats.accumulatedDepreciation ?? Math.max(0, stats.purchaseValue - stats.bookValue);
    const bookRatio = stats.purchaseValue > 0
        ? Math.min(100, Math.round((stats.bookValue / stats.purchaseValue) * 100))
        : 100;

    return (
        <Layout>
            <Head title="Fixed Asset Command Center" />
            <AssetPage className="space-y-6">
                {/* Executive Command Header */}
                <AssetPageHeader
                    icon={Boxes}
                    title="Fixed Asset Command Center"
                    description={
                        branchAccount
                            ? 'Asset inventory, physical stock, and depreciation schedule for your branch.'
                            : 'Enterprise-wide fixed asset portfolio, valuation, lifecycle tracking, and depreciation.'
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {can('fixed-assets.create') && (
                            <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer">
                                <Link href={`/fixed-assets/create${section}`}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Register Asset
                                </Link>
                            </Button>
                        )}
                        {can('fixed-assets.create') && (
                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                                <Link href={`/fixed-asset/purchases/create${section}`}>
                                    <ShoppingCart className="mr-1 h-3.5 w-3.5 text-slate-500" /> New Purchase
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                            <Link href="/sections">Sections</Link>
                        </Button>
                    </div>
                </AssetPageHeader>

                {/* Scope & Compliance Sentinel Alerts */}
                {branchScoped && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900 shadow-2xs">
                        <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>
                            <strong>Branch Scoped View:</strong> All asset registries, stock figures, and valuations are filtered to your assigned branch.
                        </span>
                    </div>
                )}

                {stats.pendingDisposals > 0 && can('fixed-assets.delete') && (
                    <Alert className="border-amber-200 bg-amber-50/70 text-amber-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" /> Pending Asset Disposals
                        </AlertTitle>
                        <AlertDescription className="text-xs text-amber-800 mt-1.5 flex flex-wrap items-center justify-between gap-2">
                            <span>
                                <strong>{stats.pendingDisposals}</strong> asset disposal/scrap request(s) are awaiting management approval.
                            </span>
                            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-7.5 px-3 rounded-md shadow-2xs cursor-pointer">
                                <Link href={`/fixed-asset/disposal/requests${section}&status=pending`}>
                                    Review & Approve Disposals →
                                </Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Financial Valuation & Executive KPI Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Net Book Value */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Net Book Value (NBV)
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Wallet className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <div className="text-xl md:text-2xl font-bold font-mono tracking-tight text-slate-900">
                                {formatTakaWhole(stats.bookValue)}
                            </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Depreciated Valuation</span>
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                ● {stats.active} Active
                            </span>
                        </div>
                    </div>

                    {/* 2. Purchase Cost & Accumulated Depreciation */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Capitalized Cost
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <TrendingDown className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline justify-between">
                            <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Original Cost</span>
                                <span className="text-sm font-bold font-mono text-slate-900">
                                    {formatTakaWhole(stats.purchaseValue)}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 block uppercase">Accum. Deprec.</span>
                                <span className="text-sm font-bold font-mono text-indigo-600">
                                    -{formatTakaWhole(accumulatedDep)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                                <div className="bg-emerald-600 h-full" style={{ width: `${bookRatio}%` }} />
                                <div className="bg-indigo-400 h-full" style={{ width: `${100 - bookRatio}%` }} />
                            </div>
                            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                <span>Retained {bookRatio}%</span>
                                <span>Depreciated {100 - bookRatio}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Total Assets & Custodian Assignments */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Total Assets
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Boxes className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">
                                {stats.totalAssets}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                items registered
                            </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Assigned to Staff</span>
                            <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md">
                                {stats.activeAssignments ?? stats.active} items
                            </span>
                        </div>
                    </div>

                    {/* 4. Maintenance & Depreciable Schedule */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Depreciable & Risk
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                                <ShieldCheck className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">
                                {stats.depreciableAssets}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                on schedule
                            </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Under Repair / Idle</span>
                            <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                                {stats.underMaintenance} Repair · {stats.notInUse ?? 0} Idle
                            </span>
                        </div>
                    </div>
                </div>

                {/* 5-Stage Interactive Asset Lifecycle Funnel */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                Asset Lifecycle Operations Funnel
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Comprehensive workflow pipeline from procurement to write-off
                            </p>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            Portfolio: <strong>{stats.totalAssets} Assets</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
                        {/* Step 1: Procurement */}
                        <Link
                            href={`/fixed-asset/purchases${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phase 1</span>
                                <ShoppingCart className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                                Procurement
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Purchase Orders & Invoices
                            </div>
                        </Link>

                        {/* Step 2: Register & Tag */}
                        <Link
                            href={`/fixed-assets${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Phase 2</span>
                                <Package className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <div className="mt-2 font-bold text-emerald-950">
                                Register & Tag
                            </div>
                            <div className="mt-1 text-[10px] text-emerald-800">
                                Asset Code & Barcode
                            </div>
                        </Link>

                        {/* Step 3: Custodian & Use */}
                        <Link
                            href={`/asset-assignments${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phase 3</span>
                                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                                Assign & Custodian
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Issue, Custody & Service
                            </div>
                        </Link>

                        {/* Step 4: Depreciate */}
                        <Link
                            href={`/fixed-asset/depreciation${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-3 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Phase 4</span>
                                <TrendingDown className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <div className="mt-2 font-bold text-indigo-950">
                                Depreciation
                            </div>
                            <div className="mt-1 text-[10px] text-indigo-800">
                                Monthly Accounting Run
                            </div>
                        </Link>

                        {/* Step 5: Transfer & Disposal */}
                        <Link
                            href={`/fixed-asset/disposal/requests${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phase 5</span>
                                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                                Transfer / Dispose
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Reallocation & Scrap
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Status Mix & Top Branches Widgets */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {/* Status Distribution */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:col-span-2">
                        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                    Asset Operational Status Breakdown
                                </h3>
                                <p className="text-[10px] text-slate-400">Physical condition & lifecycle placement</p>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-700">
                                {stats.totalAssets} Total Assets
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
                            <StatusPill label="Active" count={stats.active} color="emerald" icon={CheckCircle2} />
                            <StatusPill label="Under Repair" count={stats.underMaintenance} color="amber" icon={Wrench} />
                            <StatusPill label="In Transit" count={stats.inTransit} color="indigo" icon={Truck} />
                            <StatusPill label="Not In Use" count={stats.notInUse ?? 0} color="slate" icon={Clock} />
                            <StatusPill label="Disposed" count={stats.disposed} color="rose" icon={Trash2} />
                        </div>

                        {/* Proportion Bar */}
                        <div className="mt-4">
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                                <div className="bg-emerald-500 h-full" style={{ width: `${stats.totalAssets > 0 ? (stats.active / stats.totalAssets) * 100 : 0}%` }} title="Active" />
                                <div className="bg-amber-500 h-full" style={{ width: `${stats.totalAssets > 0 ? (stats.underMaintenance / stats.totalAssets) * 100 : 0}%` }} title="Maintenance" />
                                <div className="bg-indigo-500 h-full" style={{ width: `${stats.totalAssets > 0 ? (stats.inTransit / stats.totalAssets) * 100 : 0}%` }} title="In Transit" />
                                <div className="bg-slate-400 h-full" style={{ width: `${stats.totalAssets > 0 ? ((stats.notInUse ?? 0) / stats.totalAssets) * 100 : 0}%` }} title="Not in Use" />
                                <div className="bg-rose-500 h-full" style={{ width: `${stats.totalAssets > 0 ? (stats.disposed / stats.totalAssets) * 100 : 0}%` }} title="Disposed" />
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active ({stats.totalAssets > 0 ? Math.round((stats.active / stats.totalAssets) * 100) : 0}%)
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Maintenance ({stats.underMaintenance})
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Transit ({stats.inTransit})
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Idle ({stats.notInUse ?? 0})
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Disposed ({stats.disposed})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Top Branches Asset Distribution */}
                    {!branchScoped && stats.topBranches.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                    Top Branch Distribution
                                </h3>
                                <span className="text-[10px] text-slate-400">Physical Stock</span>
                            </div>
                            <div className="space-y-3">
                                {stats.topBranches.map((b) => {
                                    const pct = (b.asset_count / maxVal) * 100;
                                    return (
                                        <div key={b.branch} className="space-y-1">
                                            <div className="flex justify-between text-xs font-medium text-slate-800">
                                                <span className="truncate pr-2">{b.branch}</span>
                                                <span className="font-mono text-slate-900 font-bold shrink-0">{b.asset_count}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Registered Assets Queue */}
                {stats.recentAssets && stats.recentAssets.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-emerald-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                    Recently Registered Assets
                                </h3>
                            </div>
                            {can('fixed-assets.view') && (
                                <Link
                                    href={`/fixed-assets${section}`}
                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                                >
                                    Browse all assets →
                                </Link>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2.5">Asset Tag & Code</th>
                                        <th className="px-3 py-2.5">Item Name</th>
                                        <th className="px-3 py-2.5">Category</th>
                                        <th className="px-3 py-2.5">Branch</th>
                                        <th className="px-3 py-2.5 text-right">Purchase Cost</th>
                                        <th className="px-3 py-2.5">Status</th>
                                        <th className="px-3 py-2.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.recentAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                                                {asset.asset_tag}
                                            </td>
                                            <td className="px-3 py-2.5 font-semibold text-slate-800">
                                                {asset.name}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">
                                                {asset.category}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">
                                                {asset.branch}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                                {formatTakaWhole(asset.purchase_cost)}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2.5 text-[11px] border-slate-200 text-slate-600"
                                                >
                                                    <Link href={`/fixed-assets/${asset.id}${section}`}>
                                                        View Details
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Categorized Bento Grid Hub */}
                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                        Fixed Asset Management Modules
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {navGroups.map((group) => {
                            const items = group.items.filter((item) => can(item.permission ?? 'fixed-assets.view'));
                            if (items.length === 0) return null;
                            const Icon = group.icon;

                            return (
                                <div
                                    key={group.id}
                                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2.5">
                                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900">{group.title}</h3>
                                                <span className="text-[10px] text-slate-400">{items.length} sub-modules</span>
                                            </div>
                                        </div>

                                        <ul className="space-y-1">
                                            {items.map((item) => (
                                                <li key={item.path}>
                                                    <Link
                                                        href={`${item.path}${section}`}
                                                        className="group/item flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                                                    >
                                                        <span className="truncate">{item.title}</span>
                                                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover/item:opacity-100 group-hover/item:text-emerald-600 transition-all" />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </AssetPage>
        </Layout>
    );
}
