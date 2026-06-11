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
                    <div className="grid gap-4.5 sm:grid-cols-2">
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
                            <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Why is salary held?" className="bg-white min-h-[5rem] text-sm focus:ring-1 focus:ring-slate-300" />
                        </PayrollField>
                    </div>
                    <PayrollFormActions className="mt-4 pt-4">
                        <Button onClick={save} disabled={saving} className="cursor-pointer">
                            <Save className="mr-2 h-4 w-4" /> Save hold
                        </Button>
                    </PayrollFormActions>
                </PayrollSectionCard>

                <PayrollSectionCard title="Active holds" description="Remove a hold to allow payment in that month again.">
                    {records.length === 0 ? (
                        <PayrollEmptyState message="No salary holds on record." />
                    ) : (
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/40 border-b border-slate-100 hover:bg-slate-50/40">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5 pl-6">Employee</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Period</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Type</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3.5">Reason</TableHead>
                                        <TableHead className="w-16 py-3.5 pr-6" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r) => (
                                        <TableRow key={r.id} className="border-b border-slate-100/70 hover:bg-slate-50/30">
                                            <TableCell className="text-sm font-semibold text-slate-800 py-3 pl-6">{r.employee_label}</TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium py-3">{months.find((m) => m.value === r.month)?.label ?? r.month} {r.year}</TableCell>
                                            <TableCell className="py-3">
                                                <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 border-slate-200 bg-slate-50">
                                                    {salaryTypeLabels[r.salary_type.toLowerCase()] ?? r.salary_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-400 font-medium py-3 max-w-xs truncate">{r.reason || '—'}</TableCell>
                                            <TableCell className="py-3 pr-6 text-right">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50/30 rounded-lg cursor-pointer" onClick={() => { if (confirm('Remove this hold?')) router.delete(route('salary-withheld.destroy', r.id)); }}>
                                                    <Trash2 className="h-3.5 w-3.5" />
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
