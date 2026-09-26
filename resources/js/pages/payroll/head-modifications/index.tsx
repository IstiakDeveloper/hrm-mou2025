import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComboSelect } from '@/components/ComboSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { PayrollComboField, PayrollField, PayrollBranchSelect, PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { Pencil, Search, Save } from 'lucide-react';
import { formatTakaWithSymbol } from '@/lib/taka-format';

type Row = {
    employee_id: number;
    salary_head_id: number;
    head_name?: string;
    head_type?: string;
    is_basic_head?: boolean;
    pin: string;
    name: string;
    branch?: string;
    department?: string;
    designation?: string;
    basic_salary?: number;
    amount_type: string;
    amount: string;
    computed: number;
    has_modification: boolean;
    is_dirty?: boolean;
};

type Props = {
    filters: Record<string, string | boolean>;
    rows: Row[];
    searchNotice?: string | null;
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryHeads: { id: number; name: string; short_name?: string; is_basic_head?: boolean }[];
};

export default function SalaryHeadModificationIndex({ filters: initialFilters, rows: initialRows, searchNotice, ...options }: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{ errors?: Record<string, string>; flash?: { success?: string } }>().props;
    const [filters, setFilters] = useState<Record<string, string>>({
        branch_id: String(initialFilters.branch_id || ''),
        department_id: String(initialFilters.department_id || ''),
        designation_id: String(initialFilters.designation_id || ''),
        program_id: String(initialFilters.program_id || ''),
        project_id: String(initialFilters.project_id || ''),
        employee_id: String(initialFilters.employee_id || ''),
        salary_head_id: String(initialFilters.salary_head_id || ''),
        effective_from: String(initialFilters.effective_from || ''),
        reason: String(initialFilters.reason || ''),
    });
    const [rows, setRows] = useState(initialRows);
    const [saving, setSaving] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);
    const [tableSearch, setTableSearch] = useState('');

    React.useEffect(() => setRows(initialRows), [initialRows]);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const loadEmployees = () => {
        const msgs: string[] = [];
        if (!filters.effective_from?.trim()) msgs.push('Select an effective from date.');
        if (msgs.length) {
            setClientErrors(msgs);
            return;
        }
        setClientErrors([]);
        router.get(route('salary-head-modifications.index'), { ...filters, searched: 1 }, {
            onError: (errs) => setClientErrors(Object.values(errs as Record<string, string>).filter(Boolean)),
        });
    };

    const dirtyRows = rows.filter((r) => r.is_dirty);
    const rowsToSave = dirtyRows.length > 0 ? dirtyRows : rows;

    const save = () => {
        setSaving(true);
        router.post(
            route('salary-head-modifications.store'),
            { ...filters, rows: rowsToSave },
            { onFinish: () => setSaving(false) }
        );
    };

    const patchRow = (employeeId: number, salaryHeadId: number, patch: Partial<Row>) => {
        setRows((prevRows) => {
            const target = prevRows.find((r) => r.employee_id === employeeId && r.salary_head_id === salaryHeadId);
            if (!target) return prevRows;

            const isBasic = target.is_basic_head;
            const updatedTarget = { ...target, ...patch, is_dirty: true };

            let newBasic: number | null = null;
            if (isBasic) {
                updatedTarget.amount_type = 'fixed';
                if (patch.amount !== undefined) {
                    const amt = parseFloat(patch.amount) || 0;
                    updatedTarget.computed = Math.round(amt);
                    updatedTarget.basic_salary = amt;
                    newBasic = amt;
                }
            } else if (patch.amount !== undefined || patch.amount_type !== undefined) {
                const amt = parseFloat(updatedTarget.amount) || 0;
                if (updatedTarget.amount_type === 'percentage') {
                    updatedTarget.computed = Math.round(((updatedTarget.basic_salary ?? 0) * amt) / 100);
                } else {
                    updatedTarget.computed = Math.round(amt);
                }
            }

            return prevRows.map((r) => {
                if (r.employee_id === employeeId && r.salary_head_id === salaryHeadId) {
                    return updatedTarget;
                }
                if (isBasic && newBasic !== null && r.employee_id === employeeId) {
                    const nextRow = { ...r, basic_salary: newBasic };
                    if (nextRow.amount_type === 'percentage') {
                        const amt = parseFloat(nextRow.amount) || 0;
                        nextRow.computed = Math.round((newBasic * amt) / 100);
                    }
                    return nextRow;
                }
                return r;
            });
        });
    };

    const isAllHeads = !filters.salary_head_id;
    const selectedHead = options.salaryHeads.find((h) => String(h.id) === filters.salary_head_id);

    const filteredRows = useMemo(() => {
        if (!tableSearch.trim()) return rows;
        const q = tableSearch.toLowerCase();
        return rows.filter(
            (r) =>
                r.pin.toLowerCase().includes(q) ||
                r.name.toLowerCase().includes(q) ||
                (r.head_name && r.head_name.toLowerCase().includes(q))
        );
    }, [rows, tableSearch]);

    const selectItems = (optionsList: { id: number; name: string }[], allLabel: string) => [
        { value: '', label: allLabel },
        ...optionsList.map((o) => ({ value: String(o.id), label: o.name ?? '—', keywords: String(o.id) })),
    ];

    return (
        <Layout>
            <Head title="Component overrides" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Pencil}
                    title="Component overrides"
                    description="Only active employees with payscale, grade, and step assigned are included. Overrides apply from the effective date when payroll is calculated."
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Saved</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {(clientErrors.length > 0 || Object.keys(pageErrors).length > 0) && (
                    <Alert variant="destructive" className="mb-6 rounded-xl border-red-100 bg-red-50/30">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Cannot load</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-red-700/95">
                                {[...clientErrors, ...Object.values(pageErrors).filter(Boolean)].map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="rounded-xl border border-slate-100/90 bg-white p-4 shadow-xs mb-4">
                    {/* Row 1 */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <PayrollBranchSelect
                            value={filters.branch_id}
                            onChange={(v) => setFilter('branch_id', v)}
                            branches={options.branches}
                            allowAll
                        />
                        <PayrollComboField
                            label="Program"
                            value={filters.program_id}
                            onChange={(v) => setFilter('program_id', v)}
                            items={selectItems(options.programs, 'All programs')}
                            placeholder="All programs"
                        />
                        <PayrollComboField
                            label="Project"
                            value={filters.project_id}
                            onChange={(v) => setFilter('project_id', v)}
                            items={selectItems(options.projects, 'All projects')}
                            placeholder="All projects"
                        />
                        <PayrollComboField
                            label="Department"
                            value={filters.department_id}
                            onChange={(v) => setFilter('department_id', v)}
                            items={selectItems(options.departments, 'All departments')}
                            placeholder="All departments"
                        />
                    </div>

                    {/* Row 2 */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <PayrollComboField
                            label="Designation"
                            value={filters.designation_id}
                            onChange={(v) => setFilter('designation_id', v)}
                            items={selectItems(options.designations, 'All designations')}
                            placeholder="All designations"
                        />
                        <PayrollEmployeeSelect
                            value={filters.employee_id}
                            onChange={(v) => setFilter('employee_id', v)}
                            employees={options.employees}
                            branchId={filters.branch_id || undefined}
                            payrollReady
                        />
                        <PayrollComboField
                            label="Salary component"
                            value={filters.salary_head_id}
                            onChange={(v) => setFilter('salary_head_id', v)}
                            items={[
                                { value: '', label: 'All components' },
                                ...options.salaryHeads.map((h) => ({
                                    value: String(h.id),
                                    label: h.short_name && h.short_name !== h.name ? `${h.name} (${h.short_name})` : h.name,
                                    keywords: `${h.name} ${h.short_name ?? ''}`,
                                })),
                            ]}
                            placeholder="All components"
                        />
                        <PayrollField label="Effective from" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.effective_from)}
                                onSelect={(d) => setFilter('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
                    </div>

                    {/* Row 3 - Note & Actions */}
                    <div className="mt-3.5 flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-slate-100/50">
                        <div className="flex-1 min-w-[240px] max-w-md">
                            <PayrollField label="Note (optional)">
                                <Input value={filters.reason} onChange={(e) => setFilter('reason', e.target.value)} placeholder="Reason for override" className="h-8.5 text-xs bg-white" />
                            </PayrollField>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={loadEmployees} className="cursor-pointer h-8.5 text-xs">
                                <Search className="mr-1.5 h-3.5 w-3.5" /> Load employees
                            </Button>
                            {rows.length > 0 && (
                                <Button type="button" size="sm" onClick={save} disabled={saving} className="cursor-pointer h-8.5 text-xs">
                                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save overrides{dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ''}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {rows.length > 0 ? (
                    <PayrollSectionCard
                        title={isAllHeads ? 'Amounts — All components' : `Amounts — ${selectedHead?.name ?? 'Component'}`}
                        description={`${filteredRows.length} item(s). “Calculated” shows the value at payroll time.`}
                    >
                        {rows.length > 10 && (
                            <div className="mb-3 max-w-xs">
                                <Input
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    placeholder="Filter by PIN, name, or component…"
                                    className="h-8 text-xs bg-white"
                                />
                            </div>
                        )}
                        <div className="overflow-x-auto -mx-4.5 sm:-mx-4.5">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 pl-5 w-28">PIN</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5">Name</TableHead>
                                        {isAllHeads && (
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 w-44">Component</TableHead>
                                        )}
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 w-44">Calculation</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 text-right w-36">Value</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 text-right pr-5 w-36">Calculated (৳)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRows.map((row) => (
                                        <TableRow key={`${row.employee_id}-${row.salary_head_id}`} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="font-mono text-xs text-slate-500 py-2 pl-5">{row.pin}</TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-800 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    {row.name}
                                                    {row.has_modification && (
                                                        <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wider text-emerald-600 border-emerald-200 bg-emerald-50/50">Saved</Badge>
                                                    )}
                                                    {row.is_dirty && (
                                                        <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50/50">Modified</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {isAllHeads && (
                                                <TableCell className="py-2 text-xs font-medium text-slate-700">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{row.head_name}</span>
                                                        {row.is_basic_head ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[8px] px-1.5 py-0 font-bold uppercase tracking-wider text-purple-700 border-purple-200 bg-purple-50/50"
                                                            >
                                                                Basic
                                                            </Badge>
                                                        ) : row.head_type ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[8px] px-1 py-0 font-bold uppercase tracking-wider ${
                                                                    row.head_type === 'deduction'
                                                                        ? 'text-amber-700 border-amber-200 bg-amber-50/50'
                                                                        : 'text-blue-700 border-blue-200 bg-blue-50/50'
                                                                }`}
                                                            >
                                                                {row.head_type}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="py-1.5">
                                                {row.is_basic_head ? (
                                                    <span className="inline-flex items-center px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 rounded border border-slate-200/60">
                                                        Fixed amount
                                                    </span>
                                                ) : (
                                                    <ComboSelect
                                                        value={row.amount_type}
                                                        onChange={(v) => patchRow(row.employee_id, row.salary_head_id, { amount_type: v ?? 'fixed' })}
                                                        items={[
                                                            { value: 'percentage', label: 'Percent of basic' },
                                                            { value: 'fixed', label: 'Fixed amount' },
                                                        ]}
                                                        className="h-8 w-40 bg-white text-xs"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right">
                                                <div className="relative flex items-center justify-end">
                                                    <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                                    <Input
                                                        className="h-8 w-28 pl-5.5 pr-2.5 text-right font-mono text-xs bg-white"
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        value={row.amount}
                                                        onChange={(e) => patchRow(row.employee_id, row.salary_head_id, { amount: e.target.value })}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-700 font-semibold pr-5 py-2">{formatTakaWithSymbol(row.computed)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </PayrollSectionCard>
                ) : (
                    initialFilters.searched && (
                        <PayrollEmptyState
                            message={
                                searchNotice ??
                                'No active employees with payscale, grade, and step match your filters.'
                            }
                        />
                    )
                )}
            </PayrollPage>
        </Layout>
    );
}
