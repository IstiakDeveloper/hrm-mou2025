import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { ArrowLeft, Banknote, Pencil, Save } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { LoanInstallmentLedgerTable, type LoanInstallmentLedgerRow } from '@/components/employee-loan/LoanInstallmentLedgerTable';
import {
    LoanTermsEditDialog,
    type LoanTermsEditValues,
    type LoanTermsPolicy,
} from '@/components/employee-loan/LoanTermsEditDialog';
import {
    LedgerEmployeeLoanSwitcher,
    type LedgerNavLoan,
} from '@/components/employee-loan/LedgerEmployeeLoanSwitcher';

type Installment = LoanInstallmentLedgerRow;

type HeaderRow = { label: string; value: string | number | null | undefined };

type FullPaidPreview = {
    suggested_amount: number;
    outstanding_service_charge: number;
    outstanding_principal: number;
    outstanding_total: number;
    collection_after_rebate: number;
    pending_installments: number;
    includes_current_month: boolean;
    current_month_excluded: boolean;
    excluded_service_charge: number;
    explanation: string;
};

type Props = {
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
    editTerms: LoanTermsEditValues;
    policies: LoanTermsPolicy[];
    employeeLoans: LedgerNavLoan[];
    canEdit: boolean;
    defaultIncludeCurrentMonth: boolean;
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
                        <td className="w-[42%] border border-zinc-300 bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
                            {row.label}
                        </td>
                        <td className="border border-zinc-300 bg-white px-2 py-1 text-zinc-900">
                            {display(row.value)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function EmployeeLoanLedger({ loan, schedule, editTerms, policies, employeeLoans, canEdit, defaultIncludeCurrentMonth }: Props) {
    const [fullPaidOpen, setFullPaidOpen] = useState(false);
    const [termsEditOpen, setTermsEditOpen] = useState(false);
    const [includeCurrentMonth, setIncludeCurrentMonth] = useState(defaultIncludeCurrentMonth);
    const [preview, setPreview] = useState<FullPaidPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const pendingInstallments = useMemo(
        () => schedule.filter((row) => row.status === 'pending' || row.status === 'scheduled').length,
        [schedule],
    );

    const termsForEdit = useMemo<LoanTermsEditValues>(
        () => ({
            ...editTerms,
            loan_id: loan.id,
            total_installments: editTerms.total_installments ?? loan.installment_count,
        }),
        [editTerms, loan.id, loan.installment_count],
    );

    const fullPaidForm = useForm({
        collection_date: new Date().toISOString().slice(0, 10),
        reference_no: '',
        notes: 'Loan full paid with rebate',
        include_current_month: null as boolean | null,
        rebate_amount: null as number | null,
    });

    useEffect(() => {
        if (!fullPaidOpen || loan.status !== 'active' || pendingInstallments === 0) {
            setPreview(null);
            setPreviewError(null);
            return;
        }

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);

        axios
            .post(route('employee-loans.full-paid.preview', loan.id), {
                collection_date: fullPaidForm.data.collection_date,
                include_current_month: includeCurrentMonth,
            })
            .then(({ data }) => {
                if (!cancelled) {
                    setPreview(data);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setPreview(null);
                    setPreviewError(error.response?.data?.message ?? 'Could not calculate full paid preview.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setPreviewLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [fullPaidOpen, loan.id, loan.status, pendingInstallments, fullPaidForm.data.collection_date, includeCurrentMonth]);

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

    const submitFullPaid = (e: React.FormEvent) => {
        e.preventDefault();
        fullPaidForm.transform((data) => ({
            ...data,
            include_current_month: includeCurrentMonth,
            rebate_amount: preview?.suggested_amount ?? null,
        }));
        fullPaidForm.post(route('employee-loans.full-paid.store', loan.id), {
            onSuccess: () => {
                setFullPaidOpen(false);
                fullPaidForm.reset();
                setIncludeCurrentMonth(defaultIncludeCurrentMonth);
                setPreview(null);
            },
        });
    };

    return (
        <EmployeeLoanLayout title={`Ledger — ${loan.loan_number}`} activeTab="register">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('employee-loans.show', loan.id))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-amber-700"
                >
                    <ArrowLeft className="h-3 w-3" /> Loan details
                </Link>
                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setTermsEditOpen(true)}
                        >
                            <Pencil className="mr-1 h-3 w-3" /> Edit loan terms
                        </Button>
                        {loan.status === 'active' && pendingInstallments > 0 && (
                            <Button
                                size="sm"
                                className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                                onClick={() => {
                                    setIncludeCurrentMonth(defaultIncludeCurrentMonth);
                                    setFullPaidOpen(true);
                                }}
                            >
                                <Banknote className="mr-1 h-3 w-3" /> Rebate & full payment
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <LedgerEmployeeLoanSwitcher
                currentLoanId={loan.id}
                currentEmployeeId={loan.employee.id}
                employeeLoans={employeeLoans}
            />

            <div className="mb-3 grid gap-3 lg:grid-cols-3">
                <LedgerHeaderTable rows={employeeRows} />
                <LedgerHeaderTable rows={policyRows} />
                <LedgerHeaderTable rows={financialRows} />
            </div>

            <Card className="mb-3 border-amber-200 bg-amber-50/20 shadow-2xs">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-amber-800">Outstanding balance</p>
                            <p className="text-xl font-bold tabular-nums text-amber-900">{fmt(loan.outstanding_balance)}</p>
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

            <LoanTermsEditDialog
                open={termsEditOpen}
                onOpenChange={setTermsEditOpen}
                title="Edit loan terms"
                subtitle={loan.employee.label}
                terms={termsForEdit}
                policies={policies}
            />

            <Dialog open={fullPaidOpen} onOpenChange={setFullPaidOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Rebate & full payment</DialogTitle>
                        <DialogDescription className="text-xs">
                            Rebate + সব বাকি installment একসাথে collect হবে। নিচের checkbox দিয়ে এই মাসের SC rebate দেবেন কি না সেটা নির্ধারণ করুন।
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitFullPaid} className="space-y-3">
                        <PayrollField label="Collection date" error={fullPaidForm.errors.collection_date}>
                            <Input
                                type="date"
                                value={fullPaidForm.data.collection_date}
                                onChange={(e) => fullPaidForm.setData('collection_date', e.target.value)}
                            />
                        </PayrollField>
                        <PayrollField label="Reference">
                            <Input
                                value={fullPaidForm.data.reference_no}
                                onChange={(e) => fullPaidForm.setData('reference_no', e.target.value)}
                            />
                        </PayrollField>
                        <PayrollField label="Notes" error={fullPaidForm.errors.notes}>
                            <Textarea
                                value={fullPaidForm.data.notes}
                                onChange={(e) => fullPaidForm.setData('notes', e.target.value)}
                            />
                        </PayrollField>

                        <label className="flex items-start gap-2 text-xs text-zinc-700">
                            <Checkbox
                                checked={includeCurrentMonth}
                                onCheckedChange={(checked) => setIncludeCurrentMonth(checked === true)}
                            />
                            <span>
                                এই মাসের installment-এর SC rebate-এ দিন
                                <span className="mt-0.5 block text-[11px] text-zinc-500">
                                    Uncheck = এই মাসের SC rebate হবে না (month cutoff)। Check = এই মাসসহ সব বাকি SC rebate।
                                </span>
                            </span>
                        </label>

                        {previewLoading && <p className="text-xs text-zinc-500">Calculating…</p>}
                        {previewError && <p className="text-xs text-rose-600">{previewError}</p>}
                        {fullPaidForm.errors.full_paid && (
                            <p className="text-xs text-rose-600">{fullPaidForm.errors.full_paid}</p>
                        )}

                        {preview && !previewLoading && (
                            <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <PreviewMetric label="Rebate" value={fmt(preview.suggested_amount)} />
                                    <PreviewMetric label="Collection" value={fmt(preview.collection_after_rebate)} />
                                    <PreviewMetric label="Pending installments" value={String(preview.pending_installments)} />
                                    <PreviewMetric label="Employee pays" value={fmt(preview.collection_after_rebate)} accent />
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{preview.explanation}</p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={fullPaidForm.processing || previewLoading || !preview}>
                                <Save className="mr-2 h-4 w-4" />
                                Close loan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </EmployeeLoanLayout>
    );
}

function PreviewMetric({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className={`text-sm font-semibold tabular-nums ${accent ? 'text-emerald-800' : 'text-zinc-900'}`}>{value}</p>
        </div>
    );
}
