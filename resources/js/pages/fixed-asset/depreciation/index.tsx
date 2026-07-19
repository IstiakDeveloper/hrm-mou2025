import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { hasAppPermission } from '@/lib/permissions';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { Play, Search, TrendingDown } from 'lucide-react';

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

type EntryRow = {
    id: number;
    period_year: number;
    period_month: number;
    depreciation_amount: string;
    book_value_after: string;
    fixed_asset?: { id: number; asset_tag: string; name: string; branch?: { name: string } };
};

export default function AssetDepreciationIndex({
    entries,
    filters,
    period,
    summary,
    branches,
    branchScoped,
}: {
    entries: { data: EntryRow[] };
    filters: Record<string, string | undefined>;
    period: { year: number; month: number };
    summary: { eligible: number; posted: number; pending: number };
    branches: { id: number; name: string }[];
    branchScoped?: boolean;
}) {
    const { flash, auth } = usePage<{ flash?: { success?: string; warning?: string; error?: string }; auth?: object }>().props;
    const canRun = hasAppPermission(auth, 'fixed-assets.edit');

    const [year, setYear] = useState(period.year);
    const [month, setMonth] = useState(period.month);
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = () => {
        router.get(route('fixed-asset.depreciation.index'), {
            year,
            month,
            branch_id: branchId ?? undefined,
            search: search || undefined,
        }, { preserveState: true });
    };

    const runDepreciation = () => {
        if (!confirm(`Post straight-line depreciation for ${MONTHS.find((m) => m.value === month)?.label} ${year}?`)) return;
        router.post(route('fixed-asset.depreciation.post'), {
            year,
            month,
            branch_id: branchId ?? undefined,
        });
    };

    return (
        <Layout>
            <Head title="Depreciation" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={TrendingDown}
                    title="Monthly depreciation"
                    description="Straight-line depreciation updates book value automatically."
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
                        <p className="text-sm text-muted-foreground">Eligible assets: <strong>{summary.eligible}</strong></p>
                        <p className="text-sm text-muted-foreground">Posted this period: <strong>{summary.posted}</strong></p>
                        <p className="text-sm text-muted-foreground">Still pending: <strong>{summary.pending}</strong></p>
                        {canRun && summary.pending > 0 && (
                            <Button className="mt-3" size="sm" onClick={runDepreciation}>
                                <Play className="mr-2 h-4 w-4" />Run depreciation
                            </Button>
                        )}
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Period" className="md:col-span-2">
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <Label>Year</Label>
                                <Input type="number" className="w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>Month</Label>
                                <ComboSelect value={month} onChange={(v) => v && setMonth(Number(v))} items={MONTHS} className="min-w-[140px]" />
                            </div>
                            <ComboSelect value={branchId} onChange={(v) => setBranchId(v)} items={branchComboSelectItems(branches, { numericValue: true })} placeholder="All branches" className="min-w-[160px]" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Asset tag…" className="max-w-xs" />
                            <Button variant="outline" onClick={applyFilters}><Search className="h-4 w-4" /></Button>
                        </div>
                    </PayrollSectionCard>
                </div>

                <PayrollSectionCard title="Posted entries">
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
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        No entries for this period. Use Run depreciation when ready.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Link href={route('fixed-asset.depreciation.schedule', row.fixed_asset!.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                                {row.fixed_asset?.asset_tag}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                        </TableCell>
                                        <TableCell>{row.fixed_asset?.branch?.name ?? '—'}</TableCell>
                                        <TableCell>{row.depreciation_amount}</TableCell>
                                        <TableCell>{row.book_value_after}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
