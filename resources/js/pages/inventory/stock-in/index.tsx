import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSurface } from '@/components/page-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { formatDisplayDate } from '@/lib/display-date';
import { Plus } from 'lucide-react';

type Movement = {
    id: number;
    quantity: number;
    movement_date: string;
    remarks: string | null;
    branch: { name: string; branch_code?: string | null; is_head_office: boolean };
    product: { name: string; unit: string; code?: string | null };
    creator?: { name: string } | null;
};

type Props = {
    movements: { data: Movement[] };
    filters: { branch_id?: string; product_id?: string; date_from?: string; date_to?: string };
    branches: { headOffice: { id: number; name: string; branch_code?: string | null }[]; branches: { id: number; name: string; branch_code?: string | null }[] };
    products: { id: number; name: string; unit: string }[];
};

export default function StockInIndex({ movements, filters, branches, products }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = () => {
        router.get(route('inventory.stock-in.index'), {
            branch_id: branchId || undefined,
            product_id: productId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Stock In" />
            <PageSurface>
                <div className="mb-6 flex flex-col md:flex-row justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Stock In</h1>
                        <p className="mt-1 text-sm text-slate-500">Receipts from Head Office &amp; Branch — date-wise</p>
                    </div>
                    <Link href={route('inventory.stock-in.create')}>
                        <Button className="bg-sky-600 hover:bg-sky-700"><Plus className="h-4 w-4 mr-1" />New Stock In</Button>
                    </Link>
                </div>

                <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <BranchTypeSelect value={branchId} onChange={setBranchId} branches={branches} placeholder="All branches" />
                    <Select value={productId || undefined} onValueChange={setProductId}>
                        <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
                        <SelectContent>
                            {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    <Button onClick={applyFilters} className="bg-sky-600 hover:bg-sky-700">Filter</Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.data.length ? movements.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-sm">{formatDisplayDate(row.movement_date)}</TableCell>
                                    <TableCell className="text-sm">{row.branch.name}</TableCell>
                                    <TableCell className="text-xs">{row.branch.is_head_office ? 'Head Office' : 'Branch'}</TableCell>
                                    <TableCell className="text-sm">{row.product.name}</TableCell>
                                    <TableCell className="text-right tabular-nums font-medium">{row.quantity} {row.product.unit}</TableCell>
                                    <TableCell className="text-sm text-slate-500 max-w-[160px] truncate">{row.remarks || '—'}</TableCell>
                                    <TableCell className="text-sm">{row.creator?.name || '—'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No stock in records.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PageSurface>
        </Layout>
    );
}
