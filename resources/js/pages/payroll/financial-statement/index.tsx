import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollPage } from '@/components/payroll/PayrollPageShell';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { employeeDisplayName } from '@/lib/employee-name';
import { formatTakaWhole } from '@/lib/taka-format';
import {
    CheckCircle2,
    FileSpreadsheet,
    Gift,
    Landmark,
    Printer,
    Search,
    User,
    Wallet,
} from 'lucide-react';

type EmployeeOption = {
    id: number;
    pin: string;
    employee_id: string;
    name_en: string;
    name_bn?: string | null;
    status: string;
    department?: string | null;
    designation?: string | null;
    branch?: string | null;
    joining_date?: string | null;
};

type StatementData = {
    employee: {
        id: number;
        pin: string;
        employee_id: string;
        name_en: string;
        name_bn?: string | null;
        status: string;
        department: string;
        designation: string;
        branch: string;
        joining_date?: string | null;
        confirmation_date?: string | null;
        separation_date?: string | null;
        calculation_date: string;
        tenure_joining?: string | null;
        tenure_confirmation?: string | null;
        basic_salary: number;
        gross_salary: number;
    };
    pf: {
        enrolled: boolean;
        own_contribution: number;
        org_contribution: number;
        balance: number;
    };
    gratuity: {
        eligible: boolean;
        amount: number;
        label: string;
        already_paid: boolean;
        completed_years: number;
        basic_multiplier: number;
        basic_salary: number;
    };
    loans: {
        items: {
            id: number;
            loan_number: string;
            loan_type: string;
            type_label: string;
            principal_amount: number;
            total_payable: number;
            paid_amount: number;
            outstanding_balance: number;
            disbursement_date?: string | null;
        }[];
        total_outstanding: number;
    };
    summary: {
        gross_entitlement: number;
        total_deductions: number;
        net_payable: number;
        amount_in_words: string;
    };
    existing_record?: {
        id: number;
        status: string;
        payment_date?: string | null;
        notes?: string | null;
        show_url: string;
    } | null;
};

type Props = {
    selectedEmployeeId: number | null;
    selectedEmployee: {
        id: number;
        pin: string;
        employee_id: string;
        name_en: string;
        name_bn?: string | null;
        status: string;
    } | null;
    statement: StatementData | null;
    initialEmployees: EmployeeOption[];
    companyName: string;
    companyAddress?: string | null;
};

