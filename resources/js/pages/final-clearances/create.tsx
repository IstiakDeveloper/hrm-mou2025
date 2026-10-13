import { AppraisalEmployeeCombo, type AppraisalEmployee } from '@/components/appraisal/AppraisalEmployeeCombo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Layout from '@/layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ChevronRight, HandCoins, User } from 'lucide-react';
import React, { useState } from 'react';

const SIGNATURE_REQUIRED = 'চূড়ান্ত ছাড়পত্রের কোনো কাজ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।';

export default function FinalClearanceCreate({ userHasSignature = false }: { userHasSignature?: boolean }) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [picked, setPicked] = useState<AppraisalEmployee | null>(null);
    const [submitting, setSubmitting] = useState(false);

    return (
        <Layout>
            <Head title="New Final Payment & Clearance" />
            <div className="w-full space-y-3.5">
                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-2xs sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/final-clearances" className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                <span>HR</span>
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                                <Link href="/final-clearances" className="hover:text-emerald-700">Final Payment & Clearance</Link>
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                                <span className="font-semibold text-emerald-700">New</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                                    <HandCoins className="h-4 w-4" />
                                </div>
                                <div>
                                    <h1 className="text-base leading-tight font-bold tracking-tight text-slate-900">New clearance</h1>
                                    <p className="text-[11px] text-slate-500">Dropped or inactive staff whose final payment is not paid yet.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden border-slate-200 bg-white shadow-xs">
                    <CardHeader className="border-b border-slate-200/80 bg-slate-50/60 pb-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <User className="h-5 w-5 text-emerald-600" />
                            <CardTitle className="text-base">Select employee</CardTitle>
                        </div>
                        <CardDescription>Search by PIN or name, then select the staff member.</CardDescription>
                    </CardHeader>
                    <CardContent className="max-w-2xl space-y-4 p-5">
                        <div className="space-y-2">
                            <Label className="font-medium text-slate-700">
                                Employee <span className="text-red-500">*</span>
                            </Label>
                            <AppraisalEmployeeCombo
                                lookupUrl="/final-clearances/employees/lookup"
                                value={employeeId}
                                lang="en"
                                placeholder="Search by PIN or name, then select"
                                onSelect={(employee) => {
                                    setPicked(employee);
                                    setEmployeeId(employee?.id ?? null);
                                }}
                            />
                        </div>

                        {picked && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{picked.name_bn || picked.name_en}</div>
                                    <div className="text-[11px] text-slate-600">
                                        {picked.pin} · {picked.designation?.name || '—'} · {picked.branch?.name || '—'}
                                    </div>
                                </div>
                                <Button
                                    className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold hover:bg-emerald-700"
                                    disabled={submitting || !employeeId}
                                    onClick={() => {
                                        if (!employeeId) return;
                                        if (!userHasSignature) {
                                            alert(SIGNATURE_REQUIRED);
                                            window.location.href = '/settings/profile';
                                            return;
                                        }
                                        setSubmitting(true);
                                        router.post('/final-clearances', { employee_id: employeeId }, {
                                            onFinish: () => setSubmitting(false),
                                        });
                                    }}
                                >
                                    Create draft
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
