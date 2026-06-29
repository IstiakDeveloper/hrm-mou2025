import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { PayrollFilterGrid } from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState, payrollBtnPrimary, payrollBadgePrimary } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT } from '@/lib/display-date';
import { payrollPostContextFromSalaryType, payrollPostRoutes } from '@/lib/payroll-post-routes';
import { Calculator, ChevronDown, Search, Users, Coins, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTakaWithSymbol } from '@/lib/taka-format';

const salaryTypeLabels: Record<string, string> = {
    salary: 'Monthly salary',
    bonus: 'Bonus',
    arrear: 'Arrear',
};

type BranchRun = {
    id: number;
    branch: string;
    status: string;
    employee_count: number;
    total_net: number;
    processed_at: string | null;
    posted_at: string | null;
};

type PeriodBatch = {
    year: number;
    month: number;
    period_label: string;
    salary_type: string;
    bonus_label?: string | null;
    branch_count: number;
    employee_count: number;
    total_net: number;
    processed_at: string | null;
    posted_at: string | null;
    branches: BranchRun[];
};

type Props = {
    filters: Record<string, string | boolean>;
    pendingBatches: PeriodBatch[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    salaryTypes: { value: string; label: string }[];
    months: { value: number; label: string }[];
    years: number[];
    canProcess?: boolean;
};

function flattenErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v) continue;
        const label = k.replace(/_/g, ' ');
        out.push(`${label}: ${v}`);
    }
    return out;
}

function reviewPeriodHref(batch: PeriodBatch): string | null {
    const context = payrollPostContextFromSalaryType(batch.salary_type);
    if (context === 'arrear') {
        return batch.branches.length === 1 ? payrollPostRoutes('salary').show(batch.branches[0].id) : null;
    }
    return payrollPostRoutes(context).period(batch.year, batch.month, 'processed');
}

function reviewBranchHref(batch: PeriodBatch, branchId: number): string {
    const context = payrollPostContextFromSalaryType(batch.salary_type);
    if (context === 'bonus') {
        return payrollPostRoutes('bonus').show(branchId);
    }
    return payrollPostRoutes('salary').show(branchId);
}

