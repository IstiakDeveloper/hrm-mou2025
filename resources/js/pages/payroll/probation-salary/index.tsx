import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PayrollComboField, PayrollField, PayrollBranchSelect, PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { Banknote, Pencil, Plus, Save, Settings2, Trash2, SlidersHorizontal, ArrowRight } from 'lucide-react';

type RuleRow = {
    id?: number;
    max_service_months: string;
    salary_amount: string;
    is_active: boolean;
};

type EmployeeRow = {
    employee_id: number;
    pin: string;
    name: string;
    branch?: string | null;
    department?: string | null;
    designation?: string | null;
    joining_date?: string | null;
    service_months: number;
    default_salary: number | null;
    probation_salary: string;
    effective_salary: number | null;
    has_override: boolean;
};

type FilterOptions = {
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
};

type Props = FilterOptions & {
    filters: Record<string, string | boolean>;
    rows: EmployeeRow[];
    rules: RuleRow[];
};

function formatMoney(value: number | string | null | undefined): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ruleLabel(maxMonths: number): string {
    if (maxMonths >= 999) return 'Above threshold';
    return `Up to ${maxMonths} month${maxMonths === 1 ? '' : 's'}`;
}

export default function ProbationSalaryIndex({
    filters: initialFilters,
    rows: initialRows,
    rules: initialRules,
    branches,
    departments,
    designations,
    programs,
    projects,
    employees,
}: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{ errors?: Record<string, string>; flash?: { success?: string } }>().props;

    const [filters, setFilters] = useState<Record<string, string>>({
        branch_id: String(initialFilters.branch_id || ''),
        department_id: String(initialFilters.department_id || ''),
        designation_id: String(initialFilters.designation_id || ''),
        program_id: String(initialFilters.program_id || ''),
        project_id: String(initialFilters.project_id || ''),
        employee_id: String(initialFilters.employee_id || ''),
    });

    const [rulesOpen, setRulesOpen] = useState(false);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
    const [overrideAmount, setOverrideAmount] = useState('');
    const [rules, setRules] = useState<RuleRow[]>([]);
    const [savingRules, setSavingRules] = useState(false);
    const [savingEmployee, setSavingEmployee] = useState(false);

    useEffect(() => {
        setRules(
            initialRules.length
                ? initialRules.map((r) => ({
                    id: r.id,
                    max_service_months: String((r as RuleRow).max_service_months ?? (r as { probation_months?: number }).probation_months ?? ''),
                    salary_amount: String(r.salary_amount),
                    is_active: Boolean(r.is_active),
                }))
                : [
                    { max_service_months: '3', salary_amount: '20000', is_active: true },
                    { max_service_months: '999', salary_amount: '25000', is_active: true },
                ],
        );
    }, [initialRules]);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const activeRules = useMemo(
        () =>
            [...initialRules]
                .filter((r) => r.is_active !== false)
                .sort((a, b) => Number((a as RuleRow).max_service_months ?? 0) - Number((b as RuleRow).max_service_months ?? 0)),
        [initialRules],
    );

    const applyFilters = () => {
        router.get(route('probation-salary.index'), filters, { preserveState: true });
    };

    const saveRules = () => {
        setSavingRules(true);
        router.post(route('probation-salary.rules.store'), { rules }, {
            onFinish: () => setSavingRules(false),
            onSuccess: () => setRulesOpen(false),
        });
    };

    const openEmployeeModal = (row: EmployeeRow) => {
        setEditingEmployee(row);
        setOverrideAmount(row.probation_salary);
        setEmployeeOpen(true);
    };

    const saveEmployee = () => {
        if (!editingEmployee) return;
        setSavingEmployee(true);
        router.post(
            route('probation-salary.employee.store'),
            {
                employee_id: editingEmployee.employee_id,
                probation_salary: overrideAmount.trim() === '' ? null : overrideAmount,
            },
            {
                onFinish: () => setSavingEmployee(false),
                onSuccess: () => {
                    setEmployeeOpen(false);
                    setEditingEmployee(null);
                },
            },
        );
    };

    const addRule = () => setRules((prev) => [...prev, { max_service_months: '', salary_amount: '', is_active: true }]);
    const removeRule = (index: number) => setRules((prev) => prev.filter((_, i) => i !== index));
    const patchRule = (index: number, patch: Partial<RuleRow>) => {
        setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    };

    const selectItems = (optionsList: { id: number; name: string }[], allLabel: string) => [
        { value: '', label: allLabel },
        ...optionsList.map((o) => ({ value: String(o.id), label: o.name ?? '—', keywords: String(o.id) })),
    ];

    return (
        <Layout>
            <Head title="Probation Salary" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Banknote}
                    title="Probation Salary"
                    description="Fixed salary during probation by months since joining. Override individual employees when needed."
                >
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setRulesOpen(true)} 
                            className="cursor-pointer h-8.5 text-xs border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
                        >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                            Salary rules
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="cursor-pointer h-8.5 text-xs border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
                        >
                            <Link href="/sections/payroll">Payroll</Link>
                        </Button>
                    </div>
                </PayrollPageHeader>

                {flash?.success ? (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50/60 text-emerald-900 rounded-xl shadow-2xs py-2.5 px-4">
                        <AlertTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Success
                        </AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                ) : null}

                {Object.keys(pageErrors).length > 0 ? (
                    <Alert variant="destructive" className="mb-4 rounded-xl border-red-200 bg-red-50/50 py-2.5 px-4">
                        <AlertTitle className="text-[10px] font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Error
                        </AlertTitle>
                        <AlertDescription className="text-xs text-red-700 mt-1">{Object.values(pageErrors).join(' ')}</AlertDescription>
                    </Alert>
                ) : null}

                {/* Rules Timeline / Track */}
                <div className="mb-5 rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Salary Progression</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                            Higher tiers apply automatically until confirmation.
                        </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        {activeRules.map((rule, index) => {
                            const max = Number((rule as RuleRow).max_service_months ?? 0);
                            return (
                                <React.Fragment key={rule.id ?? max}>
                                    {index > 0 && (
                                        <div className="hidden sm:flex items-center text-slate-300">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30 p-2.5 pl-3 pr-4 shadow-3xs transition-all duration-200 hover:border-indigo-100 hover:bg-indigo-50/10">
                                        {/* Vertical decoration accent bar */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/80 rounded-l-xl"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                                {ruleLabel(max)}
                                            </span>
                                            <span className="text-sm font-extrabold font-mono text-slate-800 mt-0.5">
                                                ৳{formatMoney(rule.salary_amount)}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Filter Deck */}
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-4 mb-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100/80">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">Filter Employees</span>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-9 items-end">
                        <div className="lg:col-span-2">
                            <PayrollBranchSelect
                                value={filters.branch_id}
                                onChange={(v) => setFilter('branch_id', v)}
                                branches={branches}
                                allowAll
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <PayrollComboField
                                label="Department"
                                value={filters.department_id}
                                onChange={(v) => setFilter('department_id', v)}
                                items={selectItems(departments, 'All departments')}
                                placeholder="All departments"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <PayrollComboField
                                label="Designation"
                                value={filters.designation_id}
                                onChange={(v) => setFilter('designation_id', v)}
                                items={selectItems(designations, 'All designations')}
                                placeholder="All designations"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <PayrollEmployeeSelect
                                value={filters.employee_id}
                                onChange={(v) => setFilter('employee_id', v)}
                                employees={employees}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <Button 
                                type="button" 
                                onClick={applyFilters} 
                                className="w-full cursor-pointer h-8.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-2xs rounded-lg transition-all duration-200"
                            >
                                Filter
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden transition-all duration-300">
                    <div className="border-b border-slate-100 px-5 py-3.5 bg-slate-50/40 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Probation Employees</h2>
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal leading-normal mt-0.5">List of active employees undergoing probation and their payable rates.</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider text-indigo-700 border-indigo-200 bg-indigo-50/50">
                            {initialRows.length} active
                        </Badge>
                    </div>
                    
                    <div className="p-0">
                        {initialRows.length === 0 ? (
                            <div className="p-8">
                                <PayrollEmptyState message="No probation employees match the selected filters." />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 pl-6 w-28">PIN</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3">Employee</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-32">Joined</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-28">Service Duration</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-32">Rule Salary</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-36">Payable Salary</TableHead>
                                            <TableHead className="w-16 py-3 pr-6 text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialRows.map((row) => (
                                            <TableRow key={row.employee_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors duration-150 group">
                                                <TableCell className="font-mono text-xs font-semibold text-slate-500 py-2.5 pl-6">{row.pin}</TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{row.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium leading-none mt-1">
                                                        {[row.branch, row.designation].filter(Boolean).join(' · ') || '—'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 font-medium py-2.5">{row.joining_date ?? '—'}</TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                                        {row.service_months} {row.service_months === 1 ? 'month' : 'months'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold font-mono text-slate-600 py-2.5">৳{formatMoney(row.default_salary)}</TableCell>
                                                <TableCell className="py-2.5">
                                                    {row.has_override ? (
                                                        <div className="inline-flex flex-col">
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-0.5 text-xs font-bold font-mono text-amber-800 shadow-3xs">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                ৳{formatMoney(row.effective_salary)}
                                                            </span>
                                                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-0.5 ml-1">Custom Override</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold font-mono text-slate-800">৳{formatMoney(row.effective_salary)}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2.5 pr-6 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/40 shadow-3xs transition-all duration-200 cursor-pointer"
                                                        onClick={() => openEmployeeModal(row)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rules modal */}
                <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                    <DialogContent className="sm:max-w-lg rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-lg p-6 shadow-2xl">
                        <DialogHeader className="pb-3 border-b border-slate-100">
                            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-indigo-500" />
                                Probation Salary Rules
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Define base salary brackets by months since joining. If service exceeds the highest tier, that tier&apos;s amount is maintained.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="max-h-[50vh] space-y-3 overflow-y-auto py-4 pr-1">
                            {rules.map((rule, index) => (
                                <div key={rule.id ?? `rule-${index}`} className="relative grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3.5 rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-350 transition-all">
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Max service months</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={rule.max_service_months}
                                            onChange={(e) => patchRule(index, { max_service_months: e.target.value })}
                                            placeholder="3"
                                            className="h-8.5 text-xs bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Salary (৳)</label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={rule.salary_amount}
                                                onChange={(e) => patchRule(index, { salary_amount: e.target.value })}
                                                placeholder="20000"
                                                className="h-8.5 pl-6 text-xs bg-white border-slate-200 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8.5 w-8.5 text-red-500 border border-slate-200 bg-white hover:text-red-650 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer shadow-3xs" 
                                        onClick={() => removeRule(index)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <div className="col-span-3 flex items-center gap-2 pt-1 border-t border-slate-100/50 mt-1">
                                        <Checkbox 
                                            id={`rule-active-${index}`}
                                            checked={rule.is_active} 
                                            onCheckedChange={(c) => patchRule(index, { is_active: Boolean(c) })} 
                                        />
                                        <label htmlFor={`rule-active-${index}`} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                                            Active Rule
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-center py-3 border-t border-slate-100">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={addRule} 
                                className="cursor-pointer border-slate-200 text-xs hover:bg-slate-50 transition-colors"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5 text-slate-500" />
                                Add Tier
                            </Button>
                        </div>
                        
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button 
                                variant="outline" 
                                onClick={() => setRulesOpen(false)} 
                                className="cursor-pointer border-slate-200 text-xs hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all" 
                                disabled={savingRules} 
                                onClick={saveRules}
                            >
                                {savingRules ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Save className="h-3.5 w-3.5" />
                                        Save rules
                                    </span>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Employee override modal */}
                <Dialog open={employeeOpen} onOpenChange={(open) => { setEmployeeOpen(open); if (!open) setEditingEmployee(null); }}>
                    <DialogContent className="sm:max-w-md rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-lg p-6 shadow-2xl">
                        <DialogHeader className="pb-3 border-b border-slate-100">
                            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Pencil className="h-4 w-4 text-indigo-500" />
                                Employee Salary Override
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1">
                                {editingEmployee ? (
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                        {editingEmployee.pin} · {editingEmployee.name}
                                    </span>
                                ) : ''}
                            </DialogDescription>
                        </DialogHeader>
                        {editingEmployee ? (
                            <div className="space-y-4 py-3">
                                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50/50 border border-slate-200/60 p-3.5 text-xs">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service duration</p>
                                        <p className="font-bold text-slate-700 mt-1">{editingEmployee.service_months} months</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Rule Salary</p>
                                        <p className="font-bold text-slate-700 mt-1 font-mono">৳{formatMoney(editingEmployee.default_salary)}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom override amount (৳)</label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3 text-xs text-slate-400 font-medium">৳</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={overrideAmount}
                                            onChange={(e) => setOverrideAmount(e.target.value)}
                                            placeholder={`Leave blank to use rule (৳${formatMoney(editingEmployee.default_salary)})`}
                                            className="h-9 pl-6 text-xs bg-white border-slate-200 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400 font-normal leading-normal">
                                        Leave blank to automatically apply the rule-based salary configured for this employee&apos;s service duration tier.
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setEmployeeOpen(false)} 
                                className="cursor-pointer border-slate-200 text-xs hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all" 
                                disabled={savingEmployee} 
                                onClick={saveEmployee}
                            >
                                {savingEmployee ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Save className="h-3.5 w-3.5" />
                                        Save Override
                                    </span>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </PayrollPage>
        </Layout>
    );
}
