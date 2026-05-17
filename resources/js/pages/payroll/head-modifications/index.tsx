import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { PayrollFilterGrid, PayrollField } from '@/components/payroll/PayrollFilterGrid';
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
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryHeads: { id: number; name: string; short_name?: string }[];
};

export default function SalaryHeadModificationIndex({ filters: initialFilters, rows: initialRows, ...options }: Props) {
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

    React.useEffect(() => setRows(initialRows), [initialRows]);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const loadEmployees = () => router.get(route('salary-head-modifications.index'), { ...filters, searched: 1 });

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
                    description="Change a single salary component (e.g. house rent) for selected employees. Overrides apply from the effective date when payroll is calculated."
                />

                <PayrollSectionCard title="Filters & component" description="Narrow down employees, then pick which component to override." className="mb-6">
                    <PayrollFilterGrid filters={filters} setFilter={setFilter} {...options} />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollField label="Effective from" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.effective_from)}
                                onSelect={(d) => setFilter('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
                        <PayrollField label="Salary component" required>
                            <Select value={filters.salary_head_id || 'none'} onValueChange={(v) => setFilter('salary_head_id', v === 'none' ? '' : v)}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select component" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select component</SelectItem>
                                    {options.salaryHeads.map((h) => (
                                        <SelectItem key={h.id} value={String(h.id)}>{h.short_name || h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </PayrollField>
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
                                                <Select value={row.amount_type} onValueChange={(v) => patchRow(row.employee_id, { amount_type: v })}>
                                                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percent of basic</SelectItem>
                                                        <SelectItem value="fixed">Fixed amount</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
                        <PayrollEmptyState message="No employees match your filters, or search without selecting a component." />
                    )
                )}
            </PayrollPage>
        </Layout>
    );
}
