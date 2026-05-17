import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { PayrollFilterGrid, PayrollField } from '@/components/payroll/PayrollFilterGrid';
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
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryTypes: { value: string; label: string }[];
    months: { value: number; label: string }[];
    years: number[];
};

export default function SalaryProcessIndex({ filters: init, recentRuns, ...options }: Props) {
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
        process_date: String(init.process_date || ''),
        is_partial: Boolean(init.is_partial),
    });
    const [processing, setProcessing] = useState(false);
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const runProcess = () => {
        setProcessing(true);
        router.post(route('salary-process.process'), { ...filters, is_partial: filters.is_partial ? 1 : 0 }, { onFinish: () => setProcessing(false) });
    };

    return (
        <Layout>
            <Head title="Calculate payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Calculator}
                    title="Calculate payroll"
                    description="Generate payslips for active employees in a branch for a pay period. Review results under Finalize payroll before posting."
                />

                <PayrollSectionCard title="Pay period & scope" description="Each branch and month can only be calculated once until rolled back." className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollField label="Branch" required>
                            <Select value={filters.branch_id || 'none'} onValueChange={(v) => setFilter('branch_id', v === 'none' ? '' : v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select branch" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select branch</SelectItem>
                                    {options.branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </PayrollField>
                        <PayrollField label="Year" required>
                            <Select value={filters.year} onValueChange={(v) => setFilter('year', v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>{options.years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                        </PayrollField>
                        <PayrollField label="Month" required>
                            <Select value={filters.month || 'none'} onValueChange={(v) => setFilter('month', v === 'none' ? '' : v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select month" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select month</SelectItem>
                                    {options.months.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </PayrollField>
                    </div>
                    <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollField label="Pay type" required>
                            <Select value={filters.salary_type} onValueChange={(v) => setFilter('salary_type', v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {options.salaryTypes.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{salaryTypeLabels[t.value] ?? t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </PayrollField>
                        <PayrollField label="Calculation date" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.process_date)}
                                onSelect={(d) => setFilter('process_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
                        <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:mt-7">
                            <Checkbox checked={filters.is_partial} onCheckedChange={(v) => setFilters((f) => ({ ...f, is_partial: Boolean(v) }))} />
                            <span className="text-sm text-slate-700">Partial month (joining / leaving)</span>
                        </label>
                    </div>
                    <PayrollFormActions>
                        <Button onClick={runProcess} disabled={processing} size="lg">
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
