import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { formatDisplayDate } from '@/lib/display-date';
import { ArrowLeft, History } from 'lucide-react';

export default function AssetNotInUseHistory({ logs, branchScoped }: { logs: { data: any[] }; branchScoped: boolean }) {
    return (
        <Layout>
            <Head title="Status history" />
            <PayrollPage>
                <Link href={route('fixed-asset.assets.not-in-use.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={History} title="Not-in-use status history" />
                <BranchScopeAlert branchScoped={branchScoped} />
                <PayrollSectionCard title="Log">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Asset</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {logs.data.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No history.</TableCell></TableRow> : logs.data.map((row: any) => (
                                <TableRow key={row.id}>
                                    <TableCell>{formatDisplayDate(row.changed_at)}</TableCell>
                                    <TableCell>{row.fixed_asset ? `${row.fixed_asset.asset_tag} — ${row.fixed_asset.name}` : '—'}</TableCell>
                                    <TableCell>{row.from_status?.replace(/_/g, ' ') || '—'}</TableCell>
                                    <TableCell>{row.to_status?.replace(/_/g, ' ') || '—'}</TableCell>
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
