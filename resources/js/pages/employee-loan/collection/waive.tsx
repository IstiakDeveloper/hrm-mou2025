import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { LoanCollectionFormFields } from './LoanCollectionFormFields';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { fmt, type LoanOption } from './types';
import { ArrowLeft, Save } from 'lucide-react';

type Props = {
    filters: Record<string, string>;
    branches: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    loans: LoanOption[];
    defaultCollectionDate: string;
};

export default function LoanCollectionWaive({ filters, branches, employees, loans, defaultCollectionDate }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [loanId, setLoanId] = useState('');

    const form = useForm({
        collection_date: defaultCollectionDate,
        reference_no: '',
        notes: '',
        employee_loan_id: '',
        installment_count: '1',
    });

    const selectedLoan = loans.find((l) => String(l.id) === loanId);
    const estimated = selectedLoan ? selectedLoan.installment_amount * (parseInt(form.data.installment_count, 10) || 1) : 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            employee_loan_id: parseInt(loanId, 10),
            installment_count: parseInt(data.installment_count, 10) || 1,
        }));
        form.post(route('loan-collection.waive.store'));
    };

    return (
        <EmployeeLoanLayout
            title="Loan waive"
            activeTab="collection-waive"
            description="Forgive pending installments without cash collection."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-collection.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Collection list
                </Link>
            </div>

            <form onSubmit={submit}>
                <Card className="border-amber-200/80 shadow-sm">
                    <CardHeader className="border-b border-amber-100 py-3">
                        <CardTitle className="text-sm font-semibold text-amber-900">Waive installments</CardTitle>
                        <CardDescription className="text-xs">
                            Outstanding balance will reduce; waived installments will not be collected from payroll.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <LoanCollectionFormFields
                            branches={branches}
                            employees={employees}
                            loans={loans}
                            branchId={branchId}
                            employeeId={employeeId}
                            loanId={loanId}
                            onBranchChange={setBranchId}
                            onEmployeeChange={setEmployeeId}
                            onLoanChange={setLoanId}
                            collectionDate={form.data.collection_date}
                            onCollectionDateChange={(v) => form.setData('collection_date', v)}
                            referenceNo={form.data.reference_no}
                            onReferenceNoChange={(v) => form.setData('reference_no', v)}
                            notes={form.data.notes}
                            onNotesChange={(v) => form.setData('notes', v)}
                            notesRequired
                            errors={form.errors as Record<string, string>}
                        />
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <PayrollField label="Installments to waive" error={form.errors.installment_count}>
                                <Input
                                    type="number"
                                    min={1}
                                    className="h-9 text-xs"
                                    value={form.data.installment_count}
                                    onChange={(e) => form.setData('installment_count', e.target.value)}
                                />
                            </PayrollField>
                            <PayrollField label="Waived amount (৳)">
                                <Input readOnly className="h-9 bg-zinc-50 text-xs tabular-nums" value={estimated ? fmt(estimated) : ''} />
                            </PayrollField>
                        </div>
                        {form.errors.collection && <p className="mt-3 text-xs text-rose-600">{form.errors.collection}</p>}
                        <div className="mt-5 flex justify-end">
                            <Button type="submit" disabled={form.processing || !loanId} variant="destructive">
                                <Save className="mr-2 h-4 w-4" /> Confirm waive
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </EmployeeLoanLayout>
    );
}
