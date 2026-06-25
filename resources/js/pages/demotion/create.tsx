import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { ArrowLeft, Calendar, ChevronRight, User2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
    EmployeeSalaryAssignment,
    type PayrollGradeOption,
    type PayrollPayscaleOption,
    type PayrollStepOption,
} from '@/components/employee/EmployeeSalaryAssignment';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    designation_id: number | null;
    payscale_id: number | null;
    salary_grade_id: number | null;
    salary_step_id: number | null;
    basic_salary: number | string;
};

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };

type Props = {
    employees: Employee[];
    designations: Designation[];
    salaryGrades: SalaryGrade[];
    suggestedOrderNo?: string;
    payscales: PayrollPayscaleOption[];
    payrollGrades: PayrollGradeOption[];
    payrollSteps: PayrollStepOption[];
    activePayscaleId?: number | null;
};

export default function CreateDemotion({
    employees,
    designations,
    salaryGrades,
    suggestedOrderNo,
    payscales,
    payrollGrades,
    payrollSteps,
    activePayscaleId = null,
}: Props) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [toDesignationId, setToDesignationId] = useState<number | null>(null);
    const [toPayscaleId, setToPayscaleId] = useState<string>(activePayscaleId ? String(activePayscaleId) : '');
    const [toSalaryGradeId, setToSalaryGradeId] = useState<string>('');
    const [toSalaryStepId, setToSalaryStepId] = useState<string>('');
    const [toBasicSalary, setToBasicSalary] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [effectiveDateOpen, setEffectiveDateOpen] = useState(false);
    const [demotionOrderNo, setDemotionOrderNo] = useState(suggestedOrderNo ?? '');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const selectedEmployee = useMemo(
        () => employees.find((e) => e.id === employeeId) ?? null,
        [employees, employeeId],
    );

    useEffect(() => {
        if (!selectedEmployee) {
            setToDesignationId(null);
            setToPayscaleId(activePayscaleId ? String(activePayscaleId) : '');
            setToSalaryGradeId('');
            setToSalaryStepId('');
            setToBasicSalary('');
            return;
        }
        // Default destination fields to current values (HR can override).
        if (toDesignationId == null && selectedEmployee.designation_id) {
            setToDesignationId(selectedEmployee.designation_id);
        }
        const payscaleDefault = selectedEmployee.payscale_id
            ? String(selectedEmployee.payscale_id)
            : activePayscaleId
              ? String(activePayscaleId)
              : '';
        if (payscaleDefault) {
            setToPayscaleId(payscaleDefault);
        }
        if (selectedEmployee.salary_grade_id) {
            setToSalaryGradeId(String(selectedEmployee.salary_grade_id));
        }
        if (selectedEmployee.salary_step_id) {
            setToSalaryStepId(String(selectedEmployee.salary_step_id));
        }
        if (!toBasicSalary && selectedEmployee.basic_salary !== null && selectedEmployee.basic_salary !== undefined) {
            setToBasicSalary(String(selectedEmployee.basic_salary));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEmployee]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!employeeId) e.employee_id = 'Employee is required';
        if (!toDesignationId) e.to_designation_id = 'New designation is required';
        if (!effectiveDate) e.effective_date = 'Effective date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setSubmitting(true);

        router.post(
            route('demotions.store'),
            {
                employee_id: employeeId,
                to_designation_id: toDesignationId,
                to_payscale_id: toPayscaleId || null,
                to_salary_grade_id: toSalaryGradeId || null,
                to_salary_step_id: toSalaryStepId || null,
                to_basic_salary: toBasicSalary ? Number(toBasicSalary) : null,
                effective_date: effectiveDate ? format(effectiveDate, 'yyyy-MM-dd') : '',
                demotion_order_no: demotionOrderNo,
                reason,
            },
            {
                onError: (errs) => setErrors(errs),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Layout>
            <Head title="Create Demotion" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('demotions.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Demotions
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Create demotion request</h1>
                    <p className="mt-1 text-xs text-zinc-600">Record designation, grade, or salary downgrade for an employee.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Demotion details</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Select employee, then set the new career values.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={onSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Employee</Label>
                                        <ComboSelect<number>
                                            value={employeeId}
                                            onChange={(v) => setEmployeeId(v ?? null)}
                                            placeholder="Search employee (PIN / name)…"
                                            items={employees.map((e) => ({
                                                value: e.id,
                                                label: `${e.employee_id} — ${employeeDisplayName(e)}`.trim(),
                                                keywords: `${e.employee_id} ${employeeDisplayName(e)}`,
                                            }))}
                                        />
                                        {errors.employee_id && <p className="text-xs text-rose-600">{errors.employee_id}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">New designation</Label>
                                            <ComboSelect<number>
                                                value={toDesignationId}
                                                onChange={(v) => setToDesignationId(v ?? null)}
                                                placeholder="Select designation…"
                                                disabled={!selectedEmployee}
                                                items={designations.map((d) => ({
                                                    value: d.id,
                                                    label: d.name,
                                                    keywords: d.name,
                                                }))}
                                            />
                                            {errors.to_designation_id && <p className="text-xs text-rose-600">{errors.to_designation_id}</p>}
                                        </div>

                                        <div className="space-y-1.5 md:col-span-2">
                                            <EmployeeSalaryAssignment
                                                payscales={payscales}
                                                grades={payrollGrades}
                                                steps={payrollSteps}
                                                activePayscaleId={activePayscaleId ? String(activePayscaleId) : null}
                                                payscaleId={toPayscaleId}
                                                salaryGradeId={toSalaryGradeId}
                                                salaryStepId={toSalaryStepId}
                                                basicSalary={toBasicSalary}
                                                onPayscaleIdChange={setToPayscaleId}
                                                onSalaryGradeIdChange={setToSalaryGradeId}
                                                onSalaryStepIdChange={setToSalaryStepId}
                                                onBasicSalaryChange={setToBasicSalary}
                                                errors={{
                                                    payscale_id: errors.to_payscale_id,
                                                    salary_grade_id: errors.to_salary_grade_id,
                                                    salary_step_id: errors.to_salary_step_id,
                                                    basic_salary: errors.to_basic_salary,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Effective date</Label>
                                            <Popover open={effectiveDateOpen} onOpenChange={setEffectiveDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={cn('h-9 w-full justify-start text-left text-xs', !effectiveDate && 'text-muted-foreground')}
                                                    >
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {effectiveDate ? format(effectiveDate, 'dd MMM yyyy') : 'Select date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <UiCalendar
                                                        mode="single"
                                                        selected={effectiveDate}
                                                        onSelect={(d) => {
                                                            setEffectiveDate(d ?? undefined);
                                                            setEffectiveDateOpen(false);
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.effective_date && <p className="text-xs text-rose-600">{errors.effective_date}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Order no. (optional)</Label>
                                            <Input className="h-9 text-xs" value={demotionOrderNo} onChange={(e) => setDemotionOrderNo(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reason (optional)</Label>
                                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                            <Link href={route('demotions.index')}>Cancel</Link>
                                        </Button>
                                        <Button type="submit" disabled={submitting || !selectedEmployee} className="h-9 bg-orange-600 text-xs hover:bg-orange-700">
                                            {submitting ? 'Submitting…' : 'Submit'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Employee snapshot</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Current values (read-only)</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {!selectedEmployee ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
                                        <User2 className="h-4 w-4" />
                                        Select an employee to see current career values.
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className="text-zinc-500">Employee</p>
                                            <p className="font-medium text-zinc-900">
                                                {employeeDisplayName(selectedEmployee)}
                                            </p>
                                            <p className="text-[10px] text-zinc-500">{selectedEmployee.employee_id}</p>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Current → New</p>
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-zinc-600">Designation</span>
                                                    <span className="font-medium text-zinc-900">
                                                        {designations.find((d) => d.id === selectedEmployee.designation_id)?.name ?? '—'}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300" />
                                                    <span className="font-medium text-zinc-900">
                                                        {designations.find((d) => d.id === toDesignationId)?.name ?? '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-zinc-600">Grade</span>
                                                    <span className="font-medium text-zinc-900">
                                                        {salaryGrades.find((g) => g.id === selectedEmployee.salary_grade_id)?.name ?? '—'}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300" />
                                                    <span className="font-medium text-zinc-900">
                                                        {salaryGrades.find((g) => String(g.id) === String(toSalaryGradeId))?.name ?? '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-zinc-600">Basic</span>
                                                    <span className="font-medium text-zinc-900">{String(selectedEmployee.basic_salary ?? '—')}</span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300" />
                                                    <span className="font-medium text-zinc-900">{toBasicSalary || '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}

