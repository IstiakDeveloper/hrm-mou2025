import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { formatTakaWhole } from '@/lib/taka-format';

type Row = {
    id: number;
    application_number: string;
    employee_label: string;
    policy_name: string | null;
    principal_amount: number;
    installment_amount_monthly: number;
    total_installments: number;
    approved_at: string | null;
};

export default function LoanDisburseIndex({ applications }: { applications: Row[] }) {
    const [selected, setSelected] = useState<Row | null>(null);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    const disburse = () => {
        if (!selected) return;
        router.post(route('loan-disburse.disburse', selected.id), { disbursement_date: date });
    };

    return (
        <EmployeeLoanLayout title="Loan disburse" activeTab="disburse" description="Disburse approved applications — this creates the active loan in the register.">
            <div className="rounded-lg border bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                            {['App No', 'Employee', 'Policy', 'Principal', 'Install/mo', 'Tenure', 'Approved', ''].map((h) => (
                                <TableHead key={h || 'a'} className="text-[10px] uppercase text-amber-400 font-bold">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">No approved applications pending disbursement.</TableCell></TableRow>
                        ) : (
                            applications.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-xs font-mono">{row.application_number}</TableCell>
                                    <TableCell className="text-xs">{row.employee_label}</TableCell>
                                    <TableCell className="text-xs">{row.policy_name}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.principal_amount)}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.installment_amount_monthly)}</TableCell>
                                    <TableCell className="text-xs text-center">{row.total_installments}</TableCell>
                                    <TableCell className="text-xs">{row.approved_at}</TableCell>
                                    <TableCell>
                                        <Button size="sm" className="h-7 text-[10px] bg-amber-600" onClick={() => setSelected(row)}>Disburse</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={selected !== null} onOpenChange={() => setSelected(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Disburse loan — {selected?.application_number}</DialogTitle></DialogHeader>
                    <PayrollField label="Disbursement date">
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </PayrollField>
                    <DialogFooter>
                        <Button className="bg-emerald-600" onClick={disburse}>Confirm disburse</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EmployeeLoanLayout>
    );
}
