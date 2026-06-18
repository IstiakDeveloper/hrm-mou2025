import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSurface } from '@/components/page-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { Badge } from '@/components/ui/badge';

type StockRow = {
    branch_id: number;
    branch_name: string;
    branch_code: string | null;
    branch_type: string;
    product_id: number;
    product_name: string;
    product_code: string | null;
    unit: string;
    balance: number;
};

type Props = {
    items: StockRow[];
    filters: { branch_id?: string; product_id?: string };
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    products: { id: number; name: string; unit: string }[];
};

export default function CurrentStockReport({ items, filters, branches, products }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');

    const totalQty = items.reduce((sum, r) => sum + r.balance, 0);

    return (
        <Layout>
            <Head title="Current Stock" />
            <PageSurface>
                <div className="mb-6 border-b border-slate-200 pb-5">
                    <h1 className="text-2xl font-bold text-gray-900">Current Stock</h1>
                    <p className="mt-1 text-sm text-slate-500">Branch-wise balance (Stock In − Disburse)</p>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 items-center">
                    <div className="w-48"><BranchTypeSelect value={branchId} onChange={setBranchId} branches={branches} placeholder="All branches" /></div>
                    <Select value={productId || undefined} onValueChange={setProductId}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="All products" /></SelectTrigger>
                        <SelectContent>
                            {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => router.get(route('inventory.reports.current-stock'), {
                        branch_id: branchId || undefined,
                        product_id: productId || undefined,
                    }, { preserveState: true })}>Apply</Button>
                    <span className="text-sm text-slate-500 ml-auto">Total on hand: <strong className="text-slate-800">{totalQty.toLocaleString()}</strong></span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Branch</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length ? items.map((row) => (
                                <TableRow key={`${row.branch_id}-${row.product_id}`}>
                                    <TableCell className="text-sm font-medium">{row.branch_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{row.branch_type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{row.product_name}</TableCell>
                                    <TableCell className="text-sm text-slate-500">{row.product_code || '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums font-semibold text-sky-700">
                                        {row.balance.toLocaleString()} {row.unit}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No stock on hand.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PageSurface>
        </Layout>
    );
}
