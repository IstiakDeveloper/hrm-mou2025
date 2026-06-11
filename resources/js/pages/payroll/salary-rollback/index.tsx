import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
    PayrollComboField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { RotateCcw, Search } from 'lucide-react';

type Row = {
    payslip_id: number;
    payroll_run_id: number;
    branch: string | null;
    pin: string;
    name: string;
    grade: string | null;
    step: number | null;
    basic: number;
    gross: number;
    deduction: number;
    net: number;
    status: string;
};

type Props = {
    filters: Record<string, string | boolean>;
    rows: Row[];
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

const salaryTypeLabels: Record<string, string> = {
    all: 'All types',
    salary: 'Monthly salary',
    bonus: 'Bonus',
    arrear: 'Arrear',
};

export default function SalaryRollbackIndex({ filters: init, rows, ...options }: Props) {
    const [filters, setFilters] = useState({
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        designation_id: String(init.designation_id || ''),
        program_id: String(init.program_id || ''),
        project_id: String(init.project_id || ''),
        employee_id: String(init.employee_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || ''),
        salary_type: String(init.salary_type || 'all'),
    });
    const [selected, setSelected] = useState<number[]>([]);
    const [rolling, setRolling] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const runIds = useMemo(
        () => [...new Set(rows.filter((r) => selected.includes(r.payslip_id)).map((r) => r.payroll_run_id))],
        [rows, selected],
    );

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const load = () => {
        if (!filters.month) {
            setLoadError('Select a month before loading payroll.');
            return;
        }
        setLoadError(null);
        router.get(route('salary-rollback.index'), { ...filters, searched: 1 });
    };

    const rollback = () => {
        if (!runIds.length) return;
        if (!confirm('Undo selected payroll? Payslips will be deleted and you can calculate again.')) return;
        setRolling(true);
        router.post(route('salary-rollback.rollback'), { payroll_run_ids: runIds }, { onFinish: () => setRolling(false) });
    };

    const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.payslip_id));

    return (
        <Layout>
            <Head title="Undo payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={RotateCcw}
                    title="Undo payroll"
                    description="Remove a calculated or posted payroll for a month so you can run Calculate payroll again. This deletes payslip data for the selected run."
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Done</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {loadError && (
                    <Alert variant="destructive" className="mb-6 rounded-xl border-red-100 bg-red-50/30">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Cannot load</AlertTitle>
                        <AlertDescription className="text-xs text-red-700/95 mt-1">{loadError}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Find payroll" className="mb-6">
                    <div className="grid gap-4.5 sm:grid-cols-3">
                        <PayrollMonthSelect
                            value={filters.month}
                            onChange={(v) => setFilter('month', v)}
                            months={options.months}
                            required
                        />
                        <PayrollYearSelect
                            value={filters.year}
                            onChange={(v) => setFilter('year', v)}
                            years={options.years}
                        />
                        <PayrollComboField
                            label="Pay type"
                            value={filters.salary_type}
                            onChange={(v) => setFilter('salary_type', v || 'salary')}
                            items={Object.entries(salaryTypeLabels).map(([value, label]) => ({ value, label }))}
                            placeholder="Select pay type"
                        />
                    </div>
                    <div className="mt-4">
                        <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} showProgram={false} />
                    </div>
                    <PayrollFormActions className="mt-5 pt-4">
                        <Button type="button" variant="outline" onClick={load} className="cursor-pointer">
                            <Search className="mr-2 h-4 w-4" /> Load payroll
                        </Button>
                        {rows.length > 0 && (
                            <Button type="button" variant="destructive" onClick={rollback} disabled={rolling || !runIds.length} className="cursor-pointer">
                                <RotateCcw className="mr-2 h-4 w-4" /> Undo selected
                            </Button>
                        )}
                    </PayrollFormActions>
                </PayrollSectionCard>

                {rows.length > 0 ? (
                    <PayrollSectionCard title="Payslips" description="Select rows to undo the whole payroll run they belong to.">
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="w-12 py-3.5 pl-6">
                                            <Checkbox checked={rows.length > 0 && selected.length === rows.length} onCheckedChange={toggleAll} className="cursor-pointer" />
                                        </TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Branch</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">PIN</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Grade</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Step</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 text-right pr-6">Net (৳)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.payslip_id} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="py-3 pl-6"><Checkbox checked={selected.includes(r.payslip_id)} onCheckedChange={() => toggle(r.payslip_id)} className="cursor-pointer" /></TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{r.branch}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500 py-3">{r.pin}</TableCell>
                                            <TableCell className="text-sm font-semibold text-slate-800 py-3">{r.name}</TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{r.grade ?? '—'}</TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{r.step ?? '—'}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-700 font-semibold pr-6 py-3">৳{r.net.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </PayrollSectionCard>
                ) : init.searched ? (
                    <PayrollEmptyState message="No payroll found for this period and filters." />
                ) : null}
            </PayrollPage>
        </Layout>
    );
}
