import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { formatTakaWhole } from '@/lib/taka-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { AccountsApproveModal } from '@/components/employee-loan/AccountsApproveModal';

type Row = {
    id: number;
    application_number: string;
    employee_label: string;
    policy_name: string | null;
    applied_amount: number;
    loan_type?: string | null;
    total_payable: number;
    status: string;
    channel?: string;
    has_form?: boolean;
};

export default function LoanApprovalIndex({ applications }: { applications: Row[] }) {
    const { auth, errors } = usePage<SharedData & { errors?: { application?: string; approved_amount?: string; disbursement_date?: string } }>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [accountsRow, setAccountsRow] = useState<Row | null>(null);
    const [accountsProcessing, setAccountsProcessing] = useState(false);
    const rejectForm = useForm({ rejection_reason: '' });

    return (
        <EmployeeLoanLayout title="Loan approval" activeTab="approval" description="PF applications finish here. Motorcycle applications need Accounts seal and signature, then Executive Director approval, which disburses the loan.">
            {errors?.application && (
                <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{errors.application}</p>
            )}
            <div className="rounded-lg border bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                            {['App No', 'Employee', 'Policy', 'Applied', 'Total', 'Status', 'Action'].map((h) => (
                                <TableHead key={h} className="text-[10px] uppercase text-amber-400 font-bold">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="text-xs font-mono">{row.application_number}</TableCell>
                                <TableCell className="text-xs">{row.employee_label}</TableCell>
                                <TableCell className="text-xs">{row.policy_name}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.applied_amount)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.total_payable)}</TableCell>
                                <TableCell className="text-xs capitalize">
                                    {row.status}
                                    {row.channel === 'employee' && <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800">Employee</span>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <Link href={employeeLoanPath(route('loan-applications.show', row.id))} className="text-[10px] font-semibold text-amber-800 underline">
                                            {row.has_form ? 'Form' : 'Open'}
                                        </Link>
                                        {canEdit && row.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-[10px] bg-emerald-600"
                                                    onClick={() => {
                                                        if (row.loan_type === 'motorcycle_loan') {
                                                            setAccountsRow(row);
                                                            return;
                                                        }
                                                        router.post(route('loan-approval.approve', row.id));
                                                    }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600" onClick={() => setRejectId(row.id)}>Reject</Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AccountsApproveModal
                open={accountsRow !== null}
                onOpenChange={(open) => {
                    if (!open) setAccountsRow(null);
                }}
                appliedAmount={accountsRow?.applied_amount ?? 0}
                processing={accountsProcessing}
                error={errors?.approved_amount || errors?.disbursement_date || errors?.application || null}
                onConfirm={(amount, date) => {
                    if (!accountsRow) return;
                    setAccountsProcessing(true);
                    router.post(route('loan-approval.approve', accountsRow.id), {
                        approved_amount: amount,
                        disbursement_date: date,
                    }, {
                        onFinish: () => setAccountsProcessing(false),
                        onSuccess: () => setAccountsRow(null),
                    });
                }}
            />

            <Dialog open={rejectId !== null} onOpenChange={() => setRejectId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject application</DialogTitle></DialogHeader>
                    <Textarea value={rejectForm.data.rejection_reason} onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)} placeholder="Reason..." />
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={() => rejectId && rejectForm.post(route('loan-approval.reject', rejectId), { onSuccess: () => setRejectId(null) })}
                        >
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EmployeeLoanLayout>
    );
}
