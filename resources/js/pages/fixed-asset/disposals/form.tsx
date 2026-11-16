import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function AssetDisposalForm({
    prefillAsset,
    assets,
    methodOptions,
}: {
    prefillAsset: { id: number; asset_tag: string; name: string; book_value: string | null } | null;
    assets: { id: number; asset_tag: string; name: string; book_value: string | null }[];
    methodOptions: { value: string; label: string }[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        disposal_method: 'write_off',
        disposal_date: new Date().toISOString().slice(0, 10),
        disposal_amount: prefillAsset?.book_value != null ? String(prefillAsset.book_value) : '',
        reason: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('asset-disposals.store'));
    };

    return (
        <Layout>
            <Head title="Request disposal" />
            <PayrollPage>
                <Link href={route('asset-disposals.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={Trash2} title="Request asset disposal" description="Submits for approval. Approvers need fixed-assets.delete permission." />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Disposal request" className="max-w-xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => v && setData('fixed_asset_id', v)}
                                    items={assets.map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))}
                                    disabled={Boolean(prefillAsset)}
                                />
                                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            <div>
                                <Label>Method *</Label>
                                <ComboSelect value={data.disposal_method} onChange={(v) => v && setData('disposal_method', String(v))} items={methodOptions.map((m) => ({ value: m.value, label: m.label }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Disposal date *</Label>
                                    <Input type="date" value={data.disposal_date} onChange={(e) => setData('disposal_date', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Amount received</Label>
                                    <Input type="number" min={0} step="0.01" value={data.disposal_amount} onChange={(e) => setData('disposal_amount', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label>Reason *</Label>
                                <Textarea value={data.reason} onChange={(e) => setData('reason', e.target.value)} rows={3} required />
                                {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                            </div>
                            <Button type="submit" disabled={processing}>Submit for approval</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
