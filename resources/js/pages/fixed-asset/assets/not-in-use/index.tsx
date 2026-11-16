import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { hasAppPermission } from '@/lib/permissions';
import { History, PauseCircle, RotateCcw, Search } from 'lucide-react';
import { displayDateToServer, formatDisplayDate, todayDisplayDate } from '@/lib/display-date';
import type { SharedData } from '@/types';

type AssetRow = {
    id: number;
    asset_tag: string;
    manual_asset_code: string | null;
    name: string;
    branch?: { name: string } | null;
    category?: { name: string } | null;
    status_logs?: { reason: string | null; changed_at: string; notes: string | null }[];
};

export default function AssetNotInUseIndex({
    assets,
    filters,
    assetsForMark,
    branchScoped,
}: {
    assets: { data: AssetRow[] };
    filters: { search?: string };
    assetsForMark: { id: number; asset_tag: string; manual_asset_code: string | null; name: string }[];
    branchScoped: boolean;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');

    const markForm = useForm({
        fixed_asset_id: '',
        changed_at: todayDisplayDate(),
        reason: '',
        notes: '',
    });

    const submitMark = (e: React.FormEvent) => {
        e.preventDefault();
        markForm.transform((payload) => ({
            ...payload,
            changed_at: displayDateToServer(payload.changed_at),
        }));
        markForm.post(route('fixed-asset.assets.not-in-use.store'));
    };

    const restore = (assetId: number) => {
        const reason = prompt('Reason for restoring to active (optional):') ?? '';
        router.post(route('fixed-asset.assets.not-in-use.restore', assetId), {
            changed_at: displayDateToServer(todayDisplayDate()),
            reason,
        });
    };

    return (
        <Layout>
            <Head title="Assets not in use" />
            <PayrollPage>
                <PayrollPageHeader icon={PauseCircle} title="Asset not in use" description="Assets marked idle or not in active use.">
                    <Link href={route('fixed-asset.assets.not-in-use.history')}><Button size="sm" variant="outline"><History className="mr-2 h-4 w-4" />Status history</Button></Link>
                </PayrollPageHeader>
                <BranchScopeAlert branchScoped={branchScoped} />
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}

                {canEdit && (
                    <PayrollSectionCard title="Mark asset as not in use" className="mb-4">
                        <form onSubmit={submitMark} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="lg:col-span-2">
                                <Label>Asset *</Label>
                                <ComboSelect value={markForm.data.fixed_asset_id ? Number(markForm.data.fixed_asset_id) : null} onChange={(v) => v && markForm.setData('fixed_asset_id', String(v))} items={assetsForMark.map((a) => ({ value: a.id, label: `${a.manual_asset_code || a.asset_tag} — ${a.name}` }))} placeholder="Select asset" />
                            </div>
                            <FormDateField label="Date" value={markForm.data.changed_at} onChange={(v) => markForm.setData('changed_at', v)} required />
                            <div><Label>Reason</Label><Input value={markForm.data.reason} onChange={(e) => markForm.setData('reason', e.target.value)} /></div>
                            <div className="lg:col-span-3"><Label>Notes</Label><Textarea value={markForm.data.notes} onChange={(e) => markForm.setData('notes', e.target.value)} rows={2} /></div>
                            <div className="flex items-end"><Button type="submit" disabled={markForm.processing || !markForm.data.fixed_asset_id}>Mark not in use</Button></div>
                        </form>
                    </PayrollSectionCard>
                )}

                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && router.get(route('fixed-asset.assets.not-in-use.index'), { search }, { preserveState: true })} className="max-w-sm" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.assets.not-in-use.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Not in use">
                    <Table>
                        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Branch</TableHead><TableHead>Category</TableHead><TableHead>Reason</TableHead><TableHead>Since</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {assets.data.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No assets marked not in use.</TableCell></TableRow> : assets.data.map((row) => {
                                const log = row.status_logs?.[0];
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.manual_asset_code || row.asset_tag}</TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.branch?.name || '—'}</TableCell>
                                        <TableCell>{row.category?.name || '—'}</TableCell>
                                        <TableCell>{log?.reason || '—'}</TableCell>
                                        <TableCell>{log?.changed_at ? formatDisplayDate(log.changed_at) : '—'}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Link href={route('fixed-assets.show', row.id)}><Button variant="ghost" size="sm">View</Button></Link>
                                            {canEdit && <Button variant="outline" size="sm" onClick={() => restore(row.id)}><RotateCcw className="mr-1 h-3 w-3" />Restore</Button>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
