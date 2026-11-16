import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { DepreciationPeriodFilters, type FinancialYearOpt, type FyPeriod } from '@/components/fixed-asset/DepreciationPeriodFilters';
import { Calculator } from 'lucide-react';
import { formatTakaAmount } from '@/lib/taka-format';

type CalcRow = {
    asset_id: number;
    asset_tag: string;
    manual_asset_code: string | null;
    name: string;
    branch_name: string | null;
    depreciation_method: string | null;
    depreciation_rate: string | null;
    amount: number;
    will_post: boolean;
    skip_reason: string | null;
};

export default function DepreciationCalculation({
    rows,
    summary,
    filters,
    branches,
    branchScoped,
    financialYears,
    financialYear,
    period,
    fyPeriods,
}: {
    rows: CalcRow[];
    summary: { eligible: number; will_post: number; skipped: number; total_amount: number };
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    branchScoped: boolean;
    financialYears: FinancialYearOpt[];
    financialYear: { id: number; label: string } | null;
    period: { year: number; month: number };
    fyPeriods: FyPeriod[];
}) {
    const [financialYearId, setFinancialYearId] = useState(financialYear?.id ?? (filters.financial_year_id ? Number(filters.financial_year_id) : null));
    const [year, setYear] = useState(period.year);
    const [month, setMonth] = useState(period.month);
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);

    return (
        <Layout>
            <Head title="Depreciation calculation" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Calculator}
                    title="Depreciation calculation"
                    description={financialYear ? `Preview for FY ${financialYear.label} (July–June).` : 'Preview depreciation before posting.'}
                />
                <BranchScopeAlert branchScoped={branchScoped} />

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                    <PayrollSectionCard title="Summary">
                        <p className="text-sm text-muted-foreground">Eligible: <strong>{summary.eligible}</strong></p>
                        <p className="text-sm text-muted-foreground">Will post: <strong>{summary.will_post}</strong></p>
                        <p className="text-sm text-muted-foreground">Skipped: <strong>{summary.skipped}</strong></p>
                        <p className="text-sm text-muted-foreground">Total amount: <strong>{formatTakaAmount(summary.total_amount, 2)}</strong></p>
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Period" className="md:col-span-2">
                        <DepreciationPeriodFilters
                            routeName="fixed-asset.depreciation.calculation"
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
                        />
                    </PayrollSectionCard>
                </div>

                <PayrollSectionCard title="Calculation preview">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No eligible assets for this period.</TableCell></TableRow>
                            ) : rows.map((row) => (
                                <TableRow key={row.asset_id}>
                                    <TableCell>
                                        <div className="font-mono text-xs">{row.manual_asset_code || row.asset_tag}</div>
                                        <div className="text-xs text-muted-foreground">{row.name}</div>
                                    </TableCell>
                                    <TableCell>{row.branch_name ?? '—'}</TableCell>
                                    <TableCell className="text-xs">{row.depreciation_method?.replace('_', ' ') ?? '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatTakaAmount(row.amount, 2)}</TableCell>
                                    <TableCell>
                                        {row.will_post ? (
                                            <Badge>Will post</Badge>
                                        ) : (
                                            <Badge variant="outline">{row.skip_reason || 'Skip'}</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
