import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { type ArrearRow } from '@/components/payroll/ArrearAdjustPanel';
import { PayrollPage, PayrollPageHeader } from '@/components/payroll/PayrollPageShell';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { ArrowLeft, Lock, Unlock, CheckCircle2, User, Building2, Coins } from 'lucide-react';

type Props = {
    run: {
        id: number;
        year: number;
        month: number;
        period_label: string;
        branch: string;
        status: string;
        open: boolean;
    };
    rows: ArrearRow[];
    canEdit: boolean;
};

export default function SalaryArrearShow({ run, rows }: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const arrearRows = rows.filter((row) => row.amount > 0);
    const totalArrear = arrearRows.reduce((sum, r) => sum + (r.amount || 0), 0);

    return (
        <Layout>
            <Head title={`Arrear Breakdown · ${run.period_label} · ${run.branch}`} />
            <PayrollPage className="space-y-4">
                <PayrollPageHeader
                    title={`${run.period_label} · ${run.branch}`}
                    description="Detailed view of arrears allocated for this branch's salary run."
                    icon={Coins}
                >
                    <Button asChild variant="outline" size="sm" className="cursor-pointer shadow-2xs font-medium text-xs">
                        <Link href={route('salary-arrear.index', { year: run.year, month: run.month })}>
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Arrear Overview
                        </Link>
                    </Button>
                </PayrollPageHeader>

                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{run.branch}</h3>
                                {run.open ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                        <Unlock className="h-3 w-3" />
                                        Unposted · Arrear Open
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                        <Lock className="h-3 w-3" />
                                        Posted · Arrear Locked
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-slate-400">
                                Period: <strong className="text-slate-600 font-medium">{run.period_label}</strong> · Payroll Run #{run.id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Arrear Recipients
                            </span>
                            <span className="text-base font-bold text-slate-800">
                                {arrearRows.length} <span className="text-xs font-normal text-slate-400">staff</span>
                            </span>
                        </div>
                        <div className="text-right border-l border-slate-100 pl-6">
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                                Total Arrear
                            </span>
                            <span className="text-base font-bold text-emerald-800 font-mono">
                                {formatTakaWithSymbol(totalArrear)}
                            </span>
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Employee Arrear Records
                        </h4>
                        <span className="text-[11px] text-slate-400">
                            {arrearRows.length} record{arrearRows.length === 1 ? '' : 's'} found
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5">Staff Details</th>
                                    <th className="px-4 py-2.5 text-right">Arrear Amount</th>
                                    <th className="px-4 py-2.5">Reference / Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {arrearRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-400">
                                            No arrear was recorded for this branch in {run.period_label}.
                                        </td>
                                    </tr>
                                ) : (
                                    arrearRows.map((row) => (
                                        <tr key={row.payslip_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500">
                                                        <User className="h-3.5 w-3.5" />
                                                    </span>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 text-xs block">
                                                            {row.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            PIN: {row.pin || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-mono font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded-md text-emerald-950 border border-emerald-100">
                                                    {formatTakaWithSymbol(row.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-slate-500">
                                                {row.note || (row.orders && row.orders.length > 0 ? row.orders.join(', ') : '—')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PayrollPage>
        </Layout>
    );
}
