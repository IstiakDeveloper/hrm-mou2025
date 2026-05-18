import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { FileBarChart2, ChevronRight } from 'lucide-react';

type ReportItem = {
    slug: string;
    title: string;
    description: string;
    group: string;
};

type Props = {
    reports: ReportItem[];
};

export default function FixedAssetReportsIndex({ reports }: Props) {
    const groups = reports.reduce<Record<string, ReportItem[]>>((acc, r) => {
        const g = r.group || 'Reports';
        if (!acc[g]) acc[g] = [];
        acc[g].push(r);
        return acc;
    }, {});

    const groupOrder = ['Tracking', 'Purchase', 'Operations', 'Disposal', 'Schedules', 'Reports'];

    const orderedGroups = [
        ...groupOrder.filter((g) => groups[g]?.length),
        ...Object.keys(groups).filter((g) => !groupOrder.includes(g)),
    ];

    return (
        <Layout>
            <Head title="Asset Reports" />
            <PayrollPage>
                <PayrollPageHeader
                    title="Asset Reports"
                    description="Standard fixed-asset reports — generate on screen or download CSV."
                />

                <div className="space-y-6">
                    {orderedGroups.map((group) => (
                        <PayrollSectionCard key={group} title={group} description={`${groups[group].length} report(s)`}>
                            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                                {groups[group].map((r) => (
                                    <li key={r.slug}>
                                        <Link
                                            href={route('fixed-asset.reports.show', r.slug)}
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
                    ))}
                </div>
            </PayrollPage>
        </Layout>
    );
}
