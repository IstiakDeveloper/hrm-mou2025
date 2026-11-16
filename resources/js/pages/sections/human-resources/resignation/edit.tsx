import React from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Send, Save, AlertCircle, Info, Trash2 } from 'lucide-react';

interface EditProps {
    application: any;
    reasonCategories: Record<string, string>;
}

export default function ResignationApplicationEdit({
    application,
    reasonCategories = {},
}: EditProps) {
    const { flash } = usePage().props as any;
    const employee = application.employee || {};

    const { data, setData, put, processing, errors } = useForm<{
        reason_category: string;
        reason_detail: string;
        notice_date: string;
        last_working_date: string;
        effective_date: string;
        applicant_mobile: string;
        submit_now: boolean;
    }>({
        reason_category: application.reason_category || 'personal_reason',
        reason_detail: application.reason_detail || '',
        notice_date: application.notice_date ? String(application.notice_date).substring(0, 10) : '',
        last_working_date: application.last_working_date ? String(application.last_working_date).substring(0, 10) : '',
        effective_date: application.effective_date ? String(application.effective_date).substring(0, 10) : '',
        applicant_mobile: application.applicant_mobile || employee.mobile_phone || '',
        submit_now: false,
    });

    const handleSubmit = (submitNow: boolean) => {
        data.submit_now = submitNow;
        put(`/resignation-applications/${application.id}`, {
            preserveScroll: true,
        });
    };

    const hasAnyError = Object.keys(errors).length > 0;

    return (
        <AdminLayout>
            <Head title={`অব্যাহতি আবেদন সংশোধন - ${application.application_no}`} />

            <div className="max-w-4xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href={`/resignation-applications/${application.id}`}>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                                <ArrowLeft className="h-4 w-4" />
                                ফিরে যান
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                অব্যাহতির আবেদন সংশোধন ({application.application_no})
                            </h1>
                            <p className="text-xs text-slate-500">
                                কর্মী: {employee.name_bn || employee.name_en} ({employee.pin})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.error && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 shadow-xs">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-800">
                            <span className="font-bold text-sm block mb-0.5">আবেদন সংরক্ষণ করা সম্ভব হয়নি:</span>
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {flash?.info && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-xs">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800">
                            <span>{flash.info}</span>
                        </div>
                    </div>
                )}

                {/* Validation Errors Summary Banner */}
                {hasAnyError && (
                    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                            <span>আবেদনের তথ্যে ত্রুটি রয়েছে (অনুগ্রহ করে নিচের ফিল্ডগুলো যাচাই করুন):</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-red-700 pl-4 space-y-1">
                            {Object.entries(errors).map(([key, msg]) => (
                                <li key={key}>{String(msg)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                        <CardTitle className="text-sm font-bold text-slate-800">
                            তথ্য হালনাগাদ ও পুনরায় দাখিল
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            প্রয়োজনীয় সংশোধন সম্পন্ন করে সংরক্ষণ বা পর্যালোচনার জন্য জমা দিন।
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* Reason Selection */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">অব্যাহতির কারণ:</Label>
                            <Select
                                value={data.reason_category}
                                onValueChange={(val) => setData('reason_category', val)}
                            >
                                <SelectTrigger className={`text-xs h-9 bg-white ${errors.reason_category ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                                    <SelectValue placeholder="কারণ নির্বাচন করুন" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(reasonCategories).map(([key, label]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.reason_category && <p className="text-[11px] text-red-600 font-medium">{errors.reason_category}</p>}
                        </div>

                        {/* Additional Reason Detail */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">কারণের বিস্তারিত বিবরণ:</Label>
                            <Textarea
                                value={data.reason_detail}
                                onChange={(e) => setData('reason_detail', e.target.value)}
                                rows={3}
                                className={`text-xs resize-none ${errors.reason_detail ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {errors.reason_detail && <p className="text-[11px] text-red-600 font-medium">{errors.reason_detail}</p>}
                        </div>

                        {/* Notice & Working Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">নোটিশ/চাকরি বন্ধের তারিখ:</Label>
                                <Input
                                    type="date"
                                    value={data.notice_date}
                                    onChange={(e) => setData('notice_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.notice_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.notice_date && <p className="text-[11px] text-red-600 font-medium">{errors.notice_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">সংস্থায় শেষ কর্মদিবস (Last Day):</Label>
                                <Input
                                    type="date"
                                    value={data.last_working_date}
                                    onChange={(e) => setData('last_working_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.last_working_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.last_working_date && <p className="text-[11px] text-red-600 font-medium">{errors.last_working_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">অব্যাহতি কার্যকরের তারিখ (Effective):</Label>
                                <Input
                                    type="date"
                                    value={data.effective_date}
                                    onChange={(e) => setData('effective_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.effective_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.effective_date && <p className="text-[11px] text-red-600 font-medium">{errors.effective_date}</p>}
                            </div>
                        </div>

                        {/* Mobile Phone */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">মোবাইল নম্বর:</Label>
                            <Input
                                type="text"
                                value={data.applicant_mobile}
                                onChange={(e) => setData('applicant_mobile', e.target.value)}
                                className={`text-xs h-9 bg-slate-50 ${errors.applicant_mobile ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {errors.applicant_mobile && <p className="text-[11px] text-red-600 font-medium">{errors.applicant_mobile}</p>}
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            {application.status === 'draft' ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm(`আপনি কি নিশ্চিত যে এই খসড়া আবেদনটি (${application.application_no}) মুছে ফেলতে চান?`)) {
                                            router.delete(`/resignation-applications/${application.id}`);
                                        }
                                    }}
                                    disabled={processing}
                                    className="text-xs h-9 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    খসড়া মুছে ফেলুন
                                </Button>
                            ) : (
                                <div />
                            )}

                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSubmit(false)}
                                    disabled={processing}
                                    className="text-xs h-9 gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                >
                                    <Save className="h-4 w-4" />
                                    {processing && !data.submit_now ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন (Save Draft)'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit(true)}
                                    disabled={processing}
                                    className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                                >
                                    <Send className="h-4 w-4" />
                                    {processing && data.submit_now ? 'দাখিল হচ্ছে...' : 'পুনরায় দাখিল করুন (Resubmit)'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
