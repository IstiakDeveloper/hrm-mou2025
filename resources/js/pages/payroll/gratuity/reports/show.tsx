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
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ReportDocumentHeader } from '@/components/reports/ReportDocumentHeader';
import { WordTableReport } from '@/components/reports/WordTableReport';
import { gratuityReportPath } from '@/lib/gratuity-reports';
import { formatTakaWhole } from '@/lib/taka-format';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    requireEmployee?: boolean;
};

type Props = {
    companyName?: string;
    report: ReportMeta;
    filterOptions: {
        branches: { id: number; name: string; branch_code?: string | null }[];
        departments: { id: number; name: string }[];
        employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
    };
    filters: Record<string, string>;
    generated: boolean;
    payload: Record<string, unknown> | null;
    periodLabel: string;
    error: string | null;
    exportUrls: { print: string; pdf: string; excel: string };
};

const ELIGIBILITY_OPTIONS = [
    { value: 'all', label: 'All employees' },
    { value: 'eligible', label: 'Eligible only' },
    { value: 'not_eligible', label: 'Not eligible' },
];

const PAYMENT_OPTIONS = [
    { value: 'all', label: 'Any payment status' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'unpaid', label: 'Unpaid' },
];

export default function GratuityReportShow({
    companyName,
    report,
    filterOptions,
    filters: initFilters,
    generated,
    payload,
    periodLabel,
    error,
}: Props) {
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const canExport = auth?.permissions?.includes('reports.export') ?? true;

    const [filters, setFilters] = useState(initFilters);
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const show = useMemo(() => {
        const f = report.filters;
        return {
            asOf: f.includes('as_of'),
            dateRange: f.includes('date_from'),
            employee: f.includes('employee_id'),
            eligibility: f.includes('eligibility'),
            paymentStatus: f.includes('payment_status'),
            grid: f.some((x) => ['branch_id', 'department_id'].includes(x)),
        };
    }, [report.filters]);

    const fmt = (n: unknown) => formatTakaWhole(n);

    const employeeBlock = payload?.employee as
        | {
              label?: string;
              pin?: string;
              branch?: string | null;
              department?: string | null;
              designation?: string | null;
              confirmation_date?: string;
              service_end?: string;
              years?: number;
              basic?: number;
              multiplier?: number;
              gratuity?: number;
              eligible?: string;
              paid_total?: number;
              outstanding?: number;
          }
        | undefined;

    const basePath = gratuityReportPath(report.slug);

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

    const printUrl = `${staffFundPath(`/gratuity/reports/${report.slug}/print`)}?${query}`;
    const pdfUrl = `${staffFundPath(`/gratuity/reports/${report.slug}/pdf`)}?${query}`;
    const excelUrl = `${staffFundPath(`/gratuity/reports/${report.slug}/excel`)}?${query}`;

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description} />

            {report.filters.length > 0 && (
                    <PayrollSectionCard
                        title="Filters"
                        description="Set criteria and click Generate report."
                        className="border-emerald-100"
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
                                    forGratuityEmployees
                                />
                            )}

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {show.asOf && (
                                    <PayrollField label="As of date" required>
                                        <Input
                                            type="date"
                                            className="h-10 border-emerald-200 bg-white"
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
                                                className="h-10 border-emerald-200 bg-white"
                                                value={filters.date_from}
                                                onChange={(e) => setFilter('date_from', e.target.value)}
                                            />
                                        </PayrollField>
                                        <PayrollField label="Date to">
                                            <Input
                                                type="date"
                                                className="h-10 border-emerald-200 bg-white"
                                                value={filters.date_to}
                                                onChange={(e) => setFilter('date_to', e.target.value)}
                                            />
                                        </PayrollField>
                                    </>
                                )}
                                {show.eligibility && (
                                    <PayrollComboField
                                        label="Eligibility"
                                        value={filters.eligibility}
                                        onChange={(v) => setFilter('eligibility', v)}
                                        items={ELIGIBILITY_OPTIONS}
                                        placeholder="All"
                                    />
                                )}
                                {show.paymentStatus && (
                                    <PayrollComboField
                                        label="Payment status"
                                        value={filters.payment_status}
                                        onChange={(v) => setFilter('payment_status', v)}
                                        items={PAYMENT_OPTIONS}
                                        placeholder="All"
                                    />
                                )}
                                {show.employee && !show.grid && (
                                    <PayrollEmployeeSelect
                                        employees={filterOptions.employees}
                                        value={filters.employee_id}
                                        onChange={(v) => setFilter('employee_id', v)}
                                        forGratuity
                                    />
                                )}
                            </div>

                            <Button type="button" onClick={generate} className="bg-emerald-700 hover:bg-emerald-800">
                                <Search className="mr-2 h-4 w-4" /> Generate report
                            </Button>
                        </div>
                    </PayrollSectionCard>
                )}

                {report.filters.length === 0 && (
                    <div className="mt-4">
                        <Button type="button" onClick={generate} className="bg-emerald-700 hover:bg-emerald-800">
                            <Search className="mr-2 h-4 w-4" /> Generate report
                        </Button>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Cannot generate</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {generated && payload && !error && (
                    <PayrollSectionCard
                        className="mt-6 border-emerald-100"
                        title="Preview"
                        description={`${periodLabel} · Word-style table for A4 print`}
                    >
                        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
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
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)
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
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1 text-left font-semibold">Designation</th>
                                            <td className="border-r border-black p-1">{employeeBlock.designation ?? '—'}</td>
                                            <th className="border-r border-black p-1 text-left font-semibold">Eligible</th>
                                            <td className="p-1">{employeeBlock.eligible ?? '—'}</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1 text-left font-semibold">Confirmation / Service end</th>
                                            <td className="border-r border-black p-1">
                                                {employeeBlock.confirmation_date
                                                    ? `${employeeBlock.confirmation_date} / ${employeeBlock.service_end ?? '—'}`
                                                    : employeeBlock.service_end ?? '—'}
                                            </td>
                                            <th className="border-r border-black p-1 text-left font-semibold">Years × Basic × ×</th>
                                            <td className="p-1">
                                                {employeeBlock.years ?? 0} × {fmt(employeeBlock.basic)} × {employeeBlock.multiplier ?? 0}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="border-r border-black p-1 text-left font-semibold">Projected gratuity</th>
                                            <td className="border-r border-black p-1">{fmt(employeeBlock.gratuity)}</td>
                                            <th className="border-r border-black p-1 text-left font-semibold">Paid / Outstanding</th>
                                            <td className="p-1">
                                                {fmt(employeeBlock.paid_total)} / {fmt(employeeBlock.outstanding)}
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
