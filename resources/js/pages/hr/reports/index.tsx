import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { FileBarChart2, ChevronRight, FileText } from 'lucide-react';
import { hrReportPath } from '@/lib/hr-reports';

type ReportItem = {
    slug: string;
    title: string;
    short_title: string;
    description: string;
    orientation: string;
};

type Props = {
    reports: ReportItem[];
};

export default function HrReportsIndex({ reports }: Props) {
    return (
        <Layout>
            <Head title="Human Resource Reports" />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Human Resource Reports</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Staff headcount summaries, service length registers, PKSF formats, and eligibility lists. Preview, print, or export to PDF and Excel.
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-800">All Human Resource Reports (13 Reports)</h2>
                        <p className="text-xs text-slate-500">Select any report to configure filters, preview, and download.</p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {reports.map((r, idx) => (
                            <li key={r.slug}>
                                <Link
                                    href={hrReportPath(r.slug)}
                                    className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-slate-50"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                        <FileBarChart2 className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-semibold text-slate-400">#{idx + 1}</span>
                                            <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 uppercase">
                                                {r.orientation}
                                            </span>
                                        </div>
                                        {r.description && (
                                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{r.description}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
