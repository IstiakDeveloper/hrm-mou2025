import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

type PayscaleOption = { id: number; name: string };
type Grade = { id: number; payscale_id: number; name: string | null; sort_order: number; is_active: boolean };

export default function SalaryGradeEdit({ grade, payscales }: { grade: Grade; payscales: PayscaleOption[] }) {
    const { data, setData, put, processing, errors } = useForm({
        payscale_id: String(grade.payscale_id),
        name: grade.name || '',
        sort_order: String(grade.sort_order ?? 0),
        is_active: grade.is_active,
    });

    return (
        <Layout>
            <Head title="Edit Salary Grade" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('salary-grades.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form onSubmit={(e) => { e.preventDefault(); put(route('salary-grades.update', grade.id)); }}>
                    <Card>
                        <CardHeader><CardTitle>Edit salary grade</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Payscale *</Label>
                                <Select value={data.payscale_id} onValueChange={(v) => setData('payscale_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select payscale" /></SelectTrigger>
                                    <SelectContent>
                                        {payscales.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.payscale_id && <p className="text-sm text-red-500">{errors.payscale_id}</p>}
                            </div>
                            <div>
                                <Label>Grade name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Sort order</Label>
                                <Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild><Link href={route('salary-grades.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing}>Update</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
