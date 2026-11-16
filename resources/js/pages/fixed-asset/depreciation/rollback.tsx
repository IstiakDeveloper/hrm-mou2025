import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { DepreciationPeriodFilters, type FinancialYearOpt, type FyPeriod } from '@/components/fixed-asset/DepreciationPeriodFilters';
import { hasAppPermission } from '@/lib/permissions';
import { RotateCcw } from 'lucide-react';

type EntryRow = {
    id: number;
    depreciation_amount: string;
    book_value_after: string;
    fixed_asset?: { asset_tag: string; manual_asset_code: string | null; name: string; branch?: { name: string } };
};

export default function DepreciationRollback({
    entries,
    entryCount,
    filters,
    branches,
    branchScoped,
    financialYears,
    financialYear,
    period,
    fyPeriods,
}: {
    entries: { data: EntryRow[] };
    entryCount: number;
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    branchScoped: boolean;
    financialYears: FinancialYearOpt[];
    financialYear: { id: number; label: string } | null;
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

    const runRollback = () => {
        if (!confirm(`Rollback auto depreciation for ${periodLabel}? This will recalculate book values.`)) return;
        router.post(route('fixed-asset.depreciation.rollback.run'), {
            financial_year_id: financialYearId ?? undefined,
            year,
            month,
            branch_id: branchId ?? undefined,
        });
    };

    return (
        <Layout>
            <Head title="Depreciation rollback" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={RotateCcw}
                    title="Depreciation rollback"
                    description="Reverse auto-posted depreciation for a financial year period."
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

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                    <PayrollSectionCard title="Rollback">
                        <p className="text-sm text-muted-foreground">Auto entries in period: <strong>{entryCount}</strong></p>
                        {canRun && entryCount > 0 && (
                            <Button className="mt-3" size="sm" variant="destructive" onClick={runRollback}>
                                <RotateCcw className="mr-2 h-4 w-4" />Rollback period
                            </Button>
                        )}
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Period" className="md:col-span-2">
                        <DepreciationPeriodFilters
                            routeName="fixed-asset.depreciation.rollback"
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

                <PayrollSectionCard title="Auto entries to rollback">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Book value after</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No auto entries for this period.</TableCell></TableRow>
                            ) : entries.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-mono text-xs">{row.fixed_asset?.manual_asset_code || row.fixed_asset?.asset_tag}</div>
                                        <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                    </TableCell>
                                    <TableCell>{row.fixed_asset?.branch?.name ?? '—'}</TableCell>
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
