import React, { useCallback, useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    BonusPayslipReviewTable,
    PayslipReviewTable,
    buildAmountsMap,
    previewTotals,
    type PayslipRow,
} from '@/components/payroll/PayslipReviewPanels';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, payrollBtnPrimary, payrollFilterActive } from '@/components/payroll/PayrollPageShell';
import { cn } from '@/lib/utils';
import { payrollPostLabels, payrollPostRoutes, type PayrollPostContext } from '@/lib/payroll-post-routes';
import { ArrowLeft, CheckCircle2, Save, Trash2, Search, Users, Coins, SlidersHorizontal } from 'lucide-react';

type BonusConfigInfo = {
    name: string;
    type_name?: string | null;
    basic_percentage: number;
};

type RunInfo = {
    id: number;
    year: number;
    month: number;
    salary_type: string;
    bonus_label?: string | null;
    branch: string | null;
    status: string;
    employee_count: number;
    total_gross: number;
    total_deduction: number;
    total_net: number;
    processed_at: string | null;
};

type Props = {
    run: RunInfo;
    payslips: PayslipRow[];
    canEdit: boolean;
    pageContext?: PayrollPostContext;
    bonusConfig?: BonusConfigInfo | null;
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalaryPostShow({
    run: initialRun,
    payslips: initialPayslips,
    canEdit,
    pageContext = 'salary',
    bonusConfig,
}: Props) {
    const isBonus = pageContext === 'bonus';
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const routes = payrollPostRoutes(pageContext);
    const copy = payrollPostLabels(pageContext);
    const [run, setRun] = useState(initialRun);
    const [saving, setSaving] = useState(false);
    const [posting, setPosting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [dirty, setDirty] = useState(false);
    const isPosted = run.status === 'posted';
    const [amounts, setAmounts] = useState<Record<number, string>>(() => buildAmountsMap(initialPayslips, isBonus));

    const [employeeQuery, setEmployeeQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'on_hold' | 'has_loan' | 'with_deductions'>('all');

    React.useEffect(() => {
        setRun(initialRun);
        setAmounts(buildAmountsMap(initialPayslips, isBonus));
        setDirty(false);
    }, [initialRun, initialPayslips, isBonus]);

    const onAmountChange = useCallback((lineId: number, value: string) => {
        setAmounts((prev) => ({ ...prev, [lineId]: value }));
        setDirty(true);
    }, []);

    const buildLinesPayload = useCallback(() => {
        const lineIds = isBonus
            ? initialPayslips.map((p) => p.bonus_review?.line_id).filter((id): id is number => id != null)
            : null;

        return Object.entries(amounts)
            .filter(([id]) => !lineIds || lineIds.includes(Number(id)))
            .map(([id, computed_amount]) => ({
                id: Number(id),
                computed_amount: Number(computed_amount),
            }));
    }, [amounts, initialPayslips, isBonus]);

    const saveLines = () => {
        const lines = buildLinesPayload();

        setSaving(true);
        router.put(
            routes.updatePayslips(run.id),
            { lines },
            {
                preserveScroll: true,
                onSuccess: () => setDirty(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    const post = () => {
        if (!confirm(pageContext === 'bonus' ? 'Finalize this bonus payroll? The period will be locked.' : 'Finalize this payroll? The period will be locked.')) return;
        setPosting(true);
        const payload = dirty && canEdit ? { lines: buildLinesPayload() } : {};
        router.post(routes.post(run.id), payload, {
            preserveScroll: true,
            onSuccess: () => setDirty(false),
            onFinish: () => setPosting(false),
        });
    };

    const cancelRun = () => {
        if (!confirm('Cancel this payroll? It will be removed and you can run calculation again for this branch.')) return;
        setCancelling(true);
        router.post(routes.cancel(run.id), {}, { onFinish: () => setCancelling(false) });
    };

    // Filter employees
    const filteredPayslips = useMemo(() => {
        return initialPayslips.filter((p) => {
            const matchesSearch =
                !employeeQuery.trim() ||
                p.name.toLowerCase().includes(employeeQuery.toLowerCase()) ||
                (p.pin && p.pin.toLowerCase().includes(employeeQuery.toLowerCase())) ||
                (p.grade && p.grade.toLowerCase().includes(employeeQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (statusFilter === 'on_hold') return p.is_withheld;
            if (statusFilter === 'has_loan') {
                return (
                    (p.loan_deductions && p.loan_deductions.length > 0) ||
                    p.lines.some((line) => line.is_loan)
                );
            }
            if (statusFilter === 'with_deductions') {
                return p.deduction > 0;
            }
            return true;
        });
    }, [initialPayslips, employeeQuery, statusFilter]);

    // Live active branch totals calculation based on client amounts edits
    const liveTotals = useMemo(() => {
        let basic = 0;
        let gross = 0;
        let deduction = 0;
        let net = 0;
        for (const p of initialPayslips) {
            if (isBonus && p.bonus_review?.line_id) {
                const raw = amounts[p.bonus_review.line_id] ?? String(p.bonus_review.bonus_amount);
                const amt = Number(raw) || 0;
                gross += amt;
                net += p.is_withheld ? 0 : amt;
            } else {
                const totals = previewTotals(p, amounts);
                basic += totals.basic || p.basic;
                gross += totals.gross;
                deduction += totals.deduction;
                net += totals.net;
            }
        }
        return { basic, gross, deduction, net };
    }, [initialPayslips, amounts, isBonus]);

    return (
        <Layout>
            <Head title={copy.reviewTitle} />
            <PayrollPage>
                <PayrollPageHeader
                    title={`${monthNames[run.month] ?? run.month} ${run.year} — ${run.branch ?? 'Branch'}`}
                    description={`${run.bonus_label ?? run.salary_type} · Calculated ${run.processed_at ?? ''}${canEdit ? copy.reviewDescriptionSuffix : ''}`}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="cursor-pointer font-semibold rounded-lg shadow-2xs">
                            <Link href={routes.period(run.year, run.month, isPosted ? 'posted' : 'processed')}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" /> Period view
                            </Link>
                        </Button>
                        {canEdit && !isPosted && (
                            <>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={saveLines} 
                                    disabled={saving || !dirty} 
                                    className={cn(
                                        "cursor-pointer font-semibold rounded-lg shadow-2xs h-8.5 text-xs",
                                        dirty
                                            ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/60"
                                            : "text-slate-400"
                                    )}
                                >
                                    <Save className="mr-1.5 h-4 w-4" />
                                    {saving ? 'Saving…' : 'Save amounts'}
                                </Button>
                                <Button 
                                    onClick={post} 
                                    disabled={posting || cancelling} 
                                    className={cn('cursor-pointer font-semibold rounded-lg shadow-2xs h-8.5 text-xs', payrollBtnPrimary)}
                                >
                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                    {posting ? copy.postingButton : copy.finalizeButton}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-red-100 text-red-700 hover:bg-red-50/50 cursor-pointer font-semibold rounded-lg shadow-2xs h-8.5 text-xs"
                                    onClick={cancelRun}
                                    disabled={cancelling || posting}
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4 text-red-500" />
                                    {cancelling ? 'Cancelling…' : copy.cancelBranchButton}
                                </Button>
                            </>
                        )}
                        {isPosted && (
                            <Badge variant="outline" className="h-8.5 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700 border-emerald-200 bg-emerald-50 rounded-full">
                                Posted (Period Locked)
                            </Badge>
                        )}
                    </div>
                </PayrollPageHeader>

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {canEdit && !isPosted && (
                    <Alert className="mb-6 border-sky-100 bg-sky-50/30 text-sky-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-sky-800">Workspace Editor Mode</AlertTitle>
                        <AlertDescription className="text-xs text-sky-700/90 mt-1">This screen is for review and edits. Payroll posts only when you click <strong>Finalize payroll</strong>.</AlertDescription>
                    </Alert>
                )}

                {isBonus && bonusConfig && (
                    <Alert className="mb-6 border-violet-100 bg-violet-50/30 text-violet-900 rounded-xl shadow-xs">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-violet-800">Bonus configuration</AlertTitle>
                        <AlertDescription className="text-xs text-violet-700/90 mt-1">
                            {bonusConfig.type_name ? `${bonusConfig.type_name} — ` : ''}
                            <span className="font-semibold text-slate-800">{bonusConfig.name}</span>
                            {' · '}
                            {bonusConfig.basic_percentage}% of each employee&apos;s basic salary
                        </AlertDescription>
                    </Alert>
                )}

                <div className={cn('mb-6 grid gap-4', isBonus ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-5')}>
                    {(isBonus
                        ? [
                              { label: 'Employees', value: run.employee_count.toLocaleString() },
                              { label: 'Total bonus (৳) (Live)', value: liveTotals.net.toLocaleString(), highlight: true },
                          ]
                        : [
                              { label: 'Employees', value: run.employee_count.toLocaleString() },
                              { label: 'Basic salary (৳) (Live)', value: liveTotals.basic.toLocaleString() },
                              { label: 'Gross (৳) (Live)', value: liveTotals.gross.toLocaleString() },
                              { label: 'Total deduction (৳) (Live)', value: liveTotals.deduction.toLocaleString() },
                              { label: 'Net payable (৳) (Live)', value: liveTotals.net.toLocaleString(), highlight: true },
                          ]
                    ).map((s) => (
                        <div
                            key={s.label}
                            className={cn(
                                'rounded-xl border px-4.5 py-3.5 shadow-xs',
                                s.highlight ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white',
                            )}
                        >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className={cn('mt-1.5 text-lg font-bold tabular-nums font-mono', s.highlight ? 'text-emerald-800' : 'text-slate-800')}>
                                {s.highlight ? `৳${s.value}` : s.value}
                            </p>
                        </div>
                    ))}
                </div>

                <PayrollSectionCard
                    title={isBonus ? 'Employee bonus breakdown' : 'Employee salary breakdown'}
                    description={
                        canEdit && !isPosted
                            ? 'Review all components in one row per employee. Edit amounts inline, save, then finalize.'
                            : 'All salary components shown in one row per employee.'
                    }
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl mb-4">
                        {/* Employee Search Bar */}
                        <div className="relative flex items-center max-w-xs w-full">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search name, PIN, grade..."
                                value={employeeQuery}
                                onChange={(e) => setEmployeeQuery(e.target.value)}
                                className="pl-8 text-xs h-8.5 bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
                            />
                        </div>

                        {/* Status Filtering Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Filters:</span>
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border transition-colors",
                                    statusFilter === 'all'
                                        ? payrollFilterActive
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                All ({initialPayslips.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('on_hold')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border transition-colors",
                                    statusFilter === 'on_hold'
                                        ? "bg-amber-600 border-amber-600 text-white"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                On Hold ({initialPayslips.filter(p => p.is_withheld).length})
                            </button>
                            {!isBonus && (
                                <>
                                    <button
                                        onClick={() => setStatusFilter('has_loan')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border transition-colors",
                                            statusFilter === 'has_loan'
                                                ? "bg-amber-600 border-amber-600 text-white"
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        Loans ({initialPayslips.filter(p => (p.loan_deductions && p.loan_deductions.length > 0) || p.lines.some(l => l.is_loan)).length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('with_deductions')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border transition-colors",
                                            statusFilter === 'with_deductions'
                                                ? "bg-red-600 border-red-600 text-white"
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        With Deductions ({initialPayslips.filter(p => p.deduction > 0).length})
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {filteredPayslips.length === 0 ? (
                        <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                            <Users className="mx-auto h-8 w-8 text-slate-300 stroke-1 mb-2" />
                           <p className="text-xs font-semibold text-slate-600">No employees match this filter</p>
                            <p className="text-[10px] text-slate-400 mt-1">Try clearing filters or search keyword</p>
                        </div>
                    ) : isBonus ? (
                        <BonusPayslipReviewTable
                            payslips={filteredPayslips.filter((p) => p.bonus_review)}
                            canEdit={canEdit && !isPosted}
                            amounts={amounts}
                            onAmountChange={onAmountChange}
                        />
                    ) : (
                        <PayslipReviewTable
                            payslips={filteredPayslips}
                            canEdit={canEdit && !isPosted}
                            amounts={amounts}
                            onAmountChange={onAmountChange}
                        />
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
