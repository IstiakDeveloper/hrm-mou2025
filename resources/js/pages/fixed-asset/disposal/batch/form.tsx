import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';

type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null };

export default function DisposalBatchForm({
    assets,
    reasons,
    methodOptions,
    submitRoute,
}: {
    assets: AssetOpt[];
    reasons: { id: number; code: string; name: string }[];
    methodOptions: { value: string; label: string }[];
    submitRoute: string;
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        fixed_asset_ids: [] as number[],
        asset_disposal_reason_id: '' as const,
        disposal_method: 'write_off',
        request_date: todayDisplayDate(),
        disposal_date: todayDisplayDate(),
        disposal_amount: '',
        notes: '',
    });

    const [search, setSearch] = useState('');

    const filteredAssets = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return assets;
        return assets.filter((a) =>
            a.asset_tag.toLowerCase().includes(q)
            || (a.manual_asset_code?.toLowerCase().includes(q))
            || a.name.toLowerCase().includes(q),
        );
    }, [assets, search]);

    const toggleAsset = (id: number) => {
        setData('fixed_asset_ids', data.fixed_asset_ids.includes(id)
            ? data.fixed_asset_ids.filter((x) => x !== id)
            : [...data.fixed_asset_ids, id]);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(`Dispose ${data.fixed_asset_ids.length} asset(s)?`)) return;
        transform((payload) => ({
            ...payload,
            request_date: displayDateToServer(payload.request_date),
            disposal_date: displayDateToServer(payload.disposal_date),
        }));
        post(route(submitRoute));
    };

    return (
        <Layout>
            <Head title="Batch disposal" />
            <PayrollPage>
                <Link href={route('fixed-asset.disposal.requests.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={Trash2} title="Batch disposal" description="Dispose multiple assets with the same reason and date." />
                <form onSubmit={submit}>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <PayrollSectionCard title="Disposal details">
                            <div className="space-y-4">
                                <div>
                                    <Label>Disposal reason *</Label>
                                    <ComboSelect value={Number(data.asset_disposal_reason_id) || null} onChange={(v) => v && setData('asset_disposal_reason_id', v)} items={reasons.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))} />
                                    {errors.asset_disposal_reason_id && <p className="text-sm text-red-500">{errors.asset_disposal_reason_id}</p>}
                                </div>
                                <div>
                                    <Label>Method *</Label>
                                    <ComboSelect value={data.disposal_method} onChange={(v) => v && setData('disposal_method', String(v))} items={methodOptions.map((m) => ({ value: m.value, label: m.label }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormDateField label="Request date" value={data.request_date} onChange={(v) => setData('request_date', v)} />
                                    <FormDateField label="Disposal date" value={data.disposal_date} onChange={(v) => setData('disposal_date', v)} required error={errors.disposal_date} />
                                </div>
                                <div><Label>Notes</Label><Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} /></div>
                                <p className="text-sm text-muted-foreground">Selected: <strong>{data.fixed_asset_ids.length}</strong> asset(s)</p>
                                {errors.fixed_asset_ids && <p className="text-sm text-red-500">{errors.fixed_asset_ids}</p>}
                                <Button type="submit" disabled={processing || data.fixed_asset_ids.length === 0}>Dispose selected assets</Button>
                            </div>
                        </PayrollSectionCard>
                        <PayrollSectionCard title="Select assets">
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" className="mb-3" />
                            <div className="max-h-96 space-y-2 overflow-y-auto">
                                {filteredAssets.map((asset) => (
                                    <label key={asset.id} className="flex cursor-pointer items-start gap-2 rounded border p-2 text-sm">
                                        <Checkbox checked={data.fixed_asset_ids.includes(asset.id)} onCheckedChange={() => toggleAsset(asset.id)} />
                                        <span>
                                            <span className="font-mono text-xs">{asset.manual_asset_code || asset.asset_tag}</span>
                                            <span className="block text-muted-foreground">{asset.name}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </PayrollSectionCard>
                    </div>
                </form>
            </PayrollPage>
        </Layout>
    );
}
