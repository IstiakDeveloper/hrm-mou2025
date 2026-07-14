import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { LoanCollectionFormFields } from './LoanCollectionFormFields';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { fmt, type LoanOption } from './types';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';

type RebatePreview = {
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
    filters: Record<string, string>;
    branches: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    loans: LoanOption[];
    defaultCollectionDate: string;
    defaultIncludeCurrentMonth: boolean;
};

export default function LoanCollectionRebate({
    filters,
    branches,
    employees,
    loans,
    defaultCollectionDate,
    defaultIncludeCurrentMonth,
}: Props) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [loanId, setLoanId] = useState('');
    const [includeCurrentMonth, setIncludeCurrentMonth] = useState(defaultIncludeCurrentMonth);
    const [preview, setPreview] = useState<RebatePreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [amountTouched, setAmountTouched] = useState(false);

    const form = useForm({
        collection_date: defaultCollectionDate,
        reference_no: '',
        notes: '',
        employee_loan_id: '',
        amount: '',
    });

    const selectedLoan = loans.find((l) => String(l.id) === loanId);

    useEffect(() => {
        if (!loanId || !form.data.collection_date) {
            setPreview(null);
            setPreviewError(null);
            return;
        }

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);

        axios
            .post(route('loan-collection.rebate.preview'), {
                employee_loan_id: parseInt(loanId, 10),
                collection_date: form.data.collection_date,
                include_current_month: includeCurrentMonth,
            })
            .then(({ data }) => {
                if (cancelled) {
                    return;
                }
                setPreview(data);
                if (!amountTouched) {
                    form.setData('amount', data.suggested_amount > 0 ? String(data.suggested_amount) : '');
                }
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }
                setPreview(null);
                setPreviewError(error.response?.data?.message ?? 'Could not calculate rebate preview.');
            })
            .finally(() => {
                if (!cancelled) {
                    setPreviewLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [loanId, form.data.collection_date, includeCurrentMonth, amountTouched]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            employee_loan_id: parseInt(loanId, 10),
            amount: parseFloat(data.amount),
        }));
        form.post(route('loan-collection.rebate.store'));
    };

    const applySuggested = () => {
        if (!preview) {
            return;
        }
        setAmountTouched(false);
        form.setData('amount', preview.suggested_amount > 0 ? String(preview.suggested_amount) : '');
    };

    const outstandingAfterRebate =
        selectedLoan && form.data.amount
            ? Math.max(0, selectedLoan.outstanding_balance - parseFloat(form.data.amount || '0'))
            : preview?.collection_after_rebate ?? selectedLoan?.outstanding_balance;

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
                            Rebate amount is suggested from pending SC. Choose manually whether this month&apos;s installment SC is included.
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
                            onBranchChange={(value) => {
                                setBranchId(value);
                                setLoanId('');
                                setPreview(null);
                                setAmountTouched(false);
                            }}
                            onEmployeeChange={(value) => {
                                setEmployeeId(value);
                                setLoanId('');
                                setPreview(null);
                                setAmountTouched(false);
                            }}
                            onLoanChange={(value) => {
                                setLoanId(value);
                                setIncludeCurrentMonth(defaultIncludeCurrentMonth);
                                setAmountTouched(false);
                            }}
                            collectionDate={form.data.collection_date}
                            onCollectionDateChange={(value) => {
                                form.setData('collection_date', value);
                                setAmountTouched(false);
                            }}
                            referenceNo={form.data.reference_no}
                            onReferenceNoChange={(value) => form.setData('reference_no', value)}
                            notes={form.data.notes}
                            onNotesChange={(value) => form.setData('notes', value)}
                            notesRequired
                            errors={form.errors as Record<string, string>}
                        />

                        {loanId && (
                            <div className="mt-4 space-y-3 rounded-md border border-emerald-100 bg-emerald-50/40 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-emerald-900">Auto rebate suggestion</p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px]"
                                            disabled={previewLoading || !preview}
                                            onClick={applySuggested}
                                        >
                                            <RefreshCw className="mr-1 h-3 w-3" /> Use suggested
                                        </Button>
                                    </div>
                                </div>

                                <label className="flex items-start gap-2 text-xs text-zinc-700">
                                    <Checkbox
                                        checked={includeCurrentMonth}
                                        onCheckedChange={(checked) => {
                                            setIncludeCurrentMonth(checked === true);
                                            setAmountTouched(false);
                                        }}
                                    />
                                    <span>
                                        এই মাসের installment-এর SC rebate-এ দিন
                                        <span className="mt-0.5 block text-[11px] text-zinc-500">
                                            Uncheck করলে এই মাসের SC rebate হবে না — পরের মাস থেকে rebate গণনা হবে।
                                        </span>
                                    </span>
                                </label>

                                {previewLoading && <p className="text-xs text-zinc-500">Calculating rebate…</p>}
                                {previewError && <p className="text-xs text-rose-600">{previewError}</p>}

                                {preview && !previewLoading && (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                        <PreviewMetric label="Suggested rebate" value={fmt(preview.suggested_amount)} accent="text-emerald-800" />
                                        <PreviewMetric label="Outstanding SC" value={fmt(preview.outstanding_service_charge)} />
                                        <PreviewMetric label="Outstanding PR" value={fmt(preview.outstanding_principal)} />
                                        <PreviewMetric label="Collect after rebate" value={fmt(preview.collection_after_rebate)} accent="text-amber-800" />
                                    </div>
                                )}

                                {preview && !previewLoading && (
                                    <p className="text-[11px] leading-relaxed text-zinc-600">{preview.explanation}</p>
                                )}

                                {preview?.current_month_excluded && (
                                    <p className="text-[11px] font-medium text-amber-800">
                                        Current month SC excluded: {fmt(preview.excluded_service_charge)}. Rebate starts from next pending installment.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <PayrollField label="Rebate amount (৳)" error={form.errors.amount}>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="h-9 text-xs"
                                    value={form.data.amount}
                                    onChange={(e) => {
                                        setAmountTouched(true);
                                        form.setData('amount', e.target.value);
                                    }}
                                    placeholder={selectedLoan ? `Max ${fmt(selectedLoan.outstanding_balance)}` : ''}
                                />
                            </PayrollField>
                            <PayrollField label="Outstanding after rebate (৳)">
                                <Input
                                    readOnly
                                    className="h-9 bg-zinc-50 text-xs tabular-nums"
                                    value={selectedLoan ? fmt(outstandingAfterRebate ?? 0) : ''}
                                />
                            </PayrollField>
                        </div>

                        {preview && selectedLoan && (
                            <p className="mt-2 text-[11px] text-zinc-500">
                                After rebate, use Advance Collection for {preview.pending_installments} pending installment(s) — estimated ৳
                                {fmt(outstandingAfterRebate ?? 0)}.
                            </p>
                        )}

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

function PreviewMetric({ label, value, accent = 'text-zinc-900' }: { label: string; value: string; accent?: string }) {
    return (
        <div className="rounded border border-white/80 bg-white/70 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent}`}>{value}</p>
        </div>
    );
}
