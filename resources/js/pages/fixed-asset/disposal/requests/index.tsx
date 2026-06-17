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
import { hasAppPermission } from '@/lib/permissions';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { formatDisplayDate } from '@/lib/display-date';
import { Check, Plus, Search, Trash2, X } from 'lucide-react';

type Row = {
    id: number;
    status: string;
    disposal_method: string;
    request_date: string | null;
    disposal_date: string;
    disposal_amount: string | null;
    batch_reference: string | null;
    photo_path: string | null;
    reason: string;
    fixed_asset?: { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null; branch?: { name: string } };
    disposal_reason?: { name: string; code: string } | null;
    requested_by_user?: { name: string };
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    approved: 'default',
    rejected: 'destructive',
};

export default function DisposalRequestsIndex({
    disposals,
    pendingCount,
    filters,
    branches,
    statusOptions,
    branchScoped,
}: {
    disposals: { data: Row[] };
    pendingCount: number;
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; is_head_office: boolean }[];
    statusOptions: { value: string; label: string }[];
    branchScoped?: boolean;
}) {
    const { flash, auth } = usePage<{ flash?: { success?: string; warning?: string; error?: string }; auth?: object }>().props;
    const canReview = hasAppPermission(auth, 'fixed-assets.delete') || hasAppPermission(auth, 'admin.access');

    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [status, setStatus] = useState(filters.status || '');

    const applyFilters = () => {
        router.get(route('fixed-asset.disposal.requests.index'), {
            search: search || undefined,
            branch_id: branchId ?? undefined,
            status: status || undefined,
        }, { preserveState: true });
    };

    const approve = (id: number) => {
        if (!confirm('Approve disposal? The asset will be marked disposed.')) return;
        router.post(route('fixed-asset.disposal.approve', id));
    };

    const reject = (id: number) => {
        const notes = window.prompt('Rejection reason (optional):');
        router.post(route('fixed-asset.disposal.reject', id), { review_notes: notes ?? '' });
    };

    return (
        <Layout>
            <Head title="Disposal requests" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Trash2}
                    title="Disposal requests"
                    description={pendingCount > 0 ? `${pendingCount} pending approval` : 'Request and approve asset disposals.'}
                >
                    <Link href={route('fixed-asset.disposal.requests.create')}>
                        <Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />New request</Button>
                    </Link>
                </PayrollPageHeader>

                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.warning && <Alert className="mb-4 border-amber-200 bg-emerald-50"><AlertTitle>Note</AlertTitle><AlertDescription>{flash.warning}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} placeholder="Asset tag or batch…" className="max-w-xs" />
                        <ComboSelect value={branchId} onChange={setBranchId} items={branchComboSelectItems(branches, { numericValue: true })} placeholder="All branches" className="min-w-[160px]" />
                        <ComboSelect value={status || null} onChange={(v) => setStatus(v ? String(v) : '')} items={statusOptions.map((s) => ({ value: s.value, label: s.label }))} placeholder="All statuses" />
                        <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Requests">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Request date</TableHead>
                                <TableHead>Disposal date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requested by</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {disposals.data.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No disposal requests.</TableCell></TableRow>
                            ) : disposals.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Link href={route('fixed-assets.show', row.fixed_asset!.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                            {row.fixed_asset?.manual_asset_code || row.fixed_asset?.asset_tag}
                                        </Link>
                                        <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                        {row.batch_reference && <div className="text-xs text-muted-foreground">{row.batch_reference}</div>}
                                    </TableCell>
                                    <TableCell>{row.disposal_reason?.name ?? row.reason}</TableCell>
                                    <TableCell>{row.request_date ? formatDisplayDate(row.request_date) : '—'}</TableCell>
                                    <TableCell>{formatDisplayDate(row.disposal_date)}</TableCell>
                                    <TableCell><Badge variant={statusVariant[row.status] ?? 'secondary'}>{row.status}</Badge></TableCell>
                                    <TableCell>{row.requested_by_user?.name ?? '—'}</TableCell>
                                    <TableCell className="space-x-1 text-right">
                                        {row.photo_path && (
                                            <a href={`/storage/${row.photo_path}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">Photo</a>
                                        )}
                                        {row.status === 'pending' && canReview && (
                                            <>
                                                <Button size="sm" variant="default" onClick={() => approve(row.id)}><Check className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="outline" onClick={() => reject(row.id)}><X className="h-4 w-4" /></Button>
                                            </>
                                        )}
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
