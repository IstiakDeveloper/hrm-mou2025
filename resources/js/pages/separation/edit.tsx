import React, { FormEvent, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & { id: number; employee_id: string };

type Separation = {
    id: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    separation_date: string;
    final_payment_date: string | null;
    reason: string | null;
    employee: Employee;
};

type Props = { separation: Separation };

function statusBadge(status: Separation['status']) {
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

export default function EditSeparation({ separation }: Props) {
    const [separationDate, setSeparationDate] = useState<Date | undefined>(new Date(separation.separation_date));
    const [separationDateOpen, setSeparationDateOpen] = useState(false);
    const [finalPaymentDate, setFinalPaymentDate] = useState<Date | undefined>(
        separation.final_payment_date ? new Date(separation.final_payment_date) : undefined,
    );
    const [finalPaymentDateOpen, setFinalPaymentDateOpen] = useState(false);
    const [reason, setReason] = useState(separation.reason ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        setSubmitting(true);

        router.put(
            route('separations.update', separation.id),
            {
                separation_date: separationDate ? format(separationDate, 'yyyy-MM-dd') : '',
                final_payment_date: finalPaymentDate ? format(finalPaymentDate, 'yyyy-MM-dd') : null,
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
            <Head title={`Edit Separation #${separation.id}`} />
            <PageSurface className="max-w-3xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('separations.show', separation.id)} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to separation
                    </Link>
                </div>

                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Edit separation</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            {separation.employee.employee_id} — {employeeDisplayName(separation.employee)}
                            {separation.status === 'completed' && (
                                <span className="ml-2 text-amber-700">Employee dropout date will be updated on save.</span>
                            )}
                        </p>
                    </div>
                    {statusBadge(separation.status)}
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Separation details</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Effective date is the first day the employee is no longer on staff. Salary is paid through the day before.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Separation date (effective)</Label>
                                    <Popover open={separationDateOpen} onOpenChange={setSeparationDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn('h-9 w-full justify-start text-left text-xs', !separationDate && 'text-muted-foreground')}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {separationDate ? format(separationDate, 'dd MMM yyyy') : 'Select date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <UiCalendar
                                                mode="single"
                                                selected={separationDate}
                                                onSelect={(d) => {
                                                    setSeparationDate(d ?? undefined);
                                                    setSeparationDateOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.separation_date && <p className="text-xs text-rose-600">{errors.separation_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Final payment date (optional)</Label>
                                    <Popover open={finalPaymentDateOpen} onOpenChange={setFinalPaymentDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn('h-9 w-full justify-start text-left text-xs', !finalPaymentDate && 'text-muted-foreground')}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {finalPaymentDate ? format(finalPaymentDate, 'dd MMM yyyy') : 'Select date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <UiCalendar
                                                mode="single"
                                                selected={finalPaymentDate}
                                                onSelect={(d) => {
                                                    setFinalPaymentDate(d ?? undefined);
                                                    setFinalPaymentDateOpen(false);
                                                }}
                                                disabled={(date) => (separationDate ? date < separationDate : false)}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.final_payment_date && <p className="text-xs text-rose-600">{errors.final_payment_date}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Reason / notes (optional)</Label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="text-xs" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button asChild type="button" variant="outline" className="h-9 text-xs">
                                    <Link href={route('separations.show', separation.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={submitting} className="h-9 bg-rose-600 text-xs hover:bg-rose-700">
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
