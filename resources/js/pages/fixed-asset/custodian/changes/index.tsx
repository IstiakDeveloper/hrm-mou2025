import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { History, Plus, Search } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatDisplayDate } from '@/lib/display-date';
import type { SharedData } from '@/types';

type CustodianRef = { id: number; name: string; employee?: (EmployeeNameFields & { employee_id: string }) | null };
type ChangeRow = {
    id: number;
    change_date: string;
    reason: string | null;
    fixed_asset?: { asset_tag: string; name: string; branch?: { name: string } | null } | null;
    from_custodian?: CustodianRef | null;
    to_custodian?: CustodianRef | null;
    changed_by_user?: { name: string } | null;
};

function custodianLabel(c?: CustodianRef | null) {
    if (!c) return '—';
    if (c.employee) return `${c.name} (${c.employee.employee_id})`;
    return c.name;
}

export default function CustodianChangeIndex({
    changes,
    filters,
    branchScoped,
}: {
    changes: { data: ChangeRow[] };
    filters: { search?: string };
    branches: { id: number; name: string }[];
    branchScoped: boolean;
    scopedBranchId: number | null;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');

    return (
        <Layout>
            <Head title="Custodian changes" />
            <PayrollPage>
                <PayrollPageHeader icon={History} title="Custodian change" description="History of custodian assignments and releases.">
                    {canEdit && (
                        <Link href={route('fixed-asset.custodian.changes.create')}>
                            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Change custodian</Button>
                        </Link>
                    )}
                </PayrollPageHeader>
                {branchScoped && <BranchScopeAlert className="mb-4" />}
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}
                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && router.get(route('fixed-asset.custodian.changes.index'), { search }, { preserveState: true })} placeholder="Asset tag, custodian…" className="max-w-sm" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.custodian.changes.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>
                <PayrollSectionCard title="Change history">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead><TableHead>Asset</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {changes.data.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No custodian changes yet.</TableCell></TableRow> : changes.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{formatDisplayDate(row.change_date)}</TableCell>
                                    <TableCell>{row.fixed_asset ? `${row.fixed_asset.asset_tag} — ${row.fixed_asset.name}` : '—'}</TableCell>
                                    <TableCell>{custodianLabel(row.from_custodian)}</TableCell>
                                    <TableCell>{row.to_custodian ? custodianLabel(row.to_custodian) : <span className="text-muted-foreground">Released</span>}</TableCell>
                                    <TableCell>{row.reason || '—'}</TableCell>
                                    <TableCell>{row.changed_by_user?.name || '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
