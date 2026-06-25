import React, { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';
import { hasAppPermission } from '@/lib/permissions';
import { Edit, Plus, Search, Trash2, Package, X } from 'lucide-react';
import type { SharedData } from '@/types';

type Product = { id: number; name: string; code: string | null; unit: string; is_active: boolean };

type ProductsResponse = {
    data: Product[];
    meta?: PaginationMeta;
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
};

type Props = {
    products: ProductsResponse;
    filters: { search?: string; per_page?: string };
    units: Record<string, string>;
};

const emptyForm = { name: '', code: '', unit: 'pcs', is_active: true };

export default function InventoryProductsIndex({ products, filters, units }: Props) {
    const { auth, flash, errors: pageErrors } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'inventory.create');
    const canEdit = hasAppPermission(auth, 'inventory.edit');
    const canDelete = hasAppPermission(auth, 'inventory.delete');
    const serverErrorMessages = useMemo(
        () => Object.values(pageErrors).filter((msg): msg is string => Boolean(msg)),
        [pageErrors],
    );

    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const unitItems = useMemo(
        () => Object.entries(units).map(([value, label]) => ({ value, label })),
        [units],
    );

    const handleSearch = () => {
        router.get(route('inventory.products.index'), { search, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('inventory.products.index'), { search, per_page: value }, { preserveState: true });
    };

    const resetFilters = () => {
        setSearch('');
        setPerPage('10');
        router.get(route('inventory.products.index'), { per_page: '10' }, { preserveState: true });
    };

    const openCreate = () => {
        setEditing(null);
        reset();
        setData(emptyForm);
        clearErrors();
        setModalOpen(true);
    };

    const openEdit = (row: Product) => {
        setEditing(row);
        setData({ name: row.name, code: row.code || '', unit: row.unit, is_active: row.is_active });
        clearErrors();
        setModalOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => { setModalOpen(false); reset(); setEditing(null); },
        };
        if (editing) {
            put(route('inventory.products.update', editing.id), opts);
        } else {
            post(route('inventory.products.store'), opts);
        }
    };

    const deleteProduct = (row: Product) => {
        if (!confirm(`Delete product "${row.name}"?`)) return;
        router.delete(route('inventory.products.destroy', row.id), { preserveScroll: true });
    };

    const hasPagination = products.meta && products.links;

    return (
        <Layout>
            <Head title="Inventory Products" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
                        <p className="text-sm text-slate-500 mt-1">Item master — unit select from predefined list</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            {canCreate && (
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Product
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {(flash?.error || serverErrorMessages.length > 0) && (
                    <Alert variant="destructive" className="mb-4 rounded-xl">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider">Error</AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                            {flash?.error ? (
                                flash.error
                            ) : (
                                <ul className="list-disc pl-4 space-y-0.5">
                                    {serverErrorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                                </ul>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Code</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Unit</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        {(canEdit || canDelete) && (
                                            <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.data.length > 0 ? products.data.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-semibold text-[13px] text-slate-800">{row.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[13px] text-slate-600 font-medium">{row.code || '—'}</TableCell>
                                            <TableCell className="text-[13px] text-slate-600">{units[row.unit] || row.unit}</TableCell>
                                            <TableCell>
                                                {row.is_active ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Active</Badge>
                                                ) : (
                                                    <Badge variant="outline">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            {(canEdit || canDelete) && (
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                        {canEdit && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                                                title="Edit Product"
                                                                onClick={() => openEdit(row)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                                                title="Delete Product"
                                                                onClick={() => deleteProduct(row)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={(canEdit || canDelete) ? 5 : 4} className="h-24 text-center">
                                                No products found.
                                                {search && (
                                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">
                                                        Clear filters
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasPagination && (
                            <DataTablePagination
                                meta={products.meta}
                                links={products.links}
                                perPage={perPage}
                                onPerPageChange={handlePerPageChange}
                            />
                        )}
                    </CardContent>
                </Card>

                <Dialog open={modalOpen} onOpenChange={(open) => {
                    setModalOpen(open);
                    if (!open) {
                        setEditing(null);
                        reset();
                    }
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-3">
                            <div>
                                <Label>Name</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Code</Label>
                                <Input value={data.code} onChange={(e) => setData('code', e.target.value)} />
                            </div>
                            <div>
                                <Label>Unit</Label>
                                <ComboSelect
                                    value={data.unit}
                                    onChange={(v) => setData('unit', v ?? 'pcs')}
                                    items={unitItems}
                                    portal={false}
                                    clearable={false}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(c) => setData('is_active', Boolean(c))} id="active" />
                                <Label htmlFor="active">Active</Label>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                                    {editing ? 'Update' : 'Save'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageSurface>
        </Layout>
    );
}
