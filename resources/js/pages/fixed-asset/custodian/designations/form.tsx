import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Briefcase } from 'lucide-react';

type Data = { id: number; sl: number; code: string; name: string; sort_order: number; is_active: boolean };

export default function CustodianDesignationForm({ designation, nextSl }: { designation: Data | null; nextSl: number | null }) {
    const isEdit = Boolean(designation?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        sl: String(designation?.sl ?? nextSl ?? 1),
        code: designation?.code ?? '',
        name: designation?.name ?? '',
        sort_order: String(designation?.sort_order ?? 0),
        is_active: designation?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.custodian.designations.update', designation!.id));
        else post(route('fixed-asset.custodian.designations.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit designation' : 'Add designation'} />
            <PayrollPage>
                <Link href={route('fixed-asset.custodian.designations.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={Briefcase} title={isEdit ? 'Edit designation' : 'Add designation'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><Label>SL</Label><Input type="number" min={1} value={data.sl} onChange={(e) => setData('sl', e.target.value)} /></div>
                                <div><Label>Code {isEdit ? '*' : ''}</Label><Input value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} required={isEdit} />{errors.code && <p className="text-sm text-red-500">{errors.code}</p>}</div>
                            </div>
                            <div><Label>Name *</Label><Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />{errors.name && <p className="text-sm text-red-500">{errors.name}</p>}</div>
                            <div><Label>Order serial</Label><Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} /><Label>Active</Label></div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
