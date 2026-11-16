import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import InputError from '@/components/input-error';
import { ArrowLeft, Layers } from 'lucide-react';

interface Designation {
    id: number;
    name: string;
}

export default function LeaveSettingsCreate({ designations }: { designations: Designation[] }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        context: 'head_office' as 'head_office' | 'branch',
        max_leave_days: '3',
        approver_type: 'department_head' as
            | 'department_head'
            | 'executive_director'
            | 'branch_manager'
            | 'branch_head'
            | 'designation',
        designation_id: '',
        is_active: true,
    });

    transform((form) => ({
        ...form,
        max_leave_days: Number(form.max_leave_days),
        designation_id: form.designation_id === '' ? null : Number(form.designation_id),
        is_active: Boolean(form.is_active),
    }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('leave.settings.store'));
    };

    return (
        <Layout>
            <Head title="Add leave approval tier" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link
                        href={route('leave.settings.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back
                    </Link>
                </div>

                <h1 className="mb-2 text-3xl font-bold text-gray-900">Add tier</h1>
                <p className="mb-8 max-w-2xl text-gray-600">
                    Set the <strong>maximum</strong> leave length (in days) this row covers. Example: 3 + Department head
                    means 1–3 day requests use that step; add another row with a higher max (e.g. 366) + Executive director
                    for longer leave.
                </p>

                <form onSubmit={submit}>
                    <Card className="mx-auto max-w-lg">
                        <CardHeader className="border-b bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-emerald-100 p-1.5">
                                    <Layers className="h-5 w-5 text-emerald-700" />
                                </div>
                                <div>
                                    <CardTitle>Tier</CardTitle>
                                    <CardDescription>Head office or branch</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div className="space-y-2">
                                <Label>Where</Label>
                                <Select
                                    value={data.context}
                                    onValueChange={(v) => setData('context', v as 'head_office' | 'branch')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="head_office">Head office</SelectItem>
                                        <SelectItem value="branch">Branch</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.context} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_leave_days">
                                    Up to how many days? <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="max_leave_days"
                                    type="number"
                                    min={1}
                                    max={366}
                                    value={data.max_leave_days}
                                    onChange={(e) => setData('max_leave_days', e.target.value)}
                                />
                                <InputError message={errors.max_leave_days} />
                            </div>

                            <div className="space-y-2">
                                <Label>Who approves / gets notified</Label>
                                <Select
                                    value={data.approver_type}
                                    onValueChange={(v) =>
                                        setData(
                                            'approver_type',
                                            v as
                                                | 'department_head'
                                                | 'executive_director'
                                                | 'branch_manager'
                                                | 'branch_head'
                                                | 'designation',
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="department_head">Department head</SelectItem>
                                        <SelectItem value="executive_director">Executive director</SelectItem>
                                        <SelectItem value="branch_manager">Branch manager</SelectItem>
                                        <SelectItem value="branch_head">Branch head</SelectItem>
                                        <SelectItem value="designation">By designation…</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.approver_type} />
                            </div>

                            {data.approver_type === 'designation' && (
                                <div className="space-y-2">
                                    <Label>
                                        Designation <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={data.designation_id ? String(data.designation_id) : ''}
                                        onValueChange={(v) => setData('designation_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="e.g. Regional Manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {designations.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.designation_id} />
                                    <p className="text-xs text-muted-foreground">
                                        Branch: only people in the <em>same branch</em> with this designation. Head
                                        office: anyone in the org with this designation.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="is_active">Active</Label>
                                    <p className="text-sm text-muted-foreground">Off = ignored.</p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(c) => setData('is_active', c)}
                                />
                            </div>
                            <InputError message={errors.is_active} />
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving…' : 'Save'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
