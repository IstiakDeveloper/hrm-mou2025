import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { DepreciationPeriodFilters, type FinancialYearOpt, type FyPeriod } from '@/components/fixed-asset/DepreciationPeriodFilters';
import { hasAppPermission } from '@/lib/permissions';
import { PenLine } from 'lucide-react';

type EntryRow = {
    id: number;
    period_year: number;
    period_month: number;
    depreciation_amount: string;
    notes: string | null;
    fixed_asset?: { asset_tag: string; manual_asset_code: string | null; name: string; branch?: { name: string } };
};

type AssetOpt = { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null };

export default function DepreciationManual({
    entries,
    assets,
    filters,
    branches,
    branchScoped,
    financialYears,
    financialYear,
    period,
    fyPeriods,
}: {
    entries: { data: EntryRow[] };
    assets: AssetOpt[];
    filters: Record<string, string | undefined>;
    branches: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    branchScoped: boolean;
    financialYears: FinancialYearOpt[];
    financialYear: { id: number; label: string } | null;
    period: { year: number; month: number };
    fyPeriods: FyPeriod[];
}) {
    const { flash, auth } = usePage<{ flash?: { success?: string }; auth?: object }>().props;
    const canPost = hasAppPermission(auth, 'fixed-assets.edit');

    const [financialYearId, setFinancialYearId] = useState(financialYear?.id ?? null);
    const [year, setYear] = useState(period.year);
    const [month, setMonth] = useState(period.month);
    const [branchId, setBranchId] = useState(filters.branch_id ? Number(filters.branch_id) : null);
    const [search, setSearch] = useState(filters.search || '');

    const { data, setData, processing, errors } = useForm({
        fixed_asset_id: null as number | null,
        financial_year_id: financialYearId,
        year,
        month,
        depreciation_amount: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('fixed-asset.depreciation.manual.store'), {
            ...data,
            financial_year_id: financialYearId,
        });
    };

    return (
        <Layout>
            <Head title="Manual depreciation" />
            <PayrollPage>
                <PayrollPageHeader icon={PenLine} title="Manual depreciation" description="Post a one-off depreciation entry for a specific asset and period." />
                <BranchScopeAlert branchScoped={branchScoped} />

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-4 grid gap-4 lg:grid-cols-2">
                    {canPost && (
                        <PayrollSectionCard title="New manual entry">
                            <form onSubmit={submit} className="space-y-3">
                                <div>
                                    <Label>Asset</Label>
                                    <ComboSelect
                                        value={data.fixed_asset_id}
                                        onChange={(v) => setData('fixed_asset_id', v)}
                                        items={assets.map((a) => ({
                                            value: a.id,
                                            label: `${a.manual_asset_code || a.asset_tag} — ${a.name}`,
                                        }))}
                                        placeholder="Select asset"
                                    />
                                    {errors.fixed_asset_id && <p className="text-xs text-destructive">{errors.fixed_asset_id}</p>}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label>Year</Label>
                                        <Input type="number" value={data.year} onChange={(e) => setData('year', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <Label>Month</Label>
                                        <Input type="number" min={1} max={12} value={data.month} onChange={(e) => setData('month', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div>
                                    <Label>Amount</Label>
                                    <Input type="number" step="0.01" value={data.depreciation_amount} onChange={(e) => setData('depreciation_amount', e.target.value)} />
                                    {errors.depreciation_amount && <p className="text-xs text-destructive">{errors.depreciation_amount}</p>}
                                </div>
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                                </div>
                                <Button type="submit" disabled={processing}>Post manual entry</Button>
                            </form>
                        </PayrollSectionCard>
                    )}
                    <PayrollSectionCard title="Filter manual entries">
                        <DepreciationPeriodFilters
                            routeName="fixed-asset.depreciation.manual"
                            financialYears={financialYears}
                            financialYearId={financialYearId}
                            onFinancialYearIdChange={(id) => { setFinancialYearId(id); setData('financial_year_id', id); }}
                            fyPeriods={fyPeriods}
                            year={year}
                            month={month}
                            onYearChange={(y) => { setYear(y); setData('year', y); }}
                            onMonthChange={(m) => { setMonth(m); setData('month', m); }}
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

                <PayrollSectionCard title="Manual entries">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No manual entries yet.</TableCell></TableRow>
                            ) : entries.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-mono text-xs">{row.fixed_asset?.manual_asset_code || row.fixed_asset?.asset_tag}</div>
                                        <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                                    </TableCell>
                                    <TableCell>{row.period_month}/{row.period_year}</TableCell>
                                    <TableCell>{row.depreciation_amount}</TableCell>
                                    <TableCell className="max-w-xs truncate text-xs">{row.notes || '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
