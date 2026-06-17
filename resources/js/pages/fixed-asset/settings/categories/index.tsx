import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { Boxes, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';
import { hasAppPermission } from '@/lib/permissions';
import type { SharedData } from '@/types';

type CategoryRow = {
    id: number;
    sl: number;
    code: string;
    name: string;
    name_bn: string | null;
    depreciation_method: string | null;
    depreciation_rate: number | null;
    sort_order: number;
    is_active: boolean;
    fixed_assets_count: number;
};

type PaginatedCategories = {
    data: CategoryRow[];
    meta: PaginationMeta;
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
};

export default function AssetCategoryIndex({
    categories,
    filters,
    depreciationMethods,
}: {
    categories: PaginatedCategories;
    filters: { search?: string; per_page?: string };
    depreciationMethods: Record<string, string>;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const perPage = filters.per_page || '10';
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    const handleSearch = () =>
        router.get(route('fixed-asset.settings.categories.index'), { search, per_page: perPage }, { preserveState: true });

    const handlePerPageChange = (value: string) => {
        router.get(route('fixed-asset.settings.categories.index'), { search, per_page: value }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (!confirm('Delete this category?')) return;
        router.delete(route('fixed-asset.settings.categories.destroy', id));
    };

    return (
        <Layout>
            <Head title="Asset Categories" />
            <AssetPage>
                <AssetPageHeader
                    icon={Boxes}
                    title="Categories"
                    description="Main asset categories with depreciation method and rate defaults."
                >
                    {canCreate && (
                        <Link href={route('fixed-asset.settings.categories.create')}>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" /> Add Category
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
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-rose-800">Error</AlertTitle>
                        <AlertDescription className="text-xs text-rose-700 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="flex items-end gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Name or shortcode…"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer px-3.5" onClick={handleSearch}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="All Categories" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6 w-16">SL</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-32">Shortcode</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Category Name</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Depreciation</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Rate %</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-20">Order</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-24">Assets</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-24">Status</TableHead>
                                <TableHead className="py-3.5 pr-6 text-right w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-12 text-center text-zinc-400 font-medium">
                                        No categories registered yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                        <TableCell className="font-semibold text-zinc-500 py-3.5 pl-6">{row.sl}</TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-600 font-semibold">{row.code}</TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-zinc-900">{row.name}</div>
                                            {row.name_bn && (
                                                <div className="text-[11px] font-medium text-zinc-400 mt-0.5">{row.name_bn}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-zinc-600 text-xs font-medium">
                                            {row.depreciation_method
                                                ? depreciationMethods[row.depreciation_method] ?? row.depreciation_method
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-800">{row.depreciation_rate ?? '—'}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{row.sort_order}</TableCell>
                                        <TableCell className="font-mono text-xs font-semibold text-zinc-800">{row.fixed_assets_count}</TableCell>
                                        <TableCell>
                                            <Badge className={row.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50' : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3.5 pr-6 space-x-1.5">
                                            {canEdit && (
                                                <Link href={route('fixed-asset.settings.categories.edit', row.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit Category"
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
                                                    title="Delete Category"
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
                        meta={categories.meta}
                        links={categories.links}
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                    />
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
