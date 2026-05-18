import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { hasAppPermission } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRightLeft, Boxes, Edit, Trash2, TrendingDown, UserCheck, Wrench } from 'lucide-react';

type TransferRow = {
    id: number;
    transfer_date: string;
    notes: string | null;
    from_branch?: { name: string };
    to_branch?: { name: string };
    transferred_by?: { name: string };
};

type AssignmentRow = {
    id: number;
    assigned_date: string;
    released_date: string | null;
    employee?: { employee_id: string; first_name: string; last_name: string };
    assigned_by?: { name: string };
};

type MaintenanceRow = {
    id: number;
    maintenance_type: string;
    status: string;
    maintenance_date: string;
    cost: string | null;
    description: string;
};

type PendingDisposal = {
    id: number;
    disposal_method: string;
    disposal_date: string;
    reason: string;
    requested_by?: { name: string };
};

type AssetPayload = {
    id: number;
    asset_tag: string;
    name: string;
    status: string;
    purchase_cost: string | null;
    book_value: string | null;
    serial_number: string | null;
    model: string | null;
    manufacturer: string | null;
    purchase_date: string | null;
    vendor: string | null;
    invoice_no: string | null;
    category?: { name: string };
    branch?: { name: string };
    custodian?: { employee_id: string; first_name: string; last_name: string } | null;
    transfers?: TransferRow[];
    assignments?: AssignmentRow[];
    maintenances?: MaintenanceRow[];
    accumulated_depreciation?: string | null;
    depreciation_entries?: Array<{
        id: number;
        period_year: number;
        period_month: number;
        depreciation_amount: string;
        book_value_after: string;
    }>;
    revaluations?: Array<{
        id: number;
        revaluation_date: string;
        previous_book_value: string;
        new_book_value: string;
        reason: string | null;
    }>;
};

