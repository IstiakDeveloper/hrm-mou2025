import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, TrendingDown } from 'lucide-react';

export default function AssetDepreciationSchedule({
    asset,
    posted,
    projected,
}: {
    asset: {
        id: number;
        asset_tag: string;
        name: string;
        purchase_cost: string | null;
        salvage_value: string | null;
        accumulated_depreciation: string | null;
        book_value: string | null;
        useful_life_years: number | null;
        depreciation_method: string | null;
        monthly_amount: number;
    };
    posted: Array<{ id: number; period_year: number; period_month: number; depreciation_amount: string; book_value_after: string }>;
    projected: Array<{ year: number; month: number; amount: number; accumulated: number; book_value: number }>;
}) {
    const postedKeys = new Set(posted.map((p) => `${p.period_year}-${p.period_month}`));

    return (
        <Layout>
            <Head title={`Depreciation — ${asset.asset_tag}`} />
            <PayrollPage>
                <Link href={route('fixed-assets.show', asset.id)} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to asset
                </Link>
                <PayrollPageHeader icon={TrendingDown} title={`Depreciation — ${asset.asset_tag}`} description={asset.name} />

                <div className="mb-4 grid gap-4 md:grid-cols-4">
                    <PayrollSectionCard title="Purchase cost"><p className="text-lg font-semibold">{asset.purchase_cost ?? '—'}</p></PayrollSectionCard>
                    <PayrollSectionCard title="Accumulated"><p className="text-lg font-semibold">{asset.accumulated_depreciation ?? 0}</p></PayrollSectionCard>
                    <PayrollSectionCard title="Book value"><p className="text-lg font-semibold">{asset.book_value ?? '—'}</p></PayrollSectionCard>
                    <PayrollSectionCard title="Monthly charge"><p className="text-lg font-semibold">{asset.monthly_amount}</p></PayrollSectionCard>
                </div>

                <PayrollSectionCard title="Schedule (projected & posted)">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Accumulated</TableHead>
                                <TableHead>Book value</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projected.map((row, idx) => {
                                const key = `${row.year}-${row.month}`;
                                const isPosted = postedKeys.has(key);
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{row.month}/{row.year}</TableCell>
                                        <TableCell>{row.amount}</TableCell>
                                        <TableCell>{row.accumulated}</TableCell>
                                        <TableCell>{row.book_value}</TableCell>
                                        <TableCell>
                                            <Badge variant={isPosted ? 'default' : 'outline'}>{isPosted ? 'Posted' : 'Projected'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
