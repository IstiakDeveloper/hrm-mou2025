import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { ArrowLeft } from 'lucide-react';

type Props = {
    branches: { headOffice: { id: number; name: string; branch_code?: string | null }[]; branches: { id: number; name: string; branch_code?: string | null }[] };
    products: { id: number; name: string; unit: string }[];
};

export default function StockInCreate({ branches, products }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        product_id: '',
        quantity: '',
        movement_date: new Date().toISOString().slice(0, 10),
        remarks: '',
    });

    return (
        <Layout>
            <Head title="New Stock In" />
            <div className="container mx-auto py-8 max-w-lg">
                <Link href={route('inventory.stock-in.index')} className="mb-4 flex items-center text-sm text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Link>
                <form onSubmit={(e) => { e.preventDefault(); post(route('inventory.stock-in.store')); }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock In</CardTitle>
                            <CardDescription>Select Head Office or Branch, product, quantity &amp; date</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Branch</Label>
                                <BranchTypeSelect value={data.branch_id} onChange={(v) => setData('branch_id', v)} branches={branches} />
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
                                {errors.product_id && <p className="text-sm text-red-600">{errors.product_id}</p>}
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input type="number" min={1} value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} required />
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
                            <Button type="button" variant="outline" asChild><Link href={route('inventory.stock-in.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing} className="bg-sky-600 hover:bg-sky-700">Save Stock In</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
