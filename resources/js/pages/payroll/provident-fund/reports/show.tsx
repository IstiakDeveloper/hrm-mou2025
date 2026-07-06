import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';
import { ReportDocumentHeader } from '@/components/reports/ReportDocumentHeader';
import { WordTableReport } from '@/components/reports/WordTableReport';
import { formatPfAmount } from '@/lib/pf-format';
import { pfReportPath } from '@/lib/pf-reports';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';
import type { SharedData } from '@/types';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    requireEmployee?: boolean;
};

type Props = {
    companyName?: string;
    companyAddress?: string;
    report: ReportMeta;
    filterOptions: {
        branches: { id: number; name: string; branch_code?: string | null }[];
        departments: { id: number; name: string }[];
        employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
        months: { value: number; label: string }[];
        years: number[];
    };
    transactionTypeOptions: { value: string; label: string }[];
    filters: Record<string, string>;
    generated: boolean;
    payload: Record<string, unknown> | null;
    periodLabel: string;
    error: string | null;
};

const TX_TYPE_ITEMS = [{ value: '', label: 'All transaction types' }];

export default function PfReportShow({
    companyName,
    companyAddress,
    report,
    filterOptions,
    transactionTypeOptions,
    filters: initFilters,
    generated,
    payload,
    periodLabel,
    error,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const canExport = auth?.permissions?.includes('reports.export') ?? true;

    const [filters, setFilters] = useState(initFilters);
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const show = useMemo(() => {
        const f = report.filters;
        return {
            dateRange: f.includes('date_from'),
            endDate: f.includes('date_to') && !f.includes('date_from'),
            employee: f.includes('employee_id'),
            year: f.includes('year'),
            month: f.includes('month'),
            transactionType: f.includes('transaction_type'),
            grid: f.some((x) => ['branch_id', 'department_id', 'employee_id'].includes(x)),
        };
    }, [report.filters]);

    const basePath = pfReportPath(report.slug);

    const generate = () => {
        router.get(basePath, { ...filters, generate: '1' }, { preserveState: true });
    };

    const query = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
        return p.toString();
    }, [filters]);

    const printUrl = `${staffFundPath(`/provident-fund/reports/${report.slug}/print`)}?${query}`;
    const pdfUrl = `${staffFundPath(`/provident-fund/reports/${report.slug}/pdf`)}?${query}`;
    const excelUrl = `${staffFundPath(`/provident-fund/reports/${report.slug}/excel`)}?${query}`;

    const txTypeItems = [...TX_TYPE_ITEMS, ...transactionTypeOptions.map((o) => ({ value: o.value, label: o.label }))];

    const employeeBlock = payload?.employee as
        | {
              label?: string;
              pin?: string;
              branch?: string | null;
              department?: string | null;
              pf_balance?: number;
              own_contribution?: number;
              org_contribution?: number;
          }
        | undefined;

    const isBranchBalanceReport =
        report.slug === 'pf-balance-by-branch' ||
        Boolean((payload as { header_groups?: unknown[] } | null)?.header_groups?.length);

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description} />

            {report.filters.length > 0 && (
                <PayrollSectionCard title="Filters" description="Set criteria and click Generate report." className="border-emerald-100">
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
                            {show.dateRange && (
                                <>
                                    <PayrollField label="Date from">
                                        <Input
                                            type="date"
                                            className="h-9 border-emerald-200 bg-white text-xs"
                                            value={filters.date_from}
                                            onChange={(e) => setFilter('date_from', e.target.value)}
                                        />
                                    </PayrollField>
                                    <PayrollField label="Date to">
                                        <Input
                                            type="date"
                                            className="h-9 border-emerald-200 bg-white text-xs"
                                            value={filters.date_to}
                                            onChange={(e) => setFilter('date_to', e.target.value)}
                                        />
                                    </PayrollField>
                                </>
                            )}
                            {show.endDate && (
                                <PayrollField label="End date">
                                    <Input
                                        type="date"
                                        className="h-9 border-emerald-200 bg-white text-xs"
                                        value={filters.date_to}
                                        onChange={(e) => setFilter('date_to', e.target.value)}
                                    />
                                </PayrollField>
                            )}
                            {show.year && (
                                <PayrollYearSelect
                                    value={filters.year}
                                    onChange={(v) => setFilter('year', v)}
                                    years={filterOptions.years}
                                />
                            )}
                            {show.month && (
                                <PayrollMonthSelect
                                    value={filters.month}
                                    onChange={(v) => setFilter('month', v)}
                                    months={filterOptions.months}
                                />
                            )}
                            {show.transactionType && (
                                <PayrollComboField
                                    label="Transaction type"
                                    value={filters.transaction_type}
                                    onChange={(v) => setFilter('transaction_type', v)}
                                    items={txTypeItems}
                                    placeholder="All types"
                                />
                            )}
                            {show.employee && !show.grid && (
                                <PayrollEmployeeSelect
                                    employees={filterOptions.employees}
                                    value={filters.employee_id}
                                    onChange={(v) => setFilter('employee_id', v)}
                                    forPf
                                    branchId={filters.branch_id || undefined}
                                />
                            )}
                        </div>

                        <Button type="button" onClick={generate} className="bg-emerald-700 hover:bg-emerald-800">
                            <Search className="mr-2 h-4 w-4" /> Generate report
                        </Button>
                    </div>
                </PayrollSectionCard>
            )}

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Cannot generate</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {generated && payload && !error && (
                <PayrollSectionCard className="border-emerald-100" title="Preview" description={`${periodLabel} · A4 print layout`}>
                    <div className="mb-3 flex flex-wrap gap-2 print:hidden">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-emerald-200"
                                onClick={() => window.open(printUrl, '_blank')}
                            >
                                <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                            {canExport && (
                                <>
                                    <Button asChild variant="outline" size="sm" className="border-emerald-200">
                                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> PDF
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="border-emerald-200">
                                        <a href={excelUrl}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                                        </a>
                                    </Button>
                                </>
                            )}
                    </div>

                    {isBranchBalanceReport ? (
                        <>
                            <PayrollReportDocumentHeader
                                companyName={companyName}
                                companyAddress={companyAddress}
                                title={report.title}
                            />
                            <table className="mb-1 w-full border-collapse text-[9px] font-bold text-black">
                                <tbody>
                                    <tr>
                                        <td className="p-0 text-left" />
                                        <td className="p-0 text-right">{periodLabel}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <ReportDocumentHeader
                            companyName={companyName}
                            title={report.title}
                            periodLabel={periodLabel}
                            rowCount={(payload.meta as { row_count?: number } | undefined)?.row_count}
                        />
                    )}

                    {employeeBlock && (
                        <div className="mb-3 overflow-x-auto border border-black bg-white text-[11px] text-black">
                            <table className="w-full border-collapse">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <th className="border-r border-black p-1 text-left font-semibold">Employee</th>
                                        <td className="border-r border-black p-1">{employeeBlock.label}</td>
                                        <th className="border-r border-black p-1 text-left font-semibold">Branch</th>
                                        <td className="p-1">{employeeBlock.branch ?? '—'}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <th className="border-r border-black p-1 text-left font-semibold">PIN</th>
                                        <td className="border-r border-black p-1">{employeeBlock.pin}</td>
                                        <th className="border-r border-black p-1 text-left font-semibold">Department</th>
                                        <td className="p-1">{employeeBlock.department ?? '—'}</td>
                                    </tr>
                                    <tr>
                                        <th className="border-r border-black p-1 text-left font-semibold">Current balance</th>
                                        <td className="border-r border-black p-1">{formatPfAmount(employeeBlock.pf_balance)}</td>
                                        <th className="border-r border-black p-1 text-left font-semibold">Own / Org contribution</th>
                                        <td className="p-1">
                                            {formatPfAmount(employeeBlock.own_contribution)} / {formatPfAmount(employeeBlock.org_contribution)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <WordTableReport payload={payload as Parameters<typeof WordTableReport>[0]['payload']} />
                </PayrollSectionCard>
            )}
            </PayrollPage>
        </Layout>
    );
}
