import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Wrench } from 'lucide-react';

type MaintenanceData = {
    id: number;
    fixed_asset_id: number;
    maintenance_type: string;
    status: string;
    maintenance_date: string;
    completed_date: string | null;
    next_due_date: string | null;
    description: string;
    cost: string | null;
    service_provider: string | null;
    asset_tag?: string;
};

export default function AssetMaintenanceForm({
    maintenance,
    prefillAsset,
    assets,
    typeOptions,
    statusOptions,
}: {
    maintenance: MaintenanceData | null;
    prefillAsset: { id: number; asset_tag: string; name: string } | null;
    assets: { id: number; asset_tag: string; name: string }[];
    typeOptions: { value: string; label: string }[];
    statusOptions: { value: string; label: string }[];
}) {
    const isEdit = Boolean(maintenance?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        fixed_asset_id: maintenance?.fixed_asset_id ?? prefillAsset?.id ?? ('' as const),
        maintenance_type: maintenance?.maintenance_type ?? 'preventive',
        status: maintenance?.status ?? 'scheduled',
        maintenance_date: maintenance?.maintenance_date ?? new Date().toISOString().slice(0, 10),
        completed_date: maintenance?.completed_date ?? '',
        next_due_date: maintenance?.next_due_date ?? '',
        description: maintenance?.description ?? '',
        cost: maintenance?.cost != null ? String(maintenance.cost) : '',
        service_provider: maintenance?.service_provider ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('asset-maintenances.update', maintenance!.id));
        else post(route('asset-maintenances.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit maintenance' : 'Log maintenance'} />
            <PayrollPage>
                <Link href={route('asset-maintenances.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={Wrench} title={isEdit ? `Edit — ${maintenance?.asset_tag}` : 'Log maintenance'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => v && setData('fixed_asset_id', v)}
                                    items={assets.map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))}
                                    disabled={isEdit || Boolean(prefillAsset)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Type *</Label>
                                    <ComboSelect value={data.maintenance_type} onChange={(v) => v && setData('maintenance_type', String(v))} items={typeOptions.map((t) => ({ value: t.value, label: t.label }))} />
                                </div>
                                <div>
                                    <Label>Status *</Label>
                                    <ComboSelect value={data.status} onChange={(v) => v && setData('status', String(v))} items={statusOptions.map((s) => ({ value: s.value, label: s.label }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Date *</Label>
                                    <Input type="date" value={data.maintenance_date} onChange={(e) => setData('maintenance_date', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Completed date</Label>
                                    <Input type="date" value={data.completed_date} onChange={(e) => setData('completed_date', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label>Next due</Label>
                                <Input type="date" value={data.next_due_date} onChange={(e) => setData('next_due_date', e.target.value)} />
                            </div>
                            <div>
                                <Label>Description *</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} required />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Cost</Label>
                                    <Input type="number" min={0} step="0.01" value={data.cost} onChange={(e) => setData('cost', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Service provider</Label>
                                    <Input value={data.service_provider} onChange={(e) => setData('service_provider', e.target.value)} />
                                </div>
                            </div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Save'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
