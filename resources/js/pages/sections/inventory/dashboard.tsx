import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Layout from '@/layouts/AdminLayout';
import type { InventoryBranchScope } from '@/lib/inventory-branch-scope';
import { INVENTORY_NAV_GROUPS } from '@/lib/inventory-nav';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowDownToLine, ArrowUpRight, Home, Layers, Package, Send, Warehouse } from 'lucide-react';

type Stats = {
    products: number;
    stockIn: number;
    disbursed: number;
    onHand: number;
    headOfficeBranches: number;
    fieldBranches: number;
};

type Props = {
    stats: Stats;
    branchScope?: InventoryBranchScope;
};

const section = '?section=inventory';

export default function InventoryDashboard({ stats, branchScope }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);
    const branchLocked = Boolean(branchScope?.locked);
    const navGroups = INVENTORY_NAV_GROUPS;

    // Computed totals for branch distribution
    const hoCount = stats.headOfficeBranches || 0;
    const fieldCount = stats.fieldBranches || 0;
    const totalBranches = hoCount + fieldCount;

    return (
        <Layout>
            <Head title="Inventory Dashboard" />
            <PageSurface>
                {/* Header Section */}
                <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 shadow-xs ring-1 ring-sky-600/10">
                            <Package className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Inventory Section</h1>
                            <p className="mt-1 max-w-2xl text-xs leading-relaxed font-normal text-zinc-500">
                                Manage stock logs, monitor disbursements to employees, and track branch balances.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        <Link href="/sections">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8.5 cursor-pointer rounded-lg border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                            >
                                All Sections
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Alerts / Info Banners */}
                {branchLocked && branchScope?.branch_name && (
                    <Alert className="mb-6 rounded-xl border-sky-100 bg-sky-50/40 text-sky-950 shadow-2xs">
                        <AlertTitle className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-sky-800 uppercase">
                            <Warehouse className="h-4 w-4 text-sky-600" /> Branch Locked Scope
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs text-sky-700">
                            Your dashboard view and transaction records are locked to: <strong>{branchScope.branch_name}</strong>.
                        </AlertDescription>
                    </Alert>
                )}

                {/* KPI Metrics Grid */}
                <section className="mb-8">
                    <h2 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Key Performance Metrics</h2>
                    <div className="grid grid-cols-1 gap-4 min-[340px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {[
                            {
                                label: 'Product Categories',
                                value: stats.products,
                                icon: Package,
                                href: `/inventory/products${section}`,
                                bgClass: 'bg-sky-50 text-sky-700 ring-sky-600/10',
                            },
                            {
                                label: 'Total Stock In',
                                value: stats.stockIn,
                                icon: ArrowDownToLine,
                                href: `/inventory/operations${section}`,
                                bgClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
                            },
                            {
                                label: 'Total Disbursed',
                                value: stats.disbursed,
                                icon: Send,
                                href: `/inventory/operations${section}`,
                                bgClass: 'bg-amber-50 text-amber-700 ring-amber-600/10',
                            },
                            {
                                label: 'Current On Hand',
                                value: stats.onHand,
                                icon: Layers,
                                href: `/inventory/reports/stock-ledger${section}`,
                                bgClass: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
                            },
                        ].map((kpi) => (
                            <Link
                                key={kpi.label}
                                href={kpi.href}
                                className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-xs focus:outline-none"
                            >
                                <div className="flex items-start justify-between">
                                    <span
                                        className={`grid h-9 w-9 place-items-center rounded-xl shadow-2xs ring-1 transition-all duration-200 ${kpi.bgClass} group-hover:bg-sky-600 group-hover:text-white group-hover:ring-sky-600`}
                                    >
                                        <kpi.icon className="h-4.5 w-4.5" />
                                    </span>
                                    <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-50 text-zinc-400 transition-all group-hover:bg-sky-50 group-hover:text-sky-700">
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">{kpi.label}</p>
                                    <p className="mt-0.5 text-xl font-extrabold tracking-tight text-zinc-950 tabular-nums">
                                        {kpi.value.toLocaleString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Shortcuts & Scope Breakdown Split */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Shortcuts Section (Left 2/3) */}
                    <div className="space-y-4 md:col-span-2">
                        <h2 className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Module Shortcuts</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {navGroups.map((group) => {
                                const permittedItems = group.items.filter((item) => can(item.permission ?? 'inventory.view'));
                                if (permittedItems.length === 0) return null;
                                const GroupIcon = group.icon;

                                return (
                                    <div
                                        key={group.id}
                                        className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-colors hover:border-zinc-300"
                                    >
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-50 text-sky-700">
                                                    <GroupIcon className="h-4 w-4" />
                                                </span>
                                                <h3 className="text-xs font-bold tracking-tight text-zinc-800">{group.title}</h3>
                                            </div>
                                            <ul className="space-y-1">
                                                {permittedItems.map((item) => (
                                                    <li key={item.path}>
                                                        <Link
                                                            href={`${item.path}${section}`}
                                                            className="group/item flex items-center justify-between py-1 text-xs text-zinc-600 transition-colors hover:text-sky-700"
                                                        >
                                                            <span className="truncate">{item.title}</span>
                                                            <ArrowUpRight className="h-3 w-3 text-zinc-300 opacity-0 transition-all group-hover/item:text-sky-600 group-hover/item:opacity-100" />
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

                    {/* Scope breakdown Card (Right 1/3) */}
                    <div className="space-y-4 md:col-span-1">
                        <h2 className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Inventory Branch Scope</h2>
                        <div className="space-y-5 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                            <div>
                                <h3 className="text-xs font-semibold tracking-tight text-zinc-800">Active Branch Distribution</h3>
                                <p className="mt-0.5 text-[10px] text-zinc-400">Number of offices/branches utilizing inventory logs.</p>
                            </div>

                            <div className="space-y-4">
                                {/* Head Office branches */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-800">
                                        <span className="flex items-center gap-1.5">
                                            <Home className="h-3.5 w-3.5 text-zinc-400" />
                                            Head Office Units
                                        </span>
                                        <span className="shrink-0 font-mono text-zinc-950">{hoCount}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                        <div
                                            className="h-full rounded-full bg-sky-600/80 transition-all duration-500"
                                            style={{
                                                width: `${totalBranches > 0 ? (hoCount / totalBranches) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Field branches */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-800">
                                        <span className="flex items-center gap-1.5">
                                            <Warehouse className="h-3.5 w-3.5 text-zinc-400" />
                                            Field Branches
                                        </span>
                                        <span className="shrink-0 font-mono text-zinc-950">{fieldCount}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                        <div
                                            className="h-full rounded-full bg-sky-500/60 transition-all duration-500"
                                            style={{
                                                width: `${totalBranches > 0 ? (fieldCount / totalBranches) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total branches stat footer */}
                            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                                <span className="text-zinc-500">Total Logged Branches</span>
                                <span className="font-mono font-bold text-zinc-800">{totalBranches}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Quick Actions Footer */}
                <div className="mt-8 flex gap-3 border-t border-zinc-100 pt-5">
                    <Button asChild className="cursor-pointer bg-sky-600 text-white shadow-2xs hover:bg-sky-700">
                        <Link href={`/inventory/operations${section}`}>Go to Workstation</Link>
                    </Button>
                    <Button asChild variant="outline" className="cursor-pointer border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                        <Link href={`/inventory/reports/stock-ledger${section}`}>View Stock Ledger</Link>
                    </Button>
                </div>
            </PageSurface>
        </Layout>
    );
}
