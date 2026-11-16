import React, { useState, useMemo, Fragment } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';
import { PayrollReportSignatureSection } from '@/components/payroll/PayrollReportSignatureSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Printer, FileDown, FileSpreadsheet, Search, RefreshCw } from 'lucide-react';

type ReportMeta = {
    slug: string;
    title: string;
    shortTitle: string;
    description: string;
    filters: string[];
    orientation: 'portrait' | 'landscape';
    isDateRange?: boolean;
};

type SignatureBlock = {
    label: string;
    department: string;
};

type OptionItem = {
    id: number;
    name: string;
    code?: string | null;
    branch_code?: string | null;
    zone_id?: number | null;
    regional_office_id?: number | null;
};

type Props = {
    companyName?: string;
    companyAddress?: string;
    signatureBlocks?: SignatureBlock[];
    report: ReportMeta;
    filterOptions: {
        branches: OptionItem[];
        zones: OptionItem[];
        regional_offices: OptionItem[];
        designations: OptionItem[];
    };
    filters: Record<string, string | number | null>;
    generated: boolean;
    payload: any | null;
    periodLabel: string;
    error: string | null;
    exportUrls: { print: string; pdf: string; excel: string };
};

export default function HrReportShow({
    companyName = 'MOUSUMI',
    companyAddress = 'Ukilpara, Naogaon',
    signatureBlocks = [],
    report,
    filterOptions,
    filters: initialFilters,
    generated,
    payload,
    periodLabel,
    error,
    exportUrls,
}: Props) {
    const [filters, setFilters] = useState({
        as_of_date: String(initialFilters.as_of_date || new Date().toISOString().split('T')[0]),
        date_from: String(initialFilters.date_from || ''),
        date_to: String(initialFilters.date_to || ''),
        zone_id: initialFilters.zone_id ? String(initialFilters.zone_id) : '',
        regional_office_id: initialFilters.regional_office_id ? String(initialFilters.regional_office_id) : '',
        branch_id: initialFilters.branch_id ? String(initialFilters.branch_id) : '',
        designation_id: initialFilters.designation_id ? String(initialFilters.designation_id) : '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cascading filter options
    const filteredRegions = useMemo(() => {
        if (!filters.zone_id) return filterOptions.regional_offices;
        return filterOptions.regional_offices.filter((r) => String(r.zone_id) === String(filters.zone_id));
    }, [filterOptions.regional_offices, filters.zone_id]);

    const filteredBranches = useMemo(() => {
        if (!filters.regional_office_id) return filterOptions.branches;
        return filterOptions.branches.filter((b) => String(b.regional_office_id) === String(filters.regional_office_id));
    }, [filterOptions.branches, filters.regional_office_id]);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.get(`/hr/reports/${report.slug}`, {
            ...filters,
            generate: true,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handlePrint = () => {
        window.open(exportUrls.print, '_blank');
    };

    return (
        <Layout>
            <Head title={report.title} />

            <div className="space-y-4 p-4 md:p-6">
                {/* Header & Controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/hr/reports"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">{report.title}</h1>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
                                {report.orientation}
                            </span>
                        </div>
                        {report.description && (
                            <p className="mt-1 text-xs text-slate-500 sm:ml-10">{report.description}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="gap-1.5"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print</span>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                        >
                            <a href={exportUrls.pdf} download>
                                <FileDown className="h-4 w-4" />
                                <span>PDF</span>
                            </a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            <a href={exportUrls.excel} download>
                                <FileSpreadsheet className="h-4 w-4" />
                                <span>Excel</span>
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Filter Form */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                        {report.isDateRange ? (
                            <>
                                <div>
                                    <label className="text-[11px] font-medium text-slate-700">From Date</label>
                                    <Input
                                        type="date"
                                        value={filters.date_from}
                                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                                        className="mt-1 h-8 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-slate-700">To Date</label>
                                    <Input
                                        type="date"
                                        value={filters.date_to}
                                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                                        className="mt-1 h-8 text-xs"
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="text-[11px] font-medium text-slate-700">As on Date</label>
                                <Input
                                    type="date"
                                    value={filters.as_of_date}
                                    onChange={(e) => setFilters({ ...filters, as_of_date: e.target.value })}
                                    className="mt-1 h-8 text-xs"
                                    required
                                />
                            </div>
                        )}

                        {report.filters.includes('zone_id') && (
                            <div>
                                <label className="text-[11px] font-medium text-slate-700">Zone</label>
                                <select
                                    value={filters.zone_id}
                                    onChange={(e) => setFilters({ ...filters, zone_id: e.target.value, regional_office_id: '', branch_id: '' })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">All Zones</option>
                                    {filterOptions.zones.map((z) => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {report.filters.includes('regional_office_id') && (
                            <div>
                                <label className="text-[11px] font-medium text-slate-700">Region</label>
                                <select
                                    value={filters.regional_office_id}
                                    onChange={(e) => setFilters({ ...filters, regional_office_id: e.target.value, branch_id: '' })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">All Regions</option>
                                    {filteredRegions.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {report.filters.includes('branch_id') && (
                            <div>
                                <label className="text-[11px] font-medium text-slate-700">Branch</label>
                                <select
                                    value={filters.branch_id}
                                    onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">All Branches</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.branch_code ? `[${b.branch_code}] ` : ''}{b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {report.filters.includes('designation_id') && (
                            <div>
                                <label className="text-[11px] font-medium text-slate-700">Designation</label>
                                <select
                                    value={filters.designation_id}
                                    onChange={(e) => setFilters({ ...filters, designation_id: e.target.value })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">All Designations</option>
                                    {filterOptions.designations.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-end">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting}
                                className="h-8 w-full gap-1.5 bg-sky-700 hover:bg-sky-800"
                            >
                                <Search className="h-3.5 w-3.5" />
                                <span>{isSubmitting ? 'Loading...' : 'Generate Report'}</span>
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Error Box */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        {error}
                    </div>
                )}

                {/* Report Document Preview */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {!generated ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                            <Search className="h-8 w-8 text-slate-300" />
                            <p className="mt-2 text-sm font-semibold">Click "Generate Report" to view data</p>
                            <p className="text-xs text-slate-400">Select dates and hierarchy filters above to customize the report view.</p>
                        </div>
                    ) : !payload ? (
                        <div className="py-12 text-center text-xs text-slate-500">No data found for the selected filters.</div>
                    ) : (
                        <div className="overflow-x-auto text-black">
                            <PayrollReportDocumentHeader
                                title={report.title}
                                companyName={companyName}
                                companyAddress={companyAddress}
                            />
                            <div className="mb-3 text-center text-xs text-slate-700">{periodLabel}</div>

                            {/* Render Template */}
                            {renderPayloadTemplate(payload)}

                            {/* Signature Blocks */}
                            <div className="mt-8">
                                <PayrollReportSignatureSection blocks={signatureBlocks} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function renderPayloadTemplate(payload: any) {
    const template = payload.template;

    if (template === 'designation-matrix') {
        return (
            <table className="w-full border-collapse border border-black text-left text-xs">
                <thead>
                    <tr className="bg-slate-100">
                        <th rowSpan={2} className="border border-black p-1.5">Designation</th>
                        <th colSpan={3} className="border border-black p-1.5 text-center">Active Staff</th>
                        <th colSpan={3} className="border border-black p-1.5 text-center">Inactive Staff</th>
                        <th rowSpan={2} className="border border-black p-1.5 text-center">Grand Total</th>
                    </tr>
                    <tr className="bg-slate-100 text-center">
                        <th className="border border-black p-1">Male</th>
                        <th className="border border-black p-1">Female</th>
                        <th className="border border-black p-1 font-bold">Total</th>
                        <th className="border border-black p-1">Male</th>
                        <th className="border border-black p-1">Female</th>
                        <th className="border border-black p-1 font-bold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {payload.rows?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="border border-black p-1.5">{row.designation}</td>
                            <td className="border border-black p-1.5 text-center">{row.active_male || '-'}</td>
                            <td className="border border-black p-1.5 text-center">{row.active_female || '-'}</td>
                            <td className="border border-black bg-slate-50 p-1.5 text-center font-bold">{row.active_total || '-'}</td>
                            <td className="border border-black p-1.5 text-center">{row.inactive_male || '-'}</td>
                            <td className="border border-black p-1.5 text-center">{row.inactive_female || '-'}</td>
                            <td className="border border-black bg-slate-50 p-1.5 text-center font-bold">{row.inactive_total || '-'}</td>
                            <td className="border border-black p-1.5 text-center font-bold">{row.grand_total || '-'}</td>
                        </tr>
                    ))}
                </tbody>
                {payload.totals && (
                    <tfoot>
                        <tr className="bg-slate-100 font-bold">
                            <td className="border border-black p-1.5">Grand Total</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.active_male}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.active_female}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.active_total}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.inactive_male}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.inactive_female}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.inactive_total}</td>
                            <td className="border border-black p-1.5 text-center">{payload.totals.grand_total}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        );
    }

    if (template === 'staff-list') {
        return (
            <table className="w-full border-collapse border border-black text-left text-xs">
                <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                        <th className="border border-black p-1">SL</th>
                        <th className="border border-black p-1 text-left">Branch</th>
                        <th className="border border-black p-1">PIN</th>
                        <th className="border border-black p-1 text-left">Name (English)</th>
                        <th className="border border-black p-1 text-left">Designation</th>
                        <th className="border border-black p-1">Joining Date</th>
                        <th className="border border-black p-1">Location Join</th>
                        <th className="border border-black p-1">Duration</th>
                        <th className="border border-black p-1">Mobile</th>
                        <th className="border border-black p-1 text-left">Address Combined</th>
                    </tr>
                </thead>
                <tbody>
                    {payload.rows?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="border border-black p-1 text-center">{row.sl}</td>
                            <td className="border border-black p-1">{row.branch}</td>
                            <td className="border border-black p-1 text-center font-mono">{row.pin}</td>
                            <td className="border border-black p-1 font-medium">{row.name}</td>
                            <td className="border border-black p-1">{row.designation}</td>
                            <td className="border border-black p-1 text-center">{row.joining_date}</td>
                            <td className="border border-black p-1 text-center">{row.present_location_joining_date}</td>
                            <td className="border border-black p-1 text-center font-mono text-[11px]">{row.duration_at_present_location}</td>
                            <td className="border border-black p-1 text-center font-mono">{row.mobile}</td>
                            <td className="border border-black p-1 text-[11px]">{row.address_combined}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 font-bold">
                        <td colSpan={9} className="border border-black p-1.5 text-right">Total Staff Count:</td>
                        <td className="border border-black p-1.5">{payload.total_count}</td>
                    </tr>
                </tfoot>
            </table>
        );
    }

    if (template === 'staff-list-grouped') {
        return (
            <div className="space-y-4">
                {payload.sections?.map((sec: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-1">
                        <div className="border border-black bg-slate-100 px-3 py-1 font-bold text-xs">
                            Branch: {sec.branch_name} &nbsp;&nbsp;|&nbsp;&nbsp; Staff Count: {sec.staff_count}
                        </div>
                        <table className="w-full border-collapse border border-black text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-center font-bold">
                                    <th className="border border-black p-1">SL</th>
                                    <th className="border border-black p-1">PIN</th>
                                    <th className="border border-black p-1 text-left">Name (English)</th>
                                    <th className="border border-black p-1 text-left">Designation</th>
                                    <th className="border border-black p-1">Joining Date</th>
                                    <th className="border border-black p-1">Location Join</th>
                                    <th className="border border-black p-1">Duration</th>
                                    <th className="border border-black p-1">Mobile</th>
                                    <th className="border border-black p-1 text-left">Address Combined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.rows?.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="border border-black p-1 text-center">{row.sl}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.pin}</td>
                                        <td className="border border-black p-1 font-medium">{row.name}</td>
                                        <td className="border border-black p-1">{row.designation}</td>
                                        <td className="border border-black p-1 text-center">{row.joining_date}</td>
                                        <td className="border border-black p-1 text-center">{row.present_location_joining_date}</td>
                                        <td className="border border-black p-1 text-center font-mono text-[11px]">{row.duration_at_present_location}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.mobile}</td>
                                        <td className="border border-black p-1 text-[11px]">{row.address_combined}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
                <div className="text-right font-bold text-xs">
                    Grand Total Staff: {payload.grand_total}
                </div>
            </div>
        );
    }

    if (template === 'staff-pksf') {
        return (
            <div className="space-y-4">
                {payload.print_date && (
                    <div className="text-right text-xs font-semibold">Print Date: {payload.print_date}</div>
                )}
                {payload.sections?.map((sec: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-1">
                        <div className="border border-black bg-slate-100 px-3 py-1 font-bold text-xs">
                            Branch: {sec.branch_name} &nbsp;&nbsp;|&nbsp;&nbsp; Total Staff: {sec.staff_count}
                        </div>
                        <table className="w-full border-collapse border border-black text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-center font-bold">
                                    <th className="border border-black p-1">SL</th>
                                    <th className="border border-black p-1">PIN</th>
                                    <th className="border border-black p-1 text-left">Name (English)</th>
                                    <th className="border border-black p-1 text-left">Father's Name</th>
                                    <th className="border border-black p-1 text-left">Designation</th>
                                    <th className="border border-black p-1">Joining Date</th>
                                    <th className="border border-black p-1">Location Join</th>
                                    <th className="border border-black p-1">Mobile</th>
                                    <th className="border border-black p-1">NID/Smart Card</th>
                                    <th className="border border-black p-1">DOB</th>
                                    <th className="border border-black p-1 text-left">Permanent Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.rows?.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="border border-black p-1 text-center">{row.sl}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.pin}</td>
                                        <td className="border border-black p-1 font-medium">{row.name}</td>
                                        <td className="border border-black p-1">{row.father_name}</td>
                                        <td className="border border-black p-1">{row.designation}</td>
                                        <td className="border border-black p-1 text-center">{row.joining_date}</td>
                                        <td className="border border-black p-1 text-center">{row.present_location_joining_date}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.mobile}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.nid_smart_card}</td>
                                        <td className="border border-black p-1 text-center">{row.date_of_birth}</td>
                                        <td className="border border-black p-1 text-[11px]">{row.permanent_address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
                <div className="text-right font-bold text-xs">
                    Grand Total Staff: {payload.grand_total}
                </div>
            </div>
        );
    }

    if (template === 'field-summary' || template === 'zone-region-summary' || template === 'zone-summary') {
        const isField = template === 'field-summary';
        const isZoneRegion = template === 'zone-region-summary';
        const hoSummary = isField ? payload.head_office_summary : null;

        return (
            <div className="space-y-6">
                <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                    <tr className="bg-slate-100 font-bold">
                        <th rowSpan={2} className="border border-black p-1">SL</th>
                        <th rowSpan={2} className="border border-black p-1 text-left">Zone</th>
                        {(isField || isZoneRegion) && (
                            <th rowSpan={2} className="border border-black p-1 text-left">Region</th>
                        )}
                        {isField && (
                            <th rowSpan={2} className="border border-black p-1 text-left">Branch</th>
                        )}
                        <th colSpan={3} className="border border-black p-1">Officer</th>
                        <th colSpan={3} className="border border-black p-1">Accountant</th>
                        <th colSpan={3} className="border border-black p-1">Branch Mgr</th>
                        <th colSpan={3} className="border border-black p-1">Reg Mgr</th>
                        <th colSpan={3} className="border border-black p-1">Zone Mgr</th>
                        <th colSpan={3} className="border border-black p-1">Other</th>
                        <th colSpan={3} className="border border-black p-1 bg-slate-200">Total Staff</th>
                    </tr>
                    <tr className="bg-slate-100 text-[10px]">
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5">M</th><th className="border border-black p-0.5">F</th><th className="border border-black p-0.5 font-bold">T</th>
                        <th className="border border-black p-0.5 bg-slate-200">M</th><th className="border border-black p-0.5 bg-slate-200">F</th><th className="border border-black p-0.5 bg-slate-200 font-bold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {payload.rows?.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="border border-black p-1">{r.sl}</td>
                            <td className="border border-black p-1 text-left">{r.zone}</td>
                            {(isField || isZoneRegion) && (
                                <td className="border border-black p-1 text-left">{r.region}</td>
                            )}
                            {isField && (
                                <td className="border border-black p-1 text-left font-medium">{r.branch}</td>
                            )}
                            <td className="border border-black p-1">{r.officer_male || '-'}</td>
                            <td className="border border-black p-1">{r.officer_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.officer_total || '-'}</td>

                            <td className="border border-black p-1">{r.accountant_male || '-'}</td>
                            <td className="border border-black p-1">{r.accountant_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.accountant_total || '-'}</td>

                            <td className="border border-black p-1">{r.bm_male || '-'}</td>
                            <td className="border border-black p-1">{r.bm_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.bm_total || '-'}</td>

                            <td className="border border-black p-1">{r.rm_male || '-'}</td>
                            <td className="border border-black p-1">{r.rm_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.rm_total || '-'}</td>

                            <td className="border border-black p-1">{r.zm_male || '-'}</td>
                            <td className="border border-black p-1">{r.zm_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.zm_total || '-'}</td>

                            <td className="border border-black p-1">{r.other_male || '-'}</td>
                            <td className="border border-black p-1">{r.other_female || '-'}</td>
                            <td className="border border-black p-1 font-bold">{r.other_total || '-'}</td>

                            <td className="border border-black bg-slate-100 p-1 font-bold">{r.total_male}</td>
                            <td className="border border-black bg-slate-100 p-1 font-bold">{r.total_female}</td>
                            <td className="border border-black bg-slate-200 p-1 font-bold">{r.row_total}</td>
                        </tr>
                    ))}
                </tbody>
                {payload.totals && (
                    <tfoot>
                        <tr className="bg-slate-200 font-bold">
                            <td colSpan={isField ? 4 : (isZoneRegion ? 3 : 2)} className="border border-black p-1.5 text-left">Grand Total</td>
                            <td className="border border-black p-1">{payload.totals.officer_male}</td>
                            <td className="border border-black p-1">{payload.totals.officer_female}</td>
                            <td className="border border-black p-1">{payload.totals.officer_total}</td>

                            <td className="border border-black p-1">{payload.totals.accountant_male}</td>
                            <td className="border border-black p-1">{payload.totals.accountant_female}</td>
                            <td className="border border-black p-1">{payload.totals.accountant_total}</td>

                            <td className="border border-black p-1">{payload.totals.bm_male}</td>
                            <td className="border border-black p-1">{payload.totals.bm_female}</td>
                            <td className="border border-black p-1">{payload.totals.bm_total}</td>

                            <td className="border border-black p-1">{payload.totals.rm_male}</td>
                            <td className="border border-black p-1">{payload.totals.rm_female}</td>
                            <td className="border border-black p-1">{payload.totals.rm_total}</td>

                            <td className="border border-black p-1">{payload.totals.zm_male}</td>
                            <td className="border border-black p-1">{payload.totals.zm_female}</td>
                            <td className="border border-black p-1">{payload.totals.zm_total}</td>

                            <td className="border border-black p-1">{payload.totals.other_male}</td>
                            <td className="border border-black p-1">{payload.totals.other_female}</td>
                            <td className="border border-black p-1">{payload.totals.other_total}</td>

                            <td className="border border-black p-1">{payload.totals.total_male}</td>
                            <td className="border border-black p-1">{payload.totals.total_female}</td>
                            <td className="border border-black p-1">{payload.totals.row_total}</td>
                        </tr>
                    </tfoot>
                )}
            </table>

            {isField && hoSummary && (
                <div className="space-y-3">
                    <div className="border-b border-black pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
                        Head Office Staff Summary
                    </div>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-slate-100 text-center font-bold">
                                <th className="border border-black p-1.5 w-12">SL</th>
                                <th className="border border-black p-1.5 text-left">Salary Grade</th>
                                <th className="border border-black p-1.5 text-left">Present / Last Designation</th>
                                <th className="border border-black p-1.5 w-20">Male</th>
                                <th className="border border-black p-1.5 w-20">Female</th>
                                <th className="border border-black p-1.5 w-24">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoSummary.rows?.length ? (
                                hoSummary.rows.map((r: any) => (
                                    <tr key={r.sl} className="hover:bg-slate-50">
                                        <td className="border border-black p-1 text-center">{r.sl}</td>
                                        <td className="border border-black p-1 text-left">{r.salary_grade}</td>
                                        <td className="border border-black p-1 text-left">{r.designation}</td>
                                        <td className="border border-black p-1 text-center">{r.male || '-'}</td>
                                        <td className="border border-black p-1 text-center">{r.female || '-'}</td>
                                        <td className="border border-black p-1 text-center font-bold">{r.total}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="border border-black p-4 text-center text-slate-500">
                                        No head office staff found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {hoSummary.totals && (
                            <tfoot>
                                <tr className="bg-slate-100 font-bold">
                                    <td colSpan={3} className="border border-black p-2 text-right">Head Office Total:</td>
                                    <td className="border border-black p-2 text-center">{hoSummary.totals.male}</td>
                                    <td className="border border-black p-2 text-center">{hoSummary.totals.female}</td>
                                    <td className="border border-black p-2 text-center">{hoSummary.totals.total}</td>
                                </tr>
                                <tr className="bg-slate-200 font-bold text-sm">
                                    <td colSpan={3} className="border border-black p-2 text-right">Combined Grand Total (Field + Head Office):</td>
                                    <td className="border border-black p-2 text-center">
                                        {(payload.totals?.total_male ?? 0) + (hoSummary.totals.male ?? 0)}
                                    </td>
                                    <td className="border border-black p-2 text-center">
                                        {(payload.totals?.total_female ?? 0) + (hoSummary.totals.female ?? 0)}
                                    </td>
                                    <td className="border border-black p-2 text-center">
                                        {payload.combined_total ?? ((payload.totals?.row_total ?? 0) + (hoSummary.totals.total ?? 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
        );
    }

    if (template === 'location-ratio') {
        return (
            <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                    <tr className="bg-slate-100 font-bold">
                        <th className="border border-black p-2 text-left">Location & Ratio</th>
                        <th className="border border-black p-2">Male</th>
                        <th className="border border-black p-2">Female</th>
                        <th className="border border-black p-2">Total</th>
                        <th className="border border-black p-2">Ratio (Male : Female)</th>
                        <th className="border border-black p-2">Male %</th>
                        <th className="border border-black p-2">Female %</th>
                    </tr>
                </thead>
                <tbody>
                    {payload.rows?.map((row: any, i: number) => {
                        const isGrand = row.location === 'Grand Total';
                        return (
                            <tr key={i} className={isGrand ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                                <td className="border border-black p-2 text-left font-medium">{row.location}</td>
                                <td className="border border-black p-2">{row.male}</td>
                                <td className="border border-black p-2">{row.female}</td>
                                <td className="border border-black p-2 font-bold">{row.total}</td>
                                <td className="border border-black p-2 font-mono">{row.ratio}</td>
                                <td className="border border-black p-2">{row.male_percentage}</td>
                                <td className="border border-black p-2">{row.female_percentage}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    if (template === 'ho-grade-summary') {
        return (
            <div className="space-y-4">
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-center font-bold">
                            <th className="border border-black p-1.5 w-12">SL</th>
                            <th className="border border-black p-1.5 text-left">Salary Grade</th>
                            <th className="border border-black p-1.5 text-left">Present / Last Designation</th>
                            <th className="border border-black p-1.5 w-20">Male</th>
                            <th className="border border-black p-1.5 w-20">Female</th>
                            <th className="border border-black p-1.5 w-24">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payload.rows?.length ? (
                            payload.rows.map((r: any) => (
                                <tr key={r.sl} className="hover:bg-slate-50">
                                    <td className="border border-black p-1 text-center">{r.sl}</td>
                                    <td className="border border-black p-1">{r.salary_grade}</td>
                                    <td className="border border-black p-1">{r.designation}</td>
                                    <td className="border border-black p-1 text-center">{r.male || '-'}</td>
                                    <td className="border border-black p-1 text-center">{r.female || '-'}</td>
                                    <td className="border border-black p-1 text-center font-bold">{r.total}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="border border-black p-4 text-center text-slate-500">
                                    No head office staff found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {payload.totals && (
                        <tfoot>
                            <tr className="bg-slate-200 font-bold">
                                <td colSpan={3} className="border border-black p-2 text-right">Grand Total:</td>
                                <td className="border border-black p-2 text-center">{payload.totals.male}</td>
                                <td className="border border-black p-2 text-center">{payload.totals.female}</td>
                                <td className="border border-black p-2 text-center">{payload.totals.total}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        );
    }

    if (template === 'recruitment-separation-payment') {
        return (
            <div className="space-y-6">
                {Object.entries(payload.sections || {}).map(([key, sec]: [string, any]) => (
                    <div key={key} className="space-y-1">
                        <div className="border-b border-black pb-1 font-bold text-sm">{sec.title}</div>
                        <table className="w-full border-collapse border border-black text-center text-xs">
                            <thead>
                                <tr className="bg-slate-100 font-bold">
                                    <th className="border border-black p-1.5 text-left">Month</th>
                                    {sec.designations?.map((d: string, dIdx: number) => (
                                        <th key={dIdx} className="border border-black p-1.5">{d}</th>
                                    ))}
                                    <th className="border border-black p-1.5 bg-slate-200">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.rows?.map((r: any, rIdx: number) => (
                                    <tr key={rIdx} className={r.is_subtotal ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                                        <td className="border border-black p-1 text-left">{r.label}</td>
                                        {sec.designations?.map((d: string, dIdx: number) => (
                                            <td key={dIdx} className="border border-black p-1">
                                                {r.counts[d] || (r.is_subtotal ? '0' : '-')}
                                            </td>
                                        ))}
                                        <td className="border border-black p-1 font-bold">{r.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {sec.totals && (
                                <tfoot>
                                    <tr className="bg-slate-200 font-bold">
                                        <td className="border border-black p-1.5 text-left">Grand Total</td>
                                        {sec.designations?.map((d: string, dIdx: number) => (
                                            <td key={dIdx} className="border border-black p-1.5">
                                                {sec.totals.counts[d] || 0}
                                            </td>
                                        ))}
                                        <td className="border border-black p-1.5">{sec.totals.total || 0}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                ))}
            </div>
        );
    }

    if (template === 'eligibility-list') {
        const isPromotion = payload.eligibility_type === 'promotion';
        const isConfirmation = payload.eligibility_type === 'confirmation';

        return (
            <div className="space-y-4">
                {payload.eligibility_banner && (
                    <div className="border border-black bg-slate-50 p-2 font-bold text-xs flex justify-between">
                        <span>{payload.eligibility_banner}</span>
                        {payload.generated_date && <span className="font-normal text-slate-600">Generated: {payload.generated_date}</span>}
                    </div>
                )}

                {payload.sections?.map((sec: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-1">
                        <div className="border border-black bg-slate-100 px-3 py-1 font-bold text-xs">
                            Branch: {sec.branch_name} &nbsp;&nbsp;|&nbsp;&nbsp; Eligible Staff: {sec.staff_count}
                        </div>
                        <table className="w-full border-collapse border border-black text-xs text-left">
                            <thead>
                                <tr className="bg-slate-50 text-center font-bold">
                                    <th className="border border-black p-1">SL</th>
                                    <th className="border border-black p-1 text-left">Branch</th>
                                    <th className="border border-black p-1">PIN</th>
                                    <th className="border border-black p-1 text-left">Name (English)</th>
                                    <th className="border border-black p-1 text-left">Designation</th>
                                    <th className="border border-black p-1">Joining Date</th>
                                    {isPromotion && <th className="border border-black p-1">Confirmation Date</th>}
                                    <th className="border border-black p-1">Service Length</th>
                                    {isPromotion && <th className="border border-black p-1">Last Promo Date</th>}
                                    <th className="border border-black p-1">
                                        {isPromotion ? 'Upcoming Promo' : (isConfirmation ? 'Upcoming Conf' : 'Upcoming Increase')}
                                    </th>
                                    <th className="border border-black p-1">Upcoming Month</th>
                                    <th className="border border-black p-1">Grade</th>
                                    <th className="border border-black p-1">Step</th>
                                    <th className="border border-black p-1 text-right">Basic</th>
                                    <th className="border border-black p-1 text-right">Gross</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.rows?.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="border border-black p-1 text-center">{row.sl}</td>
                                        <td className="border border-black p-1">{row.branch}</td>
                                        <td className="border border-black p-1 text-center font-mono">{row.pin}</td>
                                        <td className="border border-black p-1 font-medium">{row.name}</td>
                                        <td className="border border-black p-1">{row.designation}</td>
                                        <td className="border border-black p-1 text-center">{row.joining_date}</td>
                                        {isPromotion && <td className="border border-black p-1 text-center">{row.confirmation_date || '-'}</td>}
                                        <td className="border border-black p-1 text-center font-mono text-[11px]">{row.service_length}</td>
                                        {isPromotion && <td className="border border-black p-1 text-center">{row.last_promo_date || '-'}</td>}
                                        <td className="border border-black p-1 text-center font-semibold text-emerald-800">{row.upcoming_date}</td>
                                        <td className="border border-black p-1 text-center">{row.upcoming_month}</td>
                                        <td className="border border-black p-1 text-center">{row.salary_grade}</td>
                                        <td className="border border-black p-1 text-center">{row.salary_step}</td>
                                        <td className="border border-black p-1 text-right font-mono">{row.basic_salary}</td>
                                        <td className="border border-black p-1 text-right font-mono font-semibold">{row.gross_salary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
                <div className="text-right font-bold text-xs">
                    Grand Total Eligible Staff: {payload.grand_total}
                </div>
            </div>
        );
    }

    return <div>Report payload received.</div>;
}
