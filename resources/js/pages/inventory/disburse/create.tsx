import React, { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    current_branch_id: number | null;
};

type Props = {
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    products: { id: number; name: string; unit: string }[];
    employees: Employee[];
};

export default function DisburseCreate({ branches, products, employees }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        product_id: '',
        employee_id: '',
        quantity: '',
        movement_date: new Date().toISOString().slice(0, 10),
        remarks: '',
    });
    const [available, setAvailable] = useState<number | null>(null);

    useEffect(() => {
        if (!data.branch_id || !data.product_id) {
            setAvailable(null);
            return;
        }
        axios.get(route('inventory.disburse.stock-check'), {
            params: { branch_id: data.branch_id, product_id: data.product_id },
        }).then((res) => setAvailable(res.data.available)).catch(() => setAvailable(null));
    }, [data.branch_id, data.product_id]);

    const filteredEmployees = data.branch_id
        ? employees.filter((e) => String(e.current_branch_id) === data.branch_id)
        : employees;

    return (
        <Layout>
            <Head title="New Disburse" />
            <div className="container mx-auto py-8 max-w-lg">
                <Link href={route('inventory.disburse.index')} className="mb-4 flex items-center text-sm text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Link>
                <form onSubmit={(e) => { e.preventDefault(); post(route('inventory.disburse.store')); }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Disburse to Employee</CardTitle>
                            <CardDescription>Issue stock from branch inventory</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>From Branch</Label>
                                <BranchTypeSelect value={data.branch_id} onChange={(v) => setData({ ...data, branch_id: v, employee_id: '' })} branches={branches} />
                                {errors.branch_id && <p className="text-sm text-red-600">{errors.branch_id}</p>}
                            </div>
                            <div>
                                <Label>Product</Label>
                                <Select value={data.product_id || undefined} onValueChange={(v) => setData('product_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                    <SelectContent>
                                        {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.unit})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {available !== null && (
                                    <p className="text-xs text-slate-500 mt-1">Available at branch: <strong>{available}</strong></p>
                                )}
                                {errors.product_id && <p className="text-sm text-red-600">{errors.product_id}</p>}
                            </div>
                            <div>
                                <Label>Employee</Label>
                                <Select value={data.employee_id || undefined} onValueChange={(v) => setData('employee_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredEmployees.map((e) => (
                                            <SelectItem key={e.id} value={String(e.id)}>
                                                {e.employee_id} — {employeeDisplayName(e)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.employee_id && <p className="text-sm text-red-600">{errors.employee_id}</p>}
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input type="number" min={1} max={available ?? undefined} value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} required />
                                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
                            </div>
                            <div>
                                <Label>Date</Label>
                                <Input type="date" value={data.movement_date} onChange={(e) => setData('movement_date', e.target.value)} required />
                            </div>
                            <div>
                                <Label>Remarks</Label>
                                <Input value={data.remarks} onChange={(e) => setData('remarks', e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild><Link href={route('inventory.disburse.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing} className="bg-sky-600 hover:bg-sky-700">Disburse</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
