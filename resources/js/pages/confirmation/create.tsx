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
import { addDays, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type EmployeeType = { id: number; name: string; probation_months: number };
type Designation = { id: number; name: string };
type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    joining_date?: string | null;
    designation_id?: number | null;
    employee_type?: EmployeeType;
    employeeType?: EmployeeType;
    designation?: Designation;
};

type Props = {
    employees: Employee[];
    designations: Designation[];
    permanentEmployeeType?: { id: number; name: string } | null;
    suggestedOrderNo?: string;
};

export default function CreateConfirmation({ employees, designations, permanentEmployeeType, suggestedOrderNo }: Props) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [toDesignationId, setToDesignationId] = useState<number | null>(null);
    const [confirmationDate, setConfirmationDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [confirmationDateOpen, setConfirmationDateOpen] = useState(false);
    const [confirmationOrderNo, setConfirmationOrderNo] = useState(suggestedOrderNo ?? '');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const selectedEmployee = useMemo(() => employees.find((e) => e.id === employeeId) ?? null, [employees, employeeId]);
    const employeeType = selectedEmployee?.employeeType ?? selectedEmployee?.employee_type;

    useEffect(() => {
        if (!selectedEmployee) {
            setToDesignationId(null);
            return;
        }
        if (toDesignationId == null && selectedEmployee.designation_id) {
            setToDesignationId(selectedEmployee.designation_id);
        }
    }, [selectedEmployee, toDesignationId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!employeeId) e.employee_id = 'Employee is required';
        if (!toDesignationId) e.to_designation_id = 'Confirmation designation is required';
        if (!confirmationDate) e.confirmation_date = 'Confirmation date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        router.post(
            route('confirmations.store'),
            {
                employee_id: employeeId,
                to_designation_id: toDesignationId,
                confirmation_date: confirmationDate ? format(confirmationDate, 'yyyy-MM-dd') : '',
                confirmation_order_no: confirmationOrderNo,
                reason,
            },
            { onError: (errs) => setErrors(errs), onFinish: () => setSubmitting(false) },
        );
    };

    const currentDesignationName = selectedEmployee?.designation?.name
        ?? designations.find((d) => d.id === selectedEmployee?.designation_id)?.name
        ?? '—';
    const newDesignationName = designations.find((d) => d.id === toDesignationId)?.name ?? '—';

    return (
        <Layout>
            <Head title="Create Confirmation" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('confirmations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Confirmations
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Create confirmation request</h1>
                    <p className="mt-1 text-xs text-zinc-600">Probation employees become permanent immediately when confirmation date is today or earlier.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Confirmation details</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Select employee, confirmation designation, and date.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={onSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Employee (on probation)</Label>
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
                                        {!employees.length && <p className="text-xs text-amber-600">No probation employees available for confirmation.</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Confirmation designation</Label>
                                        <ComboSelect<number>
                                            value={toDesignationId}
                                            onChange={(v) => setToDesignationId(v ?? null)}
                                            placeholder="Select designation after confirmation…"
                                            disabled={!selectedEmployee}
                                            items={designations.map((d) => ({
                                                value: d.id,
                                                label: d.name,
                                                keywords: d.name,
                                            }))}
                                        />
                                        {errors.to_designation_id && <p className="text-xs text-rose-600">{errors.to_designation_id}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Confirmation date</Label>
                                            <Popover open={confirmationDateOpen} onOpenChange={setConfirmationDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button type="button" variant="outline" className={cn('h-9 w-full justify-start text-left text-xs', !confirmationDate && 'text-muted-foreground')}>
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {confirmationDate ? format(confirmationDate, 'dd MMM yyyy') : 'Select date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <UiCalendar
                                                        mode="single"
                                                        selected={confirmationDate}
                                                        onSelect={(d) => { setConfirmationDate(d ?? undefined); setConfirmationDateOpen(false); }}
                                                        disabled={(date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.confirmation_date && <p className="text-xs text-rose-600">{errors.confirmation_date}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Order no. (optional)</Label>
                                            <Input className="h-9 text-xs" value={confirmationOrderNo} onChange={(e) => setConfirmationOrderNo(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reason / notes (optional)</Label>
                                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button asChild type="button" variant="outline" className="h-9 text-xs"><Link href={route('confirmations.index')}>Cancel</Link></Button>
                                        <Button type="submit" disabled={submitting || !selectedEmployee} className="h-9 bg-violet-600 text-xs hover:bg-violet-700">
                                            {submitting ? 'Submitting…' : 'Submit'}
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
                            </CardHeader>
                            <CardContent className="pt-4">
                                {!selectedEmployee ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
                                        <User2 className="h-4 w-4" />
                                        Select an employee to see probation details.
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className="text-zinc-500">Employee</p>
                                            <p className="font-medium text-zinc-900">{employeeDisplayName(selectedEmployee)}</p>
                                            <p className="text-[10px] text-zinc-500">{selectedEmployee.employee_id}</p>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Probation → Permanent</p>
                                            <p className="mt-2 text-zinc-700">Type: {employeeType?.name ?? '—'} → {permanentEmployeeType?.name ?? 'Permanent'}</p>
                                            <p className="mt-1 text-zinc-700">Period: {employeeType?.probation_months ? `${employeeType.probation_months} months` : '—'}</p>
                                            <p className="mt-1 text-zinc-700">Joining: {selectedEmployee.joining_date ?? '—'}</p>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Current → Confirmed</p>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <span className="text-zinc-600">Designation</span>
                                                <span className="font-medium text-zinc-900">{currentDesignationName}</span>
                                                <ChevronRight className="h-4 w-4 text-zinc-300" />
                                                <span className="font-medium text-zinc-900">{newDesignationName}</span>
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