function ProcessBatchCard({ batch }: { batch: PeriodBatch }) {
    const [open, setOpen] = useState(false);
    const periodHref = reviewPeriodHref(batch);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-100 bg-white shadow-2xs overflow-hidden hover:border-slate-200 transition-all duration-200">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3.5 text-left hover:opacity-95 focus:outline-hidden cursor-pointer">
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{batch.period_label}</span>
                            <Badge
                                variant="outline"
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider text-slate-500 border-slate-200 bg-slate-50"
                            >
                                {batch.bonus_label ?? salaryTypeLabels[batch.salary_type.toLowerCase()] ?? batch.salary_type}
                            </Badge>
                            <Badge
                                variant="secondary"
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md text-slate-500 bg-slate-100/80 border border-slate-200/30"
                            >
                                {batch.branch_count} branch{batch.branch_count === 1 ? '' : 'es'}
                            </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400 font-medium flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-300" /> {batch.employee_count} employees</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-slate-300" /> Net <span className="font-mono font-bold text-slate-600">{formatTakaWithSymbol(batch.total_net)}</span></span>
                            <span>·</span>
                            <span>Calculated {batch.processed_at ?? '—'}</span>
                        </p>
                    </div>
                </CollapsibleTrigger>
                {periodHref ? (
                    <Button asChild size="sm" className={cn('cursor-pointer font-semibold rounded-lg shadow-sm', payrollBtnPrimary)}>
                        <Link href={periodHref}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Review & post
                        </Link>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer font-semibold rounded-lg shadow-sm"
                        onClick={() => setOpen(true)}
                    >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Review branches
                    </Button>
                )}
            </div>
            <CollapsibleContent>
                <div className="border-t border-slate-100/70 bg-slate-50/20 px-5 py-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Branch breakdowns</p>
                    <div className="space-y-2">
                        {batch.branches.map((branch) => (
                            <div
                                key={branch.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-3xs hover:border-slate-200 transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700">{branch.branch}</p>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        {branch.employee_count} employees · Net <span className="font-mono font-bold text-slate-500">{formatTakaWithSymbol(branch.total_net)}</span>
                                    </p>
                                </div>
                                <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg border border-slate-100 bg-white text-slate-600 hover:text-slate-900 shadow-3xs cursor-pointer hover:bg-slate-50 text-xs font-semibold">
                                    <Link href={reviewBranchHref(batch, branch.id)}>Review branch</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function SalaryProcessIndex({ filters: init, pendingBatches, canProcess = false, ...options }: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string; warning?: string; info?: string };
    }>().props;

    const [filters, setFilters] = useState({
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        designation_id: String(init.designation_id || ''),
        program_id: String(init.program_id || ''),
        project_id: String(init.project_id || ''),
        employee_id: String(init.employee_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || new Date().getMonth() + 1),
        salary_type: String(init.salary_type || 'salary'),
        process_date: String(init.process_date || format(new Date(), DISPLAY_DATE_FMT)),
    });
    const [processing, setProcessing] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);
    const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
    const [listSearch, setListSearch] = useState('');

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const allErrors = useMemo(
        () => flattenErrors({ ...pageErrors, ...submitErrors }),
        [pageErrors, submitErrors],
    );

    const filterBatches = (batches: PeriodBatch[]) => {
        if (!listSearch.trim()) return batches;
        const q = listSearch.toLowerCase();
        return batches.filter(
            (b) =>
                b.period_label.toLowerCase().includes(q) ||
                b.salary_type.toLowerCase().includes(q) ||
                (b.bonus_label && b.bonus_label.toLowerCase().includes(q)) ||
                b.branches.some((branch) => branch.branch.toLowerCase().includes(q)),
        );
    };

    const filteredPending = useMemo(() => filterBatches(pendingBatches), [pendingBatches, listSearch]);

    const validateClient = (): string[] => {
        const msgs: string[] = [];
        if (!filters.month) msgs.push('Select a month.');
        if (!filters.year) msgs.push('Select a year.');
        if (!filters.process_date?.trim()) msgs.push('Select a calculation date.');
        if (!canProcess) msgs.push('Your account needs Payroll Edit permission to run salary process.');
        return msgs;
    };

    const runProcess = () => {
        const client = validateClient();
        if (client.length) {
            setClientErrors(client);
            setSubmitErrors({});
            return;
        }
        setClientErrors([]);
        setSubmitErrors({});
        setProcessing(true);
        router.post(
            route('salary-process.process'),
            filters,
            {
                preserveScroll: true,
                onError: (errs) => {
                    setSubmitErrors(errs as Record<string, string>);
                    setClientErrors(flattenErrors(errs as Record<string, string>));
                },
                onSuccess: () => {
                    setClientErrors([]);
                    setSubmitErrors({});
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Layout>
            <Head title="Salary process" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Calculator}
                    title="Salary process"
                    description="Calculate payroll for active employees, then review and post from the list below."
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.warning && (
                    <Alert className="mb-6 border-amber-100 bg-amber-50/40 text-amber-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">Already processed</AlertTitle>
                        <AlertDescription className="text-xs text-amber-800/90 mt-1">{flash.warning}</AlertDescription>
                    </Alert>
                )}

                {flash?.error && (
                    <Alert variant="destructive" className="mb-6 rounded-xl border-red-100 bg-red-50/30 transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Could not process salary</AlertTitle>
                        <AlertDescription className="text-xs text-red-700/95 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                {flash?.info && (
                    <Alert className="mb-6 border-sky-100 bg-sky-50/30 text-sky-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-sky-800">Process details</AlertTitle>
                        <AlertDescription className="text-xs text-sky-700/90 mt-1">{flash.info}</AlertDescription>
                    </Alert>
                )}

                {(clientErrors.length > 0 || allErrors.length > 0) && !flash?.warning && !flash?.error && (
                    <Alert variant="destructive" className="mb-6 rounded-xl border-red-100 bg-red-50/30 transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Please fix the following</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-red-700/95">
                                {(clientErrors.length ? clientErrors : allErrors).map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {!canProcess && (
                    <Alert className="mb-6 border-amber-100 bg-amber-50/30 text-amber-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">View only</AlertTitle>
                        <AlertDescription className="text-xs text-amber-700/90 mt-1">
                            You can open this page, but running salary process requires the <strong>payroll.edit</strong> permission.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col gap-6">
                    <PayrollSectionCard
                        title="Calculate payroll"
                        description="Choose pay period and scope, then run calculation."
                    >
                        <PayrollFilterGrid
                            filters={filters}
                            setFilter={setFilter}
                            {...options}
                            years={options.years}
                            months={options.months}
                            salaryTypes={options.salaryTypes.map((t) => ({
                                value: t.value,
                                label: salaryTypeLabels[t.value] ?? t.label,
                            }))}
                            processDate={filters.process_date}
                            onProcessDateChange={(v) => setFilter('process_date', v)}
                            branchAllLabel="All branches (Bulk run)"
                            payrollReadyEmployees
                            fieldErrors={submitErrors}
                            columns={4}
                        />

                        <PayrollFormActions className="mt-4 border-t border-slate-100 pt-3">
                            <Button
                                onClick={runProcess}
                                disabled={processing || !canProcess}
                                className={cn('cursor-pointer rounded-lg px-4 h-9 shadow-sm flex items-center transition-all', payrollBtnPrimary)}
                            >
                                <Eye className="mr-2 h-4 w-4 shrink-0" />
                                {processing ? 'Loading…' : 'View'}
                            </Button>
                        </PayrollFormActions>
                    </PayrollSectionCard>

                    <PayrollSectionCard
                        title="Salary process list"
                        description="Calculated payroll awaiting review and posting."
                    >
                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex items-center max-w-sm w-full">
                                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Search by month, branch, pay type..."
                                        value={listSearch}
                                        onChange={(e) => setListSearch(e.target.value)}
                                        className="pl-8 text-xs h-8.5 bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
                                    />
                                </div>
                                {pendingBatches.length > 0 && (
                                    <Badge className={cn('w-fit px-2 py-1 text-[10px] font-bold', payrollBadgePrimary)}>
                                        {pendingBatches.length} waiting
                                    </Badge>
                                )}
                            </div>

                            {filteredPending.length === 0 ? (
                                <PayrollEmptyState message="Nothing waiting to review. Run Calculate payroll above, or clear search if you already posted." />
                            ) : (
                                <div className="space-y-3">
                                    {filteredPending.map((batch) => (
                                        <ProcessBatchCard
                                            key={`${batch.year}-${batch.month}-${batch.salary_type}`}
                                            batch={batch}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </PayrollSectionCard>
                </div>
            </PayrollPage>
        </Layout>
    );
}
