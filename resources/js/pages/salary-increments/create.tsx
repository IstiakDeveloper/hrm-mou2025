import { Head, Link, router, usePage } from '@inertiajs/react';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { toFormDisplayDate } from '@/lib/display-date';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Search,
    TrendingUp,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    Users,
    FileText,
    ArrowRight,
    Sparkles,
    Check,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Option = { id: number; name: string };

type Proposal = {
    to_step_id: number;
    to_step: number;
    to_basic: number;
    to_gross: number;
    increment_amount: number;
};

type StaffRow = {
    employee_id: number;
    employee_code: string;
    name: string;
    branch: string;
    employee_type?: string;
    grade: string;
    joining_date: string | null;
    last_increment_date: string | null;
    sort_index?: number;
    current_step: number | null;
    max_step?: number;
    current_basic?: number;
    current_gross?: number;
    basic_off_scale?: boolean;
    eligible: boolean;
    grantable: boolean;
    reason_code: string | null;
    reason: string | null;
    can_release?: boolean;
    proposals?: Record<string, Proposal>;
};

type Filters = {
    branch_id: string;
    program_id: string;
    project_id: string;
    employee_type_id: string;
    order_no: string;
    increment_date: string;
    effective_date: string;
    arrear_months: string;
    notes: string;
    searched: boolean;
};

type Choice = { included: boolean; action: 'grant' | 'stop'; steps: number };
type Pool = 'all' | 'eligible' | 'not_eligible';

type Props = {
    filters: Filters;
    eligible: StaffRow[];
    held: StaffRow[];
    branches: Option[];
    programs: Option[];
    projects: Option[];
    employeeTypes: Option[];
    branchLocked: boolean;
    canRelease: boolean;
};

function monthGap(from: string, to: string): number {
    if (!from || !to || from >= to) return 0;
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    return Math.max(0, Math.min(24, (ty - fy) * 12 + (tm - fm)));
}

function proposalKeys(row: StaffRow): number[] {
    return Object.keys(row.proposals ?? {}).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
}

function maxGrantable(row: StaffRow): number {
    const keys = proposalKeys(row);
    return keys.length ? keys[keys.length - 1] : 0;
}

function proposalFor(row: StaffRow, steps: number): Proposal | null {
    const proposals = row.proposals ?? {};
    const exact = proposals[String(steps)];
    if (exact) return exact;
    const keys = proposalKeys(row).filter((n) => n <= steps);
    if (keys.length === 0) return null;
    const capped = keys[keys.length - 1];
    return proposals[String(capped)] ?? null;
}

