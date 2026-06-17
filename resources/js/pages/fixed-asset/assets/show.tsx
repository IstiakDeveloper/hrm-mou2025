import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { hasAppPermission } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRightLeft, Boxes, Edit, Trash2, TrendingDown, UserCheck, Wrench, Calendar, DollarSign, History } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatDisplayDate } from '@/lib/display-date';

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
    employee?: EmployeeNameFields & { employee_id: string };
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
    custodian?: (EmployeeNameFields & { employee_id: string }) | null;
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

const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
        active: 'Active',
        in_transit: 'In Transit',
        under_maintenance: 'Maintenance',
        not_in_use: 'Not in Use',
        disposed: 'Disposed',
    };
    const classes: Record<string, string> = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50',
        in_transit: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-50',
        under_maintenance: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50',
        not_in_use: 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100',
        disposed: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50',
    };
    return (
        <Badge variant="outline" className={classes[status] || 'bg-zinc-50 text-zinc-600 border-zinc-100'}>
            {labels[status] || status.replace(/_/g, ' ')}
        </Badge>
    );
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
            <AssetPage>
                <Link href={route('fixed-assets.index')} className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to register
                </Link>

                {flash?.success && (
                    <Alert className="border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {pendingDisposal && (
                    <Alert className="border-amber-100 bg-amber-50/40 text-amber-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending disposal approval</AlertTitle>
                        <AlertDescription className="text-xs text-amber-700 mt-1 flex items-center justify-between">
                            <span>
                                {pendingDisposal.disposal_method.replace(/_/g, ' ')} on {formatDisplayDate(pendingDisposal.disposal_date)}
                                {pendingDisposal.requested_by ? ` — requested by ${pendingDisposal.requested_by.name}` : ''}.
                            </span>
                            <Link href={route('asset-disposals.index', { status: 'pending' })} className="font-semibold text-amber-800 hover:underline">Review requests</Link>
                        </AlertDescription>
                    </Alert>
                )}

                <AssetPageHeader icon={Boxes} title={asset.name} description={asset.asset_tag}>
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                            <Link href={route('fixed-assets.edit', asset.id)}>
                                <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit</Button>
                            </Link>
                        )}
                        {!isDisposed && !pendingDisposal && canEdit && (
                            <>
                                <Link href={route('asset-transfers.create', { fixed_asset_id: asset.id })}>
                                    <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer"><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer</Button>
                                </Link>
                                <Link href={route('asset-assignments.create', { fixed_asset_id: asset.id })}>
                                    <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer"><UserCheck className="mr-2 h-4 w-4" />Assign</Button>
                                </Link>
                                <Link href={route('asset-maintenances.create', { fixed_asset_id: asset.id })}>
                                    <Button size="sm" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8.5 rounded-lg cursor-pointer"><Wrench className="mr-2 h-4 w-4" />Maintenance</Button>
                                </Link>
                                <Link href={route('asset-disposals.create', { fixed_asset_id: asset.id })}>
                                    <Button size="sm" variant="ghost" className="text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 h-8.5 rounded-lg cursor-pointer"><Trash2 className="mr-2 h-4 w-4" />Dispose</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </AssetPageHeader>

                <div className="grid gap-6 md:grid-cols-2">
                    <AssetSectionCard title="Asset Overview">
                        <div className="divide-y divide-zinc-100 text-sm">
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Status</span>
                                <span>{getStatusBadge(asset.status)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Category</span>
                                <span className="text-zinc-900 font-semibold text-xs">{asset.category?.name ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Branch</span>
                                <span className="text-zinc-900 font-semibold text-xs">{asset.branch?.name ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Custodian</span>
                                <span className="text-zinc-900 font-semibold text-xs">
                                    {asset.custodian ? `${employeeDisplayName(asset.custodian)} (${asset.custodian.employee_id})` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Book Value</span>
                                <span className="font-mono text-zinc-900 font-bold text-xs">
                                    {asset.book_value != null ? `৳${Number(asset.book_value).toLocaleString()}` : asset.purchase_cost != null ? `৳${Number(asset.purchase_cost).toLocaleString()}` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Accum. Depreciation</span>
                                <span className="font-mono text-zinc-900 font-semibold text-xs">{asset.accumulated_depreciation ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Depreciation Schedule</span>
                                <span>
                                    <Link href={route('asset-depreciation.schedule', asset.id)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
                                        View Schedule
                                    </Link>
                                </span>
                            </div>
                        </div>
                    </AssetSectionCard>
                    
                    <AssetSectionCard title="Technical & Purchase Details">
                        <div className="divide-y divide-zinc-100 text-sm">
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Serial Number</span>
                                <span className="font-mono text-zinc-900 font-semibold text-xs">{asset.serial_number ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Model</span>
                                <span className="text-zinc-900 font-semibold text-xs">{asset.model ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Manufacturer</span>
                                <span className="text-zinc-900 font-semibold text-xs">{asset.manufacturer ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Purchase Date</span>
                                <span className="text-zinc-900 font-semibold text-xs">{formatDisplayDate(asset.purchase_date)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-zinc-500 font-medium text-xs">Vendor / Invoice</span>
                                <span className="text-zinc-900 font-semibold text-xs">
                                    {[asset.vendor, asset.invoice_no].filter(Boolean).join(' / ') || '—'}
                                </span>
                            </div>
                        </div>
                    </AssetSectionCard>
                </div>

                <div className="w-full mt-2">
                    <Tabs defaultValue="assignments" className="w-full">
                        <TabsList className="bg-zinc-100 p-1 rounded-lg border border-zinc-200/50">
                            <TabsTrigger value="assignments" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 cursor-pointer text-xs"><UserCheck className="mr-1.5 h-3.5 w-3.5" />Assignments</TabsTrigger>
                            <TabsTrigger value="maintenances" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 cursor-pointer text-xs"><Wrench className="mr-1.5 h-3.5 w-3.5" />Maintenance</TabsTrigger>
                            <TabsTrigger value="depreciations" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 cursor-pointer text-xs"><TrendingDown className="mr-1.5 h-3.5 w-3.5" />Depreciation & Revaluation</TabsTrigger>
                            <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 cursor-pointer text-xs"><ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />Transfers</TabsTrigger>
                        </TabsList>

                        <TabsContent value="assignments" className="mt-4">
                            <AssetSectionCard title="Assignment History" noPadding>
                                {(asset.assignments?.length ?? 0) === 0 ? (
                                    <div className="p-6 text-center text-zinc-400 text-xs font-medium">No assignment history recorded.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-zinc-50/50">
                                            <TableRow className="border-zinc-100 hover:bg-transparent">
                                                <TableHead className="font-semibold text-zinc-700 py-3 pl-6">Employee</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Assigned</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Released</TableHead>
                                                <TableHead className="font-semibold text-zinc-700 pr-6">Assigned By</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {asset.assignments!.map((a) => (
                                                <TableRow key={a.id} className="border-zinc-100 hover:bg-zinc-50/40">
                                                    <TableCell className="py-3 pl-6 font-medium text-zinc-900">{a.employee ? employeeDisplayName(a.employee) : '—'}</TableCell>
                                                    <TableCell className="text-zinc-600 text-xs">{formatDisplayDate(a.assigned_date)}</TableCell>
                                                    <TableCell className="text-zinc-600 text-xs">
                                                        {a.released_date ? (
                                                            <span className="text-zinc-500">{formatDisplayDate(a.released_date)}</span>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">Active</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-zinc-500 text-xs pr-6">{a.assigned_by?.name ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </AssetSectionCard>
                        </TabsContent>

                        <TabsContent value="maintenances" className="mt-4">
                            <AssetSectionCard title="Maintenance History" noPadding>
                                {(asset.maintenances?.length ?? 0) === 0 ? (
                                    <div className="p-6 text-center text-zinc-400 text-xs font-medium">No maintenance records found.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-zinc-50/50">
                                            <TableRow className="border-zinc-100 hover:bg-transparent">
                                                <TableHead className="font-semibold text-zinc-700 py-3 pl-6">Date</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Type</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Cost</TableHead>
                                                <TableHead className="font-semibold text-zinc-700 pr-6">Description</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {asset.maintenances!.map((m) => (
                                                <TableRow key={m.id} className="border-zinc-100 hover:bg-zinc-50/40">
                                                    <TableCell className="py-3 pl-6 text-zinc-900 font-semibold text-xs">{formatDisplayDate(m.maintenance_date)}</TableCell>
                                                    <TableCell className="capitalize text-zinc-800 font-medium text-xs">{m.maintenance_type}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={m.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}>
                                                            {m.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold text-zinc-800">
                                                        {m.cost != null ? `৳${Number(m.cost).toLocaleString()}` : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-zinc-500 text-xs max-w-xs truncate pr-6">{m.description}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </AssetSectionCard>
                        </TabsContent>

                        <TabsContent value="depreciations" className="mt-4 space-y-6">
                            {!isDisposed && canEdit && (
                                <AssetSectionCard title="Apply Revaluation">
                                    <form onSubmit={submitRevaluation} className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date</Label>
                                            <Input type="date" value={revalueForm.data.revaluation_date} onChange={(e) => revalueForm.setData('revaluation_date', e.target.value)} className="h-9 border-zinc-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">New Book Value (৳)</Label>
                                            <Input type="number" min={0} step="0.01" value={revalueForm.data.new_book_value} onChange={(e) => revalueForm.setData('new_book_value', e.target.value)} className="h-9 border-zinc-200" />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Reason for Revaluation</Label>
                                            <Input value={revalueForm.data.reason} onChange={(e) => revalueForm.setData('reason', e.target.value)} placeholder="e.g. Market value adjustment" className="h-9 border-zinc-200" />
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-4 flex justify-end">
                                            <Button type="submit" size="sm" disabled={revalueForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer">
                                                Apply Revaluation
                                            </Button>
                                        </div>
                                    </form>
                                </AssetSectionCard>
                            )}

                            <div className="grid gap-6 md:grid-cols-2">
                                <AssetSectionCard title="Depreciation Postings" noPadding>
                                    {(asset.depreciation_entries?.length ?? 0) === 0 ? (
                                        <div className="p-6 text-center text-zinc-400 text-xs font-medium">
                                            No depreciation posted yet.{' '}
                                            <Link href={route('asset-depreciation.index')} className="text-emerald-700 hover:underline ml-1">Run monthly depreciation</Link>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-zinc-50/50">
                                                <TableRow className="border-zinc-100 hover:bg-transparent">
                                                    <TableHead className="font-semibold text-zinc-700 py-3 pl-6">Period</TableHead>
                                                    <TableHead className="font-semibold text-zinc-700">Amount</TableHead>
                                                    <TableHead className="font-semibold text-zinc-700 pr-6">Book Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {asset.depreciation_entries!.map((e) => (
                                                    <TableRow key={e.id} className="border-zinc-100 hover:bg-zinc-50/40">
                                                        <TableCell className="py-3 pl-6 text-zinc-900 font-semibold text-xs">{e.period_month}/{e.period_year}</TableCell>
                                                        <TableCell className="font-mono text-xs text-zinc-600">৳{Number(e.depreciation_amount).toLocaleString()}</TableCell>
                                                        <TableCell className="font-mono text-xs font-semibold text-zinc-800 pr-6">৳{Number(e.book_value_after).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </AssetSectionCard>

                                <AssetSectionCard title="Revaluation History" noPadding>
                                    {(asset.revaluations?.length ?? 0) === 0 ? (
                                        <div className="p-6 text-center text-zinc-400 text-xs font-medium">No revaluations recorded.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-zinc-50/50">
                                                <TableRow className="border-zinc-100 hover:bg-transparent">
                                                    <TableHead className="font-semibold text-zinc-700 py-3 pl-6">Date</TableHead>
                                                    <TableHead className="font-semibold text-zinc-700">Previous</TableHead>
                                                    <TableHead className="font-semibold text-zinc-700">New</TableHead>
                                                    <TableHead className="font-semibold text-zinc-700 pr-6">Reason</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {asset.revaluations!.map((r) => (
                                                    <TableRow key={r.id} className="border-zinc-100 hover:bg-zinc-50/40">
                                                        <TableCell className="py-3 pl-6 text-zinc-900 font-semibold text-xs">{formatDisplayDate(r.revaluation_date)}</TableCell>
                                                        <TableCell className="font-mono text-xs text-zinc-600">৳{Number(r.previous_book_value).toLocaleString()}</TableCell>
                                                        <TableCell className="font-mono text-xs font-semibold text-zinc-800">৳{Number(r.new_book_value).toLocaleString()}</TableCell>
                                                        <TableCell className="text-zinc-500 text-xs pr-6 truncate max-w-[120px]" title={r.reason ?? undefined}>{r.reason ?? '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </AssetSectionCard>
                            </div>
                        </TabsContent>

                        <TabsContent value="transfers" className="mt-4">
                            <AssetSectionCard title="Transfer History" noPadding>
                                {(asset.transfers?.length ?? 0) === 0 ? (
                                    <div className="p-6 text-center text-zinc-400 text-xs font-medium">No transfer history recorded.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-zinc-50/50">
                                            <TableRow className="border-zinc-100 hover:bg-transparent">
                                                <TableHead className="font-semibold text-zinc-700 py-3 pl-6">Date</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">From Branch</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">To Branch</TableHead>
                                                <TableHead className="font-semibold text-zinc-700">Transferred By</TableHead>
                                                <TableHead className="font-semibold text-zinc-700 pr-6">Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {asset.transfers!.map((t) => (
                                                <TableRow key={t.id} className="border-zinc-100 hover:bg-zinc-50/40">
                                                    <TableCell className="py-3 pl-6 text-zinc-900 font-semibold text-xs">{formatDisplayDate(t.transfer_date)}</TableCell>
                                                    <TableCell className="text-zinc-800 text-xs font-medium">{t.from_branch?.name}</TableCell>
                                                    <TableCell className="text-zinc-800 text-xs font-medium">{t.to_branch?.name}</TableCell>
                                                    <TableCell className="text-zinc-500 text-xs">{t.transferred_by?.name ?? '—'}</TableCell>
                                                    <TableCell className="text-zinc-500 text-xs pr-6 truncate max-w-[150px]">{t.notes ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </AssetSectionCard>
                        </TabsContent>
                    </Tabs>
                </div>
            </AssetPage>
        </Layout>
    );
}
