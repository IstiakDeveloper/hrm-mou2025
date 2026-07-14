import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ComboSelect } from '@/components/ComboSelect';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { useEmployeeLookup } from '@/lib/employee-lookup';
import { ArrowLeft, List, Save, Send, User2 } from 'lucide-react';
import axios from 'axios';

type Calc = {
    rate_yearly: number;
    installment_amount_monthly: number;
    installment_amount_monthly_exact: number;
    total_installments: number;
    grace_months: number;
    interval_months: number;
    principal_amount: number;
    service_charge_amount: number;
    total_payable: number;
    max_loan_limit_amount: number | null;
    max_loan_limit_percentage: number | null;
};

type EmployeePreview = {
    department: string | null;
    designation: string | null;
    joining_date: string | null;
    employment_months: number;
    pf_own_balance: number;
    pf_org_balance: number;
    pf_total_balance: number;
};

type Props = {
    employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
    policies: { id: number; name: string; code: string; min_amount: number; max_amount: number }[];
    committees: { id: number; committee_name: string }[];
    nextApplicationNumber: string;
    application: {
        id: number;
        application_number: string;
        application_date: string;
        employee_id: string;
        loan_policy_id: string;
        loan_committee_id: string;
        loan_cycle: string;
        applied_amount: string;
        notes: string;
        status: string;
        calculation: Calc;
    } | null;
};

const fmt = fmtLoanAmount;

function employeeLabel(e: { id: number; pin?: string; name_en?: string; employee_id?: string }) {
    const pin = e.pin || e.employee_id || '';
    const name = e.name_en || '';
    return [pin, name].filter(Boolean).join(' — ') || `Employee #${e.id}`;
}

