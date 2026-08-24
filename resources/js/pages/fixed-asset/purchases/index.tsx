import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { isAccountant, isSuperAdmin, hasAppPermission } from '@/lib/permissions';
import { formatDisplayDate } from '@/lib/display-date';
import type { SharedData } from '@/types';
import { formatTakaWhole } from '@/lib/taka-format';
import { Edit2, Eye, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PurchaseRow = {
    id: number;
    purchase_no: string;
    purchase_date: string;
    purchase_type: string;
    total_amount: string;
    voucher_no: string | null;
    items_count: number;
    branch?: { name: string } | null;
    project?: { name: string; code: string } | null;
    vendor?: { name: string } | null;
};

export default function AssetPurchaseIndex({
    purchases,
    filters,
    vendors,
    purchaseTypes,
    branches,
    branchScoped,
    scopedBranchId,
}: {
    purchases: { data: PurchaseRow[] };
    filters: Record<string, string | undefined>;
    vendors: { id: number; name: string }[];
    purchaseTypes: { value: string; label: string }[];
    branches: { id: number; name: string }[];
    branchScoped: boolean;
    scopedBranchId: number | null;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const canCreate = hasAppPermission(auth, 'fixed-assets.create') || isAccountant(auth) || isSuperAdmin(auth);
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit') || isAccountant(auth) || isSuperAdmin(auth);
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete') || isAccountant(auth) || isSuperAdmin(auth);

    const apply = (extra: Record<string, string | undefined> = {}) =>
        router.get(route('fixed-asset.purchases.index'), { search, ...extra }, { preserveState: true });

    const handleDelete = () => {
        if (!deleteId) return;
        router.delete(route('fixed-asset.purchases.destroy', deleteId), {
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <Layout>
            <Head title="Asset purchases" />
            <PayrollPage>
                <PayrollPageHeader icon={ShoppingCart} title="Purchase asset" description="Record purchases and auto-create fixed asset register entries.">
                    {canCreate && (
                        <Link href={route('fixed-asset.purchases.create')}>
                            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New purchase</Button>
                        </Link>
                    )}
                </PayrollPageHeader>
                {branchScoped && <BranchScopeAlert className="mb-4" />}
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}
                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="Purchase no, voucher…" className="max-w-xs" />
                        {!branchScoped && (
                            <select className="h-9 rounded-md border px-2 text-sm" defaultValue={filters.branch_id || ''} onChange={(e) => apply({ branch_id: e.target.value || undefined })}>
                                <option value="">All branches</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <select className="h-9 rounded-md border px-2 text-sm" defaultValue={filters.purchase_type || ''} onChange={(e) => apply({ purchase_type: e.target.value || undefined })}>
                            <option value="">All types</option>
                            {purchaseTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <Button variant="outline" onClick={() => apply()}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="Purchase list">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Purchase no</TableHead><TableHead>Date</TableHead><TableHead>Branch</TableHead><TableHead>Vendor</TableHead><TableHead>Type</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.data.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No purchases yet.</TableCell></TableRow>
                            ) : purchases.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-mono text-xs font-semibold">{row.purchase_no}</TableCell>
                                    <TableCell>{formatDisplayDate(row.purchase_date)}</TableCell>
                                    <TableCell>{row.branch?.name || '—'}</TableCell>
                                    <TableCell>{row.vendor?.name || '—'}</TableCell>
                                    <TableCell><Badge variant="outline">{row.purchase_type}</Badge></TableCell>
                                    <TableCell>{row.items_count}</TableCell>
                                    <TableCell className="text-right tabular-nums font-mono font-medium">{formatTakaWhole(row.total_amount)}</TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={route('fixed-asset.purchases.show', row.id)}>
                                                <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600 hover:text-zinc-900" title="View">
                                                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                                                </Button>
                                            </Link>
                                            {canEdit && (
                                                <Link href={route('fixed-asset.purchases.edit', row.id)}>
                                                    <Button variant="outline" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50" title="Edit">
                                                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteId(row.id)}
                                                    className="h-8 px-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Purchase Record?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this purchase record? All fixed assets created under this purchase voucher will also be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete Purchase
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
