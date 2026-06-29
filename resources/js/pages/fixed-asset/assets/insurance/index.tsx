import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { hasAppPermission } from '@/lib/permissions';
import { Edit, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/display-date';
import { formatTakaWhole } from '@/lib/taka-format';
import type { SharedData } from '@/types';

type RecordRow = {
    id: number;
    provider: string;
    policy_no: string | null;
    start_date: string | null;
    end_date: string | null;
    premium_amount: string | null;
    coverage_amount: string | null;
    fixed_asset?: { asset_tag: string; manual_asset_code: string | null; name: string; branch?: { name: string } | null } | null;
};

export default function AssetInsuranceIndex({ records, filters, branchScoped }: { records: { data: RecordRow[] }; filters: { search?: string }; branchScoped: boolean }) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    return (
        <Layout>
            <Head title="Asset insurance" />
            <PayrollPage>
                <PayrollPageHeader icon={Shield} title="Asset insurance" description="Insurance policies for assets flagged as insured.">
                    {canCreate && <Link href={route('fixed-asset.assets.insurance.create')}><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add insurance</Button></Link>}
                </PayrollPageHeader>
                <BranchScopeAlert branchScoped={branchScoped} />
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && router.get(route('fixed-asset.assets.insurance.index'), { search }, { preserveState: true })} placeholder="Provider, policy, asset…" className="max-w-sm" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.assets.insurance.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="Insurance records">
                    <Table>
                        <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Branch</TableHead><TableHead>Provider</TableHead><TableHead>Policy</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Coverage</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {records.data.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No insurance records.</TableCell></TableRow> : records.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.fixed_asset ? `${row.fixed_asset.manual_asset_code || row.fixed_asset.asset_tag} — ${row.fixed_asset.name}` : '—'}</TableCell>
                                    <TableCell>{row.fixed_asset?.branch?.name || '—'}</TableCell>
                                    <TableCell>{row.provider}</TableCell>
                                    <TableCell>{row.policy_no || '—'}</TableCell>
                                    <TableCell>
                                        {[row.start_date, row.end_date].filter(Boolean).map((d) => formatDisplayDate(d)).join(' → ') || '—'}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{row.coverage_amount != null ? formatTakaWhole(row.coverage_amount) : '—'}</TableCell>
                                    <TableCell className="text-right">
                                        {canEdit && <Link href={route('fixed-asset.assets.insurance.edit', row.id)}><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></Link>}
                                        {canDelete && <Button variant="ghost" size="sm" onClick={() => confirm('Delete?') && router.delete(route('fixed-asset.assets.insurance.destroy', row.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
