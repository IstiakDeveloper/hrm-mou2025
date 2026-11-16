import React, { useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; branch_id: number; asset_custodian_id: number | null };
type CustodianOpt = { id: number; name: string; employee_id: number | null; branch_id: number | null; employee?: (EmployeeNameFields & { employee_id: string }) | null };
type Prefill = AssetOpt & { current_custodian?: CustodianOpt | null };

export default function CustodianTransferForm({
    prefillAsset,
    assets,
    custodians,
}: {
    prefillAsset: Prefill | null;
    assets: AssetOpt[];
    custodians: CustodianOpt[];
}) {
    const { data, setData, processing, errors } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        to_custodian_id: '' as const,
        transfer_date: todayDisplayDate(),
        reason: '',
        notes: '',
        release_only: false,
    });

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const currentCustodian = prefillAsset?.current_custodian ?? null;
    const filteredCustodians = custodians.filter((c) => {
        if (selectedAsset && c.branch_id && c.branch_id !== selectedAsset.branch_id) return false;
        if (selectedAsset?.asset_custodian_id === c.id) return false;
        return true;
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('fixed-asset.transfer.custodian.store'), {
            fixed_asset_id: data.fixed_asset_id,
            to_custodian_id: data.release_only ? null : (data.to_custodian_id || null),
            transfer_date: displayDateToServer(data.transfer_date),
            reason: data.reason,
            notes: data.notes,
            release_only: data.release_only,
        });
    };

    return (
        <Layout>
            <Head title="Custodian Transfer" />
            <AssetPage>
                <Link href={route('fixed-asset.transfer.history')} className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to transfer history
                </Link>
                <AssetPageHeader icon={UserCheck} title="Transfer Asset Custodian" description="Assign a new custodian or release the current one." />
                
                {currentCustodian && (
                    <Alert className="max-w-2xl border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs mb-4">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Current Custodian</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">
                            {currentCustodian.employee
                                ? `${employeeDisplayName(currentCustodian.employee)} (${currentCustodian.employee.employee_id})`
                                : currentCustodian.name}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit} className="max-w-2xl">
                    <AssetSectionCard title="Transfer Details">
                        <div className="space-y-4.5">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => v && setData('fixed_asset_id', v)}
                                    items={assets.map((a) => ({
                                        value: a.id,
                                        label: `${a.manual_asset_code || a.asset_tag} — ${a.name}`,
                                    }))}
                                    disabled={Boolean(prefillAsset)}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer select-none">
                                <Checkbox
                                    id="release_only"
                                    checked={data.release_only}
                                    onCheckedChange={(v) => setData('release_only', Boolean(v))}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <Label htmlFor="release_only" className="text-xs font-semibold text-zinc-700 cursor-pointer">Release custodian only</Label>
                            </div>
                            {!data.release_only && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To Custodian *</Label>
                                    <ComboSelect
                                        value={Number(data.to_custodian_id) || null}
                                        onChange={(v) => v && setData('to_custodian_id', v)}
                                        items={filteredCustodians.map((c) => ({
                                            value: c.id,
                                            label: c.employee ? `${employeeDisplayName(c.employee)} — ${c.name}` : c.name,
                                        }))}
                                        className="h-9 border-zinc-200"
                                    />
                                    {errors.to_custodian_id && <p className="text-xs text-red-500">{errors.to_custodian_id}</p>}
                                </div>
                            )}
                            <div className="space-y-1">
                                <FormDateField
                                    label="Transfer Date"
                                    value={data.transfer_date}
                                    onChange={(v) => setData('transfer_date', v)}
                                    required
                                    error={errors.transfer_date}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reason</Label>
                                <Input value={data.reason} onChange={(e) => setData('reason', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Transfer Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} className="border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.transfer.history')}>
                                    <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                                    Complete Transfer
                                </Button>
                            </div>
                        </div>
                    </AssetSectionCard>
                </form>
            </AssetPage>
        </Layout>
    );
}
