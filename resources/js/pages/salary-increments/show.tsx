import { Head, Link, router, usePage } from '@inertiajs/react';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { toFormDisplayDate } from '@/lib/display-date';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

type Line = {
    id: number;
    employee_code: string;
    name: string;
    branch: string;
    grade: string;
    action: 'grant' | 'stop';
    steps: number;
    from_step: number | null;
    to_step: number | null;
    from_basic: number;
    to_basic: number | null;
    from_gross: number;
    to_gross: number | null;
    increment_amount: number;
    arrear_amount: number;
    arrear_paid?: boolean;
    status: string;
    skip_reason: string | null;
};

type Order = {
    id: number;
    order_no: string;
    increment_date: string;
    effective_date: string;
    arrear_months: number;
    status: 'scheduled' | 'pending' | 'approved' | 'applied' | 'cancelled' | 'rolled_back';
    notes: string | null;
    branch: string | null;
    program: string | null;
    project: string | null;
    employee_type: string | null;
    created_by: string | null;
    rolled_back_by: string | null;
    increment_total: number;
    arrear_total: number;
    grant_count: number;
    stop_count: number;
    lines: Line[];
};

type Props = {
    order: Order;
    canRollback: boolean;
    due: boolean;
};

function isScheduled(status: Order['status']) {
    return status === 'scheduled' || status === 'pending' || status === 'approved';
}

function statusBadge(status: Order['status']) {
    if (isScheduled(status)) {
        return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">Scheduled</Badge>;
    }
    if (status === 'applied') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Applied</Badge>;
    }
    if (status === 'rolled_back') {
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Rolled back</Badge>;
    }
    if (status === 'cancelled') {
        return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Cancelled</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
}

function lineStatus(status: string, orderStatus: Order['status']) {
    if (status === 'applied') return <span className="text-emerald-700">Applied</span>;
    if (status === 'withheld') return <span className="text-amber-700">Withheld</span>;
    if (status === 'skipped') return <span className="text-red-700">Skipped</span>;
    if (status === 'rolled_back') return <span className="text-amber-800">Rolled back</span>;
    if (isScheduled(orderStatus)) return <span className="text-blue-700">Scheduled</span>;
    return <span className="text-slate-500">Scheduled</span>;
}

