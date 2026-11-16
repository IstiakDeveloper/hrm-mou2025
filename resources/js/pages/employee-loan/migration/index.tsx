import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { History, Plus } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type Batch = {
    id: number;
    migration_number: string;
    closing_date: string | null;
    committee_name: string | null;
    item_count: number;
    created_by: string | null;
    created_at: string | null;
};

export default function LoanMigrationIndex({ batches }: { batches: Batch[] }) {
    const { auth } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'payroll.create');

    return (
        <EmployeeLoanLayout
            title="Loan migration"
            activeTab="migration"
            description="Import pre-system running loans. Each batch is saved at a closing date."
        >
            {canCreate && (
                <div className="mb-4 flex justify-end">
                    <Link href={employeeLoanPath(route('loan-migration.create'))}>
                        <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New migration
                        </Button>
                    </Link>
                </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            <TableHead className="text-xs">Migration no</TableHead>
                            <TableHead className="text-xs">Closing date</TableHead>
                            <TableHead className="text-xs">Committee</TableHead>
                            <TableHead className="text-xs text-center">Loans</TableHead>
                            <TableHead className="text-xs">Created by</TableHead>
                            <TableHead className="text-xs">Saved at</TableHead>
                            <TableHead className="text-xs w-20" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                                    <History className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                                    No migrations yet.
                                    {canCreate && (
                                        <span className="mt-1 block">
                                            <Link
                                                href={employeeLoanPath(route('loan-migration.create'))}
                                                className="font-semibold text-emerald-700 hover:underline"
                                            >
                                                Start a new migration
                                            </Link>
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            batches.map((b) => (
                                <TableRow key={b.id} className="hover:bg-amber-50/30">
                                    <TableCell className="text-xs font-mono font-semibold">{b.migration_number}</TableCell>
                                    <TableCell className="text-xs">{b.closing_date}</TableCell>
                                    <TableCell className="text-xs">{b.committee_name ?? '—'}</TableCell>
                                    <TableCell className="text-xs text-center tabular-nums">{b.item_count}</TableCell>
                                    <TableCell className="text-xs">{b.created_by ?? '—'}</TableCell>
                                    <TableCell className="text-xs text-zinc-500">{b.created_at}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={employeeLoanPath(route('loan-migration.show', b.id))}
                                            className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                                        >
                                            View
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </EmployeeLoanLayout>
    );
}
