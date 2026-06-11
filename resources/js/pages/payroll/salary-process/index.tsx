import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { Calculator, ChevronRight, ChevronDown, SlidersHorizontal, Search, History, Clock, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const salaryTypeLabels: Record<string, string> = {
    salary: 'Monthly salary',
    bonus: 'Bonus',
    arrear: 'Arrear',
};

type Props = {
    filters: Record<string, string | boolean>;
    recentRuns: { id: number; year: number; month: number; label: string; status: string; employee_count: number; total_net: number; processed_at: string | null }[];
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

export default function SalaryProcessIndex({ filters: init, recentRuns, canProcess = false, ...options }: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string; info?: string };
    }>().props;

    const [filters, setFilters] = useState({
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        designation_id: String(init.designation_id || ''),
        program_id: String(init.program_id || ''),
        project_id: String(init.project_id || ''),
        employee_id: String(init.employee_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || ''),
        salary_type: String(init.salary_type || 'salary'),
        process_date: String(init.process_date || format(new Date(), DISPLAY_DATE_FMT)),
        is_partial: Boolean(init.is_partial),
    });
    const [processing, setProcessing] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);
    const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [recentSearch, setRecentSearch] = useState('');

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const allErrors = useMemo(
        () => flattenErrors({ ...pageErrors, ...submitErrors }),
        [pageErrors, submitErrors],
    );

    const filteredRecentRuns = useMemo(() => {
        if (!recentSearch.trim()) return recentRuns;
        const q = recentSearch.toLowerCase();
        return recentRuns.filter(
            (r) =>
                r.label.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q) ||
                String(r.employee_count).includes(q)
        );
    }, [recentRuns, recentSearch]);

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
            { ...filters, is_partial: filters.is_partial ? 1 : 0 },
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
            <Head title="Calculate payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Calculator}
                    title="Calculate payroll"
                    description="Run salary processing for active employees. Select a single branch or calculate all branches together."
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
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

                {(clientErrors.length > 0 || allErrors.length > 0) && (
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

                <div className="grid gap-6 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <PayrollSectionCard 
                            title="Scope & Configurations" 
                            description="Choose pay period and configure parameters. Each branch/month can only be calculated once until rolled back."
                        >
                            <div className="space-y-5">
                                <div className="grid gap-4.5 sm:grid-cols-3">
                                    <div className="sm:col-span-1">
                                        <PayrollYearSelect
                                            value={filters.year}
                                            onChange={(v) => setFilter('year', v)}
                                            years={options.years}
                                            required
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <PayrollMonthSelect
                                            value={filters.month}
                                            onChange={(v) => setFilter('month', v)}
                                            months={options.months}
                                            required
                                        />
                                        {submitErrors.month && <p className="text-[10px] text-red-500 mt-1">{submitErrors.month}</p>}
                                    </div>
                                    <div className="sm:col-span-1">
                                        <PayrollBranchSelect
                                            label="Branch"
                                            value={filters.branch_id}
                                            onChange={(v) => setFilter('branch_id', v)}
                                            branches={options.branches}
                                            allowAll
                                            allLabel="All branches (Bulk run)"
                                        />
                                        {submitErrors.branch_id && <p className="text-[10px] text-red-500 mt-1">{submitErrors.branch_id}</p>}
                                    </div>
                                </div>

                                <div className="grid gap-4.5 sm:grid-cols-3 border-t border-slate-100 pt-4">
                                    <div className="sm:col-span-1">
                                        <PayrollComboField
                                            label="Pay type"
                                            required
                                            value={filters.salary_type}
                                            onChange={(v) => setFilter('salary_type', v)}
                                            items={options.salaryTypes.map((t) => ({
                                                value: t.value,
                                                label: salaryTypeLabels[t.value] ?? t.label,
                                            }))}
                                            placeholder="Select pay type"
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <PayrollField label="Calculation date" required>
                                            <DatePicker
                                                selected={parseFormDateValue(filters.process_date)}
                                                onSelect={(d) => setFilter('process_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                                            />
                                            {submitErrors.process_date && <p className="text-[10px] text-red-500 mt-1">{submitErrors.process_date}</p>}
                                        </PayrollField>
                                    </div>
                                    <div className="sm:col-span-1 flex items-end">
                                        <label className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/40 px-3.5 py-2.5 h-8.5 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
                                            <Checkbox 
                                                checked={filters.is_partial} 
                                                onCheckedChange={(v) => setFilters((f) => ({ ...f, is_partial: Boolean(v) }))} 
                                            />
                                            <span className="text-[11px] font-semibold text-slate-600">Partial month calculations</span>
                                        </label>
                                    </div>
                                </div>

                                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border-t border-slate-100 pt-4">
                                    <CollapsibleTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="px-2 h-8 text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                                            {showAdvanced ? 'Hide advanced filters' : 'Show advanced scope filters'}
                                            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", showAdvanced && "rotate-180")} />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/[0.15] p-3.5">
                                            <PayrollFilterGrid 
                                                filters={filters} 
                                                setFilter={setFilter} 
                                                {...options} 
                                                showBranch={false}
                                                payrollReadyEmployees
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                * Leave these empty to process the whole branch. Using these targeting options will only run payroll for matching employees.
                                            </p>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>

                            <PayrollFormActions className="mt-5 border-t border-slate-100 pt-4">
                                <Button 
                                    onClick={runProcess} 
                                    disabled={processing || !canProcess} 
                                    className="cursor-pointer bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 h-9 shadow-sm flex items-center transition-all"
                                >
                                    <Calculator className="mr-2 h-4 w-4 shrink-0" />
                                    {processing ? 'Calculating payroll…' : 'Calculate payroll'}
                                </Button>
                            </PayrollFormActions>
                        </PayrollSectionCard>
                    </div>

                    <div className="lg:col-span-1">
                        <PayrollSectionCard 
                            title="Recent Calculations" 
                            description="Calculated periods awaiting review or posted."
                        >
                            <div className="space-y-4">
                                <div className="relative flex items-center">
                                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Search calculation runs..."
                                        value={recentSearch}
                                        onChange={(e) => setRecentSearch(e.target.value)}
                                        className="pl-8 text-xs h-8.5 bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
                                    />
                                </div>

                                {filteredRecentRuns.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400">
                                        <History className="mx-auto h-6 w-6 text-slate-300 stroke-1 mb-2" />
                                        <p className="text-xs font-medium">No calculations found</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[580px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                                        {(() => {
                                            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                            
                                            // Group by year and month
                                            const getBranchCodeFromLabel = (label: string): string => {
                                                const match = label.match(/\((\d+)\)/);
                                                return match ? match[1] : '';
                                            };

                                            const groups: Record<string, { year: number; month: number; label: string; runs: typeof recentRuns; totalNet: number; employeeCount: number }> = {};
                                            for (const r of filteredRecentRuns) {
                                                const key = `${r.year}-${r.month}`;
                                                if (!groups[key]) {
                                                    const mName = monthNames[r.month] || String(r.month);
                                                    groups[key] = {
                                                        year: r.year,
                                                        month: r.month,
                                                        label: `${mName} ${r.year}`,
                                                        runs: [],
                                                        totalNet: 0,
                                                        employeeCount: 0,
                                                    };
                                                }
                                                groups[key].runs.push(r);
                                                groups[key].totalNet += r.total_net;
                                                groups[key].employeeCount += r.employee_count;
                                            }

                                            // Sort runs within each group by branch code
                                            for (const key in groups) {
                                                groups[key].runs.sort((a, b) => {
                                                    const codeA = getBranchCodeFromLabel(a.label);
                                                    const codeB = getBranchCodeFromLabel(b.label);
                                                    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                                                });
                                            }

                                            const sortedGroups = Object.values(groups).sort((a, b) => {
                                                if (a.year !== b.year) return b.year - a.year;
                                                return b.month - a.month;
                                            });

                                            return sortedGroups.map((group) => {
                                                const groupKey = `${group.year}-${group.month}`;
                                                return (
                                                    <MonthGroupWrapper
                                                        key={groupKey}
                                                        group={group}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </PayrollSectionCard>
                    </div>
                </div>
            </PayrollPage>
        </Layout>
    );
}

function MonthGroupWrapper({
    group,
}: {
    group: {
        year: number;
        month: number;
        label: string;
        runs: any[];
        totalNet: number;
        employeeCount: number;
    };
}) {
    const [open, setOpen] = useState(false);
    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-100 bg-white shadow-2xs overflow-hidden">
            <CollapsibleTrigger asChild>
                <div className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50/50 focus:outline-hidden cursor-pointer">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">{group.label}</span>
                            <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border-none">
                                {group.runs.length} branch{group.runs.length === 1 ? '' : 'es'}
                            </Badge>
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-400 font-medium">
                            {group.employeeCount} employees · Net <span className="font-mono font-bold text-slate-600">৳{group.totalNet.toLocaleString()}</span>
                        </p>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100/70 bg-slate-50/20 p-3 space-y-2">
                    {group.runs.map((r, index) => (
                        <div 
                            key={r.id} 
                            className="group relative flex flex-col p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-slate-700 truncate pr-1">
                                    {(() => {
                                        const parts = r.label.split(' / ');
                                        const branchPart = parts[1] || r.label;
                                        const branchName = branchPart.replace(/\s+\d+\s+—\s+\d+$/, '');
                                        const type = parts[0] ? parts[0].toLowerCase() : 'salary';
                                        return `${index + 1}. ${branchName} (${salaryTypeLabels[type] || type})`;
                                    })()}
                                </span>
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                                        r.status === 'posted' 
                                            ? 'text-emerald-700 border-emerald-100 bg-emerald-50/50' 
                                            : 'text-amber-700 border-amber-100 bg-amber-50/50'
                                    )}
                                >
                                    {r.status}
                                </Badge>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-medium border-t border-slate-50/60 pt-2">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-slate-500">{r.employee_count} employees</span>
                                    <span className="font-mono mt-0.5 font-bold text-slate-600">৳{r.total_net.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-300" /> {r.processed_at ? r.processed_at.split(' ')[0] : '—'}</span>
                                </div>
                            </div>

                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button asChild size="icon" variant="ghost" className="h-6 w-6 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer">
                                    <Link href={route('salary-post.period', { year: r.year, month: r.month })}>
                                        <ArrowRight className="h-3 w-3 text-slate-500" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}


