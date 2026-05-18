import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { Boxes, Edit, Eye, Plus, Search } from 'lucide-react';

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
    custodian?: { id: number; employee_id: string; first_name: string; last_name: string } | null;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    in_transit: 'outline',
    under_maintenance: 'secondary',
    disposed: 'destructive',
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
            <PayrollPage>
                <PayrollPageHeader
                    icon={Boxes}
                    title="Asset register"
                    description="All fixed assets across head office and 42+ branches."
                >
                    <div className="flex gap-2">
                        {canCreate && (
                            <Link href={route('fixed-assets.import.index')}>
                                <Button size="sm" variant="outline">Import CSV</Button>
                            </Link>
                        )}
                        {canCreate && (
                            <Link href={route('fixed-assets.create')}>
                                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Register asset</Button>
                            </Link>
                        )}
                    </div>
                </PayrollPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Tag, name, serial…"
                        />
                        <ComboSelect
                            value={branchId}
                            onChange={(v) => setBranchId(v)}
                            items={branches.map((b) => ({
                                value: b.id,
                                label: b.is_head_office ? `${b.name} (HO)` : b.name,
                                keywords: b.branch_code ?? '',
                            }))}
                            placeholder="All branches"
                        />
                        <ComboSelect
                            value={categoryId}
                            onChange={(v) => setCategoryId(v)}
                            items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                            placeholder="All categories"
                        />
                        <ComboSelect
                            value={status || null}
                            onChange={(v) => setStatus(v ? String(v) : '')}
                            items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                            placeholder="All statuses"
                        />
                        <Button variant="outline" onClick={applyFilters}><Search className="mr-2 h-4 w-4" />Filter</Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Assets">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tag</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Custodian</TableHead>
                                <TableHead>Book value</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        No assets found. Register your first asset.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assets.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.asset_tag}</TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.category?.name ?? '—'}</TableCell>
                                        <TableCell>{row.branch?.name ?? '—'}</TableCell>
                                        <TableCell>
                                            {row.custodian
                                                ? `${row.custodian.first_name} ${row.custodian.last_name}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>{row.book_value ?? row.purchase_cost ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[row.status] ?? 'secondary'}>
                                                {row.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="space-x-1 text-right">
                                            <Link href={route('fixed-assets.show', row.id)}>
                                                <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                                            </Link>
                                            <Link href={route('fixed-assets.edit', row.id)}>
                                                <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                                            </Link>
                                        </TableCell>
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
