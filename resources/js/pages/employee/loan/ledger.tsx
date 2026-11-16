import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { LoanInstallmentLedgerTable, type LoanInstallmentLedgerRow } from '@/components/employee-loan/LoanInstallmentLedgerTable';

type Installment = LoanInstallmentLedgerRow;

type HeaderRow = { label: string; value: string | number | null | undefined };

type Props = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
    };
    loan: {
        id: number;
        loan_number: string;
        loan_type_label: string;
        status: string;
        outstanding_balance: number;
        principal_amount: number;
        service_charge_amount: number;
        outstanding_principal: number;
        outstanding_service_charge: number;
        recovered_principal: number;
        recovered_service_charge: number;
        total_payable: number;
        interest_rate: number;
        installment_count: number;
        disbursement_date: string | null;
        first_installment_date: string | null;
        last_installment_date: string | null;
        loan_close_date: string | null;
        rebate_amount: number;
        policy: { code: string; name: string; label: string } | null;
        loan_cycle: number;
        application_number: string | null;
        employee: {
            id: number;
            pin: string | null;
            name: string | null;
            label: string;
            department: string | null;
            designation: string | null;
            program: string | null;
            unit: string | null;
            project: string | null;
            branch: string | null;
        };
    };
    schedule: Installment[];
};

const fmt = fmtLoanAmount;

const display = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
};

function LedgerHeaderTable({ rows }: { rows: HeaderRow[] }) {
    return (
        <table className="w-full border-collapse text-xs">
            <tbody>
                {rows.map((row) => (
                    <tr key={row.label} className="border border-zinc-300">
                        <td className="w-[42%] border border-zinc-300 bg-zinc-100 px-2 py-1 font-medium text-zinc-700">{row.label}</td>
                        <td className="border border-zinc-300 bg-white px-2 py-1 text-zinc-900">{display(row.value)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function EmployeeLoanLedger({ loan, schedule }: Props) {
    const employeeRows: HeaderRow[] = [
        { label: 'Employee Id', value: loan.employee.pin },
        { label: 'Employee Name', value: loan.employee.name },
        { label: 'Department', value: loan.employee.department },
        { label: 'Designation', value: loan.employee.designation },
        { label: 'Program', value: loan.employee.program },
        { label: 'Unit', value: loan.employee.unit ?? 'N/A' },
        { label: 'Project', value: loan.employee.project },
    ];

    const policyRows: HeaderRow[] = [
        { label: 'Policy', value: loan.policy?.label },
        { label: 'Loan Cycle', value: loan.loan_cycle },
        { label: 'Application No', value: loan.application_number },
        { label: 'Rate', value: loan.interest_rate },
        { label: 'Total Install', value: loan.installment_count },
        { label: 'Install Start Date', value: loan.first_installment_date },
        { label: 'Install End Date', value: loan.last_installment_date },
    ];

    const financialRows: HeaderRow[] = [
        { label: 'Disburse Date', value: loan.disbursement_date },
        { label: 'Disburse Branch', value: loan.employee.branch },
        { label: 'Loan Amount (PR)', value: fmt(loan.principal_amount) },
        { label: 'Loan Amount (SC)', value: fmt(loan.service_charge_amount) },
        { label: 'Outstanding PR', value: fmt(loan.outstanding_principal) },
        { label: 'Outstanding SC', value: fmt(loan.outstanding_service_charge) },
        { label: 'Loan Amount (Total)', value: fmt(loan.total_payable) },
        { label: 'Recovered PR', value: fmt(loan.recovered_principal) },
        { label: 'Recovered SC', value: fmt(loan.recovered_service_charge) },
        { label: 'Loan Close Date', value: loan.loan_close_date },
    ];

    return (
        <Layout>
            <Head title={`Ledger — ${loan.loan_number}`} />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">Loan Ledger</h1>
                        <p className="mt-1 text-sm text-zinc-600">{loan.loan_type_label} · {loan.loan_number}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}`)}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                Loan details
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath('/employee/loan')}>
                                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                My loans
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mb-4 grid gap-3 lg:grid-cols-3">
                    <LedgerHeaderTable rows={employeeRows} />
                    <LedgerHeaderTable rows={policyRows} />
                    <LedgerHeaderTable rows={financialRows} />
                </div>

                <Card className="mb-4 border-amber-200 bg-amber-50/20 shadow-sm">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-amber-800">Outstanding balance</p>
                                <p className="text-2xl font-bold tabular-nums text-amber-900">{fmt(loan.outstanding_balance)}</p>
                                <p className="text-xs text-zinc-500">{loan.employee.label} · {loan.loan_type_label}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-zinc-500">Outstanding principal</p>
                                <p className="text-lg font-bold tabular-nums text-zinc-900">{fmt(loan.outstanding_principal)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-violet-700">Outstanding service charge</p>
                                <p className="text-lg font-bold tabular-nums text-violet-900">{fmt(loan.outstanding_service_charge)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <LoanInstallmentLedgerTable rows={schedule} />
            </PageSurface>
        </Layout>
    );
}
