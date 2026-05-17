import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function SalaryHeadCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        type: 'earning' as 'earning' | 'deduction',
        sort_order: '0',
        description: '',
        is_active: true,
    });

    return (
        <Layout>
            <Head title="Create Salary Head" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('salary-heads.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form onSubmit={(e) => { e.preventDefault(); post(route('salary-heads.store')); }}>
                    <Card>
                        <CardHeader><CardTitle>New salary head</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. House Rent" required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Type *</Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v as 'earning' | 'deduction')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="earning">Earning</SelectItem>
                                        <SelectItem value="deduction">Deduction</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                            </div>
                            <div>
                                <Label>Sort order</Label>
                                <Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild><Link href={route('salary-heads.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing}>Save</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
