import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

type Policy = { id: number; code: string; name: string; label: string };
type Branch = { id: number; name: string; branch_code?: string | null };
type Employee = { id: number; pin?: string; name_en?: string; current_branch_id?: number | null };
type Committee = { id: number; committee_name: string };

type EditableRow = {
    id: string;
    branch_id: string;
    employee_id: string;
    loan_policy_id: string;
    disbursement_date: string;
    disburse_amount: string;
    passed_months: string;
};

type RowPreview = {
    installment_amount: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
    total_installments: number;
    remaining_installments: number;
    total_payable: number;
};

type Props = {
    branches: Branch[];
    employees: Employee[];
    policies: Policy[];
    committees: Committee[];
    defaultClosingDate: string;
};

let rowIdSeq = 0;

function newRowId() {
    rowIdSeq += 1;
    return `migration-row-${rowIdSeq}`;
}

function emptyRow(policies: Policy[]): EditableRow {
    return {
        id: newRowId(),
        branch_id: '',
        employee_id: '',
        loan_policy_id: policies[0] ? String(policies[0].id) : '',
        disbursement_date: new Date().toISOString().slice(0, 10),
        disburse_amount: '',
        passed_months: '0',
    };
}

const fmt = fmtLoanAmount;

type LoanCardProps = {
    row: EditableRow;
    index: number;
    canRemove: boolean;
    branches: Branch[];
    employees: Employee[];
    policyItems: { value: string; label: string; keywords?: string }[];
    preview: RowPreview | null;
    calcError: string | null;
    loading: boolean;
    onChange: (id: string, patch: Partial<EditableRow>) => void;
    onRemove: (id: string) => void;
    onRecalculate: (row: EditableRow) => void;
};

const MigrationLoanCard = memo(function MigrationLoanCard({
    row,
    index,
    canRemove,
    branches,
    employees,
    policyItems,
    preview,
    calcError,
    loading,
    onChange,
    onRemove,
    onRecalculate,
}: LoanCardProps) {
    const branchEmployees = useMemo(() => {
        if (!row.branch_id) return employees;
        return employees.filter((e) => String(e.current_branch_id ?? '') === row.branch_id);
    }, [employees, row.branch_id]);

    const triggerRecalc = useCallback(() => {
        onRecalculate(row);
    }, [onRecalculate, row]);

    return (
        <Card className="border-zinc-200/90 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 py-2.5 px-4">
                <div>
                    <CardTitle className="text-xs font-semibold text-zinc-800">Loan {index + 1}</CardTitle>
                    {preview && !loading && (
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                            {preview.remaining_installments} month(s) remaining of {preview.total_installments} · total payable {fmt(preview.total_payable)}
                        </p>
                    )}
                    {loading && <p className="mt-0.5 text-[10px] text-emerald-700">Calculating…</p>}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => onRemove(row.id)}
                    disabled={!canRemove}
                >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                </Button>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <PayrollBranchSelect
                    branches={branches}
                    value={row.branch_id}
                    onChange={(v) => onChange(row.id, { branch_id: v, employee_id: '' })}
                    allowAll
                    allLabel="All branches"
                />
                <PayrollEmployeeSelect
                    employees={branchEmployees}
                    value={row.employee_id}
                    onChange={(v) => onChange(row.id, { employee_id: v })}
                    required
                    allowAll={false}
                    allLabel="Select employee"
                />
                <PayrollComboField
                    label="Loan policy"
                    value={row.loan_policy_id}
                    onChange={(v) => onChange(row.id, { loan_policy_id: v })}
                    items={policyItems}
                    placeholder="Select policy"
                />
                <PayrollField label="Disbursement date">
                    <Input
                        type="date"
                        className="h-9 text-xs"
                        value={row.disbursement_date}
                        onChange={(e) => onChange(row.id, { disbursement_date: e.target.value })}
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                        Loan কখন দেওয়া হয়েছিল — ১ম installment এই তারিখ + policy grace থেকে শুরু।
                    </p>
                </PayrollField>
                <PayrollField label="Disburse amount (৳)">
                    <Input
                        type="text"
                        inputMode="decimal"
                        className="h-9 text-xs tabular-nums"
                        value={row.disburse_amount}
                        onChange={(e) => onChange(row.id, { disburse_amount: e.target.value.replace(/[^\d.]/g, '') })}
                        onBlur={triggerRecalc}
                        placeholder="e.g. 100000"
                    />
                </PayrollField>
                <PayrollField label="Passed months">
                    <Input
                        type="text"
                        inputMode="numeric"
                        className="h-9 text-xs tabular-nums"
                        value={row.passed_months}
                        onChange={(e) => onChange(row.id, { passed_months: e.target.value.replace(/\D/g, '') })}
                        onBlur={triggerRecalc}
                        placeholder="0"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                        Disburse-এর পর কত মাস installment paid — প্রথম N টা installment paid mark হবে।
                    </p>
                </PayrollField>
                <PayrollField label="Monthly installment (৳)">
                    <Input
                        readOnly
                        tabIndex={-1}
                        className={cn('h-9 text-xs bg-zinc-50 tabular-nums', loading && 'animate-pulse')}
                        value={preview ? fmt(preview.installment_amount) : ''}
                        placeholder="Auto from policy"
                    />
                </PayrollField>
                <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-amber-900">Outstanding at closing date</p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            onClick={triggerRecalc}
                            disabled={loading}
                        >
                            {loading ? 'Calculating…' : 'Calculate'}
                        </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <PayrollField label="Principal (৳)">
                            <Input
                                readOnly
                                tabIndex={-1}
                                className={cn('h-9 text-xs bg-white tabular-nums', loading && 'animate-pulse')}
                                value={preview ? fmt(preview.outstanding_principal) : ''}
                                placeholder="Auto"
                            />
                        </PayrollField>
                        <PayrollField label="Service charge (৳)">
                            <Input
                                readOnly
                                tabIndex={-1}
                                className={cn('h-9 text-xs bg-white tabular-nums', loading && 'animate-pulse')}
                                value={preview ? fmt(preview.outstanding_service_charge) : ''}
                                placeholder="Auto"
                            />
                        </PayrollField>
                        <PayrollField label="Total outstanding (৳)">
                            <Input
                                readOnly
                                tabIndex={-1}
                                className={cn('h-9 text-xs bg-white font-semibold tabular-nums', loading && 'animate-pulse')}
                                value={preview ? fmt(preview.outstanding_total) : ''}
                                placeholder="Auto"
                            />
                        </PayrollField>
                    </div>
                    {calcError && <p className="mt-2 text-xs text-rose-600">{calcError}</p>}
                    <p className="mt-2 text-[10px] text-amber-800/80">
                        Updates when you change policy or leave amount / passed months field. Save recalculates on server.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
});

