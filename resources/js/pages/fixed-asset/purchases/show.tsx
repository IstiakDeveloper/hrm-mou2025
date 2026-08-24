import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Edit2, ShoppingCart, Trash2 } from 'lucide-react';
import { isAccountant, isSuperAdmin, hasAppPermission } from '@/lib/permissions';
import { employeeDisplayName } from '@/lib/employee-name';
import { formatDisplayDate } from '@/lib/display-date';
import { formatTakaWhole } from '@/lib/taka-format';
import type { SharedData } from '@/types';
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

type AssetRef = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; purchase_cost: string; status: string };
type ItemRow = {
    id: number;
    quantity: number;
    model_no: string | null;
    depreciation_rate: string | null;
    unit_purchase_amount: string;
    total_amount: string;
    is_insurance: boolean;
    is_warranty: boolean;
    is_guarantee: boolean;
    floor_no: string | null;
    room_no: string | null;
    photo_url: string | null;
    category?: { code: string; name: string } | null;
    sub_category?: { code: string; name: string } | null;
    custodian?: { name: string; employee?: { employee_id: string; name_en: string } | null } | null;
    assets: AssetRef[];
};

export default function AssetPurchaseShow({ purchase }: { purchase: Record<string, unknown> }) {
    const { auth } = usePage<SharedData>().props;
    const [confirmDelete, setConfirmDelete] = useState(false);

    const canEdit = hasAppPermission(auth, 'fixed-assets.edit') || isAccountant(auth) || isSuperAdmin(auth);
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete') || isAccountant(auth) || isSuperAdmin(auth);

    const p = purchase as {
        id: number;
        purchase_no: string;
        purchase_date: string;
        purchase_type_label: string;
        voucher_no: string | null;
        ledger_no: string | null;
        account_head: string | null;
        description: string | null;
        total_amount: string;
        branch?: { name: string; branch_code: string } | null;
        project?: { name: string; code: string } | null;
        vendor?: { name: string } | null;
        creator?: { name: string } | null;
        items: ItemRow[];
    };

    const handleDelete = () => {
        router.delete(route('fixed-asset.purchases.destroy', p.id));
    };

    return (
        <Layout>
            <Head title={`Purchase ${p.purchase_no}`} />
            <PayrollPage>
                <Link href={route('fixed-asset.purchases.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to purchases
                </Link>
                <PayrollPageHeader
                    icon={ShoppingCart}
                    title={p.purchase_no}
                    description={`Purchased on ${formatDisplayDate(p.purchase_date)}`}
                >
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Link href={route('fixed-asset.purchases.edit', p.id)}>
                                <Button variant="outline" size="sm">
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                </Button>
                            </Link>
                        )}
                        {canDelete && (
                            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        )}
                    </div>
                </PayrollPageHeader>
                <div className="mb-4 grid gap-4 lg:grid-cols-2">
                    <PayrollSectionCard title="Purchase details">
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-muted-foreground">Branch</dt><dd>{p.branch?.name}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Project</dt><dd>{p.project ? `${p.project.code} — ${p.project.name}` : '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Vendor</dt><dd>{p.vendor?.name || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>{p.purchase_type_label}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Voucher / Ledger</dt><dd>{[p.voucher_no, p.ledger_no].filter(Boolean).join(' / ') || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Account head</dt><dd>{p.account_head || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold tabular-nums">{formatTakaWhole(p.total_amount)}</dd></div>
                            {p.description && <div><dt className="text-muted-foreground">Description</dt><dd className="mt-1">{p.description}</dd></div>}
                        </dl>
                    </PayrollSectionCard>
                </div>
                {p.items.map((item) => (
                    <PayrollSectionCard key={item.id} title={`${item.category?.name}${item.sub_category ? ` / ${item.sub_category.name}` : ''}`} className="mb-4">
                        <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
                            <span>Rate: {formatTakaWhole(item.unit_purchase_amount)}</span>
                            <span>Depreciation: {item.depreciation_rate ?? '—'}%</span>
                            {item.is_insurance && <Badge variant="outline">Insurance</Badge>}
                            {item.is_warranty && <Badge variant="outline">Warranty</Badge>}
                            {item.is_guarantee && <Badge variant="outline">Guarantee</Badge>}
                            {item.custodian && <span>Custodian: {item.custodian.employee ? employeeDisplayName(item.custodian.employee) : item.custodian.name}</span>}
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Manual code</TableHead><TableHead>System tag</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.assets.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-mono text-xs">{a.manual_asset_code || '—'}</TableCell>
                                        <TableCell className="font-mono text-xs">{a.asset_tag}</TableCell>
                                        <TableCell>{a.name}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatTakaWhole(a.purchase_cost)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={route('fixed-assets.show', a.id)}><Button variant="ghost" size="sm">Open</Button></Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </PayrollSectionCard>
                ))}
            </PayrollPage>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
