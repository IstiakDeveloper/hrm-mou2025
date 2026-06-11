import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { Edit, Plus, Search, Wrench } from 'lucide-react';

type Row = {
    id: number;
    maintenance_type: string;
    status: string;
    maintenance_date: string;
    completed_date: string | null;
    cost: string | null;
    description: string;
    fixed_asset?: { id: number; asset_tag: string; name: string; branch?: { name: string } };
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    scheduled: 'outline',
    in_progress: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
};

export default function AssetMaintenanceIndex({
    maintenances,
    filters,
    branches,
    statusOptions,
    branchScoped,
}: {
    maintenances: { data: Row[] };
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; is_head_office: boolean }[];
    statusOptions: { value: string; label: string }[];
    branchScoped?: boolean;
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [status, setStatus] = useState(filters.status || '');

    const applyFilters = () => {
        router.get(route('asset-maintenances.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
            status: status || undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Asset maintenance" />
            <PayrollPage>
                <PayrollPageHeader icon={Wrench} title="Maintenance log" description="Service, repair, and inspection records. In-progress work marks the asset under maintenance.">
                    <Link href={route('asset-maintenances.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Log maintenance</Button>
                    </Link>
                </PayrollPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} placeholder="Search…" className="max-w-xs" />
                        <ComboSelect value={branchId} onChange={(v) => setBranchId(v)} items={branchComboSelectItems(branches, { numericValue: true })} placeholder="All branches" className="min-w-[160px]" />
                        <ComboSelect value={status || null} onChange={(v) => setStatus(v ? String(v) : '')} items={statusOptions.map((s) => ({ value: s.value, label: s.label }))} placeholder="All statuses" className="min-w-[140px]" />
                        <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Records">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maintenances.data.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No records.</TableCell></TableRow>
                            ) : (
                                maintenances.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.maintenance_date}</TableCell>
                                        <TableCell>
                                            <Link href={route('fixed-assets.show', row.fixed_asset!.id)} className="font-mono text-xs text-emerald-700 hover:underline">{row.fixed_asset?.asset_tag}</Link>
                                        </TableCell>
                                        <TableCell className="capitalize">{row.maintenance_type.replace(/_/g, ' ')}</TableCell>
                                        <TableCell><Badge variant={statusVariant[row.status] ?? 'secondary'}>{row.status.replace(/_/g, ' ')}</Badge></TableCell>
                                        <TableCell>{row.cost ?? '—'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={route('asset-maintenances.edit', row.id)}><Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button></Link>
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
