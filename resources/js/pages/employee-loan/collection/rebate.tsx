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

export default function LoanCollectionRebate({ filters, branches, employees, loans, defaultCollectionDate }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [loanId, setLoanId] = useState('');

    const form = useForm({
        collection_date: defaultCollectionDate,
        reference_no: '',
        notes: '',
        employee_loan_id: '',
        amount: '',
    });

    const selectedLoan = loans.find((l) => String(l.id) === loanId);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            employee_loan_id: parseInt(loanId, 10),
            amount: parseFloat(data.amount),
        }));
        form.post(route('loan-collection.rebate.store'));
    };

    return (
        <EmployeeLoanLayout
            title="Loan rebate"
            activeTab="collection-rebate"
            description="Grant a rebate / discount on outstanding loan balance."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-collection.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Collection list
                </Link>
            </div>

            <form onSubmit={submit}>
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold">Rebate</CardTitle>
                        <CardDescription className="text-xs">
                            Reduces outstanding balance. Use Loan Waive to forgive remaining installments if needed.
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
                            <PayrollField label="Rebate amount (৳)" error={form.errors.amount}>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="h-9 text-xs"
                                    value={form.data.amount}
                                    onChange={(e) => form.setData('amount', e.target.value)}
                                    placeholder={selectedLoan ? `Max ${fmt(selectedLoan.outstanding_balance)}` : ''}
                                />
                            </PayrollField>
                            <PayrollField label="Outstanding after rebate (৳)">
                                <Input
                                    readOnly
                                    className="h-9 bg-zinc-50 text-xs tabular-nums"
                                    value={
                                        selectedLoan && form.data.amount
                                            ? fmt(Math.max(0, selectedLoan.outstanding_balance - parseFloat(form.data.amount || '0')))
                                            : selectedLoan
                                              ? fmt(selectedLoan.outstanding_balance)
                                              : ''
                                    }
                                />
                            </PayrollField>
                        </div>
                        {form.errors.collection && <p className="mt-3 text-xs text-rose-600">{form.errors.collection}</p>}
                        <div className="mt-5 flex justify-end">
                            <Button type="submit" disabled={form.processing || !loanId} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="mr-2 h-4 w-4" /> Save rebate
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </EmployeeLoanLayout>
    );
}
