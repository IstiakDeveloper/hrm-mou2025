import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Banknote, Printer, Wallet } from 'lucide-react';
import { payrollEmployeePath } from '@/lib/payroll-employee-nav';
import { formatTakaWhole } from '@/lib/taka-format';

type LineRow = {
    id: number;
    head_label: string;
    amount: number;
    is_loan?: boolean;
};

type Props = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
    };
    run: {
        id: number;
        year: number;
        month: number;
        period_label: string;
        salary_type: string;
        bonus_label?: string | null;
        branch: string | null;
        status: string;
        posted_at: string | null;
    };
    payslip: {
        id: number;
        grade: string | null;
        step: number | null;
        designation: string | null;
        basic: number;
        gross: number;
        deduction: number;
        net: number;
        is_withheld: boolean;
        payable_days: number | null;
        days_in_month: number | null;
        payroll_remark: string | null;
        earnings: LineRow[];
        deductions: LineRow[];
        bonus_label?: string | null;
        bonus_type?: string | null;
    };
};

const fmt = formatTakaWhole;

export default function EmployeePayslipShow({ employee, run, payslip }: Props) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Layout>
            <Head title={`Payslip — ${run.period_label}`} />
            <PageSurface className="print:p-0 px-3 sm:px-4">
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 5mm;
                    }

                    @media print {
                        html, body {
                            background: #ffffff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                        }

                        body * {
                            visibility: hidden !important;
                        }

                        [data-print-payslip],
                        [data-print-payslip] * {
                            visibility: visible !important;
                        }

                        [data-payslip-print-root] {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        [data-screen-payslip] {
                            display: none !important;
                        }

                        [data-print-payslip] {
                            display: block !important;
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-sizing: border-box;
                        }

                        [data-print-payslip] > div {
                            width: 100% !important;
                            max-width: 100% !important;
                            box-sizing: border-box;
                        }

                        .print-table {
                            width: 100%;
                            max-width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                        }

                        .print-table th,
                        .print-table td {
                            border: 1px solid #d4d4d8;
                            padding: 4px 5px;
                            font-size: 10px;
                            vertical-align: top;
                            word-wrap: break-word;
                            overflow-wrap: anywhere;
                        }

                        .print-table th {
                            background: #f4f4f5;
                            font-weight: 700;
                            text-align: left;
                        }
                    }
                `}</style>
                <div data-payslip-print-root className="print:bg-white">
                <div data-screen-payslip className="mb-4 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={payrollEmployeePath('/employee/payroll/payslips')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Payslips
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900">{run.period_label}</h1>
                            <p className="text-xs text-zinc-500">
                                {employee.pin && <span className="mr-2 font-mono">{employee.pin}</span>}
                                {employee.name_en || '—'} · {run.branch || '—'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePrint}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                        </Button>
                        {run.salary_type === 'bonus' ? (
                            <Banknote className="h-5 w-5 text-violet-500" />
                        ) : (
                            <Wallet className="h-5 w-5 text-violet-500" />
                        )}
                        {payslip.is_withheld && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                                Withheld
                            </Badge>
                        )}
                    </div>
                </div>

                {payslip.payroll_remark && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {payslip.payroll_remark}
                        {payslip.payable_days != null && payslip.days_in_month != null && (
                            <span className="mt-1 block text-xs text-amber-800">
                                Payable days: {payslip.payable_days} / {payslip.days_in_month}
                            </span>
                        )}
                    </div>
                )}

                <div data-screen-payslip className="grid gap-4 lg:grid-cols-3">
                    <Card className="border-zinc-200 shadow-sm lg:col-span-1">
                        <CardHeader className="border-b border-zinc-100 px-4 py-3">
                            <CardTitle className="text-sm font-bold">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 px-4 py-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Type</span>
                                <span className="font-medium capitalize">{run.salary_type}</span>
                            </div>
                            {payslip.designation && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Designation</span>
                                    <span>{payslip.designation}</span>
                                </div>
                            )}
                            {(payslip.grade || payslip.step) && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Grade / Step</span>
                                    <span>{payslip.grade || '—'} / {payslip.step ?? '—'}</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Posted on</span>
                                <span>{run.posted_at || '—'}</span>
                            </div>
                            <div className="border-t border-zinc-100 pt-2">
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Basic</span>
                                    <span className="font-medium tabular-nums">{fmt(payslip.basic)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Gross</span>
                                    <span className="font-medium tabular-nums">{fmt(payslip.gross)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Deductions</span>
                                    <span className="font-medium tabular-nums text-amber-700">{fmt(payslip.deduction)}</span>
                                </div>
                                <div className="mt-2 flex justify-between gap-4 border-t border-violet-100 pt-2">
                                    <span className="font-semibold text-violet-900">Net payable</span>
                                    <span className="text-lg font-bold tabular-nums text-violet-900">{fmt(payslip.net)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 lg:col-span-2">
                        <Card className="overflow-hidden border-zinc-200 shadow-sm">
                            <CardHeader className="border-b border-emerald-50 bg-emerald-50/40 px-4 py-3">
                                <CardTitle className="text-sm font-bold text-emerald-900">Earnings</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {payslip.earnings.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-zinc-500">No earnings.</div>
                                ) : (
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Head</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payslip.earnings.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>{line.head_label}</TableCell>
                                                    <TableCell className="text-right tabular-nums font-medium text-emerald-700">
                                                        {fmt(line.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-zinc-200 shadow-sm">
                            <CardHeader className="border-b border-amber-50 bg-amber-50/40 px-4 py-3">
                                <CardTitle className="text-sm font-bold text-amber-900">Deductions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {payslip.deductions.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-zinc-500">No deductions.</div>
                                ) : (
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Head</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payslip.deductions.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>
                                                        {line.head_label}
                                                        {line.is_loan && (
                                                            <Badge variant="outline" className="ml-2 border-violet-200 bg-violet-50 text-[10px] text-violet-800">
                                                                Loan
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums font-medium text-amber-700">
                                                        {fmt(line.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div data-print-payslip className="hidden">
                    <div className="box-border w-full border border-zinc-300 bg-white">
                        <div className="border-b border-zinc-300 px-2 py-2 text-center">
                            <h1 className="text-xl font-bold uppercase tracking-wide text-zinc-900">Employee Payslip</h1>
                            <p className="mt-1 text-sm font-medium text-zinc-700">{run.period_label}</p>
                            <p className="mt-1 text-xs text-zinc-600">
                                {run.salary_type === 'bonus' ? 'Bonus Payroll' : 'Salary Payroll'}
                                {run.branch ? ` · ${run.branch}` : ''}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-zinc-300 px-2 py-2 text-[10px]">
                            <div><span className="font-semibold text-zinc-700">Employee:</span> {employee.name_en || '—'}</div>
                            <div><span className="font-semibold text-zinc-700">PIN:</span> {employee.pin || '—'}</div>
                            <div><span className="font-semibold text-zinc-700">Designation:</span> {payslip.designation || '—'}</div>
                            <div><span className="font-semibold text-zinc-700">Grade / Step:</span> {payslip.grade || '—'} / {payslip.step ?? '—'}</div>
                            <div><span className="font-semibold text-zinc-700">Posted on:</span> {run.posted_at || '—'}</div>
                            <div><span className="font-semibold text-zinc-700">Status:</span> {payslip.is_withheld ? 'Withheld' : 'Posted'}</div>
                        </div>

                        {payslip.payroll_remark && (
                            <div className="border-b border-zinc-300 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-950">
                                <span className="font-semibold">Remark:</span> {payslip.payroll_remark}
                                {payslip.payable_days != null && payslip.days_in_month != null && (
                                    <span> | Payable days: {payslip.payable_days} / {payslip.days_in_month}</span>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 px-2 py-2">
                            <div>
                                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-700">Earnings</h2>
                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>Head</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payslip.earnings.length > 0 ? (
                                            payslip.earnings.map((line) => (
                                                <tr key={`print-earning-${line.id}`}>
                                                    <td>{line.head_label}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmt(line.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'center' }}>No earnings</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td style={{ fontWeight: 700 }}>Gross Salary</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(payslip.gross)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-700">Deductions</h2>
                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>Head</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payslip.deductions.length > 0 ? (
                                            payslip.deductions.map((line) => (
                                                <tr key={`print-deduction-${line.id}`}>
                                                    <td>{line.head_label}{line.is_loan ? ' (Loan)' : ''}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmt(line.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'center' }}>No deductions</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td style={{ fontWeight: 700 }}>Total Deduction</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(payslip.deduction)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border-t border-zinc-300 px-2 py-2">
                            <table className="w-full text-xs">
                                <tbody>
                                    <tr>
                                        <td className="py-1 font-medium text-zinc-700">Basic Salary</td>
                                        <td className="py-1 text-right font-medium">{fmt(payslip.basic)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-medium text-zinc-700">Gross Salary</td>
                                        <td className="py-1 text-right font-medium">{fmt(payslip.gross)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-medium text-zinc-700">Total Deduction</td>
                                        <td className="py-1 text-right font-medium">{fmt(payslip.deduction)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-t border-zinc-300 py-2 text-base font-bold uppercase tracking-wide text-zinc-900">Net Payable</td>
                                        <td className="border-t border-zinc-300 py-2 text-right text-base font-bold text-zinc-900">{fmt(payslip.net)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-2 py-4 text-[10px]">
                            <div className="pt-8 text-center">
                                <div className="border-t border-zinc-400 pt-2">Employee Signature</div>
                            </div>
                            <div className="pt-8 text-center">
                                <div className="border-t border-zinc-400 pt-2">Authorized Signature</div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
