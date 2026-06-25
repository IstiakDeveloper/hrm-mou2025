import React, { useCallback, useState, useMemo, useEffect } from 'react';
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
import { PayrollPage, PayrollPageHeader, payrollBtnPrimary, payrollFilterActive } from '@/components/payroll/PayrollPageShell';
import { BranchReviewSidebar } from '@/components/payroll/BranchReviewSidebar';
import { cn } from '@/lib/utils';
import { payrollPostLabels, payrollPostRoutes, type PayrollPostContext } from '@/lib/payroll-post-routes';
import { ArrowLeft, CheckCircle2, ChevronDown, Save, Trash2, Search, Users, Coins, Building, ShieldAlert, Check, X, SlidersHorizontal } from 'lucide-react';

type BranchBlock = {
    run: {
        id: number;
        branch: string | null;
        employee_count: number;
        total_gross: number;
        total_deduction: number;
        total_net: number;
        status: string;
    };
    payslips: PayslipRow[];
    bonusConfig?: { name: string; type_name?: string | null; basic_percentage: number } | null;
};

type Props = {
    year: number;
    month: number;
    status: 'processed' | 'posted';
    canEdit: boolean;
    pageContext?: PayrollPostContext;
    summary: {
        branch_count: number;
        employee_count: number;
        total_gross: number;
        total_deduction: number;
        total_net: number;
    };
    branches: BranchBlock[];
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalaryPostPeriod({
    year,
    month,
    status,
    canEdit,
    pageContext = 'salary',
    summary,
    branches: initialBranches,
}: Props) {
    const isBonus = pageContext === 'bonus';
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const routes = payrollPostRoutes(pageContext);
    const copy = payrollPostLabels(pageContext);

    // Master-Detail Workspace State
    const [activeRunId, setActiveRunId] = useState<number | null>(() => {
        return initialBranches.length > 0 ? initialBranches[0].run.id : null;
    });

    const [branchQuery, setBranchQuery] = useState('');
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'on_hold' | 'has_loan' | 'with_deductions'>('all');

    const allPayslips = useMemo(() => initialBranches.flatMap((b) => b.payslips), [initialBranches]);
    const [amounts, setAmounts] = useState<Record<number, string>>(() => buildAmountsMap(allPayslips, isBonus));
    const [dirtyRuns, setDirtyRuns] = useState<Record<number, boolean>>({});
    const [saving, setSaving] = useState<number | null>(null);
    const [postingRunId, setPostingRunId] = useState<number | null>(null);
    const [finalizingAll, setFinalizingAll] = useState(false);
    const [cancellingAll, setCancellingAll] = useState(false);
    const [cancellingRunId, setCancellingRunId] = useState<number | null>(null);

    useEffect(() => {
        const payslips = initialBranches.flatMap((b) => b.payslips);
        setAmounts(buildAmountsMap(payslips, isBonus));
        setDirtyRuns({});
    }, [initialBranches, isBonus]);

    const onAmountChange = useCallback((lineId: number, value: string, runId: number) => {
        setAmounts((prev) => ({ ...prev, [lineId]: value }));
        setDirtyRuns((prev) => ({ ...prev, [runId]: true }));
    }, []);

    const buildBranchLinesPayload = useCallback(
        (block: (typeof initialBranches)[number]) => {
            const lineIds = isBonus
                ? block.payslips.map((p) => p.bonus_review?.line_id).filter((id): id is number => id != null)
                : block.payslips.flatMap((p) => p.lines.map((l) => l.id));

            return lineIds.map((id) => ({
                id,
                computed_amount: Number(amounts[id] ?? 0),
            }));
        },
        [amounts, isBonus],
    );

    const saveBranch = (runId: number) => {
        const block = initialBranches.find((b) => b.run.id === runId);
        if (!block) return;

        setSaving(runId);
        router.put(
            routes.updatePayslips(runId),
            { lines: buildBranchLinesPayload(block) },
            {
                preserveScroll: true,
                onSuccess: () => setDirtyRuns((prev) => ({ ...prev, [runId]: false })),
                onFinish: () => setSaving(null),
            },
        );
    };

    const hasDirty = Object.values(dirtyRuns).some(Boolean);

    const saveDirtyBranchesThen = (onDone: () => void, onError: () => void) => {
        const dirtyIds = Object.entries(dirtyRuns)
            .filter(([, dirty]) => dirty)
            .map(([runId]) => Number(runId));

        if (dirtyIds.length === 0) {
            onDone();
            return;
        }

        const saveNext = (index: number) => {
            const runId = dirtyIds[index];
            const block = initialBranches.find((b) => b.run.id === runId);
            if (!block) {
                if (index + 1 >= dirtyIds.length) {
                    onDone();
                } else {
                    saveNext(index + 1);
                }
                return;
            }

            router.put(
                routes.updatePayslips(runId),
                { lines: buildBranchLinesPayload(block) },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setDirtyRuns((prev) => ({ ...prev, [runId]: false }));
                        if (index + 1 >= dirtyIds.length) {
                            onDone();
                        } else {
                            saveNext(index + 1);
                        }
                    },
                    onError,
                },
            );
        };

        saveNext(0);
    };

    const finalizeBranch = (runId: number) => {
        if (!confirm('Finalize this branch payroll? The period will be locked for this branch.')) return;
        setPostingRunId(runId);

        const block = initialBranches.find((b) => b.run.id === runId);
        const payload =
            dirtyRuns[runId] && canEdit && block ? { lines: buildBranchLinesPayload(block) } : {};

        router.post(routes.post(runId), payload, {
            preserveScroll: true,
            onSuccess: () => setDirtyRuns((prev) => ({ ...prev, [runId]: false })),
            onFinish: () => setPostingRunId(null),
        });
    };

    const finalizeAll = () => {
        if (!confirm(`Finalize payroll for all ${summary.branch_count} branch(es)? This period will be locked.`)) return;
        setFinalizingAll(true);

        const postAll = () => {
            router.post(routes.finalizePeriod(year, month), {}, { onFinish: () => setFinalizingAll(false) });
        };

        if (hasDirty && canEdit) {
            saveDirtyBranchesThen(postAll, () => setFinalizingAll(false));
            return;
        }

        postAll();
    };

    const cancelPeriod = () => {
        if (!confirm(`Cancel this entire period? All ${summary.branch_count} branch payroll(s) will be removed. You can run calculation again.`)) {
            return;
        }
        setCancellingAll(true);
        router.post(routes.cancelPeriod(year, month), {}, { onFinish: () => setCancellingAll(false) });
    };

    const cancelBranch = (runId: number) => {
        const block = initialBranches.find((b) => b.run.id === runId);
        const name = block?.run.branch ?? 'this branch';
        if (!confirm(`Cancel payroll for ${name}? You can run calculation again for this branch.`)) return;
        setCancellingRunId(runId);
        router.post(routes.cancel(runId), {}, { onFinish: () => setCancellingRunId(null) });
    };

    // Filter branches list (Left Panel)
    const filteredBranches = useMemo(() => {
        let list = initialBranches;
        if (branchQuery.trim()) {
            const q = branchQuery.toLowerCase();
            list = initialBranches.filter((b) => b.run.branch?.toLowerCase().includes(q));
        }

        const getBranchCode = (branchStr: string | null): string => {
            if (!branchStr) return '';
            const match = branchStr.match(/\((\d+)\)/);
            return match ? match[1] : '';
        };

        return [...list].sort((a, b) => {
            const codeA = getBranchCode(a.run.branch);
            const codeB = getBranchCode(b.run.branch);
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [initialBranches, branchQuery]);

    // Active block for detail panel (Right Panel)
    const activeBlock = useMemo(() => {
        const found = initialBranches.find((b) => b.run.id === activeRunId);
        return found || initialBranches[0] || null;
    }, [initialBranches, activeRunId]);

    // Filter employees inside active branch
    const filteredPayslips = useMemo(() => {
        if (!activeBlock) return [];
        return activeBlock.payslips.filter((p) => {
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
    }, [activeBlock, employeeQuery, statusFilter]);

    // Live active branch totals calculation based on client amounts edits
    const liveActiveBranchTotals = useMemo(() => {
        if (!activeBlock) return { basic: 0, gross: 0, deduction: 0, net: 0 };
        let basic = 0;
        let gross = 0;
        let deduction = 0;
        let net = 0;
        for (const p of activeBlock.payslips) {
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
    }, [activeBlock, amounts, isBonus]);

    const livePeriodTotals = useMemo(() => {
        let basic = 0;
        let gross = 0;
        let deduction = 0;
        let net = 0;
        for (const block of initialBranches) {
            for (const p of block.payslips) {
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
        }
        return { basic, gross, deduction, net };
    }, [initialBranches, amounts, isBonus]);

    return (
        <Layout>
            <Head title={copy.periodReviewTitle} />
            <PayrollPage className="max-w-full px-4 md:px-6">
                <PayrollPageHeader
                    title={`${monthNames[month] ?? month} ${year}`}
                    description={
                        status === 'posted'
                            ? 'Posted payroll — view only archive'
                            : `${summary.branch_count} branches processed · Adjust and finalize below`
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="cursor-pointer font-semibold rounded-lg shadow-2xs">
                            <Link href={routes.index()}><ArrowLeft className="mr-1.5 h-4 w-4" /> {copy.backLabel}</Link>
                        </Button>
                        {canEdit && status !== 'posted' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-100 text-red-700 hover:bg-red-50/50 cursor-pointer font-semibold rounded-lg shadow-2xs"
                                    onClick={cancelPeriod}
                                    disabled={finalizingAll || cancellingAll || postingRunId !== null}
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4 text-red-500" />
                                    {cancellingAll ? 'Cancelling…' : copy.cancelPeriodButton}
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={finalizeAll} 
                                    disabled={finalizingAll || cancellingAll || postingRunId !== null} 
                                    className={cn('cursor-pointer font-semibold rounded-lg shadow-2xs', payrollBtnPrimary)}
                                >
                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                    {finalizingAll ? copy.finalizingAllButton : copy.finalizeAllButton}
                                </Button>
                            </>
                        )}
                        {status === 'posted' && (
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

                {canEdit && status !== 'posted' && (
                    <Alert className="mb-6 border-sky-100 bg-sky-50/30 text-sky-900 rounded-xl shadow-xs transition-all duration-300">
                        <ShieldAlert className="h-4 w-4 text-sky-600" />
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-sky-800">Workspace Editor Mode</AlertTitle>
                        <AlertDescription className="text-xs text-sky-700/90 mt-1">
                            Use the branch panel on the left to switch branches — collapse or expand it with the arrow control.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Overall Summary of all branches in the period */}
                <div className="mb-6 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Total Branches', value: summary.branch_count.toLocaleString(), icon: Building, color: 'text-blue-500 bg-blue-50/50 border-blue-100', isMoney: false },
                        { label: 'Employees', value: summary.employee_count.toLocaleString(), icon: Users, color: 'text-indigo-500 bg-indigo-50/50 border-indigo-100', isMoney: false },
                        ...(isBonus
                            ? [
                                  { label: 'Total Bonus (Live)', value: livePeriodTotals.net.toLocaleString(), icon: Coins, color: 'text-emerald-700 bg-emerald-50/50 border-emerald-100', highlight: true, isMoney: true },
                              ]
                            : [
                                  { label: 'Basic Salary (Live)', value: livePeriodTotals.basic.toLocaleString(), icon: Coins, color: 'text-violet-500 bg-violet-50/50 border-violet-100', isMoney: true },
                                  { label: 'Gross (Live)', value: livePeriodTotals.gross.toLocaleString(), icon: Coins, color: 'text-slate-500 bg-slate-50/50 border-slate-100', isMoney: true },
                                  { label: 'Total Deduction (Live)', value: livePeriodTotals.deduction.toLocaleString(), icon: Coins, color: 'text-red-500 bg-red-50/50 border-red-100', isMoney: true },
                                  { label: 'Net Payable (Live)', value: livePeriodTotals.net.toLocaleString(), icon: Coins, color: 'text-emerald-700 bg-emerald-50/50 border-emerald-100', highlight: true, isMoney: true },
                              ]),
                    ].map((s) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={s.label}
                                className={cn(
                                    'rounded-xl border px-4.5 py-3.5 shadow-2xs bg-white flex items-center justify-between transition-all duration-200 hover:shadow-xs',
                                    s.highlight ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100',
                                )}
                            >
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                    <p className={cn('mt-1.5 text-lg font-bold tabular-nums font-mono', s.highlight ? 'text-emerald-800' : 'text-slate-800')}>
                                        {s.isMoney ? `৳${s.value}` : s.value}
                                    </p>
                                </div>
                                <div className={cn('p-2 rounded-lg border shrink-0', s.color)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <BranchReviewSidebar
                        branches={filteredBranches}
                        totalCount={initialBranches.length}
                        activeRunId={activeRunId}
                        onSelect={(runId) => {
                            setActiveRunId(runId);
                            setEmployeeQuery('');
                        }}
                        branchQuery={branchQuery}
                        onBranchQueryChange={setBranchQuery}
                        dirtyRuns={dirtyRuns}
                        hasDirty={hasDirty}
                    />

                    {/* Right Workspace: Details and Employee List */}
                    <div className="min-w-0 flex-1 space-y-6">
                        {activeBlock ? (
                            <>
                                {/* Active Branch Summary KPI Board */}
                                <div className="rounded-xl border border-slate-100/90 bg-white p-5 shadow-2xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                <Building className="h-4.5 w-4.5 text-slate-400" />
                                                {activeBlock.run.branch ?? 'Branch Detail Review'}
                                            </h2>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                Calculated run details & employee-level modifications
                                            </p>
                                        </div>

                                        {canEdit && status !== 'posted' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => saveBranch(activeBlock.run.id)}
                                                    disabled={saving === activeBlock.run.id || !dirtyRuns[activeBlock.run.id]}
                                                    className={cn(
                                                        "cursor-pointer font-semibold rounded-lg shadow-2xs h-8 text-xs",
                                                        dirtyRuns[activeBlock.run.id]
                                                            ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/60"
                                                            : "text-slate-400"
                                                    )}
                                                >
                                                    <Save className="mr-1.5 h-3.5 w-3.5" />
                                                    {saving === activeBlock.run.id ? 'Saving…' : 'Save Changes'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => finalizeBranch(activeBlock.run.id)}
                                                    disabled={postingRunId === activeBlock.run.id || cancellingRunId === activeBlock.run.id}
                                                    className={cn('cursor-pointer font-semibold rounded-lg shadow-2xs h-8 text-xs', payrollBtnPrimary)}
                                                >
                                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                                    {postingRunId === activeBlock.run.id ? 'Finalizing…' : 'Finalize Branch'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-100 text-red-700 hover:bg-red-50/50 cursor-pointer font-semibold rounded-lg shadow-2xs h-8 text-xs"
                                                    onClick={() => cancelBranch(activeBlock.run.id)}
                                                    disabled={cancellingRunId === activeBlock.run.id || postingRunId === activeBlock.run.id}
                                                >
                                                    <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                                                    {cancellingRunId === activeBlock.run.id ? 'Cancelling…' : 'Cancel Calculation'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Active Branch Stat Grid */}
                                    <div className="grid gap-3.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                        <div className="rounded-lg border border-slate-50 bg-slate-50/30 px-3.5 py-2.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employees</span>
                                            <p className="mt-1 text-sm font-bold text-slate-700">{activeBlock.run.employee_count}</p>
                                        </div>
                                        {!isBonus ? (
                                            <>
                                                <div className="rounded-lg border border-slate-50 bg-slate-50/30 px-3.5 py-2.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Basic Salary (Live)</span>
                                                    <p className="mt-1 text-sm font-bold text-slate-700 font-mono">৳{liveActiveBranchTotals.basic.toLocaleString()}</p>
                                                </div>
                                                <div className="rounded-lg border border-slate-50 bg-slate-50/30 px-3.5 py-2.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross (Live)</span>
                                                    <p className="mt-1 text-sm font-bold text-slate-700 font-mono">৳{liveActiveBranchTotals.gross.toLocaleString()}</p>
                                                </div>
                                                <div className="rounded-lg border border-red-50/60 bg-red-50/10 px-3.5 py-2.5">
                                                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total Deduction (Live)</span>
                                                    <p className="mt-1 text-sm font-bold text-red-900 font-mono">৳{liveActiveBranchTotals.deduction.toLocaleString()}</p>
                                                </div>
                                                <div className="rounded-lg border border-emerald-50/60 bg-emerald-50/15 px-3.5 py-2.5 col-span-2 md:col-span-1">
                                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Net Payable (Live)</span>
                                                    <p className="mt-1 text-sm font-bold text-emerald-950 font-mono">৳{liveActiveBranchTotals.net.toLocaleString()}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="rounded-lg border border-emerald-50/60 bg-emerald-50/15 px-3.5 py-2.5 col-span-2 md:col-span-4">
                                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Bonus (Live)</span>
                                                <p className="mt-1 text-sm font-bold text-emerald-950 font-mono">৳{liveActiveBranchTotals.net.toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active Branch Employee Filter Tool & Card Listing */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
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
                                                All ({activeBlock.payslips.length})
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
                                                On Hold ({activeBlock.payslips.filter(p => p.is_withheld).length})
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
                                                        Loans ({activeBlock.payslips.filter(p => (p.loan_deductions && p.loan_deductions.length > 0) || p.lines.some(l => l.is_loan)).length})
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
                                                        With Deductions ({activeBlock.payslips.filter(p => p.deduction > 0).length})
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Employees List */}
                                    <div>
                                        {filteredPayslips.length === 0 ? (
                                            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                                                <Users className="mx-auto h-8 w-8 text-slate-300 stroke-1 mb-2" />
                                                <p className="text-xs font-semibold text-slate-600">No employees match this filter</p>
                                                <p className="text-[10px] text-slate-400 mt-1">Try clearing filters or search keyword</p>
                                            </div>
                                        ) : isBonus ? (
                                            <BonusPayslipReviewTable
                                                payslips={filteredPayslips.filter((p) => p.bonus_review)}
                                                canEdit={canEdit && status !== 'posted'}
                                                amounts={amounts}
                                                onAmountChange={(lineId, value) => onAmountChange(lineId, value, activeBlock.run.id)}
                                            />
                                        ) : (
                                            <PayslipReviewTable
                                                payslips={filteredPayslips}
                                                canEdit={canEdit && status !== 'posted'}
                                                amounts={amounts}
                                                onAmountChange={(lineId, value) => onAmountChange(lineId, value, activeBlock.run.id)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-24 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                                <Building className="mx-auto h-12 w-12 text-slate-300 stroke-1 mb-3" />
                                <p className="text-sm font-semibold text-slate-700">No Branch Runs Processed</p>
                                <p className="text-xs text-slate-400 mt-1">Run salary process calculations first for this period.</p>
                            </div>
                        )}
                    </div>
                </div>
            </PayrollPage>
        </Layout>
    );
}

