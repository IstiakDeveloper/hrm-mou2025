import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { Eye, Search, MapPin } from 'lucide-react';
import { formatTakaWithSymbol } from '@/lib/taka-format';

type AssetRow = {
    id: number;
    asset_tag: string;
    manual_asset_code: string | null;
    name: string;
    status: string;
    purchase_cost: string | null;
    book_value: string | null;
    floor_no: string | null;
    room_no: string | null;
    category?: { code: string; name: string } | null;
    sub_category?: { code: string; name: string } | null;
    branch?: { name: string } | null;
    project?: { name: string; code: string } | null;
    asset_custodian?: ({ name: string } & { employee?: EmployeeNameFields & { employee_id: string } | null }) | null;
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

export default function AssetTrackingIndex({
    assets,
    filters,
    branches,
    projects,
    categories,
    subCategories,
    custodians,
    statusOptions,
    branchScoped,
}: {
    assets: { data: AssetRow[] };
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    projects: { id: number; name: string; code: string }[];
    categories: { id: number; code: string; name: string }[];
    subCategories: { id: number; code: string; name: string; asset_category_id: number }[];
    custodians: { id: number; name: string }[];
    statusOptions: { value: string; label: string }[];
    branchScoped: boolean;
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [projectId, setProjectId] = useState(filters.project_id ? Number(filters.project_id) : null);
    const [categoryId, setCategoryId] = useState(filters.asset_category_id ? Number(filters.asset_category_id) : null);
    const [subCategoryId, setSubCategoryId] = useState(filters.asset_sub_category_id ? Number(filters.asset_sub_category_id) : null);
    const [custodianId, setCustodianId] = useState(filters.asset_custodian_id ? Number(filters.asset_custodian_id) : null);
    const [status, setStatus] = useState(filters.status || '');

    const filteredSubs = categoryId ? subCategories.filter((s) => s.asset_category_id === categoryId) : subCategories;

    const apply = () =>
        router.get(route('fixed-asset.assets.tracking.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
            project_id: projectId ?? undefined,
            asset_category_id: categoryId ?? undefined,
            asset_sub_category_id: subCategoryId ?? undefined,
            asset_custodian_id: custodianId ?? undefined,
            status: status || undefined,
        }, { preserveState: true });

    return (
        <Layout>
            <Head title="Asset tracking" />
            <AssetPage>
                <AssetPageHeader icon={MapPin} title="Asset tracking" description="Location, custodian, project, and status for all active assets." />
                
                {branchScoped && <BranchScopeAlert branchScoped={branchScoped} />}
                
                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Search</label>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="Tag, code, name…" className="h-9 border-zinc-200" />
                        </div>
                        
                        {!branchScoped && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Branch</label>
                                <ComboSelect value={branchId} onChange={setBranchId} items={branchComboSelectItems(branches)} placeholder="All branches" className="h-9 border-zinc-200" />
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Project</label>
                            <ComboSelect value={projectId} onChange={setProjectId} items={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} placeholder="All projects" className="h-9 border-zinc-200" />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Category</label>
                            <ComboSelect value={categoryId} onChange={(v) => { setCategoryId(v); setSubCategoryId(null); }} items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} placeholder="All categories" className="h-9 border-zinc-200" />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sub Category</label>
                            <ComboSelect value={subCategoryId} onChange={setSubCategoryId} items={filteredSubs.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))} placeholder="All sub categories" className="h-9 border-zinc-200" />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Custodian</label>
                            <ComboSelect value={custodianId} onChange={setCustodianId} items={custodians.map((c) => ({ value: c.id, label: c.name }))} placeholder="All custodians" className="h-9 border-zinc-200" />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="">All statuses</option>
                                {statusOptions.filter((s) => s.value !== 'disposed').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer gap-2" onClick={apply}>
                                <Search className="h-4 w-4" /> Filter
                            </Button>
                        </div>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="Assets Directory" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6">Code</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Name</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Branch</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Project</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Category</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Custodian</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Location</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                                <TableHead className="font-semibold text-zinc-700 text-right">Book value</TableHead>
                                <TableHead className="py-3.5 pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-12 text-center text-zinc-400 font-medium">
                                        No assets found in the registry.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assets.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                        <TableCell className="font-mono text-xs font-semibold text-zinc-900 py-3.5 pl-6">
                                            {row.manual_asset_code || row.asset_tag}
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-800">{row.name}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.branch?.name || '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.project ? row.project.code : '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.sub_category?.name || row.category?.name || '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">
                                            {row.asset_custodian ? (
                                                row.asset_custodian.employee ? (
                                                    <span className="font-medium text-zinc-700">{employeeDisplayName(row.asset_custodian.employee)}</span>
                                                ) : (
                                                    row.asset_custodian.name
                                                )
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-xs">{[row.floor_no, row.room_no].filter(Boolean).join(' / ') || '—'}</TableCell>
                                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold text-zinc-800 tabular-nums">
                                            {row.book_value != null ? formatTakaWithSymbol(row.book_value) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right py-3.5 pr-6">
                                            <Link href={route('fixed-assets.show', row.id)}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer">
                                                    <Eye className="h-4 w-4" />
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
