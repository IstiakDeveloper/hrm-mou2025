import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { ArrowRightLeft, Plus, Search } from 'lucide-react';

type BranchOpt = { id: number; name: string; is_head_office: boolean };
type TransferRow = {
    id: number;
    transfer_date: string;
    notes: string | null;
    fixed_asset?: { id: number; asset_tag: string; name: string };
    from_branch?: { name: string };
    to_branch?: { name: string };
    transferred_by_user?: { name: string };
};

export default function AssetTransferIndex({
    transfers,
    filters,
    branches,
    branchScoped,
}: {
    transfers: { data: TransferRow[] };
    filters: { search?: string; branch_id?: string };
    branches: BranchOpt[];
    branchScoped?: boolean;
}) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);

    const applyFilters = () => {
        router.get(route('asset-transfers.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Asset transfers" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={ArrowRightLeft}
                    title="Branch transfers"
                    description="Movement of fixed assets between head office and branches."
                >
                    <Link href={route('asset-transfers.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New transfer</Button>
                    </Link>
                </PayrollPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Asset tag or name…"
                            className="max-w-xs"
                        />
                        <ComboSelect
                            value={branchId}
                            onChange={(v) => setBranchId(v)}
                            items={branches.map((b) => ({
                                value: b.id,
                                label: b.is_head_office ? `${b.name} (HO)` : b.name,
                            }))}
                            placeholder="All branches"
                            className="min-w-[200px]"
                        />
                        <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="History">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>By</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No transfers yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transfers.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.transfer_date}</TableCell>
                                        <TableCell>
                                            {row.fixed_asset && (
                                                <Link href={route('fixed-assets.show', row.fixed_asset.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                                    {row.fixed_asset.asset_tag}
                                                </Link>
                                            )}
                                            <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                        </TableCell>
                                        <TableCell>{row.from_branch?.name}</TableCell>
                                        <TableCell>{row.to_branch?.name}</TableCell>
                                        <TableCell>{row.transferred_by_user?.name ?? '—'}</TableCell>
                                        <TableCell>{row.notes ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
