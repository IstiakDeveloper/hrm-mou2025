import React, { useCallback, useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollComboField } from '@/components/payroll/PayrollFilterGrid';
import { formatLoanSelectLabel, loanSelectKeywords } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { estimateInstallmentCollectionAmount, fmt, type LoanOption } from './types';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

type Row = { id: string; employee_loan_id: string; installment_count: string; notes: string };

type Props = {
    loans: LoanOption[];
    defaultCollectionDate: string;
};

let rowSeq = 0;
function newRowId() {
    rowSeq += 1;
    return `batch-row-${rowSeq}`;
}

export default function LoanCollectionBatch({ loans, defaultCollectionDate }: Props) {
    const loanItems = useMemo(
        () =>
            loans.map((l) => ({
                value: String(l.id),
                label: formatLoanSelectLabel(l, {
                    includeEmployee: true,
                    includeOutstanding: false,
                    includePending: true,
                }),
                keywords: loanSelectKeywords(l),
            })),
        [loans],
    );

    const [rows, setRows] = useState<Row[]>([{ id: newRowId(), employee_loan_id: '', installment_count: '1', notes: '' }]);

    const form = useForm({
        collection_date: defaultCollectionDate,
        reference_no: '',
        notes: '',
        rows: [] as { employee_loan_id: number; installment_count: number; notes: string | null }[],
    });

    const updateRow = useCallback((id: string, patch: Partial<Row>) => {
        setRows((current) => current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }, []);

    const addRow = () => setRows((r) => [...r, { id: newRowId(), employee_loan_id: '', installment_count: '1', notes: '' }]);
    const removeRow = (id: string) => setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));

    const totalEstimate = rows.reduce((sum, row) => {
        const loan = loans.find((l) => String(l.id) === row.employee_loan_id);
        if (!loan) return sum;
        return sum + estimateInstallmentCollectionAmount(loan, parseInt(row.installment_count, 10) || 1);
    }, 0);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform(() => ({
            collection_date: form.data.collection_date,
            reference_no: form.data.reference_no,
            notes: form.data.notes,
            rows: rows
                .filter((r) => r.employee_loan_id)
                .map((r) => ({
                    employee_loan_id: parseInt(r.employee_loan_id, 10),
                    installment_count: parseInt(r.installment_count, 10) || 1,
                    notes: r.notes || null,
                })),
        }));
        form.post(route('loan-collection.batch.store'));
    };

    return (
        <EmployeeLoanLayout
            title="Batch collection"
            activeTab="collection-batch"
            description="Collect installments for multiple employees in one batch."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-collection.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Collection list
                </Link>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold">Batch header</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Collection date</Label>
                            <Input
                                type="date"
                                className="h-9 text-xs"
                                value={form.data.collection_date}
                                onChange={(e) => form.setData('collection_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Reference</Label>
                            <Input className="h-9 text-xs" value={form.data.reference_no} onChange={(e) => form.setData('reference_no', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs">Notes</Label>
                            <Textarea className="text-xs" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold">Loans</h2>
                        <p className="text-xs text-zinc-500">Estimated total: ৳{fmt(totalEstimate)}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addRow}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add row
                    </Button>
                </div>

                {rows.map((row, index) => (
                    <Card key={row.id} className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 py-2">
                            <CardTitle className="text-xs font-semibold">Row {index + 1}</CardTitle>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-rose-600" onClick={() => removeRow(row.id)} disabled={rows.length <= 1}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-3 pt-3 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <PayrollComboField
                                    label="Loan"
                                    value={row.employee_loan_id}
                                    onChange={(v) => updateRow(row.id, { employee_loan_id: v })}
                                    items={loanItems}
                                    placeholder="Select loan"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Installments</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    className="h-9 text-xs"
                                    value={row.installment_count}
                                    onChange={(e) => updateRow(row.id, { installment_count: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {form.errors.collection && <p className="text-xs text-rose-600">{form.errors.collection}</p>}

                <div className="flex justify-end">
                    <Button type="submit" disabled={form.processing} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="mr-2 h-4 w-4" /> Save batch
                    </Button>
                </div>
            </form>
        </EmployeeLoanLayout>
    );
}
