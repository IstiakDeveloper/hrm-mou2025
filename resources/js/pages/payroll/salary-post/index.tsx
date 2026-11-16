import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollBranchSelect, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState, payrollBtnPrimary, payrollBadgePrimary } from '@/components/payroll/PayrollPageShell';
import { payrollPostLabels, payrollPostRoutes, type PayrollPostContext } from '@/lib/payroll-post-routes';
import { cn } from '@/lib/utils';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { CheckCircle2, ChevronDown, Eye, Search, FolderOpen, Archive, Users, Building, Coins } from 'lucide-react';

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
    pendingBatches: PeriodBatch[];
    postedBatches: PeriodBatch[];
    filters: Record<string, string>;
    branches: { id: number; name: string; branch_code?: string | null }[];
    months: { value: number; label: string }[];
    years: number[];
    pageContext?: PayrollPostContext;
};

function PeriodBatchCard({
    batch,
    showPostedAt,
    pageContext,
}: {
    batch: PeriodBatch;
    showPostedAt?: boolean;
    pageContext: PayrollPostContext;
}) {
    const routes = payrollPostRoutes(pageContext);
    const [open, setOpen] = useState(false);
    const status = showPostedAt ? 'posted' : 'processed';

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
                                {batch.bonus_label ?? batch.salary_type}
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
                            <span>{showPostedAt ? `Posted ${batch.posted_at ?? '—'}` : `Calculated ${batch.processed_at ?? '—'}`}</span>
                        </p>
                    </div>
                </CollapsibleTrigger>
                <Button asChild size="sm" variant={showPostedAt ? 'outline' : 'default'} className={cn('cursor-pointer font-semibold rounded-lg shadow-sm', !showPostedAt && payrollBtnPrimary)}>
                    <Link href={routes.period(batch.year, batch.month, status)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {showPostedAt ? 'View details' : 'Review & post'}
                    </Link>
                </Button>
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
                                    <Link href={routes.show(branch.id)}>{showPostedAt ? 'View branch' : 'Review branch'}</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function SalaryPostIndex({
    pendingBatches,
    postedBatches,
    filters: init,
    branches,
    months,
    years,
    pageContext = 'salary',
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string; info?: string } }>().props;
    const routes = payrollPostRoutes(pageContext);
    const copy = payrollPostLabels(pageContext);
    const [filters, setFilters] = useState({
        branch_id: String(init.branch_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || ''),
    });
    const [searchQuery, setSearchQuery] = useState('');
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const applyFilters = () => router.get(routes.index(), filters, { preserveState: true });

    const filterBatches = (batches: PeriodBatch[]) => {
        if (!searchQuery.trim()) return batches;
        const q = searchQuery.toLowerCase();
        return batches.filter(
            (b) =>
                b.period_label.toLowerCase().includes(q) ||
                b.salary_type.toLowerCase().includes(q) ||
                (b.bonus_label && b.bonus_label.toLowerCase().includes(q)) ||
                b.branches.some((branch) => branch.branch.toLowerCase().includes(q))
        );
    };

    const filteredPending = useMemo(() => filterBatches(pendingBatches), [pendingBatches, searchQuery]);
    const filteredPosted = useMemo(() => filterBatches(postedBatches), [postedBatches, searchQuery]);

    return (
        <Layout>
            <Head title={copy.listTitle} />
            <PayrollPage>
                <PayrollPageHeader
                    icon={CheckCircle2}
                    title={copy.listTitle}
                    description={copy.listDescription}
                />

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.error && (
                    <Alert className="mb-6 border-red-100 bg-red-50/30 text-red-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Error</AlertTitle>
                        <AlertDescription className="text-xs text-red-700/95 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                {flash?.info && (
                    <Alert className="mb-6 border-sky-100 bg-sky-50/30 text-sky-900 rounded-xl shadow-xs transition-all duration-300">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-sky-800">Details</AlertTitle>
                        <AlertDescription className="text-xs text-sky-700/90 mt-1">{flash.info}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col gap-6">
                    <PayrollSectionCard title="Filter Period Database" className="w-full">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
                            <div className="grid gap-3 flex-1 sm:grid-cols-3">
                                <PayrollBranchSelect
                                    value={filters.branch_id}
                                    onChange={(v) => setFilter('branch_id', v)}
                                    branches={branches}
                                    allowAll
                                />
                                <PayrollYearSelect
                                    value={filters.year}
                                    onChange={(v) => setFilter('year', v)}
                                    years={years}
                                    allowAll
                                />
                                <PayrollMonthSelect
                                    value={filters.month}
                                    onChange={(v) => setFilter('month', v)}
                                    months={months}
                                    allowAll
                                />
                            </div>
                            <Button type="button" onClick={applyFilters} className={cn('cursor-pointer h-9 px-4 font-semibold shadow-sm shrink-0 rounded-lg', payrollBtnPrimary)}>
                                <Search className="mr-1.5 h-4 w-4" /> Apply filter
                             </Button>
                        </div>
                    </PayrollSectionCard>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex items-center max-w-sm w-full">
                                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    placeholder="Search by month, branch name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 text-xs h-8.5 bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <Tabs defaultValue="pending" className="w-full">
                            <TabsList className="bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40">
                                <TabsTrigger value="pending" className="cursor-pointer text-xs font-semibold px-4 py-1.5 flex items-center gap-1.5 rounded-md">
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    {copy.readySection}
                                    {pendingBatches.length > 0 && (
                                        <Badge className={cn('ml-1 px-1.5 py-0 text-[10px] font-bold', payrollBadgePrimary)}>
                                            {pendingBatches.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="posted" className="cursor-pointer text-xs font-semibold px-4 py-1.5 flex items-center gap-1.5 rounded-md">
                                    <Archive className="h-3.5 w-3.5" />
                                    {copy.postedSection}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending" className="pt-3 focus-visible:outline-none">
                                {filteredPending.length === 0 ? (
                                    <PayrollEmptyState message={copy.emptyPending} />
                                ) : (
                                    <div className="space-y-3">
                                        {filteredPending.map((batch) => (
                                            <PeriodBatchCard 
                                                key={`${batch.year}-${batch.month}`} 
                                                batch={batch} 
                                                pageContext={pageContext} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="posted" className="pt-3 focus-visible:outline-none">
                                {filteredPosted.length === 0 ? (
                                    <PayrollEmptyState message={copy.emptyPosted} />
                                ) : (
                                    <div className="space-y-3">
                                        {filteredPosted.map((batch) => (
                                            <PeriodBatchCard
                                                key={`posted-${batch.year}-${batch.month}`}
                                                batch={batch}
                                                showPostedAt
                                                pageContext={pageContext}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </PayrollPage>
        </Layout>
    );
}

