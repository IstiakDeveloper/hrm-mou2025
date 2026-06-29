import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { Boxes, Edit, Eye, Plus, Search } from 'lucide-react';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type BranchOpt = { id: number; name: string; branch_code: string | null; is_head_office: boolean };
type CategoryOpt = { id: number; code: string; name: string };
type StatusOpt = { value: string; label: string };

type AssetRow = {
    id: number;
    asset_tag: string;
    name: string;
    status: string;
    purchase_cost: string | null;
    book_value: string | null;
    category?: { id: number; code: string; name: string };
    branch?: { id: number; name: string; is_head_office: boolean };
    custodian?: (EmployeeNameFields & { id: number; employee_id: string }) | null;
};

const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
        active: 'Active',
        in_transit: 'In Transit',
        under_maintenance: 'Maintenance',
        not_in_use: 'Not in Use',
        disposed: 'Disposed',
    };
    const classes: Record<string, string> = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50',
        in_transit: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-50',
        under_maintenance: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50',
        not_in_use: 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100',
        disposed: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50',
    };
    return (
        <Badge variant="outline" className={classes[status] || 'bg-zinc-50 text-zinc-600 border-zinc-100'}>
            {labels[status] || status.replace(/_/g, ' ')}
        </Badge>
    );
};

export default function FixedAssetIndex({
    assets,
    filters,
    branches,
    categories,
    statusOptions,
    branchScoped,
}: {
    assets: { data: AssetRow[] };
    filters: { search?: string; branch_id?: string; asset_category_id?: string; status?: string };
    branches: BranchOpt[];
    categories: CategoryOpt[];
    statusOptions: StatusOpt[];
    branchScoped?: boolean;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [categoryId, setCategoryId] = useState(filters.asset_category_id ? Number(filters.asset_category_id) : null);
    const [status, setStatus] = useState(filters.status || '');

    const applyFilters = () => {
        router.get(route('fixed-assets.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
            asset_category_id: categoryId ?? undefined,
            status: status || undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Fixed assets" />
            <AssetPage>
                <AssetPageHeader
                    icon={Boxes}
                    title="Asset register"
                    description="All fixed assets across head office and 42+ branches."
                >
                    <div className="flex items-center gap-2">
                        {canCreate && (
                            <Link href={route('fixed-assets.import.index')}>
                                <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer">Import CSV</Button>
                            </Link>
                        )}
                        {canCreate && (
                            <Link href={route('fixed-assets.create')}>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer"><Plus className="mr-2 h-4 w-4" />Register asset</Button>
                            </Link>
                        )}
                    </div>
                </AssetPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-rose-800">Error</AlertTitle>
                        <AlertDescription className="text-xs text-rose-700 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                placeholder="Tag, name, serial…"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Branch</label>
                            <ComboSelect
                                value={branchId}
                                onChange={(v) => setBranchId(v)}
                                items={branchComboSelectItems(branches, { numericValue: true })}
                                placeholder="All branches"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Category</label>
                            <ComboSelect
                                value={categoryId}
                                onChange={(v) => setCategoryId(v)}
                                items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                                placeholder="All categories"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                            <ComboSelect
                                value={status || null}
                                onChange={(v) => setStatus(v ? String(v) : '')}
                                items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                                placeholder="All statuses"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div>
                            <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer gap-2" onClick={applyFilters}>
                                <Search className="h-4 w-4" /> Filter
                            </Button>
                        </div>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="Assets Register" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6">Tag</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Name</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Category</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Branch</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Custodian</TableHead>
                                <TableHead className="font-semibold text-zinc-700 text-right">Book value</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                                <TableHead className="py-3.5 pr-6 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-zinc-400 font-medium">
                                        No assets found. Register your first asset.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assets.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                        <TableCell className="font-mono text-xs font-semibold text-zinc-900 py-3.5 pl-6">{row.asset_tag}</TableCell>
                                        <TableCell className="font-medium text-zinc-800">{row.name}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.category?.name ?? '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.branch?.name ?? '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">
                                            {row.custodian ? (
                                                <span className="font-medium text-zinc-700">{employeeDisplayName(row.custodian)}</span>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold text-zinc-800 tabular-nums">
                                            {row.book_value != null || row.purchase_cost != null ? (
                                                formatTakaWithSymbol(row.book_value ?? row.purchase_cost)
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                                        <TableCell className="text-right py-3.5 pr-6 space-x-1.5">
                                            <Link href={route('fixed-assets.show', row.id)}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={route('fixed-assets.edit', row.id)}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
