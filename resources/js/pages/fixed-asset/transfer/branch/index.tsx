import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { TransferHistoryTable, type TransferRow } from '@/components/fixed-asset/TransferHistoryTable';
import { ArrowRightLeft, Plus, Search } from 'lucide-react';

export default function BranchTransferIndex({
    transfers,
    filters,
    branches,
    branchScoped,
}: {
    transfers: { data: TransferRow[] };
    filters: { search?: string; branch_id?: string };
    branches: { id: number; name: string; is_head_office: boolean }[];
    branchScoped?: boolean;
}) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);

    const applyFilters = () => {
        router.get(route('fixed-asset.transfer.branch.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Branch Transfer" />
            <AssetPage>
                <AssetPageHeader
                    icon={ArrowRightLeft}
                    title="Branch Transfer"
                    description="Move assets between branches. Custodian is cleared on branch transfer."
                >
                    <Link href={route('fixed-asset.transfer.branch.create')}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer">
                            <Plus className="mr-2 h-4 w-4" /> New Branch Transfer
                        </Button>
                    </Link>
                </AssetPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Asset Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                placeholder="Asset tag or name…"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Branch</label>
                            <ComboSelect
                                value={branchId}
                                onChange={setBranchId}
                                items={branchComboSelectItems(branches, { numericValue: true })}
                                placeholder="All branches"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer px-3.5" onClick={applyFilters}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="Branch Transfer History" noPadding className="mt-4">
                    <TransferHistoryTable transfers={transfers.data} />
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
