import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { CheckCircle2, Eye } from 'lucide-react';

type Run = {
    id: number;
    year: number;
    month: number;
    salary_type: string;
    branch: string;
    employee_count: number;
    total_net: number;
    processed_at: string | null;
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalaryPostIndex({ runs }: { runs: Run[] }) {
    return (
        <Layout>
            <Head title="Finalize payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={CheckCircle2}
                    title="Finalize payroll"
                    description="Review calculated payroll, then post to lock the period. Posted payroll cannot be edited — use Undo payroll if you need to recalculate."
                />

                <PayrollSectionCard title="Ready to post" description="These runs have been calculated but not yet finalized.">
                    {runs.length === 0 ? (
                        <PayrollEmptyState message="Nothing waiting to post. Run Calculate payroll first." />
                    ) : (
                        <div className="overflow-x-auto -mx-4 sm:-mx-5">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead>Period</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Employees</TableHead>
                                        <TableHead className="text-right">Net payable (৳)</TableHead>
                                        <TableHead>Calculated</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {runs.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{monthNames[r.month] ?? r.month} {r.year}</TableCell>
                                            <TableCell>{r.branch}</TableCell>
                                            <TableCell><Badge variant="outline">{r.salary_type}</Badge></TableCell>
                                            <TableCell className="text-right tabular-nums">{r.employee_count}</TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">{r.total_net.toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{r.processed_at ?? '—'}</TableCell>
                                            <TableCell>
                                                <Button asChild size="sm">
                                                    <Link href={route('salary-post.show', r.id)}>
                                                        <Eye className="mr-1.5 h-4 w-4" /> Review & post
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
