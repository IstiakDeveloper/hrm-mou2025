import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { Calculator, ChevronRight } from 'lucide-react';

const salaryTypeLabels: Record<string, string> = {
    salary: 'Monthly salary',
    bonus: 'Bonus',
    arrear: 'Arrear',
};

type Props = {
    filters: Record<string, string | boolean>;
    recentRuns: { id: number; label: string; status: string; employee_count: number; total_net: number; processed_at: string | null }[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryTypes: { value: string; label: string }[];
    months: { value: number; label: string }[];
    years: number[];
    canProcess?: boolean;
};

function flattenErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v) continue;
        const label = k.replace(/_/g, ' ');
        out.push(`${label}: ${v}`);
    }
    return out;
}

export default function SalaryProcessIndex({ filters: init, recentRuns, canProcess = false, ...options }: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string; info?: string };
    }>().props;

    const [filters, setFilters] = useState({
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        designation_id: String(init.designation_id || ''),
        program_id: String(init.program_id || ''),
        project_id: String(init.project_id || ''),
        employee_id: String(init.employee_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || ''),
        salary_type: String(init.salary_type || 'salary'),
        process_date: String(init.process_date || format(new Date(), DISPLAY_DATE_FMT)),
        is_partial: Boolean(init.is_partial),
    });
    const [processing, setProcessing] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);
    const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const allErrors = useMemo(
        () => flattenErrors({ ...pageErrors, ...submitErrors }),
        [pageErrors, submitErrors],
    );

    const validateClient = (): string[] => {
        const msgs: string[] = [];
        if (!filters.month) msgs.push('Select a month.');
        if (!filters.year) msgs.push('Select a year.');
        if (!filters.process_date?.trim()) msgs.push('Select a calculation date.');
        if (!canProcess) msgs.push('Your account needs Payroll Edit permission to run salary process.');
        return msgs;
    };

    const runProcess = () => {
        const client = validateClient();
        if (client.length) {
            setClientErrors(client);
            setSubmitErrors({});
            return;
        }
        setClientErrors([]);
        setSubmitErrors({});
        setProcessing(true);
        router.post(
            route('salary-process.process'),
            { ...filters, is_partial: filters.is_partial ? 1 : 0 },
            {
                preserveScroll: true,
                onError: (errs) => {
                    setSubmitErrors(errs as Record<string, string>);
                    setClientErrors(flattenErrors(errs as Record<string, string>));
                },
                onSuccess: () => {
                    setClientErrors([]);
                    setSubmitErrors({});
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Layout>
            <Head title="Calculate payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Calculator}
                    title="Calculate payroll"
                    description="Choose one branch or All branches (creates one payroll run per branch). Only active employees with payscale, grade, and step are included."
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-950">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Could not process salary</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                {flash?.info && (
                    <Alert className="mb-6 border-sky-200 bg-sky-50 text-sky-950">
                        <AlertTitle>Process details</AlertTitle>
                        <AlertDescription>{flash.info}</AlertDescription>
                    </Alert>
                )}

                {(clientErrors.length > 0 || allErrors.length > 0) && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Please fix the following</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                                {(clientErrors.length ? clientErrors : allErrors).map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {!canProcess && (
                    <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-950">
                        <AlertTitle>View only</AlertTitle>
                        <AlertDescription>
                            You can open this page, but running salary process requires the <strong>payroll.edit</strong> permission.
                        </AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Pay period & scope" description="Each branch/month can only be calculated once until rolled back. All branches = one run per branch." className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollBranchSelect
                            label="Branch"
                            value={filters.branch_id}
                            onChange={(v) => setFilter('branch_id', v)}
                            branches={options.branches}
                            allowAll
                            allLabel="All branches"
                        />
                        {submitErrors.branch_id && <p className="col-span-full text-xs text-red-500">{submitErrors.branch_id}</p>}
                        <PayrollYearSelect
                            value={filters.year}
                            onChange={(v) => setFilter('year', v)}
                            years={options.years}
                            required
                        />
                        <div>
                            <PayrollMonthSelect
                                value={filters.month}
                                onChange={(v) => setFilter('month', v)}
                                months={options.months}
                                required
                            />
                            {submitErrors.month && <p className="text-xs text-red-500">{submitErrors.month}</p>}
                        </div>
                    </div>
                    <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} showBranch={false} />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollComboField
                            label="Pay type"
                            required
                            value={filters.salary_type}
                            onChange={(v) => setFilter('salary_type', v)}
                            items={options.salaryTypes.map((t) => ({
                                value: t.value,
                                label: salaryTypeLabels[t.value] ?? t.label,
                            }))}
                            placeholder="Select pay type"
                        />
                        <PayrollField label="Calculation date" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.process_date)}
                                onSelect={(d) => setFilter('process_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                            {submitErrors.process_date && <p className="text-xs text-red-500">{submitErrors.process_date}</p>}
                        </PayrollField>
                        <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:mt-7">
                            <Checkbox checked={filters.is_partial} onCheckedChange={(v) => setFilters((f) => ({ ...f, is_partial: Boolean(v) }))} />
                            <span className="text-sm text-slate-700">Partial month (joining / leaving)</span>
                        </label>
                    </div>
                    <PayrollFormActions>
                        <Button onClick={runProcess} disabled={processing || !canProcess} size="lg">
                            <Calculator className="mr-2 h-4 w-4" />
                            {processing ? 'Calculating…' : 'Calculate payroll'}
                        </Button>
                    </PayrollFormActions>
                </PayrollSectionCard>

                {recentRuns.length > 0 && (
                    <PayrollSectionCard title="Recent calculations" description="Open a run to review before posting.">
                        <ul className="divide-y divide-slate-100">
                            {recentRuns.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{r.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.processed_at ?? '—'} · {r.employee_count} employees · Net ৳ {r.total_net.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={r.status === 'posted' ? 'default' : 'secondary'}>{r.status}</Badge>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={route('salary-post.show', r.id)}>Review <ChevronRight className="ml-1 h-4 w-4" /></Link>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
