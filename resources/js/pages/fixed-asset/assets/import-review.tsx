import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check } from 'lucide-react';

type Row = {
    row: number;
    name: string;
    category_code: string;
    branch_code: string;
    branch_name?: string;
    purchase_cost?: string;
    valid: boolean;
    issues: string[];
};

export default function FixedAssetImportReview({
    importId,
    rows,
    validCount,
    invalidCount,
}: {
    importId: string;
    rows: Row[];
    validCount: number;
    invalidCount: number;
}) {
    const { post, processing } = useForm({ importId });

    const commit = () => {
        post(route('fixed-assets.import.commit'));
    };

    return (
        <Layout>
            <Head title="Review import" />
            <PayrollPage>
                <PayrollPageHeader
                    title="Review import"
                    description={`${validCount} valid · ${invalidCount} with errors (max 500 rows)`}
                >
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('fixed-assets.import.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Upload again
                        </Link>
                    </Button>
                </PayrollPageHeader>

                <PayrollSectionCard title="Preview rows">
                    <div className="mb-4 flex gap-2">
                        <Button onClick={commit} disabled={processing || validCount === 0}>
                            <Check className="mr-2 h-4 w-4" /> Import {validCount} valid row(s)
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Row</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.row}>
                                        <TableCell>{r.row}</TableCell>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>{r.category_code}</TableCell>
                                        <TableCell>{r.branch_name ?? r.branch_code}</TableCell>
                                        <TableCell>{r.purchase_cost ?? '—'}</TableCell>
                                        <TableCell>
                                            {r.valid ? (
                                                <Badge>OK</Badge>
                                            ) : (
                                                <span className="text-xs text-destructive">{r.issues.join('; ')}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
