import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
    PayrollFilterGrid,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ReportDocumentHeader } from '@/components/reports/ReportDocumentHeader';
import { WordTableReport } from '@/components/reports/WordTableReport';
import {
    LoanInstallmentLedgerTable,
    type LoanInstallmentLedgerRow,
} from '@/components/employee-loan/LoanInstallmentLedgerTable';
import {
    LoanLedgerInfoHeader,
    type LoanLedgerInfoHeaderData,
} from '@/components/employee-loan/LoanLedgerInfoHeader';
import { employeeLoanReportPath } from '@/lib/employee-loan-reports';
import { loanCycleFilterLabel } from '@/lib/employee-loan-format';
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';
import type { SharedData } from '@/types';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    requireEmployee?: boolean;
};

type LoanLedgerSection = {
    title: string;
    loan_number: string;
    loan_type?: string;
    status?: string;
    header?: LoanLedgerInfoHeaderData;
    rows: LoanInstallmentLedgerRow[];
};

type Props = {
    companyName?: string;
    report: ReportMeta;
    filterOptions: {
        branches: { id: number; name: string; branch_code?: string | null }[];
        departments: { id: number; name: string }[];
        employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
    };
    loanTypeOptions: { value: string; label: string }[];
    filters: Record<string, string>;
    generated: boolean;
    payload: Record<string, unknown> | null;
    periodLabel: string;
    error: string | null;
};

type LedgerLookupLoan = {
    id: number;
    loan_type?: string;
    loan_cycle: number;
    loan_cycle_label?: string;
    loan_number: string;
    loan_type_label: string;
    status: string;
};

function loansOfType(loans: LedgerLookupLoan[], loanType: string): LedgerLookupLoan[] {
    if (!loanType) {
        return [];
    }

    return loans.filter((loan) => loan.loan_type === loanType);
}

function runningCycleValue(loans: LedgerLookupLoan[], loanType: string): string {
    const ofType = loansOfType(loans, loanType);
    if (ofType.length === 0) {
        return '';
    }

    const active = ofType.filter((loan) => loan.status === 'active');
    const pool = active.length > 0 ? active : ofType;
    const max = Math.max(...pool.map((loan) => Number(loan.loan_cycle) || 1));

    return String(max);
}

const LOAN_TYPE_ITEMS = [{ value: '', label: 'All loan types' }];

