import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { displayDateToServer, toFormDisplayDate } from '@/lib/display-date';
import { ArrowLeft, FileCheck } from 'lucide-react';

export default function AssetWarrantyForm({ record, assets }: { record: any; assets: { id: number; asset_tag: string; manual_asset_code: string | null; name: string }[] }) {
    const isEdit = Boolean(record?.id);
    const { data, setData, post, put, processing, errors, transform } = useForm({
        fixed_asset_id: record?.fixed_asset_id ? String(record.fixed_asset_id) : '',
        provider: record?.provider ?? '',
        warranty_no: record?.warranty_no ?? '',
        start_date: toFormDisplayDate(record?.start_date ?? ''),
        end_date: toFormDisplayDate(record?.end_date ?? ''),
        terms: record?.terms ?? '',
        notes: record?.notes ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            start_date: displayDateToServer(payload.start_date),
            end_date: displayDateToServer(payload.end_date),
        }));
        if (isEdit) put(route('fixed-asset.assets.warranties.update', record.id));
        else post(route('fixed-asset.assets.warranties.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit warranty' : 'Add warranty'} />
            <PayrollPage>
                <Link href={route('fixed-asset.assets.warranties.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={FileCheck} title={isEdit ? 'Edit warranty' : 'Add warranty'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            <div><Label>Asset *</Label><ComboSelect value={data.fixed_asset_id ? Number(data.fixed_asset_id) : null} onChange={(v) => v && setData('fixed_asset_id', String(v))} items={assets.map((a) => ({ value: a.id, label: `${a.manual_asset_code || a.asset_tag} — ${a.name}` }))} disabled={isEdit} />{errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}</div>
                            <div><Label>Provider *</Label><Input value={data.provider} onChange={(e) => setData('provider', e.target.value)} required /></div>
                            <div><Label>Warranty no</Label><Input value={data.warranty_no} onChange={(e) => setData('warranty_no', e.target.value)} /></div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormDateField label="Start" value={data.start_date} onChange={(v) => setData('start_date', v)} error={errors.start_date} />
                                <FormDateField label="End" value={data.end_date} onChange={(v) => setData('end_date', v)} error={errors.end_date} />
                            </div>
                            <div><Label>Terms</Label><Textarea value={data.terms} onChange={(e) => setData('terms', e.target.value)} rows={2} /></div>
                            <div><Label>Notes</Label><Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} /></div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
