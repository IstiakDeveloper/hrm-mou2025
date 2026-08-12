import React, { useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import { formatLoanSelectLabel, fmtLoanAmount, loanSelectKeywords } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';

type LoanOption = {
    id: number;
    loan_number: string;
    employee_id: number;
    employee_label: string;
    loan_type_label?: string | null;
    policy_name: string | null;
    policy_code?: string | null;
    outstanding_balance: number;
    installment_amount: number;
    pending_installments: number;
    has_scheduled_installments?: boolean;
    disbursement_date: string | null;
};

type Props = {
    filters: Record<string, string>;
    branches: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string; current_branch_id?: number | null }[];
    loans: LoanOption[];
    defaultTransferDate: string;
};

const fmt = fmtLoanAmount;

export default function LoanTransferCreate({ filters, branches, employees, loans, defaultTransferDate }: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [fromEmployeeId, setFromEmployeeId] = useState(filters.employee_id || '');
    const [loanId, setLoanId] = useState('');
    const [toEmployeeId, setToEmployeeId] = useState('');

    const form = useForm({
        employee_loan_id: '',
        to_employee_id: '',
        transfer_date: defaultTransferDate,
        reference_no: '',
        notes: '',
    });

    const branchEmployees = useMemo(() => {
        if (!branchId) return employees;
        return employees.filter((e) => String(e.current_branch_id ?? '') === branchId);
    }, [branchId, employees]);

    const fromLoans = useMemo(() => {
        if (!fromEmployeeId) return [];
        return loans.filter((l) => String(l.employee_id) === String(fromEmployeeId));
    }, [fromEmployeeId, loans]);

    const loanItems = useMemo(
        () =>
            fromLoans.map((l) => ({
                value: String(l.id),
                label: formatLoanSelectLabel(
                    {
                        ...l,
                        note: l.has_scheduled_installments ? 'on payroll (cannot transfer yet)' : null,
                    },
                    {
                        includeOutstanding: !l.has_scheduled_installments,
                        includePending: !l.has_scheduled_installments,
                    },
                ),
                keywords: loanSelectKeywords(l),
                disabled: Boolean(l.has_scheduled_installments),
            })),
        [fromLoans],
    );

    const selectedLoan = fromLoans.find((l) => String(l.id) === loanId);

    const toEmployeeItems = useMemo(() => {
        const excludeId = selectedLoan?.employee_id ?? (fromEmployeeId ? parseInt(fromEmployeeId, 10) : null);
        return employees
            .filter((e) => !excludeId || e.id !== excludeId)
            .map((e) => ({
                value: String(e.id),
                label: `${e.pin ?? ''} — ${e.name_en ?? ''}`.trim(),
                keywords: `${e.pin ?? ''} ${e.name_en ?? ''}`,
            }));
    }, [employees, selectedLoan, fromEmployeeId]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            employee_loan_id: parseInt(loanId, 10),
            to_employee_id: parseInt(toEmployeeId, 10),
        }));
        form.post(route('loan-transfer.store'));
    };

    return (
        <EmployeeLoanLayout
            title="New loan transfer"
            activeTab="transfer"
            description="Move an active loan to another employee. Outstanding balance and installment schedule stay the same."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-transfer.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Transfer list
                </Link>
            </div>

            <form onSubmit={submit}>
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold">Transfer details</CardTitle>
                        <CardDescription className="text-xs">
                            Loan must be active and not scheduled on a pending payroll run.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <PayrollBranchSelect
                                branches={branches}
                                value={branchId}
                                onChange={(v) => {
                                    setBranchId(v);
                                    setFromEmployeeId('');
                                    setLoanId('');
                                }}
                                allowAll
                                allLabel="All branches"
                            />
                            <div />
                        </div>

                        <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
                            <p className="mb-3 text-xs font-semibold text-zinc-700">From (current loan holder)</p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <PayrollEmployeeSelect
                                    employees={branchEmployees}
                                    value={fromEmployeeId}
                                    onChange={(v) => {
                                        setFromEmployeeId(v);
                                        setLoanId('');
                                    }}
                                    required
                                    allowAll={false}
                                    allLabel="Select employee"
                                />
                                <div key={`loan-select-${fromEmployeeId}`}>
                                    <PayrollComboField
                                        label="Loan to transfer"
                                        value={loanId}
                                        onChange={setLoanId}
                                        items={loanItems}
                                        placeholder={fromEmployeeId ? 'Select loan' : 'Select employee first'}
                                        required
                                        disabled={!fromEmployeeId}
                                    />
                                </div>
                            </div>
                            {fromEmployeeId && fromLoans.length === 0 && (
                                <p className="mt-2 text-xs text-amber-700">This employee has no active loan.</p>
                            )}
                            {fromEmployeeId && fromLoans.length > 0 && fromLoans.every((l) => l.has_scheduled_installments) && (
                                <p className="mt-2 text-xs text-amber-700">
                                    Loan is on pending payroll. Complete or rollback salary process before transfer.
                                </p>
                            )}
                            {selectedLoan && (
                                <p className="mt-2 text-[10px] text-zinc-500">
                                    {[selectedLoan.loan_type_label, selectedLoan.policy_name || selectedLoan.policy_code]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    {' · '}
                                    Outstanding ৳{fmt(selectedLoan.outstanding_balance)} ·{' '}
                                    {selectedLoan.pending_installments} pending installments · Disbursed {selectedLoan.disbursement_date}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-center text-zinc-400">
                            <ArrowRight className="h-5 w-5" />
                        </div>

                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                            <p className="mb-3 text-xs font-semibold text-emerald-900">To (new loan holder)</p>
                            <PayrollComboField
                                label="Transfer to employee"
                                value={toEmployeeId}
                                onChange={setToEmployeeId}
                                items={toEmployeeItems}
                                placeholder="Select receiving employee"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Transfer date</Label>
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={form.data.transfer_date}
                                    onChange={(e) => form.setData('transfer_date', e.target.value)}
                                />
                                {form.errors.transfer_date && <p className="text-xs text-rose-600">{form.errors.transfer_date}</p>}
                            </div>
                            <PayrollField label="Reference no.">
                                <Input
                                    className="h-9 text-xs"
                                    value={form.data.reference_no}
                                    onChange={(e) => form.setData('reference_no', e.target.value)}
                                />
                            </PayrollField>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-xs">Notes</Label>
                                <Textarea className="text-xs min-h-[72px]" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                            </div>
                        </div>

                        {form.errors.transfer && <p className="text-xs text-rose-600">{form.errors.transfer}</p>}

                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing || !loanId || !toEmployeeId} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="mr-2 h-4 w-4" />
                                Transfer loan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </EmployeeLoanLayout>
    );
}
