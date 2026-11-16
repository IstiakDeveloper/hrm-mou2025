import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { DepreciationPeriodFilters, type FinancialYearOpt, type FyPeriod } from '@/components/fixed-asset/DepreciationPeriodFilters';
import { hasAppPermission } from '@/lib/permissions';
import { Play, TrendingDown } from 'lucide-react';

type EntryRow = {
    id: number;
    period_year: number;
    period_month: number;
    depreciation_amount: string;
    book_value_after: string;
    entry_type: string;
    fixed_asset?: { id: number; asset_tag: string; manual_asset_code: string | null; name: string; branch?: { name: string } };
    financial_year?: { label: string } | null;
};

export default function DepreciationPosting({
    entries,
    filters,
    summary,
    branches,
    branchScoped,
    financialYears,
    financialYear,
    period,
    fyPeriods,
}: {
    entries: { data: EntryRow[] };
    filters: Record<string, string | undefined>;
    summary: { eligible: number; will_post: number; skipped: number; total_amount: number; posted: number; pending: number };
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    branchScoped: boolean;
    financialYears: FinancialYearOpt[];
    financialYear: { id: number; label: string; is_closed?: boolean } | null;
    period: { year: number; month: number };
    fyPeriods: FyPeriod[];
}) {
    const { flash, auth } = usePage<{ flash?: { success?: string; warning?: string; error?: string }; auth?: object }>().props;
    const canRun = hasAppPermission(auth, 'fixed-assets.edit');

    const [financialYearId, setFinancialYearId] = useState(financialYear?.id ?? null);
    const [year, setYear] = useState(period.year);
    const [month, setMonth] = useState(period.month);
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [search, setSearch] = useState(filters.search || '');

    const periodLabel = fyPeriods.find((p) => p.year === period.year && p.month === period.month)?.label
        ?? `${period.month}/${period.year}`;

    const runDepreciation = () => {
        if (!confirm(`Post depreciation for ${periodLabel}?`)) return;
        router.post(route('fixed-asset.depreciation.post'), {
            financial_year_id: financialYearId ?? undefined,
            year,
            month,
            branch_id: branchId ?? undefined,
        });
    };

    return (
        <Layout>
            <Head title="Depreciation posting" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={TrendingDown}
                    title="Depreciation posting"
                    description="Post monthly depreciation for the selected financial year period."
                />
                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.warning && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertTitle>Completed with warnings</AlertTitle>
                        <AlertDescription>{flash.warning}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                    <PayrollSectionCard title="Period summary">
                        <p className="text-sm text-muted-foreground">Eligible: <strong>{summary.eligible}</strong></p>
                        <p className="text-sm text-muted-foreground">Will post: <strong>{summary.will_post}</strong></p>
                        <p className="text-sm text-muted-foreground">Pending: <strong>{summary.pending}</strong></p>
                        <p className="text-sm text-muted-foreground">Posted entries: <strong>{summary.posted}</strong></p>
                        {canRun && summary.will_post > 0 && !financialYear?.is_closed && (
                            <Button className="mt-3" size="sm" onClick={runDepreciation}>
                                <Play className="mr-2 h-4 w-4" />Post depreciation
                            </Button>
                        )}
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Period" className="md:col-span-2">
                        <DepreciationPeriodFilters
                            routeName="fixed-asset.depreciation.posting"
                            financialYears={financialYears}
                            financialYearId={financialYearId}
                            onFinancialYearIdChange={setFinancialYearId}
                            fyPeriods={fyPeriods}
                            year={year}
                            month={month}
                            onYearChange={setYear}
                            onMonthChange={setMonth}
                            branches={branches}
                            branchId={branchId}
                            onBranchIdChange={setBranchId}
                            branchScoped={branchScoped}
                            search={search}
                            onSearchChange={setSearch}
                            showSearch
                        />
                    </PayrollSectionCard>
                </div>

                <PayrollSectionCard title="Posted entries">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Book value after</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No entries for this period.
                                    </TableCell>
                                </TableRow>
                            ) : entries.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Link href={route('fixed-asset.depreciation.schedule', row.fixed_asset!.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                            {row.fixed_asset?.manual_asset_code || row.fixed_asset?.asset_tag}
                                        </Link>
                                        <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                    </TableCell>
                                    <TableCell>{row.fixed_asset?.branch?.name ?? '—'}</TableCell>
                                    <TableCell><Badge variant="outline">{row.entry_type}</Badge></TableCell>
                                    <TableCell>{row.depreciation_amount}</TableCell>
                                    <TableCell>{row.book_value_after}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
