import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Layers, Search } from 'lucide-react';
import { formatTakaWhole } from '@/lib/taka-format';

type StockRow = {
    category_id: number;
    category_code: string | null;
    category_name: string;
    sub_category_id: number | null;
    sub_category_code: string | null;
    sub_category_name: string | null;
    asset_count: number;
    purchase_total: number;
    book_total: number;
};

export default function StockCategoryWise({
    rows,
    totals,
    filters,
    branches,
    categories,
    subCategories,
    projects,
    financialYears,
    statusOptions,
    branchScoped,
}: {
    rows: StockRow[];
    totals: { asset_count: number; purchase_total: number; book_total: number };
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    categories: { id: number; code: string; name: string }[];
    subCategories: { id: number; code: string; name: string; asset_category_id: number }[];
    projects: { id: number; name: string; code: string }[];
    financialYears: { id: number; label: string; is_active: boolean }[];
    statusOptions: { value: string; label: string }[];
    branchScoped: boolean;
}) {
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [categoryId, setCategoryId] = useState(filters.asset_category_id ? Number(filters.asset_category_id) : null);
    const [subCategoryId, setSubCategoryId] = useState(filters.asset_sub_category_id ? Number(filters.asset_sub_category_id) : null);
    const [projectId, setProjectId] = useState(filters.project_id ? Number(filters.project_id) : null);
    const [status, setStatus] = useState(filters.status || '');
    const [financialYearId, setFinancialYearId] = useState(filters.financial_year_id ? Number(filters.financial_year_id) : null);
    const [includeDisposed, setIncludeDisposed] = useState(filters.include_disposed === '1' || filters.include_disposed === 'true');

    const filteredSubs = categoryId ? subCategories.filter((s) => s.asset_category_id === categoryId) : subCategories;

    const apply = () =>
        router.get(route('fixed-asset.stock.category-wise'), {
            branch_id: branchId ?? undefined,
            asset_category_id: categoryId ?? undefined,
            asset_sub_category_id: subCategoryId ?? undefined,
            project_id: projectId ?? undefined,
            status: status || undefined,
            financial_year_id: financialYearId ?? undefined,
            include_disposed: includeDisposed ? 1 : undefined,
        }, { preserveState: true });

    return (
        <Layout>
            <Head title="Stock Summary (Category Wise)" />
            <AssetPage>
                <AssetPageHeader icon={Layers} title="Stock (Category Wise)" description="Asset count and values grouped by category and sub category." />
                <BranchScopeAlert branchScoped={branchScoped} />

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                        {!branchScoped && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Branch</label>
                                <ComboSelect value={branchId} onChange={setBranchId} items={branchComboSelectItems(branches)} placeholder="All branches" className="h-9 border-zinc-200" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Category</label>
                            <ComboSelect value={categoryId} onChange={(v) => { setCategoryId(v); setSubCategoryId(null); }} items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} placeholder="All categories" className="h-9 border-zinc-200" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sub Category</label>
                            <ComboSelect value={subCategoryId} onChange={setSubCategoryId} items={filteredSubs.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))} placeholder="All sub categories" className="h-9 border-zinc-200" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Project</label>
                            <ComboSelect value={projectId} onChange={setProjectId} items={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} placeholder="All projects" className="h-9 border-zinc-200" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                            <ComboSelect
                                value={status || null}
                                onChange={(v) => setStatus(v ? String(v) : '')}
                                items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                                placeholder="Active stock (excl. disposed)"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Financial Year</label>
                            <ComboSelect
                                value={financialYearId}
                                onChange={setFinancialYearId}
                                items={financialYears.map((y) => ({ value: y.id, label: y.is_active ? `${y.label} (active)` : y.label }))}
                                placeholder="All financial years"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer select-none pb-2">
                            <Checkbox id="include-disposed" checked={includeDisposed} onCheckedChange={(v) => setIncludeDisposed(Boolean(v))} className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
                            <Label htmlFor="include-disposed" className="text-xs font-semibold text-zinc-600 cursor-pointer">Include disposed</Label>
                        </div>
                        <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer gap-2" onClick={apply}>
                            <Search className="h-4 w-4" /> Filter
                        </Button>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="Stock Summary" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6">Category</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Sub Category</TableHead>
                                <TableHead className="font-semibold text-zinc-700 text-right">Quantity</TableHead>
                                <TableHead className="font-semibold text-zinc-700 text-right">Purchase Value</TableHead>
                                <TableHead className="font-semibold text-zinc-700 text-right pr-6">Book Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-zinc-400 font-medium">
                                        No stock data for selected filters.
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((row, i) => (
                                <TableRow key={`${row.category_id}-${row.sub_category_id ?? 'x'}-${i}`} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                    <TableCell className="font-medium text-zinc-800 py-3.5 pl-6">{row.category_code ? `${row.category_code} — ${row.category_name}` : row.category_name}</TableCell>
                                    <TableCell className="text-zinc-600 text-xs">{row.sub_category_name ? `${row.sub_category_code} — ${row.sub_category_name}` : '—'}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-semibold text-zinc-800 tabular-nums">{row.asset_count}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-semibold text-zinc-800 tabular-nums">৳{formatTakaWhole(row.purchase_total)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-semibold text-zinc-800 tabular-nums pr-6">৳{formatTakaWhole(row.book_total)}</TableCell>
                                </TableRow>
                            ))}
                            {rows.length > 0 && (
                                <TableRow className="bg-zinc-50 font-bold border-t border-zinc-200">
                                    <TableCell colSpan={2} className="py-4 pl-6 text-zinc-900">Total</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-zinc-950 tabular-nums">{totals.asset_count}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-zinc-950 tabular-nums">৳{formatTakaWhole(totals.purchase_total)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-zinc-950 tabular-nums pr-6">৳{formatTakaWhole(totals.book_total)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
