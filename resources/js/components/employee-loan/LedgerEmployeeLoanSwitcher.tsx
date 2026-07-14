import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { PayrollComboField, PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';

export type LedgerNavLoan = {
    id: number;
    loan_number: string;
    status: string;
    loan_type_label: string;
    policy_name: string | null;
    outstanding_balance: number;
    pending_installments: number;
};

type Props = {
    currentLoanId: number;
    currentEmployeeId: number;
    employeeLoans: LedgerNavLoan[];
};

const fmt = fmtLoanAmount;

function loanLabel(loan: LedgerNavLoan): string {
    const status = loan.status === 'active' ? 'active' : loan.status;
    return `${loan.loan_number} — ${status} — out ${fmt(loan.outstanding_balance)}`;
}

export function LedgerEmployeeLoanSwitcher({ currentLoanId, currentEmployeeId, employeeLoans }: Props) {
    const [employeeId, setEmployeeId] = useState(String(currentEmployeeId));
    const [loanId, setLoanId] = useState(String(currentLoanId));
    const [loans, setLoans] = useState<LedgerNavLoan[]>(employeeLoans);
    const [loansLoading, setLoansLoading] = useState(false);
    const [loansError, setLoansError] = useState<string | null>(null);

    useEffect(() => {
        setEmployeeId(String(currentEmployeeId));
        setLoanId(String(currentLoanId));
        setLoans(employeeLoans);
        setLoansError(null);
    }, [currentEmployeeId, currentLoanId, employeeLoans]);

    const loadLoans = useCallback(async (nextEmployeeId: string) => {
        if (!nextEmployeeId) {
            setLoans([]);
            return;
        }

        setLoansLoading(true);
        setLoansError(null);

        try {
            const { data } = await axios.get<{ loans: LedgerNavLoan[] }>(route('employee-loans.ledger-lookup'), {
                params: { employee_id: nextEmployeeId },
            });
            setLoans(data.loans);

            if (data.loans.length === 0) {
                setLoanId('');
                return;
            }

            if (data.loans.length === 1) {
                const onlyLoanId = String(data.loans[0].id);
                setLoanId(onlyLoanId);
                if (onlyLoanId !== String(currentLoanId)) {
                    router.visit(employeeLoanPath(route('employee-loans.ledger', onlyLoanId)));
                }
                return;
            }

            setLoanId('');
        } catch {
            setLoans([]);
            setLoanId('');
            setLoansError('Could not load loans for this employee.');
        } finally {
            setLoansLoading(false);
        }
    }, [currentLoanId]);

    const handleEmployeeChange = (nextEmployeeId: string) => {
        setEmployeeId(nextEmployeeId);
        setLoanId('');
        if (!nextEmployeeId) {
            setLoans([]);
            return;
        }
        if (nextEmployeeId === String(currentEmployeeId)) {
            setLoans(employeeLoans);
            setLoanId(String(currentLoanId));
            return;
        }
        void loadLoans(nextEmployeeId);
    };

    const handleLoanChange = (nextLoanId: string) => {
        setLoanId(nextLoanId);
        if (nextLoanId && nextLoanId !== String(currentLoanId)) {
            router.visit(employeeLoanPath(route('employee-loans.ledger', nextLoanId)));
        }
    };

    const loanItems = useMemo(
        () =>
            loans.map((loan) => ({
                value: String(loan.id),
                label: loanLabel(loan),
                keywords: `${loan.loan_number} ${loan.policy_name ?? ''} ${loan.loan_type_label}`,
            })),
        [loans],
    );

    const selectedLoan = loans.find((loan) => String(loan.id) === loanId);

    return (
        <Card className="mb-3 border-zinc-200/90 shadow-2xs">
            <CardContent className="grid gap-3 p-3 sm:grid-cols-2">
                <PayrollEmployeeSelect
                    label="Employee"
                    employees={[]}
                    value={employeeId}
                    onChange={handleEmployeeChange}
                    allowAll={false}
                    required
                />
                <PayrollComboField
                    label="Loan"
                    value={loanId}
                    onChange={handleLoanChange}
                    items={loanItems}
                    placeholder={loansLoading ? 'Loading loans…' : loans.length === 0 ? 'No loans found' : 'Select loan'}
                    disabled={loansLoading || loans.length === 0}
                    required
                />
                {loansError && <p className="text-xs text-rose-600 sm:col-span-2">{loansError}</p>}
                {selectedLoan && !loansLoading && (
                    <p className="text-[11px] text-zinc-500 sm:col-span-2">
                        {selectedLoan.loan_type_label}
                        {selectedLoan.policy_name ? ` · ${selectedLoan.policy_name}` : ''}
                        {' · '}
                        {selectedLoan.pending_installments} pending installment
                        {selectedLoan.pending_installments === 1 ? '' : 's'}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
