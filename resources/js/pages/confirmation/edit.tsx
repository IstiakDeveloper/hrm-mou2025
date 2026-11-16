import React, { FormEvent, useState } from 'react';
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
import { parseFormDateValue } from '@/lib/display-date';

type Designation = { id: number; name: string };

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Confirmation = {
    id: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    confirmation_date: string;
    confirmation_order_no: string | null;
    reason: string | null;
    to_designation_id: number;
    to_salary_grade_id: number | null;
    to_salary_step_id: number | null;
    to_basic_salary: string | number | null;
    employee: Employee;
};

type Props = {
    confirmation: Confirmation;
    toPayscaleId: number | null;
    designations: Designation[];
    permanentEmployeeType?: { id: number; name: string } | null;
    payscales: PayrollPayscaleOption[];
    payrollGrades: PayrollGradeOption[];
    payrollSteps: PayrollStepOption[];
    activePayscaleId?: number | null;
    canEditCompleted?: boolean;
};

function statusBadge(status: Confirmation['status']) {
    switch (status) {
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved':
            return <Badge className="border-0 bg-sky-600 text-white">Scheduled</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-emerald-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function EditConfirmation({
    confirmation,
    toPayscaleId: initialPayscaleId,
    designations,
    payscales,
    payrollGrades,
    payrollSteps,
    activePayscaleId = null,
    canEditCompleted = false,
}: Props) {
    const [toDesignationId, setToDesignationId] = useState<number | null>(confirmation.to_designation_id);
    const [toPayscaleId, setToPayscaleId] = useState<string>(
        initialPayscaleId ? String(initialPayscaleId) : activePayscaleId ? String(activePayscaleId) : '',
    );
    const [toSalaryGradeId, setToSalaryGradeId] = useState<string>(
        confirmation.to_salary_grade_id ? String(confirmation.to_salary_grade_id) : '',
    );
    const [toSalaryStepId, setToSalaryStepId] = useState<string>(
        confirmation.to_salary_step_id ? String(confirmation.to_salary_step_id) : '',
    );
    const [toBasicSalary, setToBasicSalary] = useState<string>(
        confirmation.to_basic_salary !== null && confirmation.to_basic_salary !== undefined
            ? String(confirmation.to_basic_salary)
            : '',
    );
    const [confirmationDate, setConfirmationDate] = useState<Date | undefined>(
        parseFormDateValue(confirmation.confirmation_date) ?? undefined,
    );
    const [confirmationDateOpen, setConfirmationDateOpen] = useState(false);
    const [confirmationOrderNo, setConfirmationOrderNo] = useState(confirmation.confirmation_order_no ?? '');
    const [reason, setReason] = useState(confirmation.reason ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const employeeLabel = `${confirmation.employee.employee_id} — ${employeeDisplayName(confirmation.employee)}`.trim();

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        setSubmitting(true);

        router.put(
            route('confirmations.update', confirmation.id),
            {
                to_designation_id: toDesignationId,
                to_payscale_id: toPayscaleId || null,
                to_salary_grade_id: toSalaryGradeId || null,
                to_salary_step_id: toSalaryStepId || null,
                to_basic_salary: toBasicSalary ? Number(toBasicSalary) : null,
                confirmation_date: confirmationDate ? format(confirmationDate, 'yyyy-MM-dd') : '',
                confirmation_order_no: confirmationOrderNo,
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
            <Head title={`Edit Confirmation #${confirmation.id}`} />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('confirmations.show', confirmation.id)} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to confirmation
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Edit confirmation</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            {employeeLabel}
                            {canEditCompleted && confirmation.status === 'completed' && (
                                <span className="ml-2 text-amber-700">Employee record will be updated on save.</span>
                            )}
                        </p>
                    </div>
                    {statusBadge(confirmation.status)}
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Confirmation details</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Update designation, salary assignment, and confirmation date.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Employee</Label>
                                <Input className="h-9 bg-zinc-50 text-xs" value={employeeLabel} readOnly disabled />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Confirmation designation</Label>
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

                            <div className="space-y-1.5">
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

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Confirmation date</Label>
                                    <Popover open={confirmationDateOpen} onOpenChange={setConfirmationDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn('h-9 w-full justify-start text-left text-xs', !confirmationDate && 'text-muted-foreground')}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {confirmationDate ? format(confirmationDate, 'dd MMM yyyy') : 'Select date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <UiCalendar
                                                mode="single"
                                                selected={confirmationDate}
                                                onSelect={(d) => {
                                                    setConfirmationDate(d ?? undefined);
                                                    setConfirmationDateOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.confirmation_date && <p className="text-xs text-rose-600">{errors.confirmation_date}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Order no.</Label>
                                    <Input className="h-9 text-xs" value={confirmationOrderNo} onChange={(e) => setConfirmationOrderNo(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Reason / notes (optional)</Label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                    <Link href={route('confirmations.show', confirmation.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={submitting} className="h-9 bg-violet-600 text-xs hover:bg-violet-700">
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
