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
import { ArrowLeft, ChevronRight, User2 } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    department_id: number | null;
    designation_id: number | null;
};

type Named = { id: number; name: string };

type Props = {
    employees: Employee[];
    departments: Named[];
    designations: Named[];
    suggestedOrderNo?: string;
};

export default function CreateRedesignation({ employees, departments, designations, suggestedOrderNo }: Props) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [toDepartmentId, setToDepartmentId] = useState<number | null>(null);
    const [toDesignationId, setToDesignationId] = useState<number | null>(null);
    const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [orderNo, setOrderNo] = useState(suggestedOrderNo ?? '');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const selectedEmployee = useMemo(
        () => employees.find((employee) => employee.id === employeeId) ?? null,
        [employees, employeeId],
    );

    useEffect(() => {
        if (!selectedEmployee) {
            setToDepartmentId(null);
            setToDesignationId(null);
            return;
        }
        setToDepartmentId(selectedEmployee.department_id);
        setToDesignationId(selectedEmployee.designation_id);
    }, [selectedEmployee]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        if (!employeeId) nextErrors.employee_id = 'Employee is required';
        if (!toDepartmentId) nextErrors.to_department_id = 'Department is required';
        if (!toDesignationId) nextErrors.to_designation_id = 'Designation is required';
        if (!effectiveDate) nextErrors.effective_date = 'Effective date is required';
        if (
            selectedEmployee &&
            toDepartmentId === selectedEmployee.department_id &&
            toDesignationId === selectedEmployee.designation_id
        ) {
            nextErrors.to_designation_id = 'Change the department or the designation.';
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        router.post(
            route('redesignations.store'),
            {
                employee_id: employeeId,
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
            <Head title="New Re Designation" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('redesignations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Re Designation
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">New re designation</h1>
                    <p className="mt-1 text-xs text-zinc-600">
                        Saving updates the employee immediately. Salary, grade, and branch stay unchanged.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Re designation details</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Select the employee, then the new department and designation.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={onSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Employee</Label>
                                        <ComboSelect<number>
                                            value={employeeId}
                                            onChange={(value) => setEmployeeId(value ?? null)}
                                            placeholder="Search employee (PIN / name)…"
                                            items={employees.map((employee) => ({
                                                value: employee.id,
                                                label: `${employee.employee_id} — ${employeeDisplayName(employee)}`.trim(),
                                                keywords: `${employee.employee_id} ${employeeDisplayName(employee)}`,
                                            }))}
                                        />
                                        {errors.employee_id && <p className="text-xs text-rose-600">{errors.employee_id}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">New department</Label>
                                            <ComboSelect<number>
                                                value={toDepartmentId}
                                                onChange={(value) => setToDepartmentId(value ?? null)}
                                                placeholder="Select department…"
                                                disabled={!selectedEmployee}
                                                items={departments.map((department) => ({
                                                    value: department.id,
                                                    label: department.name,
                                                    keywords: department.name,
                                                }))}
                                            />
                                            {errors.to_department_id && <p className="text-xs text-rose-600">{errors.to_department_id}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">New designation</Label>
                                            <ComboSelect<number>
                                                value={toDesignationId}
                                                onChange={(value) => setToDesignationId(value ?? null)}
                                                placeholder="Select designation…"
                                                disabled={!selectedEmployee}
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
                                            <Label className="text-xs">Order no. (optional)</Label>
                                            <Input className="h-9 text-xs" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reason (optional)</Label>
                                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                            <Link href={route('redesignations.index')}>Cancel</Link>
                                        </Button>
                                        <Button type="submit" disabled={submitting || !selectedEmployee} className="h-9 bg-orange-600 text-xs hover:bg-orange-700">
                                            {submitting ? 'Saving…' : 'Save'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Employee snapshot</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Current values</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {!selectedEmployee ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
                                        <User2 className="h-4 w-4" />
                                        Select an employee to see the current department and designation.
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className="text-zinc-500">Employee</p>
                                            <p className="font-medium text-zinc-900">{employeeDisplayName(selectedEmployee)}</p>
                                            <p className="text-[10px] text-zinc-500">{selectedEmployee.employee_id}</p>
                                        </div>
                                        <SnapshotRow
                                            label="Department"
                                            from={departments.find((item) => item.id === selectedEmployee.department_id)?.name}
                                            to={departments.find((item) => item.id === toDepartmentId)?.name}
                                        />
                                        <SnapshotRow
                                            label="Designation"
                                            from={designations.find((item) => item.id === selectedEmployee.designation_id)?.name}
                                            to={designations.find((item) => item.id === toDesignationId)?.name}
                                        />
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

function SnapshotRow({ label, from, to }: { label: string; from?: string; to?: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <div className="mt-2 flex items-center gap-2">
                <span className="font-medium text-zinc-900">{from || '—'}</span>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
                <span className="font-medium text-zinc-900">{to || '—'}</span>
            </div>
        </div>
    );
}
