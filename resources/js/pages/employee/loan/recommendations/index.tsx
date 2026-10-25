import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { formatTakaWhole } from '@/lib/taka-format';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';

type Row = {
    id: number;
    application_number: string;
    employee_label: string;
    designation: string | null;
    branch: string | null;
    applied_amount: number;
    policy_name: string | null;
    stage_label: string;
};

export default function MotorcycleRecommendations({ applications }: { applications: Row[] }) {
    return (
        <Layout>
            <Head title="Motorcycle recommendations" />
            <PageSurface className="px-3 sm:px-4">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950">Motorcycle recommendations</h1>
                <p className="mt-1 mb-4 max-w-2xl text-sm text-zinc-600">
                    শুধু যে আবেদন এখন আপনার সুপারিশের অপেক্ষায়, সেগুলো এখানে আসে। মন্তব্য লিখে পরের ধাপে পাঠান, অথবা আবেদনকারীর কাছে ফেরত দিন।
                </p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                            <tr>
                                <th className="px-3 py-2">Application</th>
                                <th className="px-3 py-2">Employee</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2">Waiting for</th>
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 && (
                                <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">No recommendation is waiting for you.</td></tr>
                            )}
                            {applications.map((row) => (
                                <tr key={row.id} className="border-t border-zinc-100">
                                    <td className="px-3 py-2 font-mono text-xs font-semibold">{row.application_number}</td>
                                    <td className="px-3 py-2 text-xs">
                                        <p>{row.employee_label}</p>
                                        <p className="text-zinc-500">{row.designation}{row.branch ? ` · ${row.branch}` : ''}</p>
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">{formatTakaWhole(row.applied_amount)}</td>
                                    <td className="px-3 py-2 text-xs">{row.stage_label}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Link href={employeeLoanEmployeePath(route('employee.loan.recommendations.show', row.id))} className="text-xs font-semibold text-amber-800 hover:underline">Recommend</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </PageSurface>
        </Layout>
    );
}
