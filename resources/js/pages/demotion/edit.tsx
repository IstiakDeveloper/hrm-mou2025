import React, { FormEvent, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { ArrowLeft, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };
type SalaryStep = { id: number; step_number: number };

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Demotion = {
    id: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    effective_date: string;
    demotion_order_no: string | null;
    reason: string | null;
    to_designation_id: number;
    to_salary_grade_id: number | null;
    to_salary_step_id: number | null;
    to_basic_salary: string | number | null;
    employee: Employee;
    toDesignation?: Designation | null;
    toSalaryGrade?: SalaryGrade | null;
    toSalaryStep?: SalaryStep | null;
};

type Props = {
    demotion: Demotion;
    toPayscaleId: number | null;
    designations: Designation[];
    salaryGrades: SalaryGrade[];
    payscales: PayrollPayscaleOption[];
    payrollGrades: PayrollGradeOption[];
    payrollSteps: PayrollStepOption[];
    activePayscaleId?: number | null;
    canEditCompleted?: boolean;
};

function statusBadge(status: Demotion['status']) {
    switch (status) {
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved':
            return <Badge className="border-0 bg-sky-600 text-white">Approved</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-orange-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function EditDemotion({
    demotion,
    toPayscaleId: initialPayscaleId,
    designations,
    payscales,
    payrollGrades,
    payrollSteps,
    activePayscaleId = null,
    canEditCompleted = false,
}: Props) {
    const [toDesignationId, setToDesignationId] = useState<number | null>(demotion.to_designation_id);
    const [toPayscaleId, setToPayscaleId] = useState<string>(
        initialPayscaleId ? String(initialPayscaleId) : activePayscaleId ? String(activePayscaleId) : '',
    );
    const [toSalaryGradeId, setToSalaryGradeId] = useState<string>(
        demotion.to_salary_grade_id ? String(demotion.to_salary_grade_id) : '',
    );
    const [toSalaryStepId, setToSalaryStepId] = useState<string>(
        demotion.to_salary_step_id ? String(demotion.to_salary_step_id) : '',
    );
    const [toBasicSalary, setToBasicSalary] = useState<string>(
        demotion.to_basic_salary !== null && demotion.to_basic_salary !== undefined
            ? String(demotion.to_basic_salary)
            : '',
    );
    const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(new Date(demotion.effective_date));
    const [effectiveDateOpen, setEffectiveDateOpen] = useState(false);
    const [demotionOrderNo, setDemotionOrderNo] = useState(demotion.demotion_order_no ?? '');
    const [reason, setReason] = useState(demotion.reason ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const employeeLabel = useMemo(
        () => `${demotion.employee.employee_id} — ${employeeDisplayName(demotion.employee)}`.trim(),
        [demotion.employee],
    );

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        setSubmitting(true);

        router.put(
            route('demotions.update', demotion.id),
            {
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
            <Head title={`Edit Demotion #${demotion.id}`} />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('demotions.show', demotion.id)} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to demotion
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Edit demotion</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            {employeeLabel}
                            {canEditCompleted && demotion.status === 'completed' && (
                                <span className="ml-2 text-amber-700">Employee record will be updated on save.</span>
                            )}
                        </p>
                    </div>
                    {statusBadge(demotion.status)}
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Demotion details</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Update designation, payscale, grade, step, and dates.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Employee</Label>
                                <Input className="h-9 text-xs bg-zinc-50" value={employeeLabel} readOnly disabled />
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">New designation</Label>
                                    <ComboSelect<number>
                                        value={toDesignationId}
                                        onChange={(v) => setToDesignationId(v ?? null)}
                                        placeholder="Select designation…"
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

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Order no.</Label>
                                    <Input className="h-9 text-xs" value={demotionOrderNo} onChange={(e) => setDemotionOrderNo(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Reason (optional)</Label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                    <Link href={route('demotions.show', demotion.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={submitting} className="h-9 bg-orange-600 text-xs hover:bg-orange-700">
                                    {submitting ? 'Saving…' : 'Save changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
