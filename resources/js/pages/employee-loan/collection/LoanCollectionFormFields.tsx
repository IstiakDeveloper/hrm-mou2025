import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import type { LoanOption } from './types';
import { fmt } from './types';

type Branch = { id: number; name: string; branch_code?: string | null };
type Employee = { id: number; pin?: string; name_en?: string };

type Props = {
    branches: Branch[];
    employees: Employee[];
    loans: LoanOption[];
    branchId: string;
    employeeId: string;
    loanId: string;
    onBranchChange: (v: string) => void;
    onEmployeeChange: (v: string) => void;
    onLoanChange: (v: string) => void;
    collectionDate: string;
    onCollectionDateChange: (v: string) => void;
    referenceNo: string;
    onReferenceNoChange: (v: string) => void;
    notes: string;
    onNotesChange: (v: string) => void;
    notesRequired?: boolean;
    errors?: Record<string, string>;
};

export function LoanCollectionFormFields({
    branches,
    employees,
    loans,
    branchId,
    employeeId,
    loanId,
    onBranchChange,
    onEmployeeChange,
    onLoanChange,
    collectionDate,
    onCollectionDateChange,
    referenceNo,
    onReferenceNoChange,
    notes,
    onNotesChange,
    notesRequired,
    errors = {},
}: Props) {
    const branchEmployees = useMemo(
        () => (branchId ? employees.filter((e) => true) : employees),
        [branchId, employees],
    );

    const employeeLoans = useMemo(
        () => (employeeId ? loans.filter((l) => String(l.employee_id) === employeeId) : loans),
        [employeeId, loans],
    );

    const loanItems = useMemo(
        () =>
            employeeLoans.map((l) => ({
                value: String(l.id),
                label: `${l.loan_number} — out ${fmt(l.outstanding_balance)} (${l.pending_installments} pending)`,
                keywords: `${l.loan_number} ${l.employee_label} ${l.policy_name ?? ''}`,
            })),
        [employeeLoans],
    );

    const selectedLoan = employeeLoans.find((l) => String(l.id) === loanId);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <PayrollBranchSelect
                branches={branches}
                value={branchId}
                onChange={(v) => {
                    onBranchChange(v);
                    onEmployeeChange('');
                    onLoanChange('');
                }}
                allowAll
                allLabel="All branches"
            />
            <PayrollEmployeeSelect
                employees={branchEmployees}
                value={employeeId}
                onChange={(v) => {
                    onEmployeeChange(v);
                    onLoanChange('');
                }}
                allowAll={false}
                allLabel="Select employee"
            />
            <div className="sm:col-span-2">
                <PayrollComboField
                    label="Active loan"
                    value={loanId}
                    onChange={onLoanChange}
                    items={loanItems}
                    placeholder="Select loan"
                />
                {errors.employee_loan_id && <p className="mt-1 text-xs text-rose-600">{errors.employee_loan_id}</p>}
                {selectedLoan && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                        Installment ৳{fmt(selectedLoan.installment_amount)} · Outstanding ৳{fmt(selectedLoan.outstanding_balance)} ·{' '}
                        {selectedLoan.pending_installments} pending
                    </p>
                )}
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Collection date</Label>
                <Input type="date" className="h-9 text-xs" value={collectionDate} onChange={(e) => onCollectionDateChange(e.target.value)} />
                {errors.collection_date && <p className="text-xs text-rose-600">{errors.collection_date}</p>}
            </div>
            <PayrollField label="Reference no.">
                <Input className="h-9 text-xs" value={referenceNo} onChange={(e) => onReferenceNoChange(e.target.value)} placeholder="Receipt / voucher" />
            </PayrollField>
            <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">
                    Notes{notesRequired ? ' *' : ''}
                </Label>
                <Textarea className="text-xs min-h-[72px]" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
                {errors.notes && <p className="text-xs text-rose-600">{errors.notes}</p>}
            </div>
        </div>
    );
}
