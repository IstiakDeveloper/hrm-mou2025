import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { fmt } from './types';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type Props = {
    batch: {
        id: number;
        batch_number: string;
        collection_type_label: string;
        collection_date: string | null;
        reference_no: string | null;
        notes: string | null;
        item_count: number;
        total_amount: number;
        created_by: string | null;
        created_at: string | null;
        is_rolled_back: boolean;
        rolled_back_at: string | null;
        rolled_back_by: string | null;
        can_rollback: boolean;
        items: {
            id: number;
            loan_number: string | null;
            employee_label: string;
            installment_count: number;
            amount: number;
            notes: string | null;
            loan_id: number;
        }[];
        transactions: {
            id: number;
            transaction_type_label: string;
            credit_amount: number;
            debit_amount: number;
            balance_after: number;
            transaction_date: string | null;
            installment_no: number | null;
            notes: string | null;
        }[];
    };
};

export default function LoanCollectionShow({ batch }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canRollback = hasAppPermission(auth, 'payroll.edit');
    const [rolling, setRolling] = useState(false);

    const rollback = () => {
        if (!confirm(`Rollback ${batch.batch_number}?`)) return;
        setRolling(true);
        router.post(route('loan-collection.rollback', batch.id), {}, { onFinish: () => setRolling(false) });
    };

    return (
        <EmployeeLoanLayout title={batch.batch_number} activeTab="collection">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <Link href={employeeLoanPath(route('loan-collection.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Collection list
                </Link>
                {canRollback && batch.can_rollback && !batch.is_rolled_back && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-rose-700" disabled={rolling} onClick={rollback}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Rollback batch
                    </Button>
                )}
            </div>

            <Card className="mb-4 border-zinc-200/90 shadow-sm">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">{batch.collection_type_label}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <p className="text-zinc-500">Date</p>
                        <p className="font-medium">{batch.collection_date}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Total</p>
                        <p className="font-semibold tabular-nums">৳{fmt(batch.total_amount)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Items</p>
                        <p className="font-medium">{batch.item_count}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Status</p>
                        <p className={batch.is_rolled_back ? 'text-rose-600' : 'text-emerald-700'}>
                            {batch.is_rolled_back ? `Rolled back ${batch.rolled_back_at}` : 'Active'}
                        </p>
                    </div>
                    {batch.reference_no && (
                        <div>
                            <p className="text-zinc-500">Reference</p>
                            <p>{batch.reference_no}</p>
                        </div>
                    )}
                    {batch.notes && (
                        <div className="sm:col-span-2">
                            <p className="text-zinc-500">Notes</p>
                            <p>{batch.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            {['Employee', 'Loan', 'Installments', 'Amount', ''].map((h) => (
                                <TableHead key={h} className="text-xs">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batch.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.employee_label}</TableCell>
                                <TableCell className="text-xs">{item.loan_number}</TableCell>
                                <TableCell className="text-xs">{item.installment_count}</TableCell>
                                <TableCell className="text-xs tabular-nums">{fmt(item.amount)}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={employeeLoanPath(route('employee-loans.show', item.loan_id))} className="text-xs text-emerald-700 hover:underline">
                                        Loan
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            {['Date', 'Type', 'Inst.', 'Credit', 'Balance', 'Notes'].map((h) => (
                                <TableHead key={h} className="text-xs">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batch.transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell className="text-xs">{tx.transaction_date}</TableCell>
                                <TableCell className="text-xs">{tx.transaction_type_label}</TableCell>
                                <TableCell className="text-xs">{tx.installment_no ?? '—'}</TableCell>
                                <TableCell className="text-xs tabular-nums text-emerald-700">{fmt(tx.credit_amount)}</TableCell>
                                <TableCell className="text-xs tabular-nums">{fmt(tx.balance_after)}</TableCell>
                                <TableCell className="text-xs text-zinc-500 max-w-[180px] truncate">{tx.notes}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </EmployeeLoanLayout>
    );
}
