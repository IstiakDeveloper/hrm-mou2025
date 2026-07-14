import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { ArrowLeft, Gift } from 'lucide-react';
import { formatTakaWhole } from '@/lib/taka-format';
import { staffFundEmployeePath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

type Props = {
    employee: {
        id: number;
        pin: string | null;
        name_en: string | null;
        label: string;
        branch: string | null;
        department: string | null;
        joining_date: string | null;
        confirmation_date: string | null;
        employment_status: string | null;
    };
    inGratuityScope: boolean;
    filters: { as_of: string };
    calculation: {
        completed_years: number;
        basic_salary: number;
        basic_multiplier: number;
        gratuity_amount: number;
        service_start: string | null;
        service_end: string;
        eligible: boolean;
        label: string;
    };
    payments: {
        id: number;
        service_end_date: string;
        completed_years: number;
        basic_multiplier: number;
        gratuity_amount: number;
        status: string;
        payment_date: string | null;
        payment_reference: string | null;
        notes: string | null;
    }[];
    has_paid: boolean;
    tiers: { min_years: number; basic_multiplier: number }[];
};

const fmt = formatTakaWhole;

function statusClass(status: string): string {
    const s = String(status).toLowerCase();
    if (s === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (s === 'approved') return 'border-blue-200 bg-blue-50 text-blue-900';
    if (s === 'calculated') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-zinc-200 bg-zinc-50 text-zinc-800';
}

export default function EmployeeGratuityLedger({
    employee,
    inGratuityScope,
    filters,
    calculation,
    payments,
    has_paid,
    tiers,
}: Props) {
    const form = useForm({ as_of: filters.as_of });

    const recalculate = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('employee.staff-fund.gratuity'), { as_of: form.data.as_of }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="My Gratuity" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={staffFundEmployeePath('/sections/staff-fund')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Dashboard
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900">My Gratuity</h1>
                            <p className="text-xs text-zinc-500">
                                {employee.pin && <span className="mr-2 font-mono">{employee.pin}</span>}
                                {employee.name_en || employee.label}
                            </p>
                        </div>
                    </div>
                    <Gift className="hidden h-8 w-8 text-indigo-400 sm:block" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 px-4 py-3">
                            <CardTitle className="text-sm font-bold">Employment details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 px-4 py-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Status</span>
                                <span className="font-medium capitalize">{employee.employment_status?.replace('_', ' ') || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Joining date</span>
                                <span>{employee.joining_date || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Confirmation date</span>
                                <span>{employee.confirmation_date || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Branch / Department</span>
                                <span className="text-right">{employee.branch || '—'} · {employee.department || '—'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 shadow-sm">
                        <CardHeader className="border-b border-indigo-50 bg-indigo-50/30 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-indigo-900">Entitlement estimate</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-4">
                            {inGratuityScope ? (
                                <form onSubmit={recalculate} className="mb-4 flex flex-wrap items-end gap-2">
                                    <PayrollField label="As of date" className="min-w-[140px]">
                                        <Input
                                            type="date"
                                            value={form.data.as_of}
                                            onChange={(e) => form.setData('as_of', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </PayrollField>
                                    <Button type="submit" size="sm" className="h-8 bg-indigo-600 text-xs">
                                        Recalculate
                                    </Button>
                                </form>
                            ) : null}

                            {inGratuityScope ? (
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-zinc-500">Service years</dt>
                                        <dd className="font-semibold">{calculation.completed_years}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-zinc-500">Basic salary</dt>
                                        <dd>{fmt(calculation.basic_salary)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-zinc-500">Multiplier</dt>
                                        <dd>×{calculation.basic_multiplier}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4 border-t border-indigo-100 pt-2">
                                        <dt className="font-medium text-indigo-900">Estimated gratuity</dt>
                                        <dd className="text-lg font-bold tabular-nums text-indigo-900">{fmt(calculation.gratuity_amount)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-zinc-500">Tier</dt>
                                        <dd className="text-right text-xs text-zinc-600">{calculation.label}</dd>
                                    </div>
                                    {has_paid && (
                                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                            Paid for this service end
                                        </Badge>
                                    )}
                                </dl>
                            ) : (
                                <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
                                    {calculation.label}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {inGratuityScope && tiers.length > 0 && (
                    <Card className="mt-4 border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 px-4 py-3">
                            <CardTitle className="text-sm font-bold">Gratuity tiers (reference)</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                                {tiers.map((t) => (
                                    <span key={t.min_years} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
                                        {t.min_years}+ years → ×{t.basic_multiplier} basic
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="mt-4 overflow-hidden border-zinc-200 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
                        <CardTitle className="text-sm font-bold">Payment ledger</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {payments.length === 0 ? (
                            <div className="px-4 py-10 text-center text-xs text-zinc-500">No gratuity payment records yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/50">
                                            <TableHead>Service end</TableHead>
                                            <TableHead>Years</TableHead>
                                            <TableHead>Multiplier</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Paid on</TableHead>
                                            <TableHead>Reference</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.service_end_date}</TableCell>
                                                <TableCell>{p.completed_years}</TableCell>
                                                <TableCell>×{p.basic_multiplier}</TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">{fmt(p.gratuity_amount)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('text-[10px] capitalize', statusClass(p.status))}>
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{p.payment_date || '—'}</TableCell>
                                                <TableCell className="max-w-[120px] truncate">{p.payment_reference || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
