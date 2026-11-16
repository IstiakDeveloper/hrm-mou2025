import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollComboField, PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { FormErrorBanner } from '@/components/employee-loan/FormErrorBanner';
import { ArrowLeft, Save } from 'lucide-react';

type Policy = {
    id: number;
    code: string;
    name: string;
    loan_type: string;
    tenure_years: number | null;
    min_amount: number;
    max_amount: number;
    min_tenure_months: number;
    max_tenure_months: number;
    total_installments: number | null;
    default_interest_rate: number;
    calculation_method: string;
    collection_method: string;
    is_amortization: boolean;
    install_amount_calculation: number | null;
    install_amount_view: boolean;
    max_loan_limit_amount: number | null;
    max_loan_limit_percentage: number | null;
    grace_months: number;
    interval_months: number;
    description: string | null;
    terms: string | null;
    is_active: boolean;
};

type Props = {
    policy: Policy | null;
    loanTypes: { value: string; label: string }[];
};

const methodItems = [
    { value: 'reducing', label: 'Reducing' },
    { value: 'flat', label: 'Flat' },
];

export default function LoanPolicyForm({ policy, loanTypes }: Props) {
    const isEdit = Boolean(policy?.id);

    const form = useForm({
        code: policy?.code ?? '',
        name: policy?.name ?? '',
        loan_type: policy?.loan_type ?? 'other',
        tenure_years: policy?.tenure_years != null ? String(policy.tenure_years) : '',
        min_amount: policy ? String(policy.min_amount) : '0',
        max_amount: policy ? String(policy.max_amount) : '',
        min_tenure_months: policy ? String(policy.min_tenure_months) : '1',
        max_tenure_months: policy ? String(policy.max_tenure_months) : '12',
        total_installments: policy?.total_installments != null ? String(policy.total_installments) : '',
        default_interest_rate: policy ? String(policy.default_interest_rate) : '0',
        calculation_method: policy?.calculation_method ?? 'reducing',
        collection_method: policy?.collection_method ?? 'reducing',
        is_amortization: policy?.is_amortization ?? true,
        install_amount_calculation: policy?.install_amount_calculation != null ? String(policy.install_amount_calculation) : '',
        install_amount_view: policy?.install_amount_view ?? true,
        max_loan_limit_amount: policy?.max_loan_limit_amount != null ? String(policy.max_loan_limit_amount) : '',
        max_loan_limit_percentage: policy?.max_loan_limit_percentage != null ? String(policy.max_loan_limit_percentage) : '',
        grace_months: policy ? String(policy.grace_months ?? 0) : '0',
        interval_months: policy ? String(policy.interval_months ?? 1) : '1',
        description: policy?.description ?? '',
        terms: policy?.terms ?? '',
        is_active: policy?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const years = parseInt(form.data.tenure_years, 10) || 0;
        const installments =
            parseInt(form.data.total_installments, 10) ||
            (years > 0 ? years * 12 : parseInt(form.data.max_tenure_months, 10) || 12);

        form.transform((data) => ({
            ...data,
            total_installments: String(installments),
            min_tenure_months: String(installments),
            max_tenure_months: String(installments),
        }));

        if (isEdit && policy) form.put(route('loan-policies.update', policy.id));
        else form.post(route('loan-policies.store'));
    };

    return (
        <EmployeeLoanLayout title={isEdit ? 'Edit loan policy' : 'New loan policy'} activeTab="policies" description="Define loan type, tenure, rate, and calculation rules.">
            <Link href={employeeLoanPath(route('loan-policies.index'))} className="mb-4 inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Policies
            </Link>
            <form onSubmit={submit} className="space-y-3">
                <FormErrorBanner errors={form.errors} />
                <Card className="max-w-4xl border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Policy details</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Fields match your legacy loan policy master.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
                        <PayrollComboField label="Policy Type *" value={form.data.loan_type} onChange={(v) => form.setData('loan_type', v)} items={loanTypes.map((t) => ({ value: t.value, label: t.label }))} />
                        <PayrollField label="Policy Code"><Input className="h-8 text-xs font-mono" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} /></PayrollField>
                        <PayrollField label="Policy Name *"><Input className="h-8 text-xs" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required /></PayrollField>
                        <PayrollField label="Tenure (Years)"><Input type="number" className="h-8 text-xs" value={form.data.tenure_years} onChange={(e) => form.setData('tenure_years', e.target.value)} /></PayrollField>
                        <PayrollField label="Total Installments"><Input type="number" className="h-8 text-xs" value={form.data.total_installments} onChange={(e) => form.setData('total_installments', e.target.value)} placeholder="e.g. 120" /></PayrollField>
                        <PayrollField label="Rate Yearly (%)"><Input type="number" step="0.01" className="h-8 text-xs" value={form.data.default_interest_rate} onChange={(e) => form.setData('default_interest_rate', e.target.value)} /></PayrollField>
                        <PayrollComboField label="Calculation Method" value={form.data.calculation_method} onChange={(v) => form.setData('calculation_method', v)} items={methodItems} />
                        <PayrollComboField label="Collection Method" value={form.data.collection_method} onChange={(v) => form.setData('collection_method', v)} items={methodItems} />
                        <PayrollField label="Install Amount Calculation"><Input type="number" step="0.0001" className="h-8 text-xs" value={form.data.install_amount_calculation} onChange={(e) => form.setData('install_amount_calculation', e.target.value)} /></PayrollField>
                        <PayrollField label="Min Amount (৳)"><Input type="number" className="h-8 text-xs" value={form.data.min_amount} onChange={(e) => form.setData('min_amount', e.target.value)} /></PayrollField>
                        <PayrollField label="Max Amount (৳) *"><Input type="number" className="h-8 text-xs" value={form.data.max_amount} onChange={(e) => form.setData('max_amount', e.target.value)} required /></PayrollField>
                        <PayrollField label="Max Limit Amount"><Input type="number" className="h-8 text-xs" value={form.data.max_loan_limit_amount} onChange={(e) => form.setData('max_loan_limit_amount', e.target.value)} /></PayrollField>
                        <PayrollField label="Max Limit %"><Input type="number" className="h-8 text-xs" value={form.data.max_loan_limit_percentage} onChange={(e) => form.setData('max_loan_limit_percentage', e.target.value)} /></PayrollField>
                        <PayrollField label="Grace Month"><Input type="number" className="h-8 text-xs" value={form.data.grace_months} onChange={(e) => form.setData('grace_months', e.target.value)} /></PayrollField>
                        <PayrollField label="Interval Month"><Input type="number" className="h-8 text-xs" value={form.data.interval_months} onChange={(e) => form.setData('interval_months', e.target.value)} /></PayrollField>
                        <div className="sm:col-span-3 flex flex-wrap gap-4 pt-1">
                            <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.data.is_amortization} onCheckedChange={(v) => form.setData('is_amortization', Boolean(v))} /> Is Amortization</label>
                            <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.data.install_amount_view} onCheckedChange={(v) => form.setData('install_amount_view', Boolean(v))} /> Install Amount View</label>
                            <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} /> Active</label>
                        </div>
                        <div className="sm:col-span-3"><PayrollField label="Description"><Textarea className="text-xs" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></PayrollField></div>
                        <div className="sm:col-span-3"><PayrollField label="Terms"><Textarea className="text-xs min-h-[60px]" value={form.data.terms} onChange={(e) => form.setData('terms', e.target.value)} /></PayrollField></div>
                    </CardContent>
                </Card>
                <Button type="submit" disabled={form.processing} className="mt-4 h-9 bg-emerald-600 text-xs hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" /> Save policy</Button>
            </form>
        </EmployeeLoanLayout>
    );
}
