import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { employeeLoanReportPath } from '@/lib/employee-loan-reports';
import { ChevronRight, FileBarChart2 } from 'lucide-react';

type ReportItem = {
    slug: string;
    title: string;
    description: string;
};

export default function EmployeeLoanReportsIndex({ reports }: { reports: ReportItem[] }) {
    return (
        <Layout>
            <Head title="Loan Reports" />
            <PayrollPage>
                <PayrollPageHeader
                    title="Loan Reports"
                    description="Generate, print, PDF or Excel (CSV) — same style as payroll reports."
                />

                <PayrollSectionCard title="All reports" description="Select a report to set filters and generate.">
                    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                        {reports.map((r) => (
                            <li key={r.slug}>
                                <Link
                                    href={employeeLoanReportPath(r.slug)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                                >
                                    <FileBarChart2 className="h-5 w-5 shrink-0 text-slate-500" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                                        {r.description && (
                                            <p className="text-xs text-muted-foreground">{r.description}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
