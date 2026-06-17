import React, { useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';
import { ArrowLeft, FolderKanban } from 'lucide-react';

type ProjectOpt = { id: number; name: string; code: string };
type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; project_id: number | null };
type Prefill = AssetOpt & { project_name?: string | null };

export default function ProjectTransferForm({
    prefillAsset,
    projects,
    assets,
}: {
    prefillAsset: Prefill | null;
    projects: ProjectOpt[];
    assets: AssetOpt[];
}) {
    const { data, setData, processing, errors } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        to_project_id: '' as const,
        transfer_date: todayDisplayDate(),
        reason: '',
        notes: '',
        clear_project: false,
    });

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const destinationProjects = useMemo(() => {
        const fromId = selectedAsset?.project_id ?? null;
        return projects.filter((p) => p.id !== fromId);
    }, [projects, selectedAsset]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('fixed-asset.transfer.project.store'), {
            fixed_asset_id: data.fixed_asset_id,
            to_project_id: data.clear_project ? null : (data.to_project_id || null),
            transfer_date: displayDateToServer(data.transfer_date),
            reason: data.reason,
            notes: data.notes,
        });
    };

    return (
        <Layout>
            <Head title="Project Transfer" />
            <AssetPage>
                <Link href={route('fixed-asset.transfer.history')} className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to transfer history
                </Link>
                <AssetPageHeader icon={FolderKanban} title="Transfer Asset to Project" description="Branch stays the same; only the project assignment changes." />
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
                            {selectedAsset && (
                                <p className="text-xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg p-2.5">
                                    Current Project: <span className="font-semibold text-zinc-800">{prefillAsset?.project_name ?? (selectedAsset.project_id ? projects.find((p) => p.id === selectedAsset.project_id)?.code : 'None')}</span>
                                </p>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To Project</Label>
                                <ComboSelect
                                    value={data.clear_project ? null : (Number(data.to_project_id) || null)}
                                    onChange={(v) => { setData('clear_project', false); setData('to_project_id', v ?? ''); }}
                                    items={destinationProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                                    placeholder="Select project"
                                    disabled={data.clear_project}
                                    className="h-9 border-zinc-200"
                                />
                                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 cursor-pointer mt-1 select-none">
                                    <input
                                        type="checkbox"
                                        checked={data.clear_project}
                                        onChange={(e) => setData('clear_project', e.target.checked)}
                                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    Remove project assignment
                                </label>
                                {errors.to_project_id && <p className="text-xs text-red-500">{errors.to_project_id}</p>}
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
