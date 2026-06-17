import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { hasAppPermission } from '@/lib/permissions';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import type { SharedData } from '@/types';

type ReasonRow = { id: number; sl: number; code: string; name: string; is_active: boolean; disposals_count: number };

export default function DisposalReasonIndex({
    reasons,
    filters,
}: {
    reasons: { data: ReasonRow[] };
    filters: { search?: string };
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    return (
        <Layout>
            <Head title="Disposal reasons" />
            <PayrollPage>
                <PayrollPageHeader icon={Trash2} title="Disposal reasons" description="Master list of disposal reasons.">
                    {canCreate && (
                        <Link href={route('fixed-asset.disposal.reasons.create')}>
                            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add reason</Button>
                        </Link>
                    )}
                </PayrollPageHeader>

                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}

                <PayrollSectionCard title="Reasons">
                    <div className="mb-4 flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="max-w-xs" />
                        <Button variant="outline" onClick={() => router.get(route('fixed-asset.disposal.reasons.index'), { search }, { preserveState: true })}><Search className="h-4 w-4" /></Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SL</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reasons.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.sl}</TableCell>
                                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.disposals_count}</TableCell>
                                    <TableCell><Badge variant={row.is_active ? 'default' : 'outline'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                    <TableCell className="space-x-1 text-right">
                                        {canEdit && <Link href={route('fixed-asset.disposal.reasons.edit', row.id)}><Button size="sm" variant="outline"><Edit className="h-4 w-4" /></Button></Link>}
                                        {canDelete && row.disposals_count === 0 && (
                                            <Button size="sm" variant="outline" onClick={() => confirm('Delete?') && router.delete(route('fixed-asset.disposal.reasons.destroy', row.id))}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
