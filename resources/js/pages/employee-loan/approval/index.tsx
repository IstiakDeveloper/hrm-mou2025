import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { formatTakaWhole } from '@/lib/taka-format';

type Row = {
    id: number;
    application_number: string;
    employee_label: string;
    policy_name: string | null;
    applied_amount: number;
    total_payable: number;
    status: string;
};

export default function LoanApprovalIndex({ applications }: { applications: Row[] }) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const [rejectId, setRejectId] = useState<number | null>(null);
    const rejectForm = useForm({ rejection_reason: '' });

    return (
        <EmployeeLoanLayout title="Loan approval" activeTab="approval" description="Review pending applications and approve or reject.">
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
                                <TableCell className="text-xs capitalize">{row.status}</TableCell>
                                <TableCell>
                                    {canEdit && row.status === 'pending' && (
                                        <div className="flex gap-1">
                                            <Button size="sm" className="h-7 text-[10px] bg-emerald-600" onClick={() => router.post(route('loan-approval.approve', row.id))}>Approve</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600" onClick={() => setRejectId(row.id)}>Reject</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

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