export default function SalaryIncrementCreate({
    filters,
    eligible,
    held,
    branches,
    programs,
    projects,
    employeeTypes,
    branchLocked,
    canRelease,
}: Props) {
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };

    const [branchId, setBranchId] = useState(filters.branch_id || 'all');
    const [programId, setProgramId] = useState(filters.program_id || 'all');
    const [projectId, setProjectId] = useState(filters.project_id || 'all');
    const [typeId, setTypeId] = useState(filters.employee_type_id || 'all');
    const [orderNo, setOrderNo] = useState(filters.order_no);
    const [incrementDate, setIncrementDate] = useState(filters.increment_date);
    const [effectiveDate, setEffectiveDate] = useState(filters.effective_date);
    const [arrearMonths, setArrearMonths] = useState(filters.arrear_months || '0');
    const [notes, setNotes] = useState(filters.notes || '');
    const [query, setQuery] = useState('');
    const [stepsForAll, setStepsForAll] = useState('1');
    const [pool, setPool] = useState<Pool>('all');
    const [choices, setChoices] = useState<Record<number, Choice>>({});
    const [submitting, setSubmitting] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);

    const staff = useMemo<StaffRow[]>(() => {
        const fromEligible = eligible.map((row) => ({
            ...row,
            eligible: row.eligible !== false,
            grantable: row.grantable !== false,
            reason_code: row.reason_code ?? null,
            reason: row.reason ?? null,
        }));
        const fromHeld = held.map((row) => ({
            ...row,
            eligible: false,
            grantable: row.grantable === true && maxGrantable(row) > 0,
            reason_code: row.reason_code ?? null,
            reason: row.reason ?? null,
        }));
        return [...fromEligible, ...fromHeld].sort(
            (a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0) || a.employee_id - b.employee_id,
        );
    }, [eligible, held]);

    useEffect(() => {
        setBranchId(filters.branch_id || 'all');
        setProgramId(filters.program_id || 'all');
        setProjectId(filters.project_id || 'all');
        setTypeId(filters.employee_type_id || 'all');
        setOrderNo(filters.order_no);
        setIncrementDate(filters.increment_date);
        setEffectiveDate(filters.effective_date);
        setArrearMonths(filters.arrear_months || '0');
        setNotes(filters.notes || '');
    }, [filters]);

    const requestedSteps = Math.max(1, Math.min(30, Number(stepsForAll) || 1));

    useEffect(() => {
        const next: Record<number, Choice> = {};
        staff.forEach((row) => {
            const cap = maxGrantable(row);
            const steps = cap > 0 ? Math.min(requestedSteps, cap) : 1;
            let included = false;
            if (row.grantable) {
                if (pool === 'eligible') included = row.eligible;
                else if (pool === 'not_eligible') included = !row.eligible;
                else included = true;
            }
            next[row.employee_id] = { included, action: 'grant', steps };
        });
        setChoices(next);
    }, [staff, pool, requestedSteps]);

    const arrear = Math.max(0, Math.min(24, Number(arrearMonths) || 0));
    const suggestedArrear = monthGap(effectiveDate, incrementDate);
    const staleSearch = filters.searched && effectiveDate !== filters.effective_date;

    const visibleStaff = useMemo(() => {
        const q = query.trim().toLowerCase();
        return staff.filter((row) => {
            if (pool === 'eligible' && !row.eligible) return false;
            if (pool === 'not_eligible' && row.eligible) return false;
            if (!q) return true;
            return (
                row.name.toLowerCase().includes(q) ||
                row.employee_code.toLowerCase().includes(q) ||
                row.branch.toLowerCase().includes(q)
            );
        });
    }, [staff, pool, query]);

    const totals = useMemo(() => {
        let selected = 0;
        let grants = 0;
        let stops = 0;
        let increment = 0;
        let arrearTotal = 0;

        staff.forEach((row) => {
            const choice = choices[row.employee_id];
            if (!choice?.included) return;
            selected += 1;
            if (choice.action === 'stop') {
                stops += 1;
                return;
            }
            const proposal = proposalFor(row, choice.steps);
            if (!proposal) return;
            grants += 1;
            increment += proposal.increment_amount;
            arrearTotal += proposal.increment_amount * arrear;
        });

        return { selected, grants, stops, increment, arrearTotal };
    }, [staff, choices, arrear]);

    const missingHistory = useMemo(
        () => eligible.filter((row) => !row.last_increment_date).length,
        [eligible],
    );

    const selectableVisible = visibleStaff.filter((row) => row.grantable);
    const allVisibleIncluded =
        selectableVisible.length > 0 &&
        selectableVisible.every((row) => choices[row.employee_id]?.included);

    const search = () => {
        router.get(
            route('salary-increments.create'),
            {
                searched: 1,
                branch_id: branchId !== 'all' ? branchId : '',
                program_id: programId !== 'all' ? programId : '',
                project_id: projectId !== 'all' ? projectId : '',
                employee_type_id: typeId !== 'all' ? typeId : '',
                order_no: orderNo,
                increment_date: incrementDate,
                effective_date: effectiveDate,
                arrear_months: String(arrear),
                notes,
            },
            { preserveState: false },
        );
    };

    const setChoice = (id: number, patch: Partial<Choice>) => {
        setChoices((current) => ({
            ...current,
            [id]: { ...(current[id] ?? { included: true, action: 'grant', steps: 1 }), ...patch },
        }));
    };

    const toggleVisible = (included: boolean) => {
        setChoices((current) => {
            const next = { ...current };
            selectableVisible.forEach((row) => {
                next[row.employee_id] = {
                    ...(next[row.employee_id] ?? {
                        included: true,
                        action: 'grant',
                        steps: requestedSteps,
                    }),
                    included,
                };
            });
            return next;
        });
    };

    const submit = () => {
        type LineItem = { employee_id: number; action: 'grant' | 'stop'; steps: number };
        const lines: LineItem[] = staff.flatMap<LineItem>((row) => {
            const choice = choices[row.employee_id];
            if (!choice?.included || !row.grantable) return [];
            if (choice.action === 'stop') {
                return [{ employee_id: row.employee_id, action: 'stop', steps: 0 }];
            }
            const available = proposalKeys(row).filter((n) => n <= choice.steps);
            const steps = available.length ? available[available.length - 1] : 0;
            if (steps < 1) return [];
            return [{ employee_id: row.employee_id, action: 'grant', steps }];
        });

        if (lines.length === 0) return;

        const ok = window.confirm(
            `Save ${orderNo} for ${totals.grants} grant(s) and ${totals.stops} withhold(s)? If the effective date is later, salary stays scheduled until that date. Otherwise salary updates now. Monthly increment ${formatTakaWithSymbol(totals.increment)}.`,
        );
        if (!ok) return;

        setSubmitting(true);
        router.post(
            route('salary-increments.store'),
            {
                order_no: orderNo,
                increment_date: incrementDate,
                effective_date: effectiveDate,
                arrear_months: arrear,
                notes,
                branch_id: branchId !== 'all' ? branchId : '',
                program_id: programId !== 'all' ? programId : '',
                project_id: projectId !== 'all' ? projectId : '',
                employee_type_id: typeId !== 'all' ? typeId : '',
                lines: lines as any,
            },
            {
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Layout>
            <Head title="New Increment Order" />
            <PageSurface className="max-w-[98rem] pt-1 sm:pt-2 pb-24 px-3 sm:px-6">
                {/* Compact Header Bar */}
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('salary-increments.index')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            title="Back to All Orders"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                                    New Increment Order
                                </h1>
                                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    Annual Step Progression
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowGuidelines(!showGuidelines)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                            <span>Rules</span>
                            <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500 font-mono">3</span>
                            {showGuidelines ? (
                                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Collapsible Rules Panel */}
                {showGuidelines && (
                    <div className="mb-2.5 grid gap-2 sm:grid-cols-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 text-xs">
                            <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Same Grade
                            </div>
                            <p className="mt-0.5 text-blue-700/90 text-[11px] leading-relaxed">
                                Changes the step only. Grade change is a promotion and handled separately.
                            </p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs">
                            <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Published Scale Steps
                            </div>
                            <p className="mt-0.5 text-emerald-700/90 text-[11px] leading-relaxed">
                                Batch step applies to all, customizable per staff up to max step.
                            </p>
                        </div>
                        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-xs">
                            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Max Ceiling & Withhold
                            </div>
                            <p className="mt-0.5 text-amber-700/90 text-[11px] leading-relaxed">
                                Step 10 is the ceiling. Withhold is explicit; held staff remain locked until released.
                            </p>
                        </div>
                    </div>
                )}

                {/* Validation / Flash Alerts */}
                {(flash?.error || errors?.lines || errors?.order_no) && (
                    <Alert className="mb-2.5 border-red-200 bg-red-50 text-red-900 py-2">
                        <AlertDescription className="text-xs">
                            {flash?.error || errors?.lines || errors?.order_no}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Compact Command Card */}
                <Card className="mb-3 border-slate-200/90 shadow-2xs bg-white">
                    <CardContent className="p-3 sm:p-3.5 space-y-2.5">
                        {/* Tier 1: Order Details */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
                            <div className="space-y-1">
                                <Label htmlFor="order_no" className="text-[11px] font-semibold text-slate-600">
                                    Office Order No.
                                </Label>
                                <Input
                                    id="order_no"
                                    value={orderNo}
                                    onChange={(e) => setOrderNo(e.target.value)}
                                    className="h-8 text-xs font-mono font-medium"
                                    placeholder="Order No..."
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="increment_date" className="text-[11px] font-semibold text-slate-600">
                                    Order Date
                                </Label>
                                <Input
                                    id="increment_date"
                                    type="date"
                                    value={incrementDate}
                                    onChange={(e) => setIncrementDate(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="effective_date" className="text-[11px] font-semibold text-slate-600">
                                    Effective Date
                                </Label>
                                <Input
                                    id="effective_date"
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="arrear_months" className="text-[11px] font-semibold text-slate-600">
                                        Arrear Months
                                    </Label>
                                    {suggestedArrear > 0 && suggestedArrear !== arrear && (
                                        <button
                                            type="button"
                                            onClick={() => setArrearMonths(String(suggestedArrear))}
                                            className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold underline"
                                        >
                                            Use {suggestedArrear}m
                                        </button>
                                    )}
                                </div>
                                <Input
                                    id="arrear_months"
                                    type="number"
                                    min={0}
                                    max={24}
                                    value={arrearMonths}
                                    onChange={(e) => setArrearMonths(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Tier 2: Scope & Filters */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Branch</Label>
                                <Select value={branchId} onValueChange={setBranchId} disabled={branchLocked}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!branchLocked && <SelectItem value="all">All branches</SelectItem>}
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={String(branch.id)}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Program</Label>
                                <Select value={programId} onValueChange={setProgramId}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All programs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All programs</SelectItem>
                                        {programs.map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Project</Label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All projects" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All projects</SelectItem>
                                        {projects.map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Employee Type</Label>
                                <Select value={typeId} onValueChange={setTypeId}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All permanent types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All permanent types</SelectItem>
                                        {employeeTypes.map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Tier 3: Batch Execution Bar */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="steps_for_all" className="text-[11px] font-semibold text-slate-600">
                                    Steps to Grant
                                </Label>
                                <Input
                                    id="steps_for_all"
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={stepsForAll}
                                    onChange={(e) => setStepsForAll(e.target.value)}
                                    className="h-8 text-xs font-semibold"
                                />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[11px] font-semibold text-slate-600">Selection Pool</Label>
                                <Select value={pool} onValueChange={(value) => setPool(value as Pool)}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Staff</SelectItem>
                                        <SelectItem value="eligible">Eligible Only</SelectItem>
                                        <SelectItem value="not_eligible">Not Eligible Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-4 space-y-1">
                                <Label htmlFor="notes" className="text-[11px] font-semibold text-slate-600">
                                    Notes
                                </Label>
                                <Input
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional note for order record..."
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <Button
                                    onClick={search}
                                    className="w-full h-8 text-xs bg-slate-900 hover:bg-emerald-700 text-white font-medium shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    <span>Find Eligible Staff</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Arrear / Stale Notice Alerts */}
                {suggestedArrear > 0 && suggestedArrear !== arrear && (
                    <Alert className="mb-2.5 border-amber-200 bg-amber-50/80 text-amber-950 py-2">
                        <AlertDescription className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                            <span>
                                Effective date is <strong>{suggestedArrear} month{suggestedArrear === 1 ? '' : 's'}</strong> before order date.
                                Set arrear months only if those months were already disbursed at the old step.
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] bg-white border-amber-300 hover:bg-amber-100"
                                onClick={() => setArrearMonths(String(suggestedArrear))}
                            >
                                Apply {suggestedArrear} months
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {staleSearch && (
                    <Alert className="mb-2.5 border-amber-200 bg-amber-50/80 text-amber-950 py-2">
                        <AlertDescription className="text-xs">
                            The effective date changed. Search again so eligibility updates to the new date.
                        </AlertDescription>
                    </Alert>
                )}

                {filters.searched && missingHistory > 0 && (
                    <Alert className="mb-2.5 border-amber-200 bg-amber-50/80 text-amber-950 py-2">
                        <AlertDescription className="text-xs">
                            {missingHistory} staff have no recorded last increment date, listed due for 1 step.
                            Untick if already granted for this cycle.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Pre-search Empty Prompt */}
                {!filters.searched && (
                    <Card className="border-dashed border-slate-200/90 bg-white/50 shadow-none">
                        <CardContent className="py-12 text-center text-xs text-slate-500">
                            <Sparkles className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-70" />
                            <p className="font-medium text-slate-700">Ready to compute increment batch</p>
                            <p className="mt-0.5 text-slate-500 text-[11px]">
                                Set the order & effective dates, then click <strong>Find Eligible Staff</strong> to preview scale steps.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Searched Results Section */}
                {filters.searched && (
                    <>
                        {/* Eye-catching KPI Overview Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2.5">
                            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-2 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Eligible</p>
                                    <p className="text-sm font-bold text-emerald-950 leading-tight">{eligible.length}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-2 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-amber-600/15 text-amber-700 flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Not Eligible</p>
                                    <p className="text-sm font-bold text-amber-950 leading-tight">{held.length}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-blue-200/70 bg-blue-50/60 p-2 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-blue-600/15 text-blue-700 flex items-center justify-center shrink-0">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider">Selected</p>
                                    <p className="text-sm font-bold text-blue-950 leading-tight">
                                        {totals.selected}
                                        <span className="text-[10px] font-normal text-blue-600 ml-1">
                                            ({totals.grants} grant / {totals.stops} hold)
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-2.5 shadow-2xs">
                                <div className="h-7 w-7 rounded-md bg-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                    ৳
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Monthly Inc.</p>
                                    <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                                        {formatTakaWithSymbol(totals.increment)}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-indigo-200/70 bg-indigo-50/60 p-2 flex items-center gap-2.5 col-span-2 sm:col-span-1">
                                <div className="h-7 w-7 rounded-md bg-indigo-600/15 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                    Σ
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider">Arrear Impact</p>
                                    <p className="text-xs font-bold text-indigo-950 leading-tight truncate">
                                        {formatTakaWithSymbol(totals.arrearTotal)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Staff Results Table Card */}
                        <Card className="overflow-hidden border-slate-200/90 shadow-2xs bg-white">
                            {/* Table Control Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2">
                                <div className="flex items-center gap-2 flex-1 max-w-xs">
                                    <div className="relative w-full">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search by name, ID or branch..."
                                            className="h-7 pl-8 text-xs bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setPool('all')}
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                            pool === 'all'
                                                ? 'bg-slate-900 text-white shadow-2xs'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        All ({staff.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPool('eligible')}
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                            pool === 'eligible'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Eligible ({eligible.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPool('not_eligible')}
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                            pool === 'not_eligible'
                                                ? 'bg-amber-700 text-white shadow-2xs'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Not Eligible ({held.length})
                                    </button>
                                </div>
                            </div>

                            {/* Table Scroll Area */}
                            <div className="max-h-[36rem] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px]">
                                        <TableRow className="border-b border-slate-200">
                                            <TableHead className="w-8 py-2 px-2.5">
                                                <Checkbox
                                                    checked={allVisibleIncluded}
                                                    onCheckedChange={(value) => toggleVisible(value === true)}
                                                    aria-label="Select visible staff"
                                                />
                                            </TableHead>
                                            <TableHead className="py-2">Employee</TableHead>
                                            <TableHead className="py-2">Grade</TableHead>
                                            <TableHead className="py-2">Current Status</TableHead>
                                            <TableHead className="py-2">Action / Steps</TableHead>
                                            <TableHead className="py-2">New Step</TableHead>
                                            <TableHead className="py-2 text-right">New Gross</TableHead>
                                            <TableHead className="py-2 text-right">Monthly Inc.</TableHead>
                                            <TableHead className="py-2 text-right">Arrear Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleStaff.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-20 text-center text-xs text-slate-500">
                                                    No staff matching your current filter.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {visibleStaff.map((row) => {
                                            const cap = maxGrantable(row);
                                            const choice = choices[row.employee_id] ?? {
                                                included: false,
                                                action: 'grant' as const,
                                                steps: 1,
                                            };
                                            const proposal =
                                                row.grantable && choice.action === 'grant'
                                                    ? proposalFor(row, choice.steps)
                                                    : null;
                                            const appliedSteps = proposal
                                                ? proposalKeys(row).filter((n) => n <= choice.steps).pop() ?? choice.steps
                                                : choice.steps;

                                            return (
                                                <TableRow
                                                    key={row.employee_id}
                                                    className={`transition-colors border-b border-slate-100 ${
                                                        !row.grantable
                                                            ? 'bg-slate-50/80'
                                                            : choice.included
                                                            ? 'hover:bg-slate-50/70'
                                                            : 'opacity-55 hover:opacity-100'
                                                    }`}
                                                >
                                                    <TableCell className="py-2 px-2.5">
                                                        <Checkbox
                                                            checked={row.grantable && choice.included}
                                                            disabled={!row.grantable}
                                                            onCheckedChange={(value) =>
                                                                setChoice(row.employee_id, { included: value === true })
                                                            }
                                                            aria-label={`Include ${row.name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="font-semibold text-xs text-slate-900 leading-tight">
                                                            {row.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            <span className="font-mono text-slate-600">{row.employee_code}</span> · {row.branch}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span
                                                                className={`inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-medium ${
                                                                    row.eligible
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                                                        : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                                                }`}
                                                            >
                                                                {row.eligible ? 'Eligible' : 'Not eligible'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {row.last_increment_date
                                                                    ? `Last: ${toFormDisplayDate(row.last_increment_date)}`
                                                                    : row.joining_date
                                                                    ? `Joined: ${toFormDisplayDate(row.joining_date)}`
                                                                    : ''}
                                                            </span>
                                                        </div>
                                                        {row.reason && (
                                                            <div className="mt-0.5 max-w-xs text-[10px] text-amber-800 font-medium">
                                                                {row.reason}
                                                            </div>
                                                        )}
                                                        {row.basic_off_scale && (
                                                            <div className="mt-0.5 text-[10px] text-amber-700 font-medium">
                                                                Basic off scale, will follow published step.
                                                            </div>
                                                        )}
                                                        {row.can_release && canRelease && (
                                                            <Button
                                                                size="sm"
                                                                variant="link"
                                                                className="h-auto p-0 text-[11px] text-blue-600 hover:text-blue-800 underline"
                                                                onClick={() =>
                                                                    router.post(
                                                                        route('salary-increments.release-stop', row.employee_id),
                                                                        {},
                                                                        { preserveScroll: true },
                                                                    )
                                                                }
                                                            >
                                                                Release withhold
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs font-medium text-slate-700">
                                                        {row.grade}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs">
                                                        <div className="font-semibold text-slate-800">
                                                            Step {row.current_step ?? '—'}
                                                        </div>
                                                        {row.current_basic != null && (
                                                            <div className="text-[11px] text-slate-500 font-mono">
                                                                {formatTakaWithSymbol(row.current_basic)} <span className="text-[10px] text-slate-400 font-sans">basic</span>
                                                            </div>
                                                        )}
                                                        {row.current_gross != null && (
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                {formatTakaWithSymbol(row.current_gross)} gross
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {row.grantable ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={cap}
                                                                    className="h-7 w-12 text-center text-xs font-semibold p-1"
                                                                    value={choice.action === 'stop' ? '' : String(choice.steps)}
                                                                    disabled={choice.action === 'stop'}
                                                                    onChange={(e) => {
                                                                        const typed = Math.max(1, Math.min(cap, Number(e.target.value) || 1));
                                                                        setChoice(row.employee_id, {
                                                                            action: 'grant',
                                                                            steps: typed,
                                                                            included: true,
                                                                        });
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant={choice.action === 'stop' ? 'default' : 'outline'}
                                                                    className={`h-7 px-2 text-[11px] transition-colors ${
                                                                        choice.action === 'stop'
                                                                            ? 'bg-amber-700 text-white hover:bg-amber-800'
                                                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                                                    }`}
                                                                    onClick={() =>
                                                                        setChoice(row.employee_id, {
                                                                            action: choice.action === 'stop' ? 'grant' : 'stop',
                                                                            included: true,
                                                                        })
                                                                    }
                                                                >
                                                                    {choice.action === 'stop' ? 'Withheld' : 'Withhold'}
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                At max ceiling
                                                            </span>
                                                        )}
                                                        {row.grantable && choice.action !== 'stop' && appliedSteps < choice.steps && (
                                                            <div className="mt-0.5 text-[10px] text-amber-700">
                                                                Capped at {appliedSteps} (max {row.max_step}).
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs">
                                                        {choice.action === 'stop' || !proposal ? (
                                                            <span className="text-slate-400 text-[11px]">
                                                                Stays at Step {row.current_step ?? '—'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[11px]">
                                                                Step {row.current_step} <ArrowRight className="h-3 w-3 inline text-emerald-500" /> Step {proposal.to_step}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right text-xs font-mono font-medium text-slate-800">
                                                        {proposal ? formatTakaWithSymbol(proposal.to_gross) : '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right text-xs font-mono font-bold text-emerald-700">
                                                        {proposal ? `+${formatTakaWithSymbol(proposal.increment_amount)}` : '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right text-xs font-mono text-slate-700">
                                                        {proposal ? formatTakaWithSymbol(proposal.increment_amount * arrear) : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </>
                )}

                {/* Sticky Action Footer */}
                {filters.searched && (
                    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-lg">
                        <div className="mx-auto flex max-w-[98rem] flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                <div>
                                    <strong className="font-semibold text-slate-900">{totals.selected}</strong> selected
                                </div>
                                <span className="text-slate-300">·</span>
                                <div>
                                    <strong className="font-semibold text-emerald-700">{totals.grants}</strong> grant
                                </div>
                                <span className="text-slate-300">·</span>
                                <div>
                                    <strong className="font-semibold text-amber-700">{totals.stops}</strong> withhold
                                </div>
                                <span className="text-slate-300">·</span>
                                <div>
                                    <strong className="font-semibold text-emerald-700">{formatTakaWithSymbol(totals.increment)}</strong> / month
                                </div>
                                <span className="text-slate-300">·</span>
                                <div>
                                    arrear <strong className="font-semibold text-indigo-700">{formatTakaWithSymbol(totals.arrearTotal)}</strong>
                                </div>
                            </div>
                            <Button
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-xs h-8 text-xs px-4"
                                disabled={submitting || totals.selected === 0 || staleSearch || orderNo.trim() === ''}
                                onClick={submit}
                            >
                                {submitting ? 'Saving…' : 'Save order'}
                            </Button>
                        </div>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}

