import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { Ban, Save, Trash2 } from 'lucide-react';

type Props = {
    filters: Record<string, string>;
    records: { id: number; employee_label: string; year: number; month: number; salary_type: string; reason: string | null; created_at: string | null }[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryTypes: { value: string; label: string }[];
    months: { value: number; label: string }[];
    years: number[];
};

const salaryTypeLabels: Record<string, string> = {
    salary: 'Monthly salary',
    bonus: 'Bonus',
    arrear: 'Arrear',
};

export default function SalaryWithheldIndex({ filters: init, records, branches, employees, salaryTypes, months, years }: Props) {
    const [form, setForm] = useState({
        year: init.year || String(new Date().getFullYear()),
        month: init.month || '',
        branch_id: init.branch_id || '',
        employee_id: init.employee_id || '',
        salary_type: init.salary_type || 'salary',
        reason: init.reason || '',
    });
    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        router.post(route('salary-withheld.store'), form, { onFinish: () => setSaving(false) });
    };

    return (
        <Layout>
            <Head title={form.salary_type === 'bonus' ? 'Hold bonus' : 'Hold salary'} />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Ban}
                    title={form.salary_type === 'bonus' ? 'Hold bonus payment' : 'Hold salary payment'}
                    description="Mark an employee so they are not paid for a given month. Net pay will be zero when payroll is calculated."
                />

                <PayrollSectionCard title="New hold" description="Employee will be skipped for payment in this period." className="mb-6 max-w-3xl">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <PayrollYearSelect value={form.year} onChange={(v) => setForm((f) => ({ ...f, year: v }))} years={years} required />
                        <PayrollMonthSelect value={form.month} onChange={(v) => setForm((f) => ({ ...f, month: v }))} months={months} required />
                        <PayrollBranchSelect
                            value={form.branch_id}
                            onChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
                            branches={branches}
                            required
                            allowAll={false}
                        />
                        <PayrollEmployeeSelect
                            value={form.employee_id}
                            onChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}
                            employees={employees}
                            required
                            allowAll={false}
                        />
                        <PayrollComboField
                            label="Pay type"
                            value={form.salary_type}
                            onChange={(v) => setForm((f) => ({ ...f, salary_type: v }))}
                            items={salaryTypes.map((t) => ({
                                value: t.value,
                                label: salaryTypeLabels[t.value] ?? t.label,
                            }))}
                            placeholder="Select pay type"
                        />
                        <PayrollField label="Reason" className="sm:col-span-2">
                            <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Why is salary held?" />
                        </PayrollField>
                    </div>
                    <PayrollFormActions className="mt-0 border-0 pt-2">
                        <Button onClick={save} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" /> Save hold
                        </Button>
                    </PayrollFormActions>
                </PayrollSectionCard>

                <PayrollSectionCard title="Active holds" description="Remove a hold to allow payment in that month again.">
                    {records.length === 0 ? (
                        <PayrollEmptyState message="No salary holds on record." />
                    ) : (
                        <div className="overflow-x-auto -mx-4 sm:-mx-5">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="text-sm font-medium">{r.employee_label}</TableCell>
                                            <TableCell className="text-sm">{months.find((m) => m.value === r.month)?.label ?? r.month} {r.year}</TableCell>
                                            <TableCell className="text-sm">{salaryTypeLabels[r.salary_type.toLowerCase()] ?? r.salary_type}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{r.reason || '—'}</TableCell>
                                            <TableCell>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm('Remove this hold?')) router.delete(route('salary-withheld.destroy', r.id)); }}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
