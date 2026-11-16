import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { Edit, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import type { SharedData } from '@/types';

type Row = {
    id: number;
    name: string;
    phone: string | null;
    is_active: boolean;
    fixed_assets_count: number;
    employee?: (EmployeeNameFields & { employee_id: string }) | null;
    department?: { name: string; code: string } | null;
    designation?: { name: string; code: string } | null;
    branch?: { name: string } | null;
};

export default function CustodianIndex({
    custodians,
    filters,
    branches,
    branchScoped,
    scopedBranchId,
}: {
    custodians: { data: Row[] };
    filters: { search?: string; branch_id?: string };
    branches: { id: number; name: string }[];
    branchScoped: boolean;
    scopedBranchId: number | null;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || (scopedBranchId ? String(scopedBranchId) : ''));
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    const applyFilters = () =>
        router.get(route('fixed-asset.custodian.custodians.index'), { search, branch_id: branchId || undefined }, { preserveState: true });

    return (
        <Layout>
            <Head title="Custodians" />
            <PayrollPage>
                <PayrollPageHeader icon={UserCheck} title="Custodians" description="People responsible for fixed assets.">
                    {canCreate && (
                        <Link href={route('fixed-asset.custodian.custodians.create')}>
                            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add custodian</Button>
                        </Link>
                    )}
                </PayrollPageHeader>
                {branchScoped && <BranchScopeAlert className="mb-4" />}
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}
                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} placeholder="Name, employee ID…" className="max-w-xs" />
                        {!branchScoped && (
                            <select className="h-9 rounded-md border px-2 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                                <option value="">All branches</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="All custodians">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead><TableHead>Branch</TableHead><TableHead>Assets</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {custodians.data.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No custodians yet.</TableCell></TableRow> : custodians.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.employee ? `${row.employee.employee_id} — ${employeeDisplayName(row.employee)}` : '—'}</TableCell>
                                    <TableCell>{row.department?.name || '—'}</TableCell>
                                    <TableCell>{row.designation?.name || '—'}</TableCell>
                                    <TableCell>{row.branch?.name || '—'}</TableCell>
                                    <TableCell>{row.fixed_assets_count}</TableCell>
                                    <TableCell><Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {canEdit && <Link href={route('fixed-asset.custodian.custodians.edit', row.id)}><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></Link>}
                                        {canDelete && <Button variant="ghost" size="sm" onClick={() => confirm('Delete?') && router.delete(route('fixed-asset.custodian.custodians.destroy', row.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
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
