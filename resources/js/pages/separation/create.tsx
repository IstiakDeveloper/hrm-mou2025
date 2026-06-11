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
import { ArrowLeft, Calendar, User2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    joining_date?: string | null;
    department?: { name: string };
    designation?: { name: string };
};

type Props = { employees: Employee[] };

export default function CreateSeparation({ employees }: Props) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [separationDate, setSeparationDate] = useState<Date | undefined>(new Date());
    const [separationDateOpen, setSeparationDateOpen] = useState(false);
    const [finalPaymentDate, setFinalPaymentDate] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const selectedEmployee = useMemo(() => employees.find((e) => e.id === employeeId) ?? null, [employees, employeeId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!employeeId) e.employee_id = 'Employee is required';
        if (!separationDate) e.separation_date = 'Separation date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        router.post(
            route('separations.store'),
            {
                employee_id: employeeId,
                separation_date: separationDate ? format(separationDate, 'yyyy-MM-dd') : '',
                final_payment_date: finalPaymentDate || null,
                reason,
            },
            { onError: (errs) => setErrors(errs), onFinish: () => setSubmitting(false) },
        );
    };

    return (
        <Layout>
            <Head title="Create Separation" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('separations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Separations
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Create separation request</h1>
                    <p className="mt-1 text-xs text-zinc-600">Obbahoti — employee is marked inactive immediately when separation date is today or earlier.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Separation details</CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Select employee and separation information.</CardDescription>
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
                                            <Label className="text-xs">Separation date</Label>
                                            <Popover open={separationDateOpen} onOpenChange={setSeparationDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button type="button" variant="outline" className={cn('h-9 w-full justify-start text-left text-xs', !separationDate && 'text-muted-foreground')}>
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {separationDate ? format(separationDate, 'dd MMM yyyy') : 'Select date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <UiCalendar mode="single" selected={separationDate} onSelect={(d) => { setSeparationDate(d ?? undefined); setSeparationDateOpen(false); }} />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.separation_date && <p className="text-xs text-rose-600">{errors.separation_date}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Final payment date (optional)</Label>
                                            <Input type="date" className="h-9 text-xs" value={finalPaymentDate} onChange={(e) => setFinalPaymentDate(e.target.value)} />
                                            {errors.final_payment_date && <p className="text-xs text-rose-600">{errors.final_payment_date}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reason / notes</Label>
                                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" placeholder="Reason for separation (obbahoti)..." />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button asChild type="button" variant="outline" className="h-9 text-xs"><Link href={route('separations.index')}>Cancel</Link></Button>
                                        <Button type="submit" disabled={submitting || !selectedEmployee} className="h-9 bg-rose-600 text-xs hover:bg-rose-700">
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
                                        Select an employee to see details.
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className="text-zinc-500">Employee</p>
                                            <p className="font-medium text-zinc-900">{employeeDisplayName(selectedEmployee)}</p>
                                            <p className="text-[10px] text-zinc-500">{selectedEmployee.employee_id}</p>
                                        </div>
                                        <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                                            <div className="flex items-center gap-2 text-rose-700"><UserX className="h-4 w-4" />Will become inactive on completion</div>
                                            <p className="mt-2 text-zinc-700">Dept: {selectedEmployee.department?.name ?? '—'}</p>
                                            <p className="mt-1 text-zinc-700">Designation: {selectedEmployee.designation?.name ?? '—'}</p>
                                            <p className="mt-1 text-zinc-700">Joining: {selectedEmployee.joining_date ?? '—'}</p>
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
