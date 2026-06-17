import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Trash2 } from 'lucide-react';

type ReasonData = { id: number; sl: number; code: string; name: string; sort_order: number; is_active: boolean };

export default function DisposalReasonForm({ reason, nextSl }: { reason: ReasonData | null; nextSl: number | null }) {
    const isEdit = Boolean(reason?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        sl: String(reason?.sl ?? nextSl ?? 1),
        code: reason?.code ?? '',
        name: reason?.name ?? '',
        sort_order: String(reason?.sort_order ?? 0),
        is_active: reason?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.disposal.reasons.update', reason!.id));
        else post(route('fixed-asset.disposal.reasons.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit disposal reason' : 'Add disposal reason'} />
            <PayrollPage>
                <Link href={route('fixed-asset.disposal.reasons.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={Trash2} title={isEdit ? 'Edit disposal reason' : 'Add disposal reason'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-xl">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><Label>SL</Label><Input type="number" min={1} value={data.sl} onChange={(e) => setData('sl', e.target.value)} /></div>
                                <div><Label>Code</Label><Input value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="Auto from name" /></div>
                            </div>
                            <div><Label>Name *</Label><Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />{errors.name && <p className="text-sm text-red-500">{errors.name}</p>}</div>
                            <div><Label>Sort order</Label><Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} /></div>
                            <label className="flex items-center gap-2"><Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} /><Label>Active</Label></label>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
