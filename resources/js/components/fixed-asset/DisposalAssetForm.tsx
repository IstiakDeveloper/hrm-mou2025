import React from 'react';
import { format } from 'date-fns';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { DatePicker } from '@/components/ui/date-picker';
import { DISPLAY_DATE_FMT, displayDateToServer, parseFormDateValue, todayDisplayDate } from '@/lib/display-date';

type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null };
type ReasonOpt = { id: number; code: string; name: string };
type MethodOpt = { value: string; label: string };
type Prefill = AssetOpt;

type Props = {
    prefillAsset: Prefill | null;
    assets: AssetOpt[];
    reasons: ReasonOpt[];
    methodOptions: MethodOpt[];
    submitRoute: string;
    submitLabel: string;
    showRequestDate?: boolean;
};

export function DisposalAssetForm({
    prefillAsset,
    assets,
    reasons,
    methodOptions,
    submitRoute,
    submitLabel,
    showRequestDate = true,
}: Props) {
    const { data, setData, post, processing, errors, transform } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        asset_disposal_reason_id: '' as const,
        disposal_method: 'write_off',
        request_date: todayDisplayDate(),
        disposal_date: todayDisplayDate(),
        disposal_amount: prefillAsset?.book_value != null ? String(prefillAsset.book_value) : '',
        notes: '',
        photo: null as File | null,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            request_date: displayDateToServer(payload.request_date),
            disposal_date: displayDateToServer(payload.disposal_date),
        }));
        post(route(submitRoute), { forceFormData: true });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <Label>Asset *</Label>
                <ComboSelect
                    value={Number(data.fixed_asset_id) || null}
                    onChange={(v) => v && setData('fixed_asset_id', v)}
                    items={assets.map((a) => ({ value: a.id, label: `${a.manual_asset_code || a.asset_tag} — ${a.name}` }))}
                    disabled={Boolean(prefillAsset)}
                />
                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
            </div>
            <div>
                <Label>Disposal reason *</Label>
                <ComboSelect
                    value={Number(data.asset_disposal_reason_id) || null}
                    onChange={(v) => v && setData('asset_disposal_reason_id', v)}
                    items={reasons.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))}
                />
                {errors.asset_disposal_reason_id && <p className="text-sm text-red-500">{errors.asset_disposal_reason_id}</p>}
            </div>
            <div>
                <Label>Method *</Label>
                <ComboSelect value={data.disposal_method} onChange={(v) => v && setData('disposal_method', String(v))} items={methodOptions.map((m) => ({ value: m.value, label: m.label }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {showRequestDate && (
                    <div>
                        <Label>Request date</Label>
                        <DatePicker
                            selected={parseFormDateValue(data.request_date)}
                            onSelect={(d) => setData('request_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                        />
                    </div>
                )}
                <div>
                    <Label>Disposal date *</Label>
                    <DatePicker
                        selected={parseFormDateValue(data.disposal_date)}
                        onSelect={(d) => setData('disposal_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                    />
                </div>
                <div>
                    <Label>Amount received</Label>
                    <Input type="number" min={0} step="0.01" value={data.disposal_amount} onChange={(e) => setData('disposal_amount', e.target.value)} />
                </div>
            </div>
            <div>
                <Label>Notes</Label>
                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} />
            </div>
            <div>
                <Label>Photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setData('photo', e.target.files?.[0] ?? null)} />
                {errors.photo && <p className="text-sm text-red-500">{errors.photo}</p>}
            </div>
            <Button type="submit" disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
