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
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Named = { id: number; name: string };

type Redesignation = {
    id: number;
    effective_date: string;
    order_no: string | null;
    reason: string | null;
    from_department_id: number | null;
    from_designation_id: number | null;
    to_department_id: number;
    to_designation_id: number;
    employee: Employee;
};

type Props = {
    redesignation: Redesignation;
    departments: Named[];
    designations: Named[];
};

function dateInputValue(value: string): string {
    if (!value) return format(new Date(), 'yyyy-MM-dd');
    const dateOnly = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
    return format(parseISO(value), 'yyyy-MM-dd');
}

export default function EditRedesignation({ redesignation, departments, designations }: Props) {
    const [toDepartmentId, setToDepartmentId] = useState<number | null>(redesignation.to_department_id);
    const [toDesignationId, setToDesignationId] = useState<number | null>(redesignation.to_designation_id);
    const [effectiveDate, setEffectiveDate] = useState(dateInputValue(redesignation.effective_date));
    const [orderNo, setOrderNo] = useState(redesignation.order_no ?? '');
    const [reason, setReason] = useState(redesignation.reason ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        if (!toDepartmentId) nextErrors.to_department_id = 'Department is required';
        if (!toDesignationId) nextErrors.to_designation_id = 'Designation is required';
        if (!effectiveDate) nextErrors.effective_date = 'Effective date is required';
        if (
            toDepartmentId === redesignation.from_department_id &&
            toDesignationId === redesignation.from_designation_id
        ) {
            nextErrors.to_designation_id = 'Change the department or the designation.';
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        router.put(
            route('redesignations.update', redesignation.id),
            {
                to_department_id: toDepartmentId,
                to_designation_id: toDesignationId,
                effective_date: effectiveDate,
                order_no: orderNo,
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
            <Head title="Edit Re Designation" />
            <PageSurface className="max-w-3xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('redesignations.show', redesignation.id)} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Re designation details
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Edit re designation</h1>
                    <p className="mt-1 text-xs text-zinc-600">
                        {employeeDisplayName(redesignation.employee)} · {redesignation.employee.employee_id}. Saving updates the employee&apos;s current department and designation.
                    </p>
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Department and designation</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Salary is not part of this change.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Department</Label>
                                    <ComboSelect<number>
                                        value={toDepartmentId}
                                        onChange={(value) => setToDepartmentId(value ?? null)}
                                        placeholder="Select department…"
                                        items={departments.map((department) => ({
                                            value: department.id,
                                            label: department.name,
                                            keywords: department.name,
                                        }))}
                                    />
                                    {errors.to_department_id && <p className="text-xs text-rose-600">{errors.to_department_id}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Designation</Label>
                                    <ComboSelect<number>
                                        value={toDesignationId}
                                        onChange={(value) => setToDesignationId(value ?? null)}
                                        placeholder="Select designation…"
                                        items={designations.map((designation) => ({
                                            value: designation.id,
                                            label: designation.name,
                                            keywords: designation.name,
                                        }))}
                                    />
                                    {errors.to_designation_id && <p className="text-xs text-rose-600">{errors.to_designation_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Effective date</Label>
                                    <Input type="date" className="h-9 text-xs" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                                    {errors.effective_date && <p className="text-xs text-rose-600">{errors.effective_date}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Order no.</Label>
                                    <Input className="h-9 text-xs" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Reason</Label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                    <Link href={route('redesignations.show', redesignation.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={submitting} className="h-9 bg-orange-600 text-xs hover:bg-orange-700">
                                    {submitting ? 'Saving…' : 'Save'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
