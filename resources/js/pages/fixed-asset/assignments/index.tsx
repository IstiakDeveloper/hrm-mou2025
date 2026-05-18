import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { Plus, Search, UserCheck } from 'lucide-react';

type AssignmentRow = {
    id: number;
    assigned_date: string;
    released_date: string | null;
    notes: string | null;
    fixed_asset?: { id: number; asset_tag: string; name: string; branch?: { name: string } };
    employee?: { employee_id: string; first_name: string; last_name: string };
    assigned_by_user?: { name: string };
};

export default function AssetAssignmentIndex({
    assignments,
    filters,
    branches,
    branchScoped,
}: {
    assignments: { data: AssignmentRow[] };
    filters: { search?: string; branch_id?: string; active_only?: string };
    branches: { id: number; name: string; is_head_office: boolean }[];
    branchScoped?: boolean;
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [activeOnly, setActiveOnly] = useState(filters.active_only === '1' || filters.active_only === 'true');

    const applyFilters = () => {
        router.get(route('asset-assignments.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
            active_only: activeOnly ? '1' : undefined,
        }, { preserveState: true });
    };

    const release = (id: number) => {
        if (!confirm('Release this custodian assignment?')) return;
        router.post(route('asset-assignments.release', id), {
            released_date: new Date().toISOString().slice(0, 10),
        });
    };

    return (
        <Layout>
            <Head title="Asset assignments" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={UserCheck}
                    title="Employee assignments"
                    description="Assign fixed assets to employees as custodians; full history is kept."
                >
                    <Link href={route('asset-assignments.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Assign asset</Button>
                    </Link>
                </PayrollPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Asset or employee…"
                            className="max-w-xs"
                        />
                        <ComboSelect
                            value={branchId}
                            onChange={(v) => setBranchId(v)}
                            items={branches.map((b) => ({ value: b.id, label: b.is_head_office ? `${b.name} (HO)` : b.name }))}
                            placeholder="All branches"
                            className="min-w-[180px]"
                        />
                        <div className="flex items-center gap-2">
                            <Checkbox id="active" checked={activeOnly} onCheckedChange={(v) => setActiveOnly(Boolean(v))} />
                            <Label htmlFor="active" className="text-sm">Active only</Label>
                        </div>
                        <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Assignment history">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Assigned</TableHead>
                                <TableHead>Released</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No assignments yet.</TableCell>
                                </TableRow>
                            ) : (
                                assignments.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.fixed_asset && (
                                                <Link href={route('fixed-assets.show', row.fixed_asset.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                                    {row.fixed_asset.asset_tag}
                                                </Link>
                                            )}
                                            <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            {row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : '—'}
                                            <div className="text-xs text-muted-foreground">{row.employee?.employee_id}</div>
                                        </TableCell>
                                        <TableCell>{row.fixed_asset?.branch?.name ?? '—'}</TableCell>
                                        <TableCell>{row.assigned_date}</TableCell>
                                        <TableCell>{row.released_date ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.released_date ? 'secondary' : 'default'}>
                                                {row.released_date ? 'Released' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!row.released_date && (
                                                <Button variant="outline" size="sm" onClick={() => release(row.id)}>Release</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