export default function FixedAssetShow({
    asset,
    pendingDisposal,
}: {
    asset: AssetPayload;
    pendingDisposal: PendingDisposal | null;
}) {
    const { flash, auth } = usePage<{ flash?: { success?: string }; auth?: { user?: unknown; permissions?: string[] } }>().props;
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const isDisposed = asset.status === 'disposed';

    const revalueForm = useForm({
        revaluation_date: new Date().toISOString().slice(0, 10),
        new_book_value: asset.book_value != null ? String(asset.book_value) : '',
        reason: '',
    });

    const submitRevaluation = (e: React.FormEvent) => {
        e.preventDefault();
        revalueForm.post(route('fixed-assets.revaluation.store', asset.id));
    };

    return (
        <Layout>
            <Head title={asset.asset_tag} />
            <PayrollPage>
                <Link href={route('fixed-assets.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to register
                </Link>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {pendingDisposal && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertTitle>Pending disposal</AlertTitle>
                        <AlertDescription>
                            {pendingDisposal.disposal_method.replace(/_/g, ' ')} on {pendingDisposal.disposal_date}
                            {pendingDisposal.requested_by ? ` — requested by ${pendingDisposal.requested_by.name}` : ''}.
                            <Link href={route('asset-disposals.index', { status: 'pending' })} className="ml-2 font-medium text-amber-800 underline">Review</Link>
                        </AlertDescription>
                    </Alert>
                )}

                <PayrollPageHeader icon={Boxes} title={asset.name} description={asset.asset_tag}>
                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <Link href={route('fixed-assets.edit', asset.id)}>
                                <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Edit</Button>
                            </Link>
                        )}
                        {!isDisposed && !pendingDisposal && canEdit && (
                            <>
                                <Link href={route('asset-transfers.create', { fixed_asset_id: asset.id })}>
                                    <Button variant="outline" size="sm"><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer</Button>
                                </Link>
                                <Link href={route('asset-assignments.create', { fixed_asset_id: asset.id })}>
                                    <Button variant="outline" size="sm"><UserCheck className="mr-2 h-4 w-4" />Assign</Button>
                                </Link>
                                <Link href={route('asset-maintenances.create', { fixed_asset_id: asset.id })}>
                                    <Button variant="outline" size="sm"><Wrench className="mr-2 h-4 w-4" />Maintenance</Button>
                                </Link>
                                <Link href={route('asset-disposals.create', { fixed_asset_id: asset.id })}>
                                    <Button variant="outline" size="sm"><Trash2 className="mr-2 h-4 w-4" />Dispose</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </PayrollPageHeader>

                <div className="grid gap-4 md:grid-cols-2">
                    <PayrollSectionCard title="Overview">
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><Badge>{asset.status.replace(/_/g, ' ')}</Badge></dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{asset.category?.name ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Branch</dt><dd>{asset.branch?.name ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Custodian</dt><dd>{asset.custodian ? `${asset.custodian.first_name} ${asset.custodian.last_name} (${asset.custodian.employee_id})` : '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Book value</dt><dd>{asset.book_value ?? asset.purchase_cost ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Accum. depreciation</dt><dd>{asset.accumulated_depreciation ?? '—'}</dd></div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Depreciation</dt>
                                <dd><Link href={route('asset-depreciation.schedule', asset.id)} className="text-sm text-emerald-700 hover:underline">View schedule</Link></dd>
                            </div>
                        </dl>
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Technical">
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-muted-foreground">Serial</dt><dd>{asset.serial_number ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Model</dt><dd>{asset.model ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Manufacturer</dt><dd>{asset.manufacturer ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Purchase date</dt><dd>{asset.purchase_date ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Vendor / Invoice</dt><dd>{[asset.vendor, asset.invoice_no].filter(Boolean).join(' / ') || '—'}</dd></div>
                        </dl>
                    </PayrollSectionCard>
                </div>

                <PayrollSectionCard title="Assignment history" className="mt-4">
                    {(asset.assignments?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No assignment history.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Assigned</TableHead>
                                    <TableHead>Released</TableHead>
                                    <TableHead>By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asset.assignments!.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>{a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '—'}</TableCell>
                                        <TableCell>{a.assigned_date}</TableCell>
                                        <TableCell>{a.released_date ?? '—'}</TableCell>
                                        <TableCell>{a.assigned_by?.name ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>

                <PayrollSectionCard title="Maintenance" className="mt-4">
                    {(asset.maintenances?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No maintenance records.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Description</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asset.maintenances!.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>{m.maintenance_date}</TableCell>
                                        <TableCell className="capitalize">{m.maintenance_type}</TableCell>
                                        <TableCell>{m.status.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{m.cost ?? '—'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{m.description}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>

                {!isDisposed && canEdit && (
                    <PayrollSectionCard title="Revaluation" className="mt-4">
                        <form onSubmit={submitRevaluation} className="grid gap-3 md:grid-cols-4 md:items-end">
                            <div>
                                <Label>Date</Label>
                                <Input type="date" value={revalueForm.data.revaluation_date} onChange={(e) => revalueForm.setData('revaluation_date', e.target.value)} />
                            </div>
                            <div>
                                <Label>New book value</Label>
                                <Input type="number" min={0} step="0.01" value={revalueForm.data.new_book_value} onChange={(e) => revalueForm.setData('new_book_value', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Reason</Label>
                                <Textarea value={revalueForm.data.reason} onChange={(e) => revalueForm.setData('reason', e.target.value)} rows={1} />
                            </div>
                            <Button type="submit" size="sm" disabled={revalueForm.processing}>Apply revaluation</Button>
                        </form>
                    </PayrollSectionCard>
                )}

                <PayrollSectionCard title="Depreciation history" className="mt-4">
                    {(asset.depreciation_entries?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No depreciation posted yet.{' '}
                            <Link href={route('asset-depreciation.index')} className="text-emerald-700 hover:underline">Run monthly depreciation</Link>
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Book value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asset.depreciation_entries!.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>{e.period_month}/{e.period_year}</TableCell>
                                        <TableCell>{e.depreciation_amount}</TableCell>
                                        <TableCell>{e.book_value_after}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>

                {(asset.revaluations?.length ?? 0) > 0 && (
                    <PayrollSectionCard title="Revaluation history" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Previous</TableHead>
                                    <TableHead>New</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asset.revaluations!.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.revaluation_date}</TableCell>
                                        <TableCell>{r.previous_book_value}</TableCell>
                                        <TableCell>{r.new_book_value}</TableCell>
                                        <TableCell>{r.reason ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </PayrollSectionCard>
                )}

                <PayrollSectionCard title="Transfer history" className="mt-4">
                    {(asset.transfers?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No transfers recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asset.transfers!.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.transfer_date}</TableCell>
                                        <TableCell>{t.from_branch?.name}</TableCell>
                                        <TableCell>{t.to_branch?.name}</TableCell>
                                        <TableCell>{t.transferred_by?.name ?? '—'}</TableCell>
                                        <TableCell>{t.notes ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
