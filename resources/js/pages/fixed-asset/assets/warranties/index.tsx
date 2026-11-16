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
import { Edit, FileCheck, Plus, Search, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/display-date';
import type { SharedData } from '@/types';

export default function AssetWarrantyIndex({ records, filters, branchScoped }: { records: { data: any[] }; filters: { search?: string }; branchScoped: boolean }) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    return (
        <Layout>
            <Head title="Asset warranty" />
            <PayrollPage>
                <PayrollPageHeader icon={FileCheck} title="Asset warranty" description="Warranty records for assets.">
                    {canCreate && <Link href={route('fixed-asset.assets.warranties.create')}><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add warranty</Button></Link>}
                </PayrollPageHeader>
                <BranchScopeAlert branchScoped={branchScoped} />
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && router.get(route('fixed-asset.assets.warranties.index'), { search }, { preserveState: true })} className="max-w-sm" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.assets.warranties.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="Warranty records">
                    <Table>
                        <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Provider</TableHead><TableHead>Warranty no</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {records.data.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No warranty records.</TableCell></TableRow> : records.data.map((row: any) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.fixed_asset ? `${row.fixed_asset.manual_asset_code || row.fixed_asset.asset_tag} — ${row.fixed_asset.name}` : '—'}</TableCell>
                                    <TableCell>{row.provider}</TableCell>
                                    <TableCell>{row.warranty_no || '—'}</TableCell>
                                    <TableCell>{[row.start_date, row.end_date].filter(Boolean).map((d) => formatDisplayDate(d)).join(' → ') || '—'}</TableCell>
                                    <TableCell className="text-right">
                                        {canEdit && <Link href={route('fixed-asset.assets.warranties.edit', row.id)}><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></Link>}
                                        {canDelete && <Button variant="ghost" size="sm" onClick={() => confirm('Delete?') && router.delete(route('fixed-asset.assets.warranties.destroy', row.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
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
