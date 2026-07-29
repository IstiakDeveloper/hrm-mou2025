import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Filter, HandCoins, Search } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';

type LoanRow = {
    id: number;
    loan_number: string;
    loan_type: string;
    loan_type_label: string;
    policy_name: string | null;
    status: string;
    principal_amount: number;
    service_charge_amount: number;
    total_payable: number;
    installment_amount: number;
    outstanding_balance: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    installment_count: number;
    paid_installments: number;
    next_due_date: string | null;
    disbursement_date: string | null;
};

type Props = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
        designation?: { name?: string } | null;
        department?: { name?: string } | null;
        branch?: { name?: string } | null;
    };
    filters: {
        status: string;
        loan_type: string;
    };
    loanTypes: { value: string; label: string }[];
    statusOptions: { value: string; label: string }[];
    loans: LoanRow[];
};

const fmt = fmtLoanAmount;

export default function EmployeeLoanIndex({ employee, filters: initialFilters, loanTypes, statusOptions, loans }: Props) {
    const [showFilters, setShowFilters] = useState(true);
    const [filters, setFilters] = useState(initialFilters);

    const applyFilters = () => {
        router.get(route('employee.loan.index'), filters, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="My Loans" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">My Loans</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            {employee.name_en || 'Employee'}
                            {employee.pin ? ` · ${employee.pin}` : ''}
                            {employee.designation?.name ? ` · ${employee.designation.name}` : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowFilters((v) => !v)}>
                            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filters
                        </Button>
                        <Button asChild size="sm" className="h-9 bg-amber-600 text-xs hover:bg-amber-700">
                            <Link href="/sections/employee-loan">Dashboard</Link>
                        </Button>
                    </div>
                </div>

                {showFilters && (
                    <Card className="mb-4 border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Filter my loans</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600">Status</label>
                                <select
                                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    {statusOptions.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600">Loan type</label>
                                <select
                                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                                    value={filters.loan_type}
                                    onChange={(e) => setFilters({ ...filters, loan_type: e.target.value })}
                                >
                                    <option value="all">All types</option>
                                    {loanTypes.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button type="button" className="h-9 w-full bg-amber-600 text-xs hover:bg-amber-700" onClick={applyFilters}>
                                    <Search className="mr-1.5 h-3.5 w-3.5" />
                                    Apply filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4">
                    {loans.length > 0 ? (
                        loans.map((loan) => (
                            <Card key={loan.id} className="border-zinc-200/90 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-base font-semibold text-zinc-950">{loan.loan_type_label}</h2>
                                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{loan.loan_number}</Badge>
                                                <Badge variant="outline" className="capitalize">{loan.status}</Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {loan.policy_name || 'Policy not assigned'}
                                                {loan.disbursement_date ? ` · Disbursed ${loan.disbursement_date}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                                <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}`)}>Details</Link>
                                            </Button>
                                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                                <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}/ledger`)}>
                                                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                                    Ledger
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
                                        <Metric label="Principal (PR)" value={fmt(loan.principal_amount)} accent="text-zinc-900" />
                                        <Metric label="Service charge (SC)" value={fmt(loan.service_charge_amount)} accent="text-violet-900" />
                                        <Metric label="Out. PR" value={fmt(loan.outstanding_principal)} accent="text-zinc-900" />
                                        <Metric label="Out. SC" value={fmt(loan.outstanding_service_charge)} accent="text-violet-900" />
                                        <Metric label="Outstanding" value={fmt(loan.outstanding_balance)} accent="text-amber-800" />
                                        <Metric label="Installment" value={fmt(loan.installment_amount)} accent="text-zinc-900" />
                                        <Metric label="Progress" value={`${loan.paid_installments}/${loan.installment_count}`} accent="text-zinc-900" />
                                        <Metric label="Next due" value={loan.next_due_date || '—'} accent="text-zinc-900" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="border-dashed border-zinc-200 shadow-sm">
                            <CardContent className="py-14 text-center">
                                <HandCoins className="mx-auto h-10 w-10 text-zinc-300" />
                                <p className="mt-3 text-sm font-medium text-zinc-700">No loans found</p>
                                <CardDescription className="mt-1 text-xs">No loan matches your selected filters.</CardDescription>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </PageSurface>
        </Layout>
    );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div className="rounded-xl bg-zinc-50/70 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className={`mt-1 text-sm font-semibold ${accent}`}>{value}</p>
        </div>
    );
}
