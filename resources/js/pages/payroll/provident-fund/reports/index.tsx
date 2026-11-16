import { Head, Link } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { pfReportPath } from '@/lib/pf-reports';
import { ChevronRight, FileBarChart2 } from 'lucide-react';

type ReportItem = {
    slug: string;
    title: string;
    description: string;
};

export default function PfReportsIndex({ reports }: { reports: ReportItem[] }) {
    return (
        <StaffFundLayout
            title="PF Reports"
            description="Generate, print, PDF or Excel (CSV) — same style as payroll and loan reports."
            activeTab="pf-reports"
        >
            <Head title="PF Reports" />

            <div className="rounded-lg border border-emerald-100 bg-white shadow-2xs">
                <div className="border-b border-emerald-50 px-4 py-3">
                    <h2 className="text-sm font-bold text-zinc-800">All PF reports</h2>
                    <p className="text-xs text-zinc-500">Select a report to set filters and generate.</p>
                </div>
                <ul className="divide-y divide-slate-200">
                    {reports.map((r) => (
                        <li key={r.slug}>
                            <Link
                                href={pfReportPath(r.slug)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/40"
                            >
                                <FileBarChart2 className="h-5 w-5 shrink-0 text-emerald-600" />
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
            </div>
        </StaffFundLayout>
    );
}
