import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';

export default function EmployeeTypeCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        probation_months: '0',
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('employee-types.store'));
    };

    return (
        <Layout>
            <Head title="Create Employee Type" />
            <div className="container mx-auto py-8">
                <Link href={route('employee-types.index')} className="mb-6 flex w-fit items-center text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to list
                </Link>
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Create Employee Type</h1>
                <form onSubmit={submit}>
                    <Card className="mx-auto max-w-2xl">
                        <CardHeader className="border-b bg-gray-50">
                            <CardTitle>Details</CardTitle>
                            <CardDescription>Name and default probation length</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name ? <p className="text-sm text-red-600">{errors.name}</p> : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="probation_months">Probation (months)</Label>
                                <Input
                                    id="probation_months"
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={data.probation_months}
                                    onChange={(e) => setData('probation_months', e.target.value)}
                                />
                                {errors.probation_months ? <p className="text-sm text-red-600">{errors.probation_months}</p> : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="is_active"
                                    checked={Boolean(data.is_active)}
                                    onCheckedChange={(c) => setData('is_active', Boolean(c))}
                                />
                                <Label htmlFor="is_active" className="cursor-pointer text-sm">
                                    Active
                                </Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2 border-t bg-gray-50">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('employee-types.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Save
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
