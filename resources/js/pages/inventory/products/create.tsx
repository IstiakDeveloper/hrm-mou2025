import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';

export default function InventoryProductCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        unit: 'pcs',
        is_active: true,
    });

    return (
        <Layout>
            <Head title="Add Product" />
            <div className="container mx-auto py-8 max-w-lg">
                <Link href={route('inventory.products.index')} className="mb-4 flex items-center text-sm text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Link>
                <form onSubmit={(e) => { e.preventDefault(); post(route('inventory.products.store')); }}>
                    <Card>
                        <CardHeader><CardTitle>New Product</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Code</Label>
                                <Input value={data.code} onChange={(e) => setData('code', e.target.value)} />
                                {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
                            </div>
                            <div>
                                <Label>Unit</Label>
                                <Input value={data.unit} onChange={(e) => setData('unit', e.target.value)} required />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(c) => setData('is_active', Boolean(c))} id="active" />
                                <Label htmlFor="active">Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild><Link href={route('inventory.products.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing} className="bg-sky-600 hover:bg-sky-700">Save</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
