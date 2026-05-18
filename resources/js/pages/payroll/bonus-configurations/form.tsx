import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollComboField, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Settings2 } from 'lucide-react';

type ConfigurationData = {
    id: number;
    bonus_type_id: number;
    name: string;
    year: number;
    month: number;
    basic_percentage: string;
    payscale_id: number | null;
    salary_grade_id: number | null;
    notes: string | null;
    is_active: boolean;
};

type Props = {
    configuration: ConfigurationData | null;
    bonusTypes: { id: number; name: string; code: string }[];
    payscales: { id: number; name: string }[];
    salaryGrades: { id: number; name: string; payscale_id: number }[];
    months: { value: number; label: string }[];
    years: number[];
};

export default function BonusConfigurationForm({
    configuration,
    bonusTypes,
    payscales,
    salaryGrades,
    months,
    years,
}: Props) {
    const isEdit = Boolean(configuration?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        bonus_type_id: String(configuration?.bonus_type_id ?? ''),
        name: configuration?.name ?? '',
        year: String(configuration?.year ?? new Date().getFullYear()),
        month: String(configuration?.month ?? ''),
        basic_percentage: configuration?.basic_percentage ?? '',
        payscale_id: configuration?.payscale_id ? String(configuration.payscale_id) : '',
        salary_grade_id: configuration?.salary_grade_id ? String(configuration.salary_grade_id) : '',
        notes: configuration?.notes ?? '',
        is_active: configuration?.is_active ?? true,
    });

    const filteredGrades = data.payscale_id
        ? salaryGrades.filter((g) => String(g.payscale_id) === data.payscale_id)
        : salaryGrades;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('bonus-configurations.update', configuration!.id));
        else post(route('bonus-configurations.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit bonus configuration' : 'Add bonus configuration'} />
            <PayrollPage>
                <Link href={route('bonus-configurations.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader
                    icon={Settings2}
                    title={isEdit ? 'Edit bonus configuration' : 'Add bonus configuration'}
                    description="Set how much bonus each eligible employee gets as a percentage of their basic salary."
                />
                <form onSubmit={submit} className="space-y-6 max-w-2xl">
                    <PayrollSectionCard title="Period & scope">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <PayrollComboField
                                    label="Bonus type"
                                    required
                                    value={String(data.bonus_type_id || '')}
                                    onChange={(v) => setData('bonus_type_id', v)}
                                    items={bonusTypes.map((t) => ({ value: String(t.id), label: t.name }))}
                                    placeholder="Search bonus type…"
                                />
                                {errors.bonus_type_id && <p className="text-sm text-red-500">{errors.bonus_type_id}</p>}
                            </div>
                            <div>
                                <Label>Configuration name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Eid-ul-Fitr 2026" />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <PayrollYearSelect
                                label="Year"
                                value={String(data.year)}
                                onChange={(v) => setData('year', Number(v))}
                                years={years}
                                required
                            />
                            <div>
                                <PayrollMonthSelect
                                    label="Month"
                                    value={String(data.month)}
                                    onChange={(v) => setData('month', Number(v))}
                                    months={months}
                                    required
                                />
                                {errors.month && <p className="text-sm text-red-500">{errors.month}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <PayrollComboField
                                    label="Payscale (optional)"
                                    value={data.payscale_id ? String(data.payscale_id) : ''}
                                    onChange={(v) => {
                                        setData('payscale_id', v ? Number(v) : null);
                                        setData('salary_grade_id', null);
                                    }}
                                    items={[
                                        { value: '', label: 'All payscales' },
                                        ...payscales.map((p) => ({ value: String(p.id), label: p.name })),
                                    ]}
                                    placeholder="All payscales"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <PayrollComboField
                                    label="Grade (optional)"
                                    value={data.salary_grade_id ? String(data.salary_grade_id) : ''}
                                    onChange={(v) => setData('salary_grade_id', v ? Number(v) : null)}
                                    disabled={!data.payscale_id}
                                    items={[
                                        { value: '', label: 'All grades' },
                                        ...filteredGrades.map((g) => ({ value: String(g.id), label: g.name })),
                                    ]}
                                    placeholder="All grades"
                                />
                            </div>
                            <div className="flex items-center gap-2 sm:col-span-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </div>
                    </PayrollSectionCard>

                    <PayrollSectionCard
                        title="Bonus amount"
                        description="Employees receive this share of their monthly basic salary from salary structure."
                    >
                        <div className="max-w-xs">
                            <Label>% of basic salary *</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="text-lg font-semibold tabular-nums"
                                    value={data.basic_percentage}
                                    onChange={(e) => setData('basic_percentage', e.target.value)}
                                    placeholder="100"
                                />
                                <span className="text-lg font-medium text-muted-foreground">%</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Example: <strong>100</strong> = one full basic as bonus (common for festival bonus).
                                <strong> 50</strong> = half of basic.
                            </p>
                            {errors.basic_percentage && <p className="mt-1 text-sm text-red-500">{errors.basic_percentage}</p>}
                        </div>
                    </PayrollSectionCard>

                    <PayrollSectionCard title="Notes (optional)">
                        <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                    </PayrollSectionCard>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('bonus-configurations.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>{processing ? 'Saving…' : 'Save configuration'}</Button>
                    </div>
                </form>
            </PayrollPage>
        </Layout>
    );
}
