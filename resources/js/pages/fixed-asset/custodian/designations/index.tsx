import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Briefcase, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import type { SharedData } from '@/types';

type Row = { id: number; sl: number; code: string; name: string; sort_order: number; is_active: boolean; custodians_count: number };

export default function CustodianDesignationIndex({ designations, filters }: { designations: { data: Row[] }; filters: { search?: string } }) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    return (
        <Layout>
            <Head title="Custodian designations" />
            <PayrollPage>
                <PayrollPageHeader icon={Briefcase} title="Custodian designations" description="Designations for asset custodians.">
                    {canCreate && <Link href={route('fixed-asset.custodian.designations.create')}><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add designation</Button></Link>}
                </PayrollPageHeader>
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}
                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && router.get(route('fixed-asset.custodian.designations.index'), { search }, { preserveState: true })} placeholder="Name or code…" className="max-w-sm" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.custodian.designations.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="All designations">
                    <Table>
                        <TableHeader><TableRow><TableHead>SL</TableHead><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Custodians</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {designations.data.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No designations yet.</TableCell></TableRow> : designations.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.sl}</TableCell><TableCell className="font-mono text-xs">{row.code}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.custodians_count}</TableCell><TableCell>{row.sort_order}</TableCell>
                                    <TableCell><Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {canEdit && <Link href={route('fixed-asset.custodian.designations.edit', row.id)}><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></Link>}
                                        {canDelete && <Button variant="ghost" size="sm" onClick={() => confirm('Delete?') && router.delete(route('fixed-asset.custodian.designations.destroy', row.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
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
