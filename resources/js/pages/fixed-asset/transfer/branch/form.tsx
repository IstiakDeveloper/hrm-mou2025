import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';

type BranchOpt = { id: number; name: string; is_head_office: boolean };
type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; branch_id: number; status: string };
type Prefill = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; branch_id: number; branch_name?: string; status: string };

export default function BranchTransferForm({
    prefillAsset,
    branches,
    assets,
}: {
    prefillAsset: Prefill | null;
    branches: BranchOpt[];  
    assets: AssetOpt[];
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        to_branch_id: '' as const,
        transfer_date: todayDisplayDate(),
        notes: '',
    });

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const destinationBranches = useMemo(() => {
        const fromId = selectedAsset?.branch_id ?? null;
        return branches.filter((b) => b.id !== fromId);
    }, [branches, selectedAsset]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            transfer_date: displayDateToServer(payload.transfer_date),
        }));
        post(route('fixed-asset.transfer.branch.store'));
    };

    return (
        <Layout>
            <Head title="New Branch Transfer" />
            <AssetPage>
                <Link href={route('fixed-asset.transfer.branch.index')} className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to transfers
                </Link>
                <AssetPageHeader icon={ArrowRightLeft} title="Transfer Asset to Branch" description="Move assets between branches. Custodian is automatically cleared on branch transfer." />
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
                                {errors.fixed_asset_id && <p className="text-xs text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            {selectedAsset && (
                                <p className="text-xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg p-2.5">
                                    Current Location: <span className="font-semibold text-zinc-800">{selectedAsset.branch_name ?? branches.find((b) => b.id === selectedAsset.branch_id)?.name}</span>
                                </p>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Destination Branch *</Label>
                                <ComboSelect
                                    value={Number(data.to_branch_id) || null}
                                    onChange={(v) => v && setData('to_branch_id', v)}
                                    items={branchComboSelectItems(destinationBranches, { numericValue: true })}
                                    className="h-9 border-zinc-200"
                                />
                                {errors.to_branch_id && <p className="text-xs text-red-500">{errors.to_branch_id}</p>}
                            </div>
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
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Transfer Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} className="border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.transfer.branch.index')}>
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
