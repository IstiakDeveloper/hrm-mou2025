import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

type Props = {
    run: {
        id: number;
        year: number;
        month: number;
        salary_type: string;
        branch: string | null;
        status: string;
        employee_count: number;
        total_gross: number;
        total_deduction: number;
        total_net: number;
        processed_at: string | null;
    };
    payslips: {
        id: number;
        pin: string;
        name: string;
        grade: string | null;
        step: number | null;
        basic: number;
        gross: number;
        deduction: number;
        net: number;
        is_withheld: boolean;
    }[];
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalaryPostShow({ run, payslips }: Props) {
    const [posting, setPosting] = useState(false);
    const isPosted = run.status === 'posted';

    const post = () => {
        if (!confirm('Finalize this payroll? The period will be locked.')) return;
        setPosting(true);
        router.post(route('salary-post.post', run.id), {}, { onFinish: () => setPosting(false) });
    };

    return (
        <Layout>
            <Head title="Review payroll" />
            <PayrollPage>
                <PayrollPageHeader
                    title={`${monthNames[run.month] ?? run.month} ${run.year} — ${run.branch ?? 'Branch'}`}
                    description={`${run.salary_type} · Calculated ${run.processed_at ?? ''}`}
                >
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('salary-post.index')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    {!isPosted && (
                        <Button onClick={post} disabled={posting}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {posting ? 'Posting…' : 'Finalize payroll'}
                        </Button>
                    )}
                    {isPosted && <Badge className="h-9 px-3 text-sm">Posted</Badge>}
                </PayrollPageHeader>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Employees', value: run.employee_count.toLocaleString() },
                        { label: 'Gross (৳)', value: run.total_gross.toLocaleString() },
                        { label: 'Deductions (৳)', value: run.total_deduction.toLocaleString() },
                        { label: 'Net payable (৳)', value: run.total_net.toLocaleString(), highlight: true },
                    ].map((s) => (
                        <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.highlight ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                            <p className={`mt-1 text-lg font-bold tabular-nums ${s.highlight ? 'text-emerald-800' : 'text-slate-900'}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <PayrollSectionCard title="Employee payslips" description="Withheld employees show net ৳ 0.">
                    <div className="overflow-x-auto -mx-4 sm:-mx-5">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>PIN</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Step</TableHead>
                                    <TableHead className="text-right">Basic</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Deduction</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((p) => (
                                    <TableRow key={p.id} className={p.is_withheld ? 'bg-amber-50/40' : undefined}>
                                        <TableCell className="font-mono text-xs">{p.pin}</TableCell>
                                        <TableCell className="text-sm">
                                            {p.name}
                                            {p.is_withheld && <Badge variant="outline" className="ml-2 text-[10px]">On hold</Badge>}
                                        </TableCell>
                                        <TableCell className="text-sm">{p.grade ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{p.step ?? '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">{p.basic.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">{p.gross.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">{p.deduction.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums text-sm font-medium">{p.net.toLocaleString()}</TableCell>
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
