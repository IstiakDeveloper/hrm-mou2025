import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Send, Save, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface CreateProps {
    currentEmployee: any;
    isHrOrAdmin: boolean;
    selectableEmployees: any[];
    reasonCategories: Record<string, string>;
    userHasSignature: boolean;
}

export default function ResignationApplicationCreate({
    currentEmployee,
    isHrOrAdmin,
    selectableEmployees = [],
    reasonCategories = {},
    userHasSignature = true,
}: CreateProps) {
    const { flash } = usePage().props as any;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
        currentEmployee?.id ? String(currentEmployee.id) : ''
    );

    const activeEmployee = isHrOrAdmin
        ? (selectableEmployees.find((e) => String(e.id) === selectedEmployeeId) || currentEmployee)
        : currentEmployee;

    const { data, setData, post, processing, errors } = useForm<{
        employee_id: number | string;
        application_date: string;
        joining_date: string;
        reason_category: string;
        reason_detail: string;
        notice_date: string;
        last_working_date: string;
        effective_date: string;
        applicant_mobile: string;
        submit_now: boolean;
    }>({
        employee_id: activeEmployee?.id || '',
        application_date: today,
        joining_date: activeEmployee?.joining_date ? String(activeEmployee.joining_date).substring(0, 10) : '',
        reason_category: 'personal_reason',
        reason_detail: '',
        notice_date: today,
        last_working_date: '',
        effective_date: '',
        applicant_mobile: activeEmployee?.mobile_phone || '',
        submit_now: false,
    });

    const handleEmployeeChange = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = selectableEmployees.find((e) => String(e.id) === empId);
        if (emp) {
            setData((prev) => ({
                ...prev,
                employee_id: emp.id,
                joining_date: emp.joining_date ? String(emp.joining_date).substring(0, 10) : prev.joining_date,
                applicant_mobile: emp.mobile_phone || prev.applicant_mobile,
            }));
        }
    };

    const handleSubmit = (submitNow: boolean) => {
        data.submit_now = submitNow;
        post('/resignation-applications', {
            preserveScroll: true,
        });
    };

    const designationName = activeEmployee?.designation?.name || '-';
    const branchName = activeEmployee?.branch?.name || activeEmployee?.department?.name || 'প্রধান কার্যালয়';

    const hasAnyError = Object.keys(errors).length > 0;

    return (
        <AdminLayout>
            <Head title="চাকরি হতে অব্যাহতির আবেদন দাখিল" />

            <div className="max-w-4xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href="/resignation-applications">
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                                <ArrowLeft className="h-4 w-4" />
                                ফিরে যান
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                চাকরি হতে অব্যাহতির আবেদন দাখিল
                            </h1>
                            <p className="text-xs text-slate-500">
                                মৌসুমী (Ukilpara, Naogaon) - অফিসিয়াল অব্যাহতি আবেদনপত্র ও ওয়ার্কফ্লো
                            </p>
                        </div>
                    </div>
                </div>

                {/* Flash Messages (Backend session errors/alerts) */}
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

                {/* Signature Notice */}
                {!userHasSignature && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-xs">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block text-sm mb-0.5">ডিজিটাল স্বাক্ষর সংযুক্ত নেই:</span>
                                <span>
                                    আপনি খসড়া (Draft) হিসেবে আবেদনটি সংরক্ষণ করতে পারবেন। তবে পর্যালোচকের নিকট চূড়ান্ত দাখিলের পূর্বে প্রোফাইলে ডিজিটাল স্বাক্ষর থাকা আবশ্যক।
                                </span>
                            </div>
                        </div>
                        <Link href="/settings/profile">
                            <Button size="sm" variant="outline" className="text-xs h-8 bg-white border-amber-300 text-amber-900 shrink-0">
                                স্বাক্ষর আপলোড করুন
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Form Card */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                        <CardTitle className="text-sm font-bold text-slate-800">
                            আবেদনকারীর তথ্য ও কারণাদি পূরণ
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            আপনি যেকোনো সময় "খসড়া হিসেবে সংরক্ষণ" করে রাখতে পারেন এবং পরবর্তীতে সংশোধন করতে পারবেন।
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* If Admin/HR: select employee */}
                        {isHrOrAdmin ? (
                            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                                <Label className="text-xs font-semibold text-emerald-900">
                                    কর্মীর প্রোফাইল নির্বাচন করুন (HR / Admin মোড):
                                </Label>
                                <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                                    <SelectTrigger className="text-xs h-9 bg-white">
                                        <SelectValue placeholder="কর্মী নির্বাচন করুন..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {selectableEmployees.map((emp) => (
                                            <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                                                [{emp.pin}] {emp.name_bn || emp.name_en} - {emp.designation?.name} ({emp.branch?.name || 'HO'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.employee_id && <p className="text-[11px] text-red-600 font-semibold">{errors.employee_id}</p>}
                            </div>
                        ) : !activeEmployee ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                                সতর্কতা: আপনার ইউজার অ্যাকাউন্টের সাথে কোনো কর্মী প্রোফাইল (Employee Profile) সংযুক্ত পাওয়া যায়নি। অনুগ্রহ করে মানবসম্পদ বিভাগের সাথে যোগাযোগ করুন।
                            </div>
                        ) : null}

                        {/* Readonly preview of employee info */}
                        {activeEmployee && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <span className="text-slate-500 block text-[11px]">আবেদনকারীর নাম ও পিন:</span>
                                    <span className="font-semibold text-slate-800">
                                        {activeEmployee?.name_bn || activeEmployee?.name_en || 'অনুপস্থিত'} ({activeEmployee?.pin || '-'})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">বর্তমান পদবি:</span>
                                    <span className="font-semibold text-slate-800">{designationName}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">কর্মস্থল (শাখা/অফিস):</span>
                                    <span className="font-semibold text-slate-800">{branchName}</span>
                                </div>
                            </div>
                        )}

                        {/* Dates grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">আবেদনের তারিখ:</Label>
                                <Input
                                    type="date"
                                    value={data.application_date}
                                    onChange={(e) => setData('application_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.application_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.application_date && <p className="text-[11px] text-red-600 font-medium">{errors.application_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">সংস্থায় যোগদানের তারিখ:</Label>
                                <Input
                                    type="date"
                                    value={data.joining_date}
                                    onChange={(e) => setData('joining_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.joining_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.joining_date && <p className="text-[11px] text-red-600 font-medium">{errors.joining_date}</p>}
                            </div>
                        </div>

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
                            <Label className="text-xs font-semibold text-slate-700">
                                কারণের বিস্তারিত বিবরণ (ঐচ্ছিক / 'অন্যান্য' হলে বাধ্যতামূলক):
                            </Label>
                            <Textarea
                                value={data.reason_detail}
                                onChange={(e) => setData('reason_detail', e.target.value)}
                                placeholder="অব্যাহতির সুনির্দিষ্ট কারণ বিস্তারিত লিখুন..."
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
                                <Label className="text-xs font-semibold text-slate-700">
                                    সংস্থায় শেষ কর্মদিবস (Last Working Day):
                                </Label>
                                <Input
                                    type="date"
                                    value={data.last_working_date}
                                    onChange={(e) => setData('last_working_date', e.target.value)}
                                    className={`text-xs h-9 bg-slate-50 ${errors.last_working_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                />
                                {errors.last_working_date && <p className="text-[11px] text-red-600 font-medium">{errors.last_working_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">
                                    অব্যাহতি কার্যকরের তারিখ (Effective Date):
                                </Label>
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
                            <Label className="text-xs font-semibold text-slate-700">মোবাইল নম্বর (যোগাযোগের জন্য):</Label>
                            <Input
                                type="text"
                                value={data.applicant_mobile}
                                onChange={(e) => setData('applicant_mobile', e.target.value)}
                                placeholder="017xxxxxxxx"
                                className={`text-xs h-9 bg-slate-50 ${errors.applicant_mobile ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {errors.applicant_mobile && <p className="text-[11px] text-red-600 font-medium">{errors.applicant_mobile}</p>}
                        </div>

                        {/* Form Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSubmit(false)}
                                disabled={processing}
                                className="text-xs h-9 gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                            >
                                <Save className="h-4 w-4" />
                                {processing && !data.submit_now ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া হিসেবে সংরক্ষণ করুন (Save Draft)'}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={processing}
                                className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                            >
                                <Send className="h-4 w-4" />
                                {processing && data.submit_now ? 'দাখিল হচ্ছে...' : 'সুপারিশ ও পর্যালোচনার জন্য দাখিল করুন'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
