import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowDownToLine, ArrowUpRight, Layers, Package, Send } from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { INVENTORY_NAV_GROUPS } from '@/lib/inventory-nav';
import type { InventoryBranchScope } from '@/lib/inventory-branch-scope';
import { Button } from '@/components/ui/button';

type Stats = {
    products: number;
    stockIn: number;
    disbursed: number;
    onHand: number;
    headOfficeBranches: number;
    fieldBranches: number;
};

export default function InventoryDashboard({
    stats,
    branchScope,
}: {
    stats: Stats;
    branchScope?: InventoryBranchScope;
}) {
    const section = '?section=inventory';
    const branchLocked = Boolean(branchScope?.locked);
    const navGroups = INVENTORY_NAV_GROUPS;

    return (
        <Layout>
            <Head title="Inventory" />
            <PageSurface>
                <div className="mb-6 border-b border-slate-200 pb-5">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Stock in from Head Office &amp; Branch — disburse to employees — track balance
                        {branchLocked && branchScope?.branch_name ? (
                            <span className="text-sky-700"> — {branchScope.branch_name}</span>
                        ) : null}
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: 'Products', value: stats.products, icon: Package },
                        { label: 'Total Stock In', value: stats.stockIn, icon: ArrowDownToLine },
                        { label: 'Disbursed', value: stats.disbursed, icon: Send },
                        { label: 'On Hand', value: stats.onHand, icon: Layers },
                    ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                            <kpi.icon className="h-4 w-4 text-sky-600 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{kpi.value.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {navGroups.map((group) => (
                        <div key={group.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
                                <group.icon className="h-4 w-4 text-sky-600" />
                                <span className="text-sm font-semibold text-slate-800">{group.title}</span>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {group.items.map((item) => (
                                    <li key={item.path}>
                                        <Link
                                            href={`${item.path}${section}`}
                                            className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 transition-colors"
                                        >
                                            {item.title}
                                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex gap-2">
                    <Button asChild className="bg-sky-600 hover:bg-sky-700">
                        <Link href={`/inventory/operations${section}`}>Stock &amp; Disburse</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/inventory/reports/stock-ledger${section}`}>Stock Ledger</Link>
                    </Button>
                </div>
            </PageSurface>
        </Layout>
    );
}
