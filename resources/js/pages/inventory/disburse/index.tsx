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
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { Plus } from 'lucide-react';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Movement = {
    id: number;
    quantity: number;
    movement_date: string;
    remarks: string | null;
    branch: { name: string };
    product: { name: string; unit: string };
    employee: Employee | null;
    creator?: { name: string } | null;
};

type Props = {
    movements: { data: Movement[] };
    filters: { branch_id?: string; product_id?: string; date_from?: string; date_to?: string };
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    products: { id: number; name: string; unit: string }[];
};

export default function DisburseIndex({ movements, filters, branches, products }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    return (
        <Layout>
            <Head title="Disburse Report" />
            <PageSurface>
                <div className="mb-6 flex flex-col md:flex-row justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Disburse</h1>
                        <p className="mt-1 text-sm text-slate-500">Items issued to employees — filter by date, branch, product</p>
                    </div>
                    <Link href={route('inventory.disburse.create')}>
                        <Button className="bg-sky-600 hover:bg-sky-700"><Plus className="h-4 w-4 mr-1" />New Disburse</Button>
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
                    <Button onClick={() => router.get(route('inventory.disburse.index'), {
                        branch_id: branchId || undefined,
                        product_id: productId || undefined,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                    }, { preserveState: true })} className="bg-sky-600 hover:bg-sky-700">Filter</Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead>Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.data.length ? movements.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-sm">{formatDisplayDate(row.movement_date)}</TableCell>
                                    <TableCell className="text-sm">{row.branch.name}</TableCell>
                                    <TableCell className="text-sm">
                                        {row.employee ? `${row.employee.employee_id} — ${employeeDisplayName(row.employee)}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm">{row.product.name}</TableCell>
                                    <TableCell className="text-right tabular-nums font-medium">{row.quantity} {row.product.unit}</TableCell>
                                    <TableCell className="text-sm text-slate-500 max-w-[160px] truncate">{row.remarks || '—'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No disburse records.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PageSurface>
        </Layout>
    );
}
