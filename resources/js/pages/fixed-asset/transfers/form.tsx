import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';

type BranchOpt = { id: number; name: string; is_head_office: boolean };
type AssetOpt = { id: number; asset_tag: string; name: string; branch_id: number; status: string };
type Prefill = { id: number; asset_tag: string; name: string; branch_id: number; branch_name?: string; status: string };

export default function AssetTransferForm({
    prefillAsset,
    branches,
    assets,
}: {
    prefillAsset: Prefill | null;
    branches: BranchOpt[];
    assets: AssetOpt[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        to_branch_id: '' as const,
        transfer_date: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const destinationBranches = useMemo(() => {
        const fromId = selectedAsset && 'branch_id' in selectedAsset ? selectedAsset.branch_id : null;
        return branches.filter((b) => b.id !== fromId);
    }, [branches, selectedAsset]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('asset-transfers.store'));
    };

    return (
        <Layout>
            <Head title="New asset transfer" />
            <PayrollPage>
                <Link href={route('asset-transfers.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to transfers
                </Link>
                <PayrollPageHeader icon={ArrowRightLeft} title="Transfer asset to another branch" />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Transfer details" className="max-w-xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => v && setData('fixed_asset_id', v)}
                                    items={assets.map((a) => ({
                                        value: a.id,
                                        label: `${a.asset_tag} — ${a.name}`,
                                        keywords: a.status,
                                    }))}
                                    disabled={Boolean(prefillAsset)}
                                />
                                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            {selectedAsset && (
                                <p className="text-xs text-muted-foreground">
                                    Current branch: {'branch_name' in selectedAsset && selectedAsset.branch_name
                                        ? selectedAsset.branch_name
                                        : branches.find((b) => b.id === (selectedAsset as AssetOpt).branch_id)?.name}
                                </p>
                            )}
                            <div>
                                <Label>To branch *</Label>
                                <ComboSelect
                                    value={Number(data.to_branch_id) || null}
                                    onChange={(v) => v && setData('to_branch_id', v)}
                                    items={destinationBranches.map((b) => ({
                                        value: b.id,
                                        label: b.is_head_office ? `${b.name} (HO)` : b.name,
                                    }))}
                                />
                                {errors.to_branch_id && <p className="text-sm text-red-500">{errors.to_branch_id}</p>}
                            </div>
                            <div>
                                <Label>Transfer date *</Label>
                                <Input type="date" value={data.transfer_date} onChange={(e) => setData('transfer_date', e.target.value)} required />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} />
                            </div>
                            <Button type="submit" disabled={processing}>Complete transfer</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
