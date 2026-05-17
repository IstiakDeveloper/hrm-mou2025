import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollFilterGrid, PayrollField } from '@/components/payroll/PayrollFilterGrid';
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

    const runIds = useMemo(
        () => [...new Set(rows.filter((r) => selected.includes(r.payslip_id)).map((r) => r.payroll_run_id))],
        [rows, selected],
    );

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const load = () => router.get(route('salary-rollback.index'), { ...filters, searched: 1 });

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

                <PayrollSectionCard title="Find payroll" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <PayrollField label="Month" required>
                            <Select value={filters.month || 'none'} onValueChange={(v) => setFilter('month', v === 'none' ? '' : v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select month" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select month</SelectItem>
                                    {options.months.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </PayrollField>
                        <PayrollField label="Year">
                            <Select value={filters.year} onValueChange={(v) => setFilter('year', v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>{options.years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                        </PayrollField>
                        <PayrollField label="Pay type">
                            <Select value={filters.salary_type} onValueChange={(v) => setFilter('salary_type', v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(salaryTypeLabels).map(([v, label]) => (
                                        <SelectItem key={v} value={v}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </PayrollField>
                    </div>
                    <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} showProgram={false} />
                    <PayrollFormActions>
                        <Button type="button" variant="outline" onClick={load}>
                            <Search className="mr-2 h-4 w-4" /> Load payroll
                        </Button>
                        {rows.length > 0 && (
                            <Button type="button" variant="destructive" onClick={rollback} disabled={rolling || !runIds.length}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Undo selected
                            </Button>
                        )}
                    </PayrollFormActions>
                </PayrollSectionCard>

                {rows.length > 0 ? (
                    <PayrollSectionCard title="Payslips" description="Select rows to undo the whole payroll run they belong to.">
                        <div className="overflow-x-auto -mx-4 sm:-mx-5">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10">
                                            <Checkbox checked={rows.length > 0 && selected.length === rows.length} onCheckedChange={toggleAll} />
                                        </TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>PIN</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Step</TableHead>
                                        <TableHead className="text-right">Net (৳)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.payslip_id}>
                                            <TableCell><Checkbox checked={selected.includes(r.payslip_id)} onCheckedChange={() => toggle(r.payslip_id)} /></TableCell>
                                            <TableCell className="text-sm">{r.branch}</TableCell>
                                            <TableCell className="font-mono text-xs">{r.pin}</TableCell>
                                            <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                            <TableCell className="text-sm">{r.grade ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{r.step ?? '—'}</TableCell>
                                            <TableCell className="text-right tabular-nums text-sm">{r.net.toLocaleString()}</TableCell>
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
