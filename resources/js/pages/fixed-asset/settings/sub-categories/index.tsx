import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { Edit, Layers, Plus, Search, Trash2 } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';
import { hasAppPermission } from '@/lib/permissions';
import type { SharedData } from '@/types';

type CategoryOpt = { id: number; name: string; code: string };

type SubCategoryRow = {
    id: number;
    name: string;
    code: string;
    depreciation_rate: number | null;
    sort_order: number;
    is_active: boolean;
    category?: CategoryOpt | null;
};

type PaginatedSubCategories = {
    data: SubCategoryRow[];
    meta: PaginationMeta;
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
};

export default function AssetSubCategoryIndex({
    subCategories,
    categories,
    filters,
}: {
    subCategories: PaginatedSubCategories;
    categories: CategoryOpt[];
    filters: { search?: string; asset_category_id?: string; per_page?: string };
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [categoryId, setCategoryId] = useState(filters.asset_category_id ? Number(filters.asset_category_id) : null);
    const perPage = filters.per_page || '10';
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    const filterParams = {
        search,
        asset_category_id: categoryId || undefined,
        per_page: perPage,
    };

    const applyFilters = () =>
        router.get(route('fixed-asset.settings.sub-categories.index'), filterParams, { preserveState: true });

    const handlePerPageChange = (value: string) => {
        router.get(
            route('fixed-asset.settings.sub-categories.index'),
            { ...filterParams, per_page: value },
            { preserveState: true },
        );
    };

    const handleDelete = (id: number) => {
        if (!confirm('Delete this sub category?')) return;
        router.delete(route('fixed-asset.settings.sub-categories.destroy', id));
    };

    return (
        <Layout>
            <Head title="Asset Subcategories" />
            <AssetPage>
                <AssetPageHeader
                    icon={Layers}
                    title="Subcategories"
                    description="Subcategories under main categories with optional depreciation rate override."
                >
                    {canCreate && (
                        <Link href={route('fixed-asset.settings.sub-categories.create')}>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" /> Add Subcategory
                            </Button>
                        </Link>
                    )}
                </AssetPageHeader>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                placeholder="Name or code…"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Main Category</label>
                            <ComboSelect
                                value={categoryId}
                                onChange={setCategoryId}
                                items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                                placeholder="All categories"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer px-3.5" onClick={applyFilters}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="All Subcategories" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6">Main Category</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Subcategory Name</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-32">Code</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Depreciation Rate %</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-20">Order</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-24">Status</TableHead>
                                <TableHead className="py-3.5 pr-6 text-right w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subCategories.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                                        No subcategories registered yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subCategories.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                        <TableCell className="font-semibold text-zinc-800 py-3.5 pl-6">
                                            {row.category ? `${row.category.code} — ${row.category.name}` : '—'}
                                        </TableCell>
                                        <TableCell className="font-semibold text-zinc-900">{row.name}</TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-600 font-semibold">{row.code}</TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-850">{row.depreciation_rate ?? '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.sort_order}</TableCell>
                                        <TableCell>
                                            <Badge className={row.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50' : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3.5 pr-6 space-x-1.5">
                                            {canEdit && (
                                                <Link href={route('fixed-asset.settings.sub-categories.edit', row.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit Subcategory"
                                                        className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Delete Subcategory"
                                                    onClick={() => handleDelete(row.id)}
                                                    className="h-8 w-8 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <DataTablePagination
                        meta={subCategories.meta}
                        links={subCategories.links}
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                    />
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
