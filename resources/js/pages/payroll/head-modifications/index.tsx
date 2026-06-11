import React, { useState } from 'react';
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

type Row = {
    employee_id: number;
    pin: string;
    name: string;
    amount_type: string;
    amount: string;
    computed: number;
    has_modification: boolean;
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
    salaryHeads: { id: number; name: string; short_name?: string }[];
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

    React.useEffect(() => setRows(initialRows), [initialRows]);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const loadEmployees = () => {
        const msgs: string[] = [];
        if (!filters.salary_head_id) msgs.push('Select a salary component.');
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

    const save = () => {
        setSaving(true);
        router.post(route('salary-head-modifications.store'), { ...filters, rows }, { onFinish: () => setSaving(false) });
    };

    const patchRow = (id: number, patch: Partial<Row>) => {
        setRows((r) => r.map((row) => (row.employee_id === id ? { ...row, ...patch } : row)));
    };

    const selectedHead = options.salaryHeads.find((h) => String(h.id) === filters.salary_head_id);

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
                            required
                            value={filters.salary_head_id}
                            onChange={(v) => setFilter('salary_head_id', v)}
                            items={[
                                { value: '', label: 'Select component', disabled: true },
                                ...options.salaryHeads.map((h) => ({
                                    value: String(h.id),
                                    label: h.short_name || h.name,
                                    keywords: h.name,
                                })),
                            ]}
                            placeholder="Search component…"
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
                                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save overrides
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {rows.length > 0 ? (
                    <PayrollSectionCard
                        title={`Amounts — ${selectedHead?.name ?? 'Component'}`}
                        description={`${rows.length} employee(s). “Calculated” shows the value at payroll time.`}
                    >
                        <div className="overflow-x-auto -mx-4.5 sm:-mx-4.5">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 pl-5 w-28">PIN</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5">Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 w-44">Calculation</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 text-right w-36">Value</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 text-right pr-5 w-36">Calculated (৳)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.employee_id} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="font-mono text-xs text-slate-500 py-2 pl-5">{row.pin}</TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-800 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    {row.name}
                                                    {row.has_modification && (
                                                        <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wider text-emerald-600 border-emerald-200 bg-emerald-50/50">Saved</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                                <ComboSelect
                                                    value={row.amount_type}
                                                    onChange={(v) => patchRow(row.employee_id, { amount_type: v ?? 'fixed' })}
                                                    items={[
                                                        { value: 'percentage', label: 'Percent of basic' },
                                                        { value: 'fixed', label: 'Fixed amount' },
                                                    ]}
                                                    className="h-8 w-40 bg-white text-xs"
                                                />
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right">
                                                <div className="relative flex items-center justify-end">
                                                    <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                                    <Input className="h-8 w-28 pl-5.5 pr-2.5 text-right font-mono text-xs bg-white" type="number" min={0} step="any" value={row.amount} onChange={(e) => patchRow(row.employee_id, { amount: e.target.value })} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-700 font-semibold pr-5 py-2">৳{row.computed.toLocaleString()}</TableCell>
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