export default function SalaryIncrementShow({ order, canRollback, due }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    const rollback = () => {
        const confirmText = order.status === 'applied'
            ? `Roll back ${order.order_no}? Every staff member on this order returns to the previous step and basic.`
            : `Roll back ${order.order_no}? Salary has not changed yet, so the schedule will be removed.`;
        if (!window.confirm(confirmText)) return;
        router.post(route('salary-increments.rollback', order.id));
    };

    const scope = [order.branch, order.program, order.project, order.employee_type].filter(Boolean).join(' · ');

    return (
        <Layout>
            <Head title={order.order_no} />
            <PageSurface className="max-w-[90rem]">
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                        <Link href={route('salary-increments.index')} className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-800">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            All orders
                        </Link>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.order_no}</h1>
                            {statusBadge(order.status)}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Grade unchanged. Granted staff move up the published steps on {toFormDisplayDate(order.effective_date)}.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canRollback && (isScheduled(order.status) || order.status === 'applied') && (
                            <Button variant="outline" onClick={rollback}>
                                Roll back order
                            </Button>
                        )}
                    </div>
                </div>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert className="mb-4 border-red-200 bg-red-50 text-red-900">
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                {isScheduled(order.status) && !due && (
                    <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900">
                        <AlertDescription>
                            Scheduled. Staff stay on the current step until {toFormDisplayDate(order.effective_date)}, then salary updates automatically.
                        </AlertDescription>
                    </Alert>
                )}
                {order.status === 'rolled_back' && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950">
                        <AlertDescription>
                            This order was rolled back{order.rolled_back_by ? ` by ${order.rolled_back_by}` : ''}. Salary is back to the step from before this order.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-xs tracking-wide text-slate-500 uppercase">Granted</div>
                            <div className="mt-1 text-2xl font-semibold text-slate-900">{order.grant_count}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-xs tracking-wide text-slate-500 uppercase">Withheld</div>
                            <div className="mt-1 text-2xl font-semibold text-slate-900">{order.stop_count}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-xs tracking-wide text-slate-500 uppercase">Monthly increment</div>
                            <div className="mt-1 text-2xl font-semibold text-emerald-700">{formatTakaWithSymbol(order.increment_total)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-xs tracking-wide text-slate-500 uppercase">Arrear ({order.arrear_months} mo.)</div>
                            <div className="mt-1 text-2xl font-semibold text-slate-900">{formatTakaWithSymbol(order.arrear_total)}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-4 border-slate-200 shadow-sm">
                    <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="text-xs text-slate-500">Order date</div>
                            <div className="font-medium">{toFormDisplayDate(order.increment_date)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Effective date</div>
                            <div className="font-medium">{toFormDisplayDate(order.effective_date)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Prepared by</div>
                            <div className="font-medium">{order.created_by || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">{order.status === 'rolled_back' ? 'Rolled back by' : 'Salary update'}</div>
                            <div className="font-medium">
                                {order.status === 'rolled_back'
                                    ? (order.rolled_back_by || '—')
                                    : order.status === 'applied'
                                        ? 'Updated'
                                        : isScheduled(order.status)
                                            ? `Scheduled for ${toFormDisplayDate(order.effective_date)}`
                                            : '—'}
                            </div>
                        </div>
                        {scope && (
                            <div className="sm:col-span-2 lg:col-span-4">
                                <div className="text-xs text-slate-500">Scope</div>
                                <div className="font-medium">{scope}</div>
                            </div>
                        )}
                        {order.notes && (
                            <div className="sm:col-span-2 lg:col-span-4">
                                <div className="text-xs text-slate-500">Notes</div>
                                <div className="font-medium whitespace-pre-wrap">{order.notes}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Step</TableHead>
                                    <TableHead className="text-right">Basic</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Increment</TableHead>
                                    <TableHead className="text-right">Arrear</TableHead>
                                    <TableHead>Result</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.lines.map((line, index) => (
                                    <TableRow key={line.id} className={line.action === 'stop' ? 'bg-amber-50/40' : undefined}>
                                        <TableCell className="text-sm text-slate-500">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{line.name}</div>
                                            <div className="text-xs text-slate-500">{line.employee_code} · {line.branch}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{line.grade}</TableCell>
                                        <TableCell className="text-sm">
                                            {line.action === 'stop' ? (
                                                <span className="text-amber-800">Withheld at {line.from_step}</span>
                                            ) : (
                                                <span>
                                                    {line.from_step}
                                                    <span className="mx-1 text-slate-400">→</span>
                                                    <span className="font-semibold text-emerald-700">{line.to_step}</span>
                                                    {line.steps > 1 ? <span className="ml-1 text-xs text-slate-500">({line.steps} steps)</span> : null}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {line.action === 'stop' || line.to_basic == null
                                                ? formatTakaWithSymbol(line.from_basic)
                                                : (
                                                    <span>
                                                        {formatTakaWithSymbol(line.from_basic)}
                                                        <span className="mx-1 text-slate-400">→</span>
                                                        {formatTakaWithSymbol(line.to_basic)}
                                                    </span>
                                                )}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {line.action === 'stop' || line.to_gross == null
                                                ? formatTakaWithSymbol(line.from_gross)
                                                : (
                                                    <span>
                                                        {formatTakaWithSymbol(line.from_gross)}
                                                        <span className="mx-1 text-slate-400">→</span>
                                                        {formatTakaWithSymbol(line.to_gross)}
                                                    </span>
                                                )}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium">{formatTakaWithSymbol(line.increment_amount)}</TableCell>
                                        <TableCell className="text-right text-sm">
                                            {formatTakaWithSymbol(line.arrear_amount)}
                                            {line.arrear_paid ? <div className="text-[10px] text-emerald-700">In payroll</div> : null}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {lineStatus(line.status, order.status)}
                                            {line.skip_reason && <div className="max-w-[14rem] text-xs text-red-600">{line.skip_reason}</div>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </PageSurface>
        </Layout>
    );
}
