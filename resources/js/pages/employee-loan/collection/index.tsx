import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollComboField } from '@/components/payroll/PayrollFilterGrid';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { fmt, type BatchSummary } from './types';
import { Eye, Filter, Plus } from 'lucide-react';

type Props = {
    filters: { search: string; collection_type: string };
    batches: {
        data: BatchSummary[];
        links: { url: string | null; label: string; active: boolean }[];
    };
};

const typeItems = [
    { value: '', label: 'All types' },
    { value: 'single', label: 'Single' },
    { value: 'batch', label: 'Batch' },
    { value: 'advance', label: 'Advance' },
    { value: 'waive', label: 'Waive' },
    { value: 'rebate', label: 'Rebate' },
];

export default function LoanCollectionIndex({ filters: init, batches }: Props) {
    const [filters, setFilters] = useState(init);

    const apply = () => router.get(route('loan-collection.index'), filters, { preserveState: true });

    return (
        <EmployeeLoanLayout
            title="Loan collection"
            activeTab="collection"
            description="Off-payroll loan collections, advance payments, waive and rebate."
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    <Link href={employeeLoanPath(route('loan-collection.single.create'))}>
                        <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700">
                            <Plus className="mr-1 h-3.5 w-3.5" /> Single
                        </Button>
                    </Link>
                    <Link href={employeeLoanPath(route('loan-collection.batch.create'))}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                            Batch
                        </Button>
                    </Link>
                    <Link href={employeeLoanPath(route('loan-collection.advance.create'))}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                            Advance
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                <Input
                    className="h-8 w-48 text-xs"
                    placeholder="Search batch / reference"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
                <div className="w-40">
                    <PayrollComboField
                        label=""
                        value={filters.collection_type}
                        onChange={(v) => setFilters((f) => ({ ...f, collection_type: v }))}
                        items={typeItems}
                        placeholder="Type"
                    />
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={apply}>
                    <Filter className="mr-1 h-3.5 w-3.5" /> Filter
                </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            {['Batch', 'Type', 'Date', 'Items', 'Amount', 'Reference', 'Status', ''].map((h) => (
                                <TableHead key={h} className="text-xs">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-sm text-zinc-500">
                                    No collections yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            batches.data.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="text-xs font-medium">{b.batch_number}</TableCell>
                                    <TableCell className="text-xs">{b.collection_type_label}</TableCell>
                                    <TableCell className="text-xs">{b.collection_date}</TableCell>
                                    <TableCell className="text-xs">{b.item_count}</TableCell>
                                    <TableCell className="text-xs tabular-nums">{fmt(b.total_amount)}</TableCell>
                                    <TableCell className="text-xs text-zinc-500">{b.reference_no || '—'}</TableCell>
                                    <TableCell className="text-xs">
                                        {b.is_rolled_back ? (
                                            <span className="text-rose-600">Rolled back</span>
                                        ) : (
                                            <span className="text-emerald-700">Active</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={employeeLoanPath(route('loan-collection.show', b.id))}>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                                                <Eye className="mr-1 h-3.5 w-3.5" /> View
                                            </Button>
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
