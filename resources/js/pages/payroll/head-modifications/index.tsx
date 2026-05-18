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
import { PayrollComboField, PayrollFilterGrid, PayrollField } from '@/components/payroll/PayrollFilterGrid';
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
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-950">
                        <AlertTitle>Saved</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {(clientErrors.length > 0 || Object.keys(pageErrors).length > 0) && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Cannot load</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                                {[...clientErrors, ...Object.values(pageErrors).filter(Boolean)].map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters & component" description="Narrow down employees, then pick which component to override." className="mb-6">
                    <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollField label="Effective from" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.effective_from)}
                                onSelect={(d) => setFilter('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
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
                        <PayrollField label="Note (optional)">
                            <Input value={filters.reason} onChange={(e) => setFilter('reason', e.target.value)} placeholder="Reason for override" className="h-10" />
                        </PayrollField>
                    </div>
                    <PayrollFormActions>
                        <Button type="button" variant="outline" onClick={loadEmployees}>
                            <Search className="mr-2 h-4 w-4" /> Load employees
                        </Button>
                        {rows.length > 0 && (
                            <Button type="button" onClick={save} disabled={saving}>
                                <Save className="mr-2 h-4 w-4" /> Save overrides
                            </Button>
                        )}
                    </PayrollFormActions>
                </PayrollSectionCard>

                {rows.length > 0 ? (
                    <PayrollSectionCard
                        title={`Amounts — ${selectedHead?.name ?? 'Component'}`}
                        description={`${rows.length} employee(s). “Calculated” shows the value at payroll time.`}
                    >
                        <div className="overflow-x-auto -mx-4 sm:-mx-5">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead>PIN</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Calculation</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-right">Calculated (৳)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.employee_id}>
                                            <TableCell className="font-mono text-xs">{row.pin}</TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {row.name}
                                                {row.has_modification && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px]">Saved</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ComboSelect
                                                    value={row.amount_type}
                                                    onChange={(v) => patchRow(row.employee_id, { amount_type: v ?? 'fixed' })}
                                                    items={[
                                                        { value: 'percentage', label: 'Percent of basic' },
                                                        { value: 'fixed', label: 'Fixed amount' },
                                                    ]}
                                                    className="h-9 w-40"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input className="h-9 w-full min-w-[7rem] text-right" type="number" min={0} step="any" value={row.amount} onChange={(e) => patchRow(row.employee_id, { amount: e.target.value })} />
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-sm">{row.computed.toLocaleString()}</TableCell>
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
