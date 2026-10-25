import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { FormErrorBanner } from '@/components/employee-loan/FormErrorBanner';
import { MotorcycleLoanApplicationDocument, type MotorcycleLoanFormFields } from '@/components/employee-loan/MotorcycleLoanApplicationDocument';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';

type Props = {
    application: {
        id: number;
        application_number: string;
        stage_label: string;
        applied_amount: number;
        policy_name: string | null;
    };
    form: MotorcycleLoanFormFields;
    stage?: string;
    has_signature?: boolean;
};

export default function MotorcycleRecommendationShow({ application, form, stage, has_signature = true }: Props) {
    const forward = useForm({ comments: '' });
    const sendBack = useForm({ comments: '' });
    const [comments, setComments] = useState('');

    const submitForward = () => {
        forward.transform(() => ({ comments }));
        forward.post(route('employee.loan.recommendations.forward', application.id));
    };
    const submitBack = () => {
        if (!window.confirm('আবেদনকারীর কাছে ফেরত পাঠাবেন?')) return;
        sendBack.transform(() => ({ comments }));
        sendBack.post(route('employee.loan.recommendations.send-back', application.id));
    };

    return (
        <Layout>
            <Head title={application.application_number} />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 print:hidden">
                    <p className="font-mono text-xs text-zinc-500">{application.application_number}</p>
                    <h1 className="text-xl font-bold text-zinc-950">{application.stage_label} এর সুপারিশ</h1>
                    <p className="mt-1 text-sm text-zinc-600">{application.policy_name}</p>
                </div>

                <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 print:hidden">
                    <FormErrorBanner errors={{ ...forward.errors, ...sendBack.errors }} />
                    {!has_signature && (
                        <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                            প্রোফাইলে সিল ও স্বাক্ষর নেই। আপলোড না করা পর্যন্ত সুপারিশ বা অনুমোদন দেওয়া যাবে না।
                        </p>
                    )}
                    <label className="block text-xs font-medium text-zinc-600">
                        মন্তব্য ও সুপারিশ
                        <textarea
                            className="mt-1 min-h-24 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                            value={comments}
                            onChange={(event) => setComments(event.target.value)}
                            placeholder="সুপারিশ করা হলো / ফেরত পাঠানোর কারণ"
                        />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={employeeLoanEmployeePath(route('employee.loan.recommendations.index'))}>Back</Link>
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={comments.trim() === '' || sendBack.processing} onClick={submitBack}>ফেরত পাঠান</Button>
                        <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!has_signature || comments.trim() === '' || forward.processing} onClick={submitForward}>
                            {stage === 'ed' ? 'অনুমোদন ও প্রদান' : 'সুপারিশ করে পাঠান'}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <MotorcycleLoanApplicationDocument fields={form} />
                </div>
            </PageSurface>
        </Layout>
    );
}
