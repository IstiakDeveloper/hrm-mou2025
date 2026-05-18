import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollBranchSelect, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { payrollPostLabels, payrollPostRoutes, type PayrollPostContext } from '@/lib/payroll-post-routes';
import { CheckCircle2, Eye, Search } from 'lucide-react';

type Run = {
    id: number;
    year: number;
    month: number;
    salary_type: string;
    bonus_label?: string | null;
    branch: string;
    status: string;
    employee_count: number;
    total_net: number;
    processed_at: string | null;
    posted_at: string | null;
};

type Props = {
    pendingRuns: Run[];
    postedRuns: Run[];
    filters: Record<string, string>;
    branches: { id: number; name: string; branch_code?: string | null }[];
    months: { value: number; label: string }[];
    years: number[];
    pageContext?: PayrollPostContext;
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function RunTable({ runs, showPostedAt, pageContext }: { runs: Run[]; showPostedAt?: boolean; pageContext: PayrollPostContext }) {
    const routes = payrollPostRoutes(pageContext);
    return (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead>Period</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Employees</TableHead>
                        <TableHead className="text-right">Net payable (৳)</TableHead>
                        <TableHead>{showPostedAt ? 'Posted' : 'Calculated'}</TableHead>
                        <TableHead />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {runs.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium">
                                {monthNames[r.month] ?? r.month} {r.year}
                            </TableCell>
                            <TableCell>{r.branch}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{r.bonus_label ?? r.salary_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.employee_count}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{r.total_net.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {showPostedAt ? r.posted_at ?? '—' : r.processed_at ?? '—'}
                            </TableCell>
                            <TableCell>
                                <Button asChild size="sm" variant={showPostedAt ? 'outline' : 'default'}>
                                    <Link href={routes.show(r.id)}>
                                        <Eye className="mr-1.5 h-4 w-4" />
                                        {showPostedAt ? 'View' : 'Review & post'}
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function SalaryPostIndex({
    pendingRuns,
    postedRuns,
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
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const applyFilters = () => router.get(routes.index(), filters, { preserveState: true });

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
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-950">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.info && (
                    <Alert className="mb-6 border-sky-200 bg-sky-50 text-sky-950">
                        <AlertTitle>Details</AlertTitle>
                        <AlertDescription>{flash.info}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filter" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-3">
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
                    <div className="mt-4">
                        <Button type="button" variant="outline" onClick={applyFilters}>
                            <Search className="mr-2 h-4 w-4" /> Apply filter
                        </Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard
                    title={copy.readySection}
                    description={copy.readyDescription}
                    className="mb-6"
                >
                    {pendingRuns.length === 0 ? (
                        <PayrollEmptyState message={copy.emptyPending} />
                    ) : (
                        <RunTable runs={pendingRuns} pageContext={pageContext} />
                    )}
                </PayrollSectionCard>

                <PayrollSectionCard title={copy.postedSection} description="Finalized periods remain here for review.">
                    {postedRuns.length === 0 ? (
                        <PayrollEmptyState message={copy.emptyPosted} />
                    ) : (
                        <RunTable runs={postedRuns} showPostedAt pageContext={pageContext} />
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
