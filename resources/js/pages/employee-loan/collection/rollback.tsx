import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { fmt, type BatchSummary } from './types';
import { ArrowLeft, Filter, RotateCcw } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type Props = {
    filters: { search: string };
    batches: BatchSummary[];
};

export default function LoanCollectionRollback({ filters: init, batches }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canRollback = hasAppPermission(auth, 'payroll.edit');
    const [search, setSearch] = useState(init.search || '');
    const [rolling, setRolling] = useState<number | null>(null);

    const apply = () => router.get(route('loan-collection.rollback.index'), { search }, { preserveState: true });

    const rollback = (batch: BatchSummary) => {
        if (!confirm(`Rollback collection ${batch.batch_number}? Installments will return to pending.`)) return;
        setRolling(batch.id);
        router.post(route('loan-collection.rollback', batch.id), {}, { onFinish: () => setRolling(null) });
    };

    return (
        <EmployeeLoanLayout
            title="Collection rollback"
            activeTab="collection-rollback"
            description="Undo off-payroll collection, advance, waive or rebate. Payroll collections use Salary Rollback."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-collection.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Collection list
                </Link>
            </div>

            <Card className="border-zinc-200/90 shadow-sm">
                <CardHeader className="border-b border-zinc-100 py-3">
                    <CardTitle className="text-sm font-semibold">Reversible batches</CardTitle>
                    <CardDescription className="text-xs">Only batches not yet rolled back are listed.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex gap-2 border-b border-zinc-100 p-3">
                        <Input
                            className="h-8 w-56 text-xs"
                            placeholder="Search batch / reference"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={apply}>
                            <Filter className="mr-1 h-3.5 w-3.5" /> Filter
                        </Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50/80">
                                {['Batch', 'Type', 'Date', 'Amount', 'Items', ''].map((h) => (
                                    <TableHead key={h} className="text-xs">
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                                        No batches available for rollback.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                batches.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="text-xs font-medium">{b.batch_number}</TableCell>
                                        <TableCell className="text-xs">{b.collection_type_label}</TableCell>
                                        <TableCell className="text-xs">{b.collection_date}</TableCell>
                                        <TableCell className="text-xs tabular-nums">{fmt(b.total_amount)}</TableCell>
                                        <TableCell className="text-xs">{b.item_count}</TableCell>
                                        <TableCell className="text-right">
                                            {canRollback && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-rose-700"
                                                    disabled={rolling === b.id}
                                                    onClick={() => rollback(b)}
                                                >
                                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                    {rolling === b.id ? 'Rolling back…' : 'Rollback'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </EmployeeLoanLayout>
    );
}
