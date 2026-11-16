import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { ArrearAdjustPanel, type ArrearRow } from '@/components/payroll/ArrearAdjustPanel';
import { PayrollPage, PayrollPageHeader, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Coins, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

type Option = { id: number; name: string };

type Props = {
    period_label: string;
    year: number;
    month: number;
    rows: ArrearRow[];
    posted_branches: string[];
    branches: Option[];
    departments: Option[];
    projects: Option[];
    initial_branch_id: string;
    canEdit: boolean;
};

export default function SalaryArrearPeriod({
    period_label,
    year,
    month,
    rows,
    posted_branches,
    branches,
    departments,
    projects,
    initial_branch_id,
    canEdit,
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    return (
        <Layout>
            <Head title={`Adjust Arrear · ${period_label}`} />
            <PayrollPage className="space-y-4">
                <PayrollPageHeader
                    title={`Adjust Salary Arrear · ${period_label}`}
                    description={`Allocate or update individual arrear amounts for employees before salary posting.`}
                    icon={Coins}
                >
                    <Button asChild variant="outline" size="sm" className="cursor-pointer shadow-2xs font-medium text-xs">
                        <Link href={route('salary-arrear.index', { year, month })}>
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Arrear Overview
                        </Link>
                    </Button>
                </PayrollPageHeader>

                {/* Helpful Guidance Banner */}
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs text-slate-700 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Coins className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-slate-600">
                            Filter staff by department or project. Enter approved arrear or click recommended increments. Leave blank or 0 for no arrear.
                        </p>
                    </div>
                    {branches.length > 0 && (
                        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>{branches.length} Open Branch{branches.length === 1 ? '' : 'es'}</span>
                        </div>
                    )}
                </div>

                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {posted_branches.length > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-2xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                            <strong>Note:</strong> Some branches in this period are already posted and locked: {posted_branches.join(', ')}.
                        </span>
                    </div>
                )}

                {rows.length === 0 ? (
                    <PayrollEmptyState message="No unposted salary for this month. Run Salary Process first." />
                ) : !canEdit ? (
                    <PayrollEmptyState message="You can view this page. Adding arrear needs payroll edit permission." />
                ) : (
                    <ArrearAdjustPanel
                        rows={rows}
                        departments={departments}
                        projects={projects}
                        branches={branches}
                        initialBranchId={initial_branch_id}
                    />
                )}
            </PayrollPage>
        </Layout>
    );
}
