import React, { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { hasAppPermission } from '@/lib/permissions';
import { Edit, Plus, Search, Trash2, Package } from 'lucide-react';
import type { SharedData } from '@/types';

type Product = { id: number; name: string; code: string | null; unit: string; is_active: boolean };

type Props = {
    products: { data: Product[] };
    filters: { search?: string };
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
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const unitItems = useMemo(
        () => Object.entries(units).map(([value, label]) => ({ value, label })),
        [units],
    );

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

    return (
        <Layout>
            <Head title="Inventory Products" />
            <PageSurface>
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                        <p className="mt-1 text-sm text-slate-500">Item master — unit select from predefined list</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && router.get(route('inventory.products.index'), { search }, { preserveState: true })}
                            className="h-9 text-sm max-w-xs"
                        />
                        <Button size="sm" className="h-9 bg-sky-600 hover:bg-sky-700" onClick={() => router.get(route('inventory.products.index'), { search }, { preserveState: true })}>
                            <Search className="h-4 w-4" />
                        </Button>
                        {canCreate && (
                            <Button size="sm" className="h-9 bg-sky-600 hover:bg-sky-700" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1" />Add
                            </Button>
                        )}
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

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Status</TableHead>
                                {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length ? products.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-sky-600" />
                                            <span className="font-medium text-sm">{row.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">{row.code || '—'}</TableCell>
                                    <TableCell className="text-sm">{units[row.unit] || row.unit}</TableCell>
                                    <TableCell>
                                        {row.is_active ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                                        ) : (
                                            <Badge variant="outline">Inactive</Badge>
                                        )}
                                    </TableCell>
                                    {(canEdit || canDelete) && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => deleteProduct(row)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={(canEdit || canDelete) ? 5 : 4} className="text-center py-8 text-slate-500">No products yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

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
                                <Button type="submit" disabled={processing} className="bg-sky-600 hover:bg-sky-700">
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
