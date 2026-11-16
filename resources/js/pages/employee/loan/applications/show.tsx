import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PfLoanApplicationDocument, type PfLoanFormFields } from '@/components/employee-loan/PfLoanApplicationDocument';
import { MotorcycleLoanApplicationDocument, type MotorcycleLoanFormFields } from '@/components/employee-loan/MotorcycleLoanApplicationDocument';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { formatTakaWhole } from '@/lib/taka-format';
import { Printer } from 'lucide-react';
import { LoanWorkflowTimeline, type WorkflowStep } from '@/components/employee-loan/LoanWorkflowTimeline';
import { MotorcycleLoanReviewBar, type MotorcycleReviewState } from '@/components/employee-loan/MotorcycleLoanReviewBar';

type Props = {
    application: {
        id: number;
        application_number: string;
        application_date: string | null;
        status: string;
        policy_name: string | null;
        loan_type?: string | null;
        workflow_stage?: string | null;
        applied_amount: number;
        rejection_reason: string | null;
    };
    form: (PfLoanFormFields & Partial<MotorcycleLoanFormFields>) | null;
};

const statusLabel: Record<string, string> = {
    draft: 'খসড়া',
    in_review: 'সুপারিশ চলছে',
    pending: 'With Accounts',
    approved: 'Approved',
    rejected: 'Rejected',
    disbursed: 'Disbursed',
    cancelled: 'Cancelled',
};

export default function ShowPfLoanApplication({ application, form, timeline = [], review = null }: Props & { timeline?: WorkflowStep[]; review?: MotorcycleReviewState | null }) {
    return (
        <Layout>
            <Head title={application.application_number} />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
                    <div>
                        <p className="font-mono text-xs text-zinc-500">{application.application_number}</p>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">{application.loan_type === 'motorcycle_loan' ? 'Motorcycle Loan Application' : 'PF Loan Application'}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                            <Badge variant="outline">{statusLabel[application.status] || application.status}</Badge>
                            <span>{application.application_date}</span>
                            <span>{application.policy_name}</span>
                            <span className="font-semibold text-zinc-900">{formatTakaWhole(application.applied_amount)}</span>
                        </div>
                        {application.rejection_reason && (
                            <p className="mt-2 text-sm text-rose-700">Rejected: {application.rejection_reason}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {application.status === 'draft' && (
                            <Button asChild size="sm" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700">
                                <Link href={employeeLoanEmployeePath(application.loan_type === 'motorcycle_loan' ? route('employee.loan.applications.motorcycle.create') : route('employee.loan.applications.create'))}>সংশোধন / জমা দিন</Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath(route('employee.loan.applications.index'))}>My applications</Link>
                        </Button>
                        <Button type="button" size="sm" className="h-9 bg-amber-600 text-xs hover:bg-amber-700" onClick={() => window.print()}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                        </Button>
                    </div>
                </div>

                <LoanWorkflowTimeline steps={timeline} />

                {form?.form === 'motorcycle' && <MotorcycleLoanReviewBar applicationId={application.id} review={review} appliedAmount={application.applied_amount} />}

                {form?.form === 'motorcycle' ? (
                    <div className="overflow-x-auto">
                        <MotorcycleLoanApplicationDocument fields={form as MotorcycleLoanFormFields} />
                    </div>
                ) : form ? (
                    <div className="overflow-x-auto">
                        <PfLoanApplicationDocument fields={form} />
                    </div>
                ) : (
                    <p className="text-sm text-zinc-500">The official form is not stored on this application.</p>
                )}

                <p className="mx-auto mt-4 max-w-[210mm] text-xs text-zinc-500 print:hidden">
                    {form?.form === 'motorcycle'
                        ? 'সুপারিশ এই পাতা থেকেই হয়। সিল ও স্বাক্ষর প্রোফাইলে থাকলে ফরমে নিজে থেকে বসে।'
                        : 'ট্রাস্টি বোর্ডের সিল ও স্বাক্ষর এই ফরমের ছাপানো কপিতে Accounts হাতে নেবে। সিস্টেমে শুধু Accounts approval লাগে।'}
                </p>
            </PageSurface>
        </Layout>
    );
}