export default function LoanMigrationCreate({
    branches,
    employees,
    policies,
    committees,
    defaultClosingDate,
}: Props) {
    const form = useForm({
        closing_date: defaultClosingDate,
        loan_committee_id: committees[0] ? String(committees[0].id) : '',
    });

    const [rows, setRows] = useState<EditableRow[]>(() => [emptyRow(policies)]);
    const [previews, setPreviews] = useState<Record<string, RowPreview>>({});
    const [calcErrors, setCalcErrors] = useState<Record<string, string>>({});
    const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const calcGeneration = useRef<Record<string, number>>({});

    const policyItems = useMemo(
        () => policies.map((p) => ({ value: String(p.id), label: p.label, keywords: p.code })),
        [policies],
    );

    const committeeItems = useMemo(
        () => committees.map((c) => ({ value: String(c.id), label: c.committee_name })),
        [committees],
    );

    const recalculateRow = useCallback(async (row: EditableRow) => {
        const amount = parseFloat(row.disburse_amount);
        const passed = parseInt(row.passed_months, 10) || 0;

        if (!row.loan_policy_id || !Number.isFinite(amount) || amount <= 0) {
            setPreviews((prev) => {
                const next = { ...prev };
                delete next[row.id];
                return next;
            });
            setCalcErrors((prev) => {
                const next = { ...prev };
                delete next[row.id];
                return next;
            });
            return;
        }

        const generation = (calcGeneration.current[row.id] ?? 0) + 1;
        calcGeneration.current[row.id] = generation;

        setLoadingRows((prev) => ({ ...prev, [row.id]: true }));
        setCalcErrors((prev) => {
            const next = { ...prev };
            delete next[row.id];
            return next;
        });

        try {
            const { data } = await axios.post(route('loan-migration.calculate-preview'), {
                loan_policy_id: row.loan_policy_id,
                disburse_amount: amount,
                passed_months: passed,
            });

            if (calcGeneration.current[row.id] !== generation) {
                return;
            }

            setPreviews((prev) => ({ ...prev, [row.id]: data }));
        } catch (err: unknown) {
            if (calcGeneration.current[row.id] !== generation) {
                return;
            }

            const message =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? String(err.response.data.message)
                    : 'Could not calculate from policy.';
            setCalcErrors((prev) => ({ ...prev, [row.id]: message }));
            setPreviews((prev) => {
                const next = { ...prev };
                delete next[row.id];
                return next;
            });
        } finally {
            if (calcGeneration.current[row.id] === generation) {
                setLoadingRows((prev) => ({ ...prev, [row.id]: false }));
            }
        }
    }, []);

    const updateRow = useCallback(
        (id: string, patch: Partial<EditableRow>) => {
            setRows((current) => {
                const next = current.map((r) => (r.id === id ? { ...r, ...patch } : r));
                const updated = next.find((r) => r.id === id);
                if (updated && 'loan_policy_id' in patch) {
                    queueMicrotask(() => recalculateRow(updated));
                }
                return next;
            });
        },
        [recalculateRow],
    );

    const addRow = useCallback(() => {
        setRows((current) => [...current, emptyRow(policies)]);
    }, [policies]);

    const removeRow = useCallback((id: string) => {
        setRows((current) => (current.length <= 1 ? current : current.filter((r) => r.id !== id)));
        setPreviews((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setCalcErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        delete calcGeneration.current[id];
    }, []);

    const isCalculating = Object.values(loadingRows).some(Boolean);
    const hasCalcErrors = Object.keys(calcErrors).length > 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const missingEmployee = rows.find((r) => !r.employee_id);
        if (missingEmployee) {
            setSubmitError('Select an employee for every loan row.');
            return;
        }

        const missingPreview = rows.find((r) => !previews[r.id]);
        if (missingPreview) {
            setSubmitError('Enter disburse amount and blur the field so outstanding balances calculate before saving.');
            return;
        }

        if (isCalculating) {
            setSubmitError('Wait for calculation to finish.');
            return;
        }

        form.transform(() => ({
            closing_date: form.data.closing_date,
            loan_committee_id: form.data.loan_committee_id,
            rows: rows.map((r) => {
                const p = previews[r.id]!;
                return {
                    employee_id: r.employee_id,
                    loan_policy_id: r.loan_policy_id,
                    disbursement_date: r.disbursement_date,
                    disburse_amount: r.disburse_amount,
                    passed_months: r.passed_months || '0',
                    installment_amount: String(p.installment_amount),
                    outstanding_principal: String(p.outstanding_principal),
                    outstanding_service_charge: String(p.outstanding_service_charge),
                    outstanding_total: String(p.outstanding_total),
                };
            }),
        }));
        form.post(route('loan-migration.store'), { preserveScroll: true });
    };

    return (
        <EmployeeLoanLayout
            title="New migration"
            activeTab="migration"
            description="Select policy, enter disburse amount and passed months — balances calculate from policy rules."
        >
            <div className="mb-4">
                <Link
                    href={employeeLoanPath(route('loan-migration.index'))}
                    className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Migration list
                </Link>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Migration batch</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Closing date is the cut-off snapshot only. Installment schedule follows each loan&apos;s disbursement date.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Closing date</Label>
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={form.data.closing_date}
                                    onChange={(e) => form.setData('closing_date', e.target.value)}
                                />
                                <p className="text-[10px] text-zinc-500">
                                    পুরনো register-এর snapshot তারিখ — outstanding balance এই দিন পর্যন্ত ধরা হয়।
                                </p>
                                {form.errors.closing_date && <p className="text-xs text-rose-600">{form.errors.closing_date}</p>}
                            </div>
                            <PayrollComboField
                                label="Approved committee"
                                value={form.data.loan_committee_id}
                                onChange={(v) => form.setData('loan_committee_id', v)}
                                items={committeeItems}
                                placeholder="Select committee"
                            />
                            {(form.errors.loan_committee_id || form.errors.migration) && (
                                <p className="text-xs text-rose-600 sm:col-span-2">
                                    {form.errors.loan_committee_id || form.errors.migration}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900">Loans to import</h2>
                            <p className="text-xs text-zinc-500">
                                One card per employee loan. Tab out of amount fields to refresh calculations.
                            </p>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addRow}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add loan
                        </Button>
                    </div>

                    {rows.map((row, index) => (
                        <MigrationLoanCard
                            key={row.id}
                            row={row}
                            index={index}
                            canRemove={rows.length > 1}
                            branches={branches}
                            employees={employees}
                            policyItems={policyItems}
                            preview={previews[row.id] ?? null}
                            calcError={calcErrors[row.id] ?? null}
                            loading={Boolean(loadingRows[row.id])}
                            onChange={updateRow}
                            onRemove={removeRow}
                            onRecalculate={recalculateRow}
                        />
                    ))}
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                    <Card className="border-emerald-200/60 bg-emerald-50/30 shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm text-emerald-950">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Loans in batch</span>
                                <span className="font-semibold tabular-nums">{rows.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Closing date</span>
                                <span className="font-medium">{form.data.closing_date || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Calculated</span>
                                <span className="font-medium tabular-nums">
                                    {rows.filter((r) => previews[r.id]).length}/{rows.length}
                                </span>
                            </div>
                            <p className="border-t border-emerald-100 pt-2 text-[10px] leading-relaxed text-emerald-900/80">
                                Policy change recalculates immediately. Amount and passed months recalculate when you leave the field.
                            </p>
                        </CardContent>
                    </Card>

                    {submitError && <p className="text-xs text-rose-600">{submitError}</p>}

                    <Button
                        type="submit"
                        disabled={form.processing || isCalculating || hasCalcErrors}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {form.processing ? 'Saving…' : isCalculating ? 'Calculating…' : 'Save migration'}
                    </Button>
                </div>
            </form>
        </EmployeeLoanLayout>
    );
}