export default function EmployeeFinancialStatementPage({
    selectedEmployeeId,
    selectedEmployee,
    statement,
    initialEmployees,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [lookupResults, setLookupResults] = useState<EmployeeOption[]>(initialEmployees);
    const [loadingLookup, setLoadingLookup] = useState(false);

    // Live search query for employees (filtered on backend: active + inactive with dues only)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setLookupResults(initialEmployees);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoadingLookup(true);
            try {
                const res = await fetch(
                    route('employee-financial-statement.lookup', { q: searchQuery.trim(), limit: 50 }),
                    {
                        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                        signal: controller.signal,
                    },
                );
                if (res.ok) {
                    const data = (await res.json()) as EmployeeOption[];
                    setLookupResults(data);
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    // Ignore cancelled requests
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingLookup(false);
                }
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, initialEmployees]);

    // Format options for ComboSelect
    const employeeItems = useMemo<ComboSelectItem<number>[]>(() => {
        const pool = [...lookupResults];
        if (selectedEmployee && !pool.some((e) => e.id === selectedEmployee.id)) {
            pool.unshift({
                ...selectedEmployee,
                department: statement?.employee.department,
                designation: statement?.employee.designation,
                branch: statement?.employee.branch,
            });
        }

        return pool.map((emp) => {
            const pin = emp.pin || emp.employee_id || `#${emp.id}`;
            const name = employeeDisplayName(emp, 'Unnamed');
            const role = [emp.designation, emp.branch].filter(Boolean).join(' · ');
            const statusTag = emp.status !== 'active' ? ` [${emp.status.toUpperCase()}]` : '';

            return {
                value: emp.id,
                label: `${pin} — ${name}${role ? ` (${role})` : ''}${statusTag}`,
                keywords: `${pin} ${emp.employee_id} ${emp.name_en} ${emp.name_bn || ''} ${emp.department || ''} ${emp.branch || ''}`,
            };
        });
    }, [lookupResults, selectedEmployee, statement]);

    const handleSelectEmployee = (empId: number | null) => {
        if (empId) {
            router.get(
                route('employee-financial-statement.index'),
                { employee_id: empId },
                { preserveState: true, replace: true },
            );
        } else {
            router.get(
                route('employee-financial-statement.index'),
                {},
                { preserveState: true, replace: true },
            );
        }
    };

    // Single handler to open printable A4 statement
    const handleOpenPrint = () => {
        if (!statement) return;
        const printUrl = route('employee-financial-statement.print', {
            employee_id: statement.employee.id,
        });
        window.open(printUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Layout>
            <Head title={statement ? `Financial Statement — ${statement.employee.name_en}` : 'Employee Financial Statement'} />

            <PayrollPage>
                {/* Header */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-2xs shrink-0">
                            <FileSpreadsheet className="h-4 w-4" />
                        </span>
                        <div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <span>Staff Fund</span>
                                <span>/</span>
                                <span className="text-slate-600">Financial Statement</span>
                            </div>
                            <h1 className="text-base font-bold text-slate-900 tracking-tight">Employee Financial Statement</h1>
                        </div>
                    </div>

                    {/* Single Clean Print Action */}
                    {statement && (
                        <div>
                            <Button
                                onClick={handleOpenPrint}
                                size="sm"
                                className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs font-medium text-xs h-8 px-3"
                            >
                                <Printer className="mr-1.5 h-3.5 w-3.5" />
                                Print Statement
                            </Button>
                        </div>
                    )}
                </div>

                {/* Compact Search Bar */}
                <Card className="mb-4 border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                                <Search className="h-4 w-4 text-slate-400" />
                                <label className="text-xs font-semibold text-slate-700">Select Employee:</label>
                            </div>
                            <div className="flex-1">
                                <ComboSelect<number>
                                    value={selectedEmployeeId}
                                    onChange={handleSelectEmployee}
                                    items={employeeItems}
                                    onQueryChange={setSearchQuery}
                                    placeholder={loadingLookup ? 'Searching...' : 'Search by PIN, Employee ID, or Name...'}
                                    className="w-full text-xs h-8"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Empty State */}
                {!statement && (
                    <Card className="border border-dashed border-slate-200 bg-white py-12 text-center shadow-xs">
                        <CardContent className="space-y-2">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <User className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800">No Employee Selected</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Search and select an employee above to view their Provident Fund, Gratuity, active loans, and net payable statement.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Statement Content */}
                {statement && (
                    <div className="space-y-4">
                        {/* Employee Information Card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900">{statement.employee.name_en}</h2>
                                        <Badge
                                            className={
                                                statement.employee.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'
                                            }
                                        >
                                            {statement.employee.status === 'active' ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        PIN: <span className="font-semibold text-slate-700">{statement.employee.pin}</span>
                                        {' · '}{statement.employee.designation}
                                        {' · '}{statement.employee.department}
                                        {' · '}{statement.employee.branch}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className="text-[11px] text-slate-400 block">Calculation As Of</span>
                                    <span className="text-xs font-semibold text-slate-700">{statement.employee.calculation_date}</span>
                                </div>
                            </div>

                            {/* Compact Info Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400 text-[10px] block font-medium">Basic Salary</span>
                                    <span className="font-bold text-slate-900 font-mono text-sm">৳{formatTakaWhole(statement.employee.basic_salary)}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400 text-[10px] block font-medium">Gross Salary</span>
                                    <span className="font-semibold text-slate-700 font-mono text-sm">৳{formatTakaWhole(statement.employee.gross_salary)}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400 text-[10px] block font-medium">Joining Date</span>
                                    <span className="font-semibold text-slate-700">{statement.employee.joining_date || '—'}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400 text-[10px] block font-medium">Service Length</span>
                                    <span className="font-semibold text-slate-700">{statement.employee.tenure_joining || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Position Banner */}
                        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 p-4 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                        Net Financial Position
                                    </span>
                                    <div className="text-3xl font-extrabold text-emerald-800 tracking-tight font-mono">
                                        ৳{formatTakaWhole(statement.summary.net_payable)}
                                    </div>
                                    <p className="text-xs text-emerald-900 font-medium italic">
                                        In Words: {statement.summary.amount_in_words}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <div className="rounded-lg bg-white/90 border border-emerald-100 px-3 py-2 text-slate-700 shadow-2xs">
                                        <span className="text-[10px] text-slate-400 block font-medium">Total Benefits (A)</span>
                                        <span className="font-mono font-bold text-emerald-700">+৳{formatTakaWhole(statement.summary.gross_entitlement)}</span>
                                    </div>
                                    <div className="rounded-lg bg-white/90 border border-rose-100 px-3 py-2 text-slate-700 shadow-2xs">
                                        <span className="text-[10px] text-slate-400 block font-medium">Total Deductions (B)</span>
                                        <span className="font-mono font-bold text-rose-700">−৳{formatTakaWhole(statement.summary.total_deductions)}</span>
                                    </div>
                                    <div className="rounded-lg bg-emerald-700 text-white px-3 py-2 shadow-2xs">
                                        <span className="text-[10px] text-emerald-200 block font-medium">Net Position</span>
                                        <span className="font-mono font-bold text-white">৳{formatTakaWhole(statement.summary.net_payable)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Three Pillars: PF, Gratuity, Loans */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* PF Card */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                            <Landmark className="h-4 w-4 text-emerald-600" />
                                            Provident Fund (PF)
                                        </div>
                                        <Badge
                                            className={
                                                statement.pf.enrolled
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200 text-[10px]'
                                            }
                                        >
                                            {statement.pf.enrolled ? 'Enrolled' : 'Not Enrolled'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Own Contribution:</span>
                                            <span className="font-mono font-medium">৳{formatTakaWhole(statement.pf.own_contribution)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Employer Contribution:</span>
                                            <span className="font-mono font-medium">৳{formatTakaWhole(statement.pf.org_contribution)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                                    <span className="text-xs font-semibold text-slate-700">Total PF Balance:</span>
                                    <span className="text-base font-bold text-emerald-700 font-mono">
                                        ৳{formatTakaWhole(statement.pf.balance)}
                                    </span>
                                </div>
                            </div>

                            {/* Gratuity Card */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                            <Gift className="h-4 w-4 text-sky-600" />
                                            Gratuity Entitlement
                                        </div>
                                        <Badge
                                            className={
                                                statement.gratuity.already_paid
                                                    ? 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'
                                                    : statement.gratuity.eligible
                                                    ? 'bg-sky-50 text-sky-700 border-sky-200 text-[10px]'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                                            }
                                        >
                                            {statement.gratuity.already_paid
                                                ? 'Already Paid'
                                                : statement.gratuity.eligible
                                                ? 'Eligible'
                                                : 'Not Eligible'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Qualifying Tenure:</span>
                                            <span className="font-medium">{statement.gratuity.completed_years} Years</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Formula:</span>
                                            <span className="font-medium">{statement.gratuity.basic_multiplier} × Basic Salary</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                                    <span className="text-xs font-semibold text-slate-700">Gratuity Entitlement:</span>
                                    <span className="text-base font-bold text-sky-700 font-mono">
                                        ৳{formatTakaWhole(statement.gratuity.amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Loans Card */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                            <Wallet className="h-4 w-4 text-rose-600" />
                                            Active Loans
                                        </div>
                                        <Badge
                                            className={
                                                statement.loans.items.length > 0
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                            }
                                        >
                                            {statement.loans.items.length === 0
                                                ? 'Clear'
                                                : `${statement.loans.items.length} Active`}
                                        </Badge>
                                    </div>

                                    {statement.loans.items.length === 0 ? (
                                        <div className="flex items-center gap-2 text-xs text-emerald-700 py-2">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>No outstanding loan liabilities.</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 text-xs text-slate-600">
                                            {statement.loans.items.map((loan) => (
                                                <div key={loan.id} className="flex justify-between">
                                                    <span className="truncate">{loan.loan_number} ({loan.type_label}):</span>
                                                    <span className="font-mono text-rose-600 font-semibold shrink-0">
                                                        ৳{formatTakaWhole(loan.outstanding_balance)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                                    <span className="text-xs font-semibold text-slate-700">Total Deductions:</span>
                                    <span className="text-base font-bold text-rose-700 font-mono">
                                        ৳{formatTakaWhole(statement.loans.total_outstanding)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Loan Table (Only shown if loans exist) */}
                        {statement.loans.items.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                                <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                        Active Loans Breakdown
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/75">
                                                <TableHead className="text-xs font-semibold">Loan Number</TableHead>
                                                <TableHead className="text-xs font-semibold">Type</TableHead>
                                                <TableHead className="text-xs font-semibold text-right">Principal</TableHead>
                                                <TableHead className="text-xs font-semibold text-right">Total Payable</TableHead>
                                                <TableHead className="text-xs font-semibold text-right">Paid Amount</TableHead>
                                                <TableHead className="text-xs font-semibold text-right text-rose-700">Outstanding Due</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {statement.loans.items.map((loan) => (
                                                <TableRow key={loan.id}>
                                                    <TableCell className="font-medium text-xs">{loan.loan_number}</TableCell>
                                                    <TableCell className="text-xs">{loan.type_label}</TableCell>
                                                    <TableCell className="text-xs text-right font-mono">৳{formatTakaWhole(loan.principal_amount)}</TableCell>
                                                    <TableCell className="text-xs text-right font-mono">৳{formatTakaWhole(loan.total_payable)}</TableCell>
                                                    <TableCell className="text-xs text-right font-mono">৳{formatTakaWhole(loan.paid_amount)}</TableCell>
                                                    <TableCell className="text-xs text-right font-mono font-bold text-rose-700">
                                                        ৳{formatTakaWhole(loan.outstanding_balance)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </PayrollPage>
        </Layout>
    );
}
