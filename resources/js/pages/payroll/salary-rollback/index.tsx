import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { cn } from '@/lib/utils';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { Building2, RotateCcw, Search, User, Users } from 'lucide-react';

type RollbackScope = 'employee' | 'branch' | 'branches';

type Row = {
    payslip_id: number;
    payroll_run_id: number;
    branch_id: number | null;
    branch: string | null;
    branch_label: string;
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

type BranchSummary = {
    branch_id: number | null;
    branch_label: string;
    payroll_run_ids: number[];
    run_count: number;
    employee_count: number;
    total_gross: number;
    total_deduction: number;
    total_net: number;
    status: string;
};

type ScopeOption = {
    value: RollbackScope;
    label: string;
    description: string;
};

type Props = {
    filters: Record<string, string | boolean>;
    rows: Row[];
    branchSummaries: BranchSummary[];
    rollbackScopes: ScopeOption[];
    branches: { id: number; name: string; branch_code?: string | null }[];
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

const scopeIcons: Record<RollbackScope, typeof User> = {
    employee: User,
    branch: Building2,
    branches: Users,
};

function statusBadge(status: string) {
    if (status === 'posted') {
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase tracking-wider">Posted</Badge>;
    }
    return <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-[10px] uppercase tracking-wider">Processed</Badge>;
}

export default function SalaryRollbackIndex({
    filters: init,
    rows,
    branchSummaries,
    rollbackScopes,
    ...options
}: Props) {
    const initialScope = (init.scope as RollbackScope) || 'employee';

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
    const [scope, setScope] = useState<RollbackScope>(initialScope);
    const [selectedPayslips, setSelectedPayslips] = useState<number[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
    const [singleBranchId, setSingleBranchId] = useState(String(init.branch_id || ''));
    const [rolling, setRolling] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    useEffect(() => {
        setSelectedPayslips([]);
        setSelectedBranchIds([]);
    }, [rows, branchSummaries, scope]);

    const singleBranchSummary = useMemo(
        () => branchSummaries.find((b) => String(b.branch_id ?? '') === singleBranchId),
        [branchSummaries, singleBranchId],
    );

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const load = () => {
        if (!filters.month) {
            setLoadError('Select a month before loading payroll.');
            return;
        }
        setLoadError(null);
        router.get(route('salary-rollback.index'), { ...filters, scope, searched: 1 });
    };

    const togglePayslip = (id: number) => {
        setSelectedPayslips((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    };

    const toggleAllPayslips = () => {
        setSelectedPayslips(selectedPayslips.length === rows.length ? [] : rows.map((r) => r.payslip_id));
    };

    const toggleBranch = (branchId: number | null) => {
        if (branchId == null) return;
        setSelectedBranchIds((s) => (s.includes(branchId) ? s.filter((x) => x !== branchId) : [...s, branchId]));
    };

    const toggleAllBranches = () => {
        const ids = branchSummaries.map((b) => b.branch_id).filter((id): id is number => id != null);
        setSelectedBranchIds(selectedBranchIds.length === ids.length ? [] : ids);
    };

    const selectedBranchRunIds = useMemo(() => {
        if (scope === 'branch' && singleBranchSummary) {
            return singleBranchSummary.payroll_run_ids;
        }
        if (scope === 'branches') {
            return branchSummaries
                .filter((b) => b.branch_id != null && selectedBranchIds.includes(b.branch_id))
                .flatMap((b) => b.payroll_run_ids);
        }
        return [];
    }, [scope, singleBranchSummary, branchSummaries, selectedBranchIds]);

    const rollbackLabel = useMemo(() => {
        if (scope === 'employee') {
            return selectedPayslips.length ? `Undo ${selectedPayslips.length} employee(s)` : 'Undo selected';
        }
        if (scope === 'branch') {
            return singleBranchSummary ? `Undo ${singleBranchSummary.branch_label}` : 'Undo branch';
        }
        const count = selectedBranchIds.length;
        return count ? `Undo ${count} branch(es)` : 'Undo branches';
    }, [scope, selectedPayslips.length, singleBranchSummary, selectedBranchIds.length]);

    const canRollback = useMemo(() => {
        if (scope === 'employee') return selectedPayslips.length > 0;
        if (scope === 'branch') return Boolean(singleBranchSummary?.payroll_run_ids.length);
        return selectedBranchIds.length > 0;
    }, [scope, selectedPayslips.length, singleBranchSummary, selectedBranchIds.length]);

    const rollback = () => {
        if (!canRollback) return;

        let message = '';
        if (scope === 'employee') {
            message = `Undo payroll for ${selectedPayslips.length} selected employee(s)? Other employees in the same branch will not be affected.`;
        } else if (scope === 'branch' && singleBranchSummary) {
            message = `Undo the full payroll for ${singleBranchSummary.branch_label} (${singleBranchSummary.employee_count} employee(s), net ${formatTakaWithSymbol(singleBranchSummary.total_net)})?`;
        } else {
            const employees = branchSummaries
                .filter((b) => b.branch_id != null && selectedBranchIds.includes(b.branch_id))
                .reduce((sum, b) => sum + b.employee_count, 0);
            message = `Undo payroll for ${selectedBranchIds.length} branch(es) (${employees} employee(s) total)?`;
        }

        if (!confirm(message)) return;

        setRolling(true);

        const payload =
            scope === 'employee'
                ? { scope, payslip_ids: selectedPayslips }
                : { scope, payroll_run_ids: selectedBranchRunIds };

        router.post(route('salary-rollback.rollback'), payload, {
            onFinish: () => setRolling(false),
            preserveScroll: true,
        });
    };

    const showResults = Boolean(init.searched) && (rows.length > 0 || branchSummaries.length > 0);

    return (
        <Layout>
            <Head title="Undo payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={RotateCcw}
                    title="Undo payroll"
                    description="Choose how much payroll to reverse: selected employees, one branch, or multiple branches."
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

                <PayrollSectionCard title="Pay period" className="mb-6">
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
                    <PayrollFormActions className="mt-5 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={load} className="cursor-pointer">
                            <Search className="mr-2 h-4 w-4" /> Load payroll
                        </Button>
                    </PayrollFormActions>
                </PayrollSectionCard>

                {showResults && (
                    <PayrollSectionCard title="Rollback scope" className="mb-6">
                        <div className="grid gap-3 md:grid-cols-3">
                            {rollbackScopes.map((option) => {
                                const Icon = scopeIcons[option.value as RollbackScope];
                                const active = scope === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setScope(option.value as RollbackScope)}
                                        className={cn(
                                            'rounded-xl border p-4 text-left transition-all cursor-pointer',
                                            active
                                                ? 'border-slate-800 bg-slate-900 text-white shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80',
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                    active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600',
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-slate-900')}>
                                                    {option.label}
                                                </p>
                                                <p className={cn('mt-1 text-[11px] leading-relaxed', active ? 'text-slate-300' : 'text-slate-500')}>
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </PayrollSectionCard>
                )}

                {showResults && scope === 'employee' && (
                    <PayrollSectionCard
                        title="Select employees"
                        description="Optional filters narrow the list. Only checked employees are rolled back."
                        className="mb-6"
                    >
                        <div className="mb-4 flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[16rem]">
                                <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} showProgram={false} />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={load} className="cursor-pointer shrink-0">
                                <Search className="mr-2 h-3.5 w-3.5" /> Apply filters
                            </Button>
                        </div>
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="w-12 py-3.5 pl-6">
                                            <Checkbox
                                                checked={rows.length > 0 && selectedPayslips.length === rows.length}
                                                onCheckedChange={toggleAllPayslips}
                                                className="cursor-pointer"
                                            />
                                        </TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Branch</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">PIN</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Grade</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 text-right">Net (৳)</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.payslip_id} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="py-3 pl-6">
                                                <Checkbox
                                                    checked={selectedPayslips.includes(r.payslip_id)}
                                                    onCheckedChange={() => togglePayslip(r.payslip_id)}
                                                    className="cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{r.branch_label}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500 py-3">{r.pin}</TableCell>
                                            <TableCell className="text-sm font-semibold text-slate-800 py-3">{r.name}</TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{r.grade ?? '—'}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-700 font-semibold py-3">
                                                {formatTakaWithSymbol(r.net)}
                                            </TableCell>
                                            <TableCell className="py-3 pr-6">{statusBadge(r.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </PayrollSectionCard>
                )}

                {showResults && scope === 'branch' && (
                    <PayrollSectionCard
                        title="Select branch"
                        description="The entire payroll run for this branch and period will be reversed."
                        className="mb-6"
                    >
                        <div className="max-w-md mb-5">
                            <PayrollBranchSelect
                                label="Branch"
                                value={singleBranchId}
                                onChange={setSingleBranchId}
                                branches={options.branches}
                                required
                                placeholder="Choose branch"
                            />
                        </div>

                        {singleBranchSummary ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{singleBranchSummary.branch_label}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {singleBranchSummary.employee_count} employee(s)
                                            {singleBranchSummary.run_count > 1 ? ` · ${singleBranchSummary.run_count} payroll runs` : ''}
                                        </p>
                                    </div>
                                    {statusBadge(singleBranchSummary.status)}
                                </div>
                                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross</dt>
                                        <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                                            {formatTakaWithSymbol(singleBranchSummary.total_gross)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deduction</dt>
                                        <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                                            {formatTakaWithSymbol(singleBranchSummary.total_deduction)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net payable</dt>
                                        <dd className="mt-0.5 font-mono text-sm font-semibold text-emerald-700">
                                            {formatTakaWithSymbol(singleBranchSummary.total_net)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        ) : singleBranchId ? (
                            <PayrollEmptyState message="No processed or posted payroll for this branch in the selected period." />
                        ) : null}
                    </PayrollSectionCard>
                )}

                {showResults && scope === 'branches' && (
                    <PayrollSectionCard
                        title="Select branches"
                        description="Each selected branch will have its full payroll run reversed for this period."
                        className="mb-6"
                    >
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="w-12 py-3.5 pl-6">
                                            <Checkbox
                                                checked={
                                                    branchSummaries.length > 0 &&
                                                    selectedBranchIds.length === branchSummaries.filter((b) => b.branch_id != null).length
                                                }
                                                onCheckedChange={toggleAllBranches}
                                                className="cursor-pointer"
                                            />
                                        </TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Branch</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 text-center">Employees</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 text-right">Gross</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 text-right">Net</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {branchSummaries.map((b) => (
                                        <TableRow key={String(b.branch_id)} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="py-3 pl-6">
                                                <Checkbox
                                                    checked={b.branch_id != null && selectedBranchIds.includes(b.branch_id)}
                                                    onCheckedChange={() => toggleBranch(b.branch_id)}
                                                    className="cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <p className="text-sm font-semibold text-slate-800">{b.branch_label}</p>
                                                {b.run_count > 1 && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{b.run_count} payroll runs</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium text-slate-600 py-3">{b.employee_count}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-700 py-3">
                                                {formatTakaWithSymbol(b.total_gross)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-800 py-3">
                                                {formatTakaWithSymbol(b.total_net)}
                                            </TableCell>
                                            <TableCell className="py-3 pr-6">{statusBadge(b.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </PayrollSectionCard>
                )}

                {showResults && (
                    <PayrollFormActions className="sticky bottom-4 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
                        <p className="text-xs text-slate-500 mr-auto hidden sm:block">
                            {scope === 'employee' && 'Only selected employees are affected.'}
                            {scope === 'branch' && 'All employees in the chosen branch will be rolled back.'}
                            {scope === 'branches' && 'All employees in the chosen branches will be rolled back.'}
                        </p>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={rollback}
                            disabled={rolling || !canRollback}
                            className="cursor-pointer"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {rolling ? 'Rolling back…' : rollbackLabel}
                        </Button>
                    </PayrollFormActions>
                )}

                {init.searched && !showResults && (
                    <PayrollEmptyState message="No processed or posted payroll found for this period." />
                )}
            </PayrollPage>
        </Layout>
    );
}
