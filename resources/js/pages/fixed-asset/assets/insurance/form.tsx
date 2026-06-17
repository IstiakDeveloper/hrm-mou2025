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
import { ArrowLeft, Shield } from 'lucide-react';

type RecordData = {
    id: number;
    fixed_asset_id: number;
    provider: string;
    policy_no: string | null;
    start_date: string | null;
    end_date: string | null;
    premium_amount: string | null;
    coverage_amount: string | null;
    notes: string | null;
};

export default function AssetInsuranceForm({ record, assets }: { record: RecordData | null; assets: { id: number; asset_tag: string; manual_asset_code: string | null; name: string }[] }) {
    const isEdit = Boolean(record?.id);
    const { data, setData, post, put, processing, errors, transform } = useForm({
        fixed_asset_id: record?.fixed_asset_id ? String(record.fixed_asset_id) : '',
        provider: record?.provider ?? '',
        policy_no: record?.policy_no ?? '',
        start_date: toFormDisplayDate(record?.start_date ?? ''),
        end_date: toFormDisplayDate(record?.end_date ?? ''),
        premium_amount: record?.premium_amount != null ? String(record.premium_amount) : '',
        coverage_amount: record?.coverage_amount != null ? String(record.coverage_amount) : '',
        notes: record?.notes ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            start_date: displayDateToServer(payload.start_date),
            end_date: displayDateToServer(payload.end_date),
        }));
        if (isEdit) put(route('fixed-asset.assets.insurance.update', record!.id));
        else post(route('fixed-asset.assets.insurance.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit insurance' : 'Add insurance'} />
            <PayrollPage>
                <Link href={route('fixed-asset.assets.insurance.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={Shield} title={isEdit ? 'Edit insurance' : 'Add insurance'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect value={data.fixed_asset_id ? Number(data.fixed_asset_id) : null} onChange={(v) => v && setData('fixed_asset_id', String(v))} items={assets.map((a) => ({ value: a.id, label: `${a.manual_asset_code || a.asset_tag} — ${a.name}` }))} disabled={isEdit} />
                                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            <div><Label>Provider *</Label><Input value={data.provider} onChange={(e) => setData('provider', e.target.value)} required />{errors.provider && <p className="text-sm text-red-500">{errors.provider}</p>}</div>
                            <div><Label>Policy no</Label><Input value={data.policy_no} onChange={(e) => setData('policy_no', e.target.value)} /></div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormDateField label="Start date" value={data.start_date} onChange={(v) => setData('start_date', v)} error={errors.start_date} />
                                <FormDateField label="End date" value={data.end_date} onChange={(v) => setData('end_date', v)} error={errors.end_date} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><Label>Premium</Label><Input type="number" min={0} step="0.01" value={data.premium_amount} onChange={(e) => setData('premium_amount', e.target.value)} /></div>
                                <div><Label>Coverage amount</Label><Input type="number" min={0} step="0.01" value={data.coverage_amount} onChange={(e) => setData('coverage_amount', e.target.value)} /></div>
                            </div>
                            <div><Label>Notes</Label><Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} /></div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
