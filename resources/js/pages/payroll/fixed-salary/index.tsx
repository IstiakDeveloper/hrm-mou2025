import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollComboField, PayrollField, PayrollBranchSelect, PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { Banknote, Pencil, Plus, Save, UserRound, SlidersHorizontal } from 'lucide-react';
import { formatTakaWhole } from '@/lib/taka-format';
import { formatTakaWhole } from '@/lib/taka-format';

type EmployeeRow = {
    employee_id: number;
    pin: string;
    name: string;
    branch?: string | null;
    department?: string | null;
    designation?: string | null;
    employee_type?: string | null;
    fixed_salary: string;
    has_salary: boolean;
};

type FilterOptions = {
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    employeeTypes: { id: number; name: string }[];
};

type Props = FilterOptions & {
    filters: Record<string, string | boolean>;
    rows: EmployeeRow[];
};

export default function FixedSalaryIndex({
    filters: initialFilters,
    rows: initialRows,
    branches,
    departments,
    designations,
    programs,
    projects,
    employees,
    employeeTypes,
}: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{ errors?: Record<string, string>; flash?: { success?: string } }>().props;

    const [filters, setFilters] = useState<Record<string, string>>({
        branch_id: String(initialFilters.branch_id || ''),
        department_id: String(initialFilters.department_id || ''),
        designation_id: String(initialFilters.designation_id || ''),
        program_id: String(initialFilters.program_id || ''),
        project_id: String(initialFilters.project_id || ''),
        employee_id: String(initialFilters.employee_id || ''),
        employee_type_id: String(initialFilters.employee_type_id || ''),
    });

    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [salaryAmount, setSalaryAmount] = useState('');
    const [savingEmployee, setSavingEmployee] = useState(false);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const filterOptions = useMemo(
        () => ({ branches, departments, designations, programs, projects, employees, employeeTypes }),
        [branches, departments, designations, programs, projects, employees, employeeTypes],
    );

    const employeeItems = useMemo(
        () =>
            employees.map((e) => ({
                value: String(e.id),
                label: `${e.pin ?? '—'} — ${e.name_en ?? 'Employee'}`,
            })),
        [employees],
    );

    const applyFilters = () => {
        router.get(route('fixed-salary.index'), filters, { preserveState: true });
    };

    const openEditModal = (row: EmployeeRow) => {
        setEditingEmployee(row);
        setSelectedEmployeeId(String(row.employee_id));
        setSalaryAmount(row.fixed_salary);
        setEmployeeOpen(true);
    };

    const openAddModal = () => {
        setEditingEmployee(null);
        setSelectedEmployeeId('');
        setSalaryAmount('');
        setEmployeeOpen(true);
    };

    const saveEmployee = () => {
        if (!selectedEmployeeId) return;
        setSavingEmployee(true);
        router.post(
            route('fixed-salary.employee.store'),
            {
                employee_id: Number(selectedEmployeeId),
                fixed_salary: salaryAmount.trim() === '' ? null : salaryAmount,
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

    const configuredCount = initialRows.filter((r) => r.has_salary).length;
    const missingCount = initialRows.length - configuredCount;

    return (
        <Layout>
            <Head title="Fixed Salary" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Banknote}
                    title="Fixed Salary"
                    description="Contractual and other employees without payscale/grade/step. Set a monthly amount here for payroll."
                >
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            onClick={openAddModal} 
                            className="cursor-pointer h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs rounded-lg transition-all duration-200"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Set salary
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

                {/* Stats Row */}
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fixed Salary Overview</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                            Paid as gross monthly salary with no grade components.
                        </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 shadow-3xs transition-all duration-200 hover:border-slate-350 hover:bg-slate-50/55">
                            <UserRound className="h-3.5 w-3.5 text-slate-400" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Eligible Employees</span>
                                <span className="text-sm font-extrabold font-mono text-slate-800 mt-0.5">{initialRows.length}</span>
                            </div>
                        </div>

                        <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 shadow-3xs transition-all duration-200 hover:border-emerald-100 hover:bg-emerald-50/10">
                            <span className="relative flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Configured</span>
                                <span className="text-sm font-extrabold font-mono text-emerald-800 mt-0.5">{configuredCount}</span>
                            </div>
                        </div>

                        {missingCount > 0 && (
                            <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 shadow-3xs transition-all duration-200 hover:border-amber-150 hover:bg-amber-50/10">
                                <span className="relative flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Missing Amount</span>
                                    <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">{missingCount}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Deck */}
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-4 mb-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100/80">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">Filter Employees</span>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-11 items-end">
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
                                items={[
                                    { value: '', label: 'All departments' },
                                    ...departments.map((d) => ({ value: String(d.id), label: d.name ?? '—', keywords: String(d.id) }))
                                ]}
                                placeholder="All departments"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <PayrollComboField
                                label="Designation"
                                value={filters.designation_id}
                                onChange={(v) => setFilter('designation_id', v)}
                                items={[
                                    { value: '', label: 'All designations' },
                                    ...designations.map((d) => ({ value: String(d.id), label: d.name ?? '—', keywords: String(d.id) }))
                                ]}
                                placeholder="All designations"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <PayrollComboField
                                label="Employee Type"
                                value={filters.employee_type_id}
                                onChange={(v) => setFilter('employee_type_id', v)}
                                items={[
                                    { value: '', label: 'All types' },
                                    ...employeeTypes.map((t) => ({ value: String(t.id), label: t.name ?? '—', keywords: String(t.id) }))
                                ]}
                                placeholder="All types"
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
                                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Employees Without Grade</h2>
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal leading-normal mt-0.5">Active employees missing payscale, grade, or step assignment.</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider text-indigo-700 border-indigo-200 bg-indigo-50/50">
                            {initialRows.length} total
                        </Badge>
                    </div>
                    
                    <div className="p-0">
                        {initialRows.length === 0 ? (
                            <div className="p-8">
                                <PayrollEmptyState message="No eligible employees match the selected filters." />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 pl-6 w-28">PIN</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3">Employee</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-36">Type</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-48">Monthly Salary</TableHead>
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
                                                <TableCell className="text-xs text-slate-500 font-medium py-2.5">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {row.employee_type ?? '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    {row.has_salary ? (
                                                        <span className="text-xs font-bold font-mono text-slate-800">৳{formatTakaWhole(row.fixed_salary)}</span>
                                                    ) : (
                                                        <div className="inline-flex flex-col">
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-0.5 text-xs font-bold text-amber-800 shadow-3xs">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                Not Set
                                                            </span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2.5 pr-6 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/40 shadow-3xs transition-all duration-200 cursor-pointer"
                                                        onClick={() => openEditModal(row)}
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

                {/* Dialog for Edit / Create */}
                <Dialog open={employeeOpen} onOpenChange={(open) => { setEmployeeOpen(open); if (!open) setEditingEmployee(null); }}>
                    <DialogContent className="sm:max-w-md rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-lg p-6 shadow-2xl">
                        <DialogHeader className="pb-3 border-b border-slate-100">
                            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                {editingEmployee ? (
                                    <>
                                        <Pencil className="h-4 w-4 text-indigo-500" />
                                        Update Fixed Salary
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 text-indigo-500" />
                                        Set Fixed Salary
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1">
                                {editingEmployee ? (
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                        {editingEmployee.pin} · {editingEmployee.name}
                                    </span>
                                ) : (
                                    'Select an employee without grade assignment and enter the monthly amount.'
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-3">
                            {!editingEmployee ? (
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Employee</label>
                                    <ComboSelect
                                        value={selectedEmployeeId || null}
                                        onChange={(v) => setSelectedEmployeeId(v ?? '')}
                                        items={employeeItems}
                                        placeholder="Search by PIN or name"
                                        clearable
                                        className="h-9 bg-white text-xs"
                                    />
                                </div>
                            ) : null}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly Amount (৳)</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-xs text-slate-400 font-medium">৳</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={salaryAmount}
                                        onChange={(e) => setSalaryAmount(e.target.value)}
                                        placeholder="e.g. 25000"
                                        className="h-9 pl-6 text-xs bg-white border-slate-200 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-normal leading-normal">
                                    Leave blank to clear the configured salary. This amount is used as the gross payable salary.
                                </p>
                            </div>
                        </div>
                        
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
                                disabled={savingEmployee || !selectedEmployeeId}
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
                                        Save
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