export default function LoanApplicationForm({ employees, policies, committees, nextApplicationNumber, application }: Props) {
    const isEdit = Boolean(application?.id);
    const useLookup = employees.length === 0;
    const [searchQuery, setSearchQuery] = useState('');
    const employeeLookup = useEmployeeLookup({
        enabled: useLookup,
        limit: 50,
        selectedEmployeeId: application?.employee_id ?? null,
    });
    const employeeSource = useLookup ? employeeLookup.employees : employees;

    useEffect(() => {
        if (!useLookup) {
            return;
        }
        const timer = window.setTimeout(() => {
            void employeeLookup.reload(searchQuery);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [employeeLookup.reload, searchQuery, useLookup]);

    const form = useForm({
        application_number: application?.application_number ?? nextApplicationNumber,
        application_date: application?.application_date ?? new Date().toISOString().slice(0, 10),
        employee_id: application?.employee_id ?? '',
        loan_policy_id: application?.loan_policy_id ?? (policies[0] ? String(policies[0].id) : ''),
        loan_committee_id: application?.loan_committee_id ?? '',
        loan_cycle: application?.loan_cycle ?? '1',
        applied_amount: application?.applied_amount ?? '',
        notes: application?.notes ?? '',
        submit_for_approval: false,
    });

    const [employeeInfo, setEmployeeInfo] = useState<EmployeePreview | null>(null);
    const [calc, setCalc] = useState<Calc | null>(application?.calculation ?? null);

    const employeeItems = useMemo(
        () =>
            employeeSource.map((e) => ({
                value: String(e.id),
                label: employeeLabel(e),
                keywords: `${e.pin ?? ''} ${e.name_en ?? ''} ${e.employee_id ?? ''} ${e.id}`,
            })),
        [employeeSource],
    );

    const policyItems = useMemo(
        () => policies.map((p) => ({ value: String(p.id), label: p.name, keywords: p.code })),
        [policies],
    );

    const committeeItems = useMemo(
        () => [{ value: '', label: '— None —' }, ...committees.map((c) => ({ value: String(c.id), label: c.committee_name }))],
        [committees],
    );

    const loadEmployee = useCallback(async (id: string) => {
        if (!id) {
            setEmployeeInfo(null);
            return;
        }
        const { data } = await axios.get(route('loan-applications.employee-preview', id));
        setEmployeeInfo(data);
    }, []);

    const loadCalc = useCallback(async () => {
        if (!form.data.loan_policy_id || !form.data.applied_amount) return;
        const { data } = await axios.post(route('loan-applications.calculate-preview'), {
            loan_policy_id: form.data.loan_policy_id,
            applied_amount: form.data.applied_amount,
            loan_cycle: form.data.loan_cycle,
        });
        setCalc(data);
    }, [form.data.loan_policy_id, form.data.applied_amount, form.data.loan_cycle]);

    useEffect(() => {
        if (form.data.employee_id) loadEmployee(form.data.employee_id);
    }, [form.data.employee_id, loadEmployee]);

    useEffect(() => {
        const t = setTimeout(loadCalc, 300);
        return () => clearTimeout(t);
    }, [loadCalc]);

    const submit = (forApproval: boolean) => {
        form.transform((d) => ({ ...d, submit_for_approval: forApproval }));
        if (isEdit && application) {
            form.put(route('loan-applications.update', application.id));
        } else {
            form.post(route('loan-applications.store'));
        }
    };

    return (
        <EmployeeLoanLayout
            title="Loan Application"
            activeTab="applications"
            description="Create a new employee loan application. Application number is auto-generated but can be edited."
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('loan-applications.index'))}
                    className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Application list
                </Link>
                {isEdit && (
                    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700">
                        {application?.status}
                    </span>
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(false);
                }}
                className="grid grid-cols-1 gap-5 lg:grid-cols-3"
            >
                <div className="space-y-5 lg:col-span-2">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Application details</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Application number, date, and employee.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Application no.</Label>
                                <Input
                                    className="h-9 text-xs font-mono"
                                    value={form.data.application_number}
                                    onChange={(e) => form.setData('application_number', e.target.value)}
                                />
                                {form.errors.application_number && <p className="text-xs text-rose-600">{form.errors.application_number}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Application date</Label>
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={form.data.application_date}
                                    onChange={(e) => form.setData('application_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs">Employee</Label>
                                <ComboSelect
                                    value={form.data.employee_id || null}
                                    onChange={(v) => form.setData('employee_id', v ?? '')}
                                    items={employeeItems}
                                    placeholder="Search employee (PIN / name)…"
                                    clearable={false}
                                    onQueryChange={useLookup ? setSearchQuery : undefined}
                                />
                                {form.errors.employee_id && <p className="text-xs text-rose-600">{form.errors.employee_id}</p>}
                                <p className="text-[11px] text-zinc-500">
                                    {useLookup
                                        ? 'Type PIN or name to search all active employees'
                                        : `${employeeSource.length} active employees available`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Policy & amount</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Select loan policy and applied amount.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Policy</Label>
                                <ComboSelect
                                    value={form.data.loan_policy_id || null}
                                    onChange={(v) => form.setData('loan_policy_id', v ?? '')}
                                    items={policyItems}
                                    placeholder="Select policy…"
                                    clearable={false}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Loan committee (optional)</Label>
                                <ComboSelect
                                    value={form.data.loan_committee_id || null}
                                    onChange={(v) => form.setData('loan_committee_id', v ?? '')}
                                    items={committeeItems}
                                    placeholder="Select committee…"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Applied amount (৳)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    className="h-9 text-xs"
                                    value={form.data.applied_amount}
                                    onChange={(e) => form.setData('applied_amount', e.target.value)}
                                />
                                {form.errors.applied_amount && <p className="text-xs text-rose-600">{form.errors.applied_amount}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Loan cycle</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    className="h-9 text-xs"
                                    value={form.data.loan_cycle}
                                    onChange={(e) => form.setData('loan_cycle', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs">Notes (optional)</Label>
                                <Textarea
                                    className="min-h-[72px] text-xs"
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {calc && (
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Loan calculation</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 md:grid-cols-4">
                                <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Rate (yearly %)</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{calc.rate_yearly}</p>
                                </div>
                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800">Monthly installment</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-amber-900">
                                        {fmt(calc.installment_amount_monthly)}
                                    </p>
                                </div>
                                {[
                                    ['Total installments', calc.total_installments],
                                    ['Grace months', calc.grace_months],
                                    ['Interval months', calc.interval_months],
                                    ['Max limit (amount)', calc.max_loan_limit_amount != null ? fmt(calc.max_loan_limit_amount) : '0'],
                                    ['Max limit (%)', calc.max_loan_limit_percentage ?? 0],
                                    ['Principal (PR)', fmt(calc.principal_amount)],
                                    ['Service charge (SC)', fmt(calc.service_charge_amount)],
                                    ['Total payable', fmt(calc.total_payable)],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="submit" variant="outline" className="h-9 text-xs" disabled={form.processing}>
                            <Save className="mr-1.5 h-4 w-4" />
                            Save draft
                        </Button>
                        <Button
                            type="button"
                            className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={form.processing}
                            onClick={() => submit(true)}
                        >
                            <Send className="mr-1.5 h-4 w-4" />
                            Submit for approval
                        </Button>
                    </div>
                </div>

                <div>
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Employee snapshot</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {!employeeInfo ? (
                                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
                                    <User2 className="h-4 w-4 shrink-0" />
                                    Select an employee to view department, PF balance, and tenure.
                                </div>
                            ) : (
                                <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-zinc-500">Department</p>
                                            <p className="font-medium text-zinc-900">{employeeInfo.department || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500">Designation</p>
                                            <p className="font-medium text-zinc-900">{employeeInfo.designation || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500">Joining date</p>
                                            <p className="font-medium text-zinc-900">{employeeInfo.joining_date || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500">Employment (months)</p>
                                            <p className="font-medium text-zinc-900">{employeeInfo.employment_months}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Provident fund</p>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex justify-between"><span className="text-zinc-600">Own</span><span className="font-medium tabular-nums">{fmt(employeeInfo.pf_own_balance)}</span></div>
                                            <div className="flex justify-between"><span className="text-zinc-600">Company</span><span className="font-medium tabular-nums">{fmt(employeeInfo.pf_org_balance)}</span></div>
                                            <div className="flex justify-between border-t border-zinc-100 pt-1"><span className="font-medium text-zinc-700">Total</span><span className="font-semibold tabular-nums text-emerald-800">{fmt(employeeInfo.pf_total_balance)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </form>
        </EmployeeLoanLayout>
    );
}
