import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { PayrollBranchSelect, PayrollComboField, PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { format } from 'date-fns';
import {
    Plus,
    Search,
    Trash2,
    Edit3,
    SlidersHorizontal,
    Calendar,
    RotateCcw,
    Sparkles,
} from 'lucide-react';

type ComponentSummary = {
    id: number;
    salary_head_id: number;
    head_name: string;
    full_head_name: string;
    type: 'earning' | 'deduction';
    is_basic_head: boolean;
    amount_type: string;
    amount: number;
    display: string;
};

type ModificationRow = {
    key: string;
    employee_id: number;
    pin: string;
    name: string;
    branch: string;
    department: string;
    designation: string;
    effective_from: string;
    effective_from_raw: string;
    reason: string;
    updated_at: string | null;
    components: ComponentSummary[];
    components_count: number;
};

type Props = {
    filters: {
        branch_id?: string;
        department_id?: string;
        employee_id?: string;
        search?: string;
        effective_from?: string;
    };
    rows: ModificationRow[];
    totalCount: number;
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
};

export default function SalaryHeadModificationIndex({
    filters: initialFilters,
    rows,
    totalCount,
    branches,
    departments,
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const [filters, setFilters] = useState({
        branch_id: initialFilters.branch_id || '',
        department_id: initialFilters.department_id || '',
        search: initialFilters.search || '',
        effective_from: initialFilters.effective_from || '',
    });

    const setFilter = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        router.get(route('salary-head-modifications.index'), filters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setFilters({ branch_id: '', department_id: '', search: '', effective_from: '' });
        router.get(route('salary-head-modifications.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (row: ModificationRow) => {
        if (confirm(`Remove salary modifications for ${row.pin} - ${row.name} (Effective: ${row.effective_from})?`)) {
            router.delete(
                route('salary-head-modifications.destroy', {
                    employee: row.employee_id,
                    effective_from: row.effective_from,
                }),
                { preserveScroll: true }
            );
        }
    };

    const deptOptions = [
        { value: '', label: 'All departments' },
        ...departments.map((d) => ({ value: String(d.id), label: d.name, keywords: d.name })),
    ];

    return (
        <Layout>
            <Head title="Salary Head Modifications" />
            <PayrollPage>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <PayrollPageHeader
                        icon={SlidersHorizontal}
                        title="Salary Head Modifications"
                        description="View and manage employee-wise allowance and deduction overrides. Active modifications take effect in monthly payroll calculations."
                    />
                    <Link href={route('salary-head-modifications.create')}>
                        <Button className="cursor-pointer gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold px-4 h-9">
                            <Plus className="h-4 w-4" />
                            New Modification
                        </Button>
                    </Link>
                </div>

                {flash?.success && (
                    <Alert className="mb-5 border-emerald-200 bg-emerald-50/70 text-emerald-900 rounded-xl shadow-xs">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.error && (
                    <Alert variant="destructive" className="mb-5 rounded-xl border-red-200 bg-red-50/50">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Error</AlertTitle>
                        <AlertDescription className="text-xs text-red-700 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                {/* Filter Bar */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs mb-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <PayrollBranchSelect
                            value={filters.branch_id}
                            onChange={(v) => setFilter('branch_id', v)}
                            branches={branches}
                            allowAll
                        />
                        <PayrollComboField
                            label="Department"
                            value={filters.department_id}
                            onChange={(v) => setFilter('department_id', v)}
                            items={deptOptions}
                            placeholder="All departments"
                        />
                        <PayrollField label="Search Employee / Note">
                            <div className="relative flex items-center">
                                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    value={filters.search}
                                    onChange={(e) => setFilter('search', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="PIN, Name, or note…"
                                    className="h-8.5 pl-8 text-xs bg-white"
                                />
                            </div>
                        </PayrollField>
                        <PayrollField label="Effective From">
                            <DatePicker
                                selected={parseFormDateValue(filters.effective_from)}
                                onSelect={(d) => setFilter('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="cursor-pointer h-8 text-xs text-slate-500 hover:text-slate-700"
                        >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSearch}
                            className="cursor-pointer h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                        >
                            <Search className="mr-1.5 h-3.5 w-3.5" /> Apply Filter
                        </Button>
                    </div>
                </div>

                {/* Table or Empty State */}
                {rows.length > 0 ? (
                    <PayrollSectionCard
                        title={`Modified Employees (${totalCount})`}
                        description="Employees with custom salary head overrides. Click Edit to adjust allowance or deduction values."
                    >
                        <div className="overflow-x-auto -mx-4.5 sm:-mx-4.5">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/60 border-b border-slate-100">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 pl-5 w-24">PIN</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-64">Employee</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-32">Effective From</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3">Modified Components</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 w-44">Reason / Note</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 text-right pr-5 w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.key} className="border-b border-slate-100/70 hover:bg-slate-50/40">
                                            <TableCell className="font-mono text-xs font-semibold text-slate-600 py-3 pl-5">
                                                {row.pin}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-900">{row.name}</span>
                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                        {row.designation} &bull; {row.branch}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    {row.effective_from}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {row.components.map((comp) => {
                                                        if (comp.is_basic_head) {
                                                            return (
                                                                <Badge
                                                                    key={comp.salary_head_id}
                                                                    variant="outline"
                                                                    className="text-[11px] px-2 py-0.5 font-semibold text-purple-700 border-purple-200 bg-purple-50/70 flex items-center gap-1"
                                                                >
                                                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                                                    Basic: {comp.display}
                                                                </Badge>
                                                            );
                                                        }

                                                        if (comp.type === 'deduction') {
                                                            return (
                                                                <Badge
                                                                    key={comp.salary_head_id}
                                                                    variant="outline"
                                                                    className="text-[11px] px-2 py-0.5 font-medium text-rose-700 border-rose-200 bg-rose-50/70"
                                                                >
                                                                    {comp.head_name}: {comp.display}
                                                                </Badge>
                                                            );
                                                        }

                                                        return (
                                                            <Badge
                                                                key={comp.salary_head_id}
                                                                variant="outline"
                                                                className="text-[11px] px-2 py-0.5 font-medium text-emerald-700 border-emerald-200 bg-emerald-50/70"
                                                            >
                                                                {comp.head_name}: {comp.display}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-xs text-slate-600 max-w-[200px] truncate" title={row.reason}>
                                                {row.reason}
                                            </TableCell>
                                            <TableCell className="py-3 text-right pr-5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={route('salary-head-modifications.create', {
                                                            employee_id: row.employee_id,
                                                            effective_from: row.effective_from,
                                                        })}
                                                    >
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="cursor-pointer h-7 px-2 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(row)}
                                                        className="cursor-pointer h-7 px-1.5 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        title="Delete modification"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </PayrollSectionCard>
                ) : (
                    <div className="space-y-4">
                        <PayrollEmptyState
                            message="No salary head modifications found matching your filter criteria. Click 'New Modification' to customize an employee's salary."
                        />
                        <div className="flex justify-center">
                            <Link href={route('salary-head-modifications.create')}>
                                <Button className="cursor-pointer gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-9 text-xs">
                                    <Plus className="h-4 w-4" /> Create First Modification
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </PayrollPage>
        </Layout>
    );
}