export default function EmployeeLoanReportShow({
    companyName,
    report,
    filterOptions,
    loanTypeOptions,
    filters: initFilters,
    generated,
    payload,
    periodLabel,
    error,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const canExport = auth?.permissions?.includes('reports.export') ?? true;

    const [filters, setFilters] = useState(initFilters);
    const [employeeLoans, setEmployeeLoans] = useState<LedgerLookupLoan[]>([]);
    const isLedger = report.slug === 'loan-ledger';
    const setFilter = (key: string, value: string) =>
        setFilters((f) => {
            const next = { ...f, [key]: value };
            if (key === 'employee_id') {
                next.loan_id = '';
                if (isLedger) {
                    next.loan_cycle = '';
                }
            }
            if (key === 'loan_type' && isLedger) {
                next.loan_id = '';
                next.loan_cycle = '';
            }
            return next;
        });

    const show = useMemo(() => {
        const f = report.filters;
        return {
            asOf: f.includes('as_of'),
            dateRange: f.includes('date_from'),
            employee: f.includes('employee_id'),
            loanType: f.includes('loan_type'),
            loanCycle: f.includes('loan_cycle'),
            loanId: f.includes('loan_id'),
            grid: f.some((x) => ['branch_id', 'department_id'].includes(x)),
        };
    }, [report.filters]);

    const basePath = employeeLoanReportPath(report.slug);

    const canGenerate = !isLedger || (!!filters.employee_id && !!filters.loan_type);

    const generate = () => {
        if (!canGenerate) {
            return;
        }
        router.get(basePath, { ...filters, generate: '1' }, { preserveState: true });
    };

    const query = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
        return p.toString();
    }, [filters]);

    const printUrl = `${route('employee-loan.reports.print', report.slug)}?${query}`;
    const pdfUrl = `${route('employee-loan.reports.pdf', report.slug)}?${query}`;
    const excelUrl = `${route('employee-loan.reports.excel', report.slug)}?${query}`;

    const loanTypeItems = isLedger
        ? loanTypeOptions.map((o) => ({ value: o.value, label: o.label }))
        : [...LOAN_TYPE_ITEMS, ...loanTypeOptions.map((o) => ({ value: o.value, label: o.label }))];

    useEffect(() => {
        if (!generated) {
            return;
        }
        setFilters(initFilters);
    }, [generated, initFilters.employee_id, initFilters.loan_type, initFilters.loan_cycle, initFilters.loan_id]);

    useEffect(() => {
        if (!filters.employee_id || (!isLedger && !show.loanId)) {
            setEmployeeLoans([]);
            return;
        }

        let cancelled = false;
        axios
            .get(route('employee-loans.ledger-lookup'), { params: { employee_id: filters.employee_id } })
            .then(({ data }) => {
                if (!cancelled) {
                    setEmployeeLoans(data.loans ?? []);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setEmployeeLoans([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [filters.employee_id, isLedger, show.loanId]);

    const typedLoans = useMemo(
        () => (isLedger ? loansOfType(employeeLoans, filters.loan_type) : employeeLoans),
        [employeeLoans, filters.loan_type, isLedger],
    );

    useEffect(() => {
        if (!isLedger) {
            return;
        }

        const nextCycle = runningCycleValue(employeeLoans, filters.loan_type);
        const validCycles = new Set(typedLoans.map((loan) => String(loan.loan_cycle)));

        setFilters((f) => {
            if (!f.loan_type) {
                return f.loan_cycle ? { ...f, loan_cycle: '' } : f;
            }
            if (f.loan_cycle && validCycles.has(f.loan_cycle)) {
                return f;
            }
            if (f.loan_cycle === nextCycle) {
                return f;
            }
            return { ...f, loan_cycle: nextCycle };
        });
    }, [employeeLoans, filters.loan_type, isLedger, typedLoans]);

    const cycleItems = useMemo(() => {
        if (isLedger) {
            const cycles = [...new Set(typedLoans.map((loan) => Number(loan.loan_cycle) || 1))]
                .filter((n) => n > 0)
                .sort((a, b) => a - b);

            if (cycles.length === 0) {
                return [
                    {
                        value: '',
                        label: filters.employee_id && filters.loan_type
                            ? 'No loans of this type'
                            : 'Select employee and loan type',
                        disabled: true,
                    },
                ];
            }

            return cycles.map((cycle) => {
                const running = runningCycleValue(employeeLoans, filters.loan_type);
                const label = loanCycleFilterLabel(cycle);

                return {
                    value: String(cycle),
                    label: String(cycle) === running ? `${label} (running)` : label,
                };
            });
        }

        const fromLoans = employeeLoans.map((l) => l.loan_cycle).filter((n) => Number(n) > 0);
        const maxCycle = Math.max(0, ...fromLoans, Number(filters.loan_cycle) || 0);
        const items = [{ value: '', label: 'All cycles' }];
        for (let i = 1; i <= maxCycle; i += 1) {
            items.push({ value: String(i), label: loanCycleFilterLabel(i) });
        }
        return items;
    }, [employeeLoans, filters.employee_id, filters.loan_cycle, filters.loan_type, isLedger, typedLoans]);

    const loanItems = useMemo(
        () => [
            { value: '', label: 'All loans' },
            ...employeeLoans.map((loan) => ({
                value: String(loan.id),
                label: `${loan.loan_type_label} — ${loan.loan_cycle_label ?? loanCycleFilterLabel(loan.loan_cycle)} — ${loan.loan_number} (${loan.status})`,
            })),
        ],
        [employeeLoans],
    );

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description} />

                {report.filters.length > 0 && (
                    <PayrollSectionCard
                        title="Filters"
                        description={
                            isLedger
                                ? 'Select one employee and loan type. Cycle defaults to the running loan.'
                                : 'Set criteria and click Generate report.'
                        }
                    >
                        <div className="space-y-4">
                            {show.grid && (
                                <PayrollFilterGrid
                                    filters={filters}
                                    setFilter={setFilter}
                                    branches={filterOptions.branches}
                                    departments={filterOptions.departments}
                                    designations={[]}
                                    programs={[]}
                                    projects={[]}
                                    employees={filterOptions.employees}
                                    showEmployee={show.employee}
                                    showBranch={report.filters.includes('branch_id')}
                                    showDepartment={report.filters.includes('department_id')}
                                    showDesignation={false}
                                    showProgram={false}
                                    showProject={false}
                                />
                            )}

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {isLedger && (
                                    <PayrollEmployeeSelect
                                        employees={filterOptions.employees}
                                        value={filters.employee_id}
                                        onChange={(v) => setFilter('employee_id', v)}
                                        required
                                        allowAll={false}
                                    />
                                )}
                                {show.asOf && (
                                    <PayrollField label="As of date" required>
                                        <Input
                                            type="date"
                                            className="h-9 text-xs"
                                            value={filters.as_of}
                                            onChange={(e) => setFilter('as_of', e.target.value)}
                                        />
                                    </PayrollField>
                                )}
                                {show.dateRange && (
                                    <>
                                        <PayrollField label="Date from">
                                            <Input
                                                type="date"
                                                className="h-9 text-xs"
                                                value={filters.date_from}
                                                onChange={(e) => setFilter('date_from', e.target.value)}
                                            />
                                        </PayrollField>
                                        <PayrollField label="Date to">
                                            <Input
                                                type="date"
                                                className="h-9 text-xs"
                                                value={filters.date_to}
                                                onChange={(e) => setFilter('date_to', e.target.value)}
                                            />
                                        </PayrollField>
                                    </>
                                )}
                                {show.loanType && (
                                    <PayrollComboField
                                        label="Loan type"
                                        value={filters.loan_type}
                                        onChange={(v) => setFilter('loan_type', v)}
                                        items={loanTypeItems}
                                        required={isLedger}
                                        placeholder={isLedger ? 'Select loan type' : 'All types'}
                                    />
                                )}
                                {show.loanCycle && (
                                    <PayrollComboField
                                        label="Loan cycle"
                                        value={filters.loan_cycle ?? ''}
                                        onChange={(v) => setFilter('loan_cycle', v)}
                                        items={cycleItems}
                                        required={isLedger}
                                        disabled={isLedger && typedLoans.length === 0}
                                        placeholder={isLedger ? 'Running cycle' : 'All cycles'}
                                    />
                                )}
                                {show.loanId && filters.employee_id && (
                                    <PayrollComboField
                                        label="Loan"
                                        value={filters.loan_id ?? ''}
                                        onChange={(v) => setFilter('loan_id', v)}
                                        items={loanItems}
                                        placeholder="All loans"
                                    />
                                )}
                                {show.employee && !show.grid && !isLedger && (
                                    <PayrollEmployeeSelect
                                        employees={filterOptions.employees}
                                        value={filters.employee_id}
                                        onChange={(v) => setFilter('employee_id', v)}
                                        required={report.requireEmployee}
                                        allowAll={!report.requireEmployee}
                                    />
                                )}
                            </div>

                            <Button type="button" onClick={generate} disabled={!canGenerate}>
                                <Search className="mr-2 h-4 w-4" />
                                Generate report
                            </Button>
                        </div>
                    </PayrollSectionCard>
                )}

                {report.filters.length === 0 && (
                    <Button type="button" onClick={generate} className="mb-4">
                        <Search className="mr-2 h-4 w-4" />
                        Generate report
                    </Button>
                )}

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Cannot generate</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {generated && payload && !error && (
                    <PayrollSectionCard
                        className="mt-6"
                        title="Preview"
                        description={`${periodLabel} · A4 print layout`}
                    >
                        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(printUrl, '_blank')}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                            {canExport && (
                                <>
                                    <Button asChild variant="outline" size="sm">
                                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                                            <Download className="mr-2 h-4 w-4" />
                                            PDF
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <a href={excelUrl}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                                            Excel (CSV)
                                        </a>
                                    </Button>
                                </>
                            )}
                        </div>
                        <ReportDocumentHeader
                            companyName={companyName}
                            title={report.title}
                            periodLabel={periodLabel}
                            rowCount={(payload.meta as { row_count?: number } | undefined)?.row_count}
                        />
                        {payload.template === 'loan-installment-ledger' ? (
                            <div className="space-y-6">
                                {((payload.sections as LoanLedgerSection[] | undefined) ?? []).length > 0 ? (
                                    (payload.sections as LoanLedgerSection[]).map((section) => (
                                        <div key={section.loan_number} className="space-y-2">
                                            <LoanLedgerInfoHeader header={section.header} />
                                            <LoanInstallmentLedgerTable
                                                embedded
                                                rows={section.rows}
                                                emptyMessage="No installments for this loan."
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No loans found for the selected filters.</p>
                                )}
                            </div>
                        ) : (
                            <WordTableReport payload={payload as Parameters<typeof WordTableReport>[0]['payload']} />
                        )}
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
