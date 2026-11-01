import React from 'react';
import { format, parseISO } from 'date-fns';

export const toBengaliNumber = (num: number | string | null | undefined) => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[Number(d)]);
};

export const formatBengaliDate = (dateVal: string | null | undefined) => {
    if (!dateVal) return '………………';
    try {
        const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal;
        const day = toBengaliNumber(format(d, 'dd'));
        const month = toBengaliNumber(format(d, 'MM'));
        const year = toBengaliNumber(format(d, 'yyyy'));
        return `${day}/${month}/${year}`;
    } catch {
        return dateVal;
    }
};

interface OfficialResignationDocumentProps {
    application: any;
    lang?: 'bn' | 'en';
}

export default function OfficialResignationDocument({ application }: OfficialResignationDocumentProps) {
    const employee = application.employee || {};
    const signatures = application.signatures || [];

    // Signature mapping by stage
    const applicantSig = signatures.find((s: any) => s.stage === 'applicant');
    const supervisorSig = signatures.find((s: any) => s.stage === 'supervisor');
    const rmSig = signatures.find((s: any) => s.stage === 'rm');
    const zmSig = signatures.find((s: any) => s.stage === 'zm');
    const directorSig = signatures.find((s: any) => s.stage === 'director');
    const hrSig = signatures.find((s: any) => s.stage === 'hr');
    const edSig = signatures.find((s: any) => s.stage === 'ed');

    const applicantSignaturePath = application.applicant_signature_path || applicantSig?.signature_path;

    const isHeadOffice = Boolean(application.is_head_office);
    const employeeName = employee.name_bn || employee.name_en || '………………………………';
    const designationName = employee.designation?.name || '………………………………';
    const branchName = employee.branch?.name || application.branch?.name || 'প্রধান কার্যালয়';
    const mobileNo = application.applicant_mobile || employee.mobile_phone || '……………………';
    const pin = employee.pin || '…………';

    // Work location text
    const workplaceText = isHeadOffice
        ? (employee.department?.name ? `প্রধান কার্যালয় (${employee.department.name})` : 'প্রধান কার্যালয়')
        : branchName;

    // Reason category mapping
    const reasonLabels: Record<string, string> = {
        family_reason: 'পারিবারিক কারণে',
        personal_reason: 'ব্যক্তিগত কারণে',
        better_job: 'অন্যত্র ভালো চাকরি হওয়ায়',
        sickness: 'অসুস্থ্যতা জনিত কারণে',
        retirement: 'অবসর জনিত বয়স পূর্ণ হওয়ায়',
        project_end: 'প্রকল্পের মেয়াদ শেষ হওয়ায়',
        contract_end: 'চুক্তির মেয়াদ শেষ হওয়ায়',
        other: application.reason_detail || 'অন্যান্য কারণে',
    };

    const selectedReasonText = reasonLabels[application.reason_category] || application.reason_category || 'ব্যক্তিগত কারণে';

    const renderSignatureImg = (sig: any, fallbackPath?: string) => {
        const path = sig?.signature_path || fallbackPath;
        if (!path) return <div className="h-9" />;
        return (
            <div className="flex justify-center mb-0.5">
                <img src={`/storage/${path}`} alt="Signature" className="h-8 max-h-8 max-w-[120px] object-contain" />
            </div>
        );
    };

    return (
        <div className="bg-white text-black font-serif text-[13.5px] leading-relaxed p-8 sm:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-[800px] mx-auto min-h-[1050px] flex flex-col justify-between">
            {/* Top Date */}
            <div>
                <div className="flex justify-start mb-4">
                    <span>
                        তারিখ: <span className="font-semibold">{formatBengaliDate(application.application_date)}</span> খ্রি.
                    </span>
                </div>

                {/* Recipient */}
                <div className="mb-5 leading-normal">
                    <p className="font-semibold">বরাবর</p>
                    <p className="font-semibold">নির্বাহী পরিচালক</p>
                    <p className="font-semibold text-emerald-800">মৌসুমী</p>
                    <p>উকিলপাড়া, নওগাঁ।</p>
                </div>

                {/* Subject */}
                <div className="mb-5 font-bold underline underline-offset-4">
                    বিষয়: চাকরি হতে অব্যাহতির জন্য আবেদন।
                </div>

                {/* Salutation & Body Text */}
                <div className="space-y-4 text-justify">
                    <p>মহোদয়,</p>
                    <p className="indent-8 leading-7">
                        বিনীত নিবেদন এইযে, আমি <span className="font-semibold border-b border-dotted border-black px-1.5">{employeeName}</span>। 
                        আমি <span className="font-semibold border-b border-dotted border-black px-1.5">{formatBengaliDate(application.joining_date)}</span> খ্রি. 
                        তারিখ হতে আপনার সংস্থা মৌসুমী’র <span className="font-semibold border-b border-dotted border-black px-1.5">{workplaceText}</span> শাখায়/অঞ্চলে/জোনে/প্রধান কার্যালয়ে/প্রকল্পে <span className="font-semibold border-b border-dotted border-black px-1.5">{designationName}</span> পদে কর্মরত আছি। 
                        আমার <span className="font-bold border-b border-black px-1.5 bg-slate-50">{selectedReasonText}</span> আগামী <span className="font-semibold border-b border-dotted border-black px-1.5">{formatBengaliDate(application.notice_date || application.application_date)}</span> তারিখ থেকে আমার দ্বারা চাকরি করা সম্ভব হচ্ছে না। 
                        সে অনুযায়ী আগামী <span className="font-semibold border-b border-dotted border-black px-1.5">{formatBengaliDate(application.last_working_date)}</span> তারিখ সংস্থায় আমার শেষ কর্মদিবস হবে।
                    </p>

                    <p className="indent-8 leading-7">
                        অতএব, মহোদয়ের নিকট বিনীত নিবেদন, উল্লেখিত তারিখের মধ্যে আমার উপর অর্পিত সকল দায়িত্ব ও নথিপত্র বুঝে নিয়ে <span className="font-semibold border-b border-dotted border-black px-1.5">{formatBengaliDate(application.effective_date)}</span> খ্রি. তারিখ থেকে আমার অব্যাহতিপত্র গ্রহণ ও কার্যকর করার জন্য বিনীত অনুরোধ জানাচ্ছি।
                    </p>
                </div>

                {/* Applicant Info & Signature */}
                <div className="mt-7 flex justify-end">
                    <div className="w-64 space-y-1 text-left text-[12.5px]">
                        <p className="font-semibold mb-1">নিবেদক,</p>
                        <div className="py-1">
                            {renderSignatureImg(applicantSig, applicantSignaturePath)}
                            <div className="border-t border-black w-40 text-center text-[11px] font-sans">
                                আবেদনকারীর স্বাক্ষর
                            </div>
                        </div>
                        <p><span className="font-semibold">নাম:</span> {employeeName}</p>
                        <p><span className="font-semibold">পদবি:</span> {designationName}</p>
                        <p><span className="font-semibold">পিন:</span> {toBengaliNumber(pin)}</p>
                        <p><span className="font-semibold">কর্মস্থলের নাম:</span> {workplaceText}</p>
                        <p><span className="font-semibold">মোবাইল নং:</span> {toBengaliNumber(mobileNo)}</p>
                    </div>
                </div>
            </div>

            {/* 6-box Approval Matrix at the bottom (2 rows x 3 columns) */}
            <div className="mt-8 border-t-2 border-black pt-4">
                <div className="grid grid-cols-3 border border-black divide-x divide-black text-[11px] leading-tight">
                    {/* Row 1, Col 1: ১ম তত্ত্বাবধায়কের সুপারিশ ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5">
                                ১ম তত্ত্বাবধায়কের সুপারিশ ও স্বাক্ষর:
                            </div>
                            {isHeadOffice ? (
                                <p className="mt-4 text-center text-slate-400 italic text-[10.5px]">
                                    (প্রধান কার্যালয়ের ক্ষেত্রে প্রযোজ্য নহে / N/A)
                                </p>
                            ) : (
                                <>
                                    <p className="mt-1">
                                        <span className="font-semibold">
                                            {supervisorSig?.recommended_date ? formatBengaliDate(supervisorSig.recommended_date) : '………. '}
                                        </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকরের সুপারিশ করছি।
                                    </p>
                                    <p className="mt-1 text-gray-700 italic">
                                        অন্যান্য মন্তব্য (যদি থাকে): {supervisorSig?.comments ? `"${supervisorSig.comments}"` : '……………………………'}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {!isHeadOffice && renderSignatureImg(supervisorSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {isHeadOffice ? 'প্রযোজ্য নহে' : (supervisorSig ? `${supervisorSig.user?.name || ''} (${formatBengaliDate(supervisorSig.signed_at)})` : 'স্বাক্ষর ও তারিখ')}
                            </div>
                        </div>
                    </div>

                    {/* Row 1, Col 2: আঞ্চলিক ব্যবস্থাপকের সুপারিশ ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5">
                                আঞ্চলিক ব্যবস্থাপকের সুপারিশ ও স্বাক্ষর:
                            </div>
                            {isHeadOffice ? (
                                <p className="mt-4 text-center text-slate-400 italic text-[10.5px]">
                                    (প্রধান কার্যালয়ের ক্ষেত্রে প্রযোজ্য নহে / N/A)
                                </p>
                            ) : (
                                <>
                                    <p className="mt-1">
                                        <span className="font-semibold">
                                            {rmSig?.recommended_date ? formatBengaliDate(rmSig.recommended_date) : '………. '}
                                        </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকরের সুপারিশ করছি।
                                    </p>
                                    <p className="mt-1 text-gray-700 italic">
                                        অন্যান্য মন্তব্য (যদি থাকে): {rmSig?.comments ? `"${rmSig.comments}"` : '……………………………'}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {!isHeadOffice && renderSignatureImg(rmSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {isHeadOffice ? 'প্রযোজ্য নহে' : (rmSig ? `${rmSig.user?.name || ''} (${formatBengaliDate(rmSig.signed_at)})` : 'স্বাক্ষর ও তারিখ')}
                            </div>
                        </div>
                    </div>

                    {/* Row 1, Col 3: জোনাল ম্যানেজারের সুপারিশ ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5">
                                জোনাল ম্যানেজারের সুপারিশ ও স্বাক্ষর:
                            </div>
                            {isHeadOffice ? (
                                <p className="mt-4 text-center text-slate-400 italic text-[10.5px]">
                                    (প্রধান কার্যালয়ের ক্ষেত্রে প্রযোজ্য নহে / N/A)
                                </p>
                            ) : (
                                <>
                                    <p className="mt-1">
                                        <span className="font-semibold">
                                            {zmSig?.recommended_date ? formatBengaliDate(zmSig.recommended_date) : '………. '}
                                        </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকরের সুপারিশ করছি।
                                    </p>
                                    <p className="mt-1 text-gray-700 italic">
                                        অন্যান্য মন্তব্য (যদি থাকে): {zmSig?.comments ? `"${zmSig.comments}"` : '……………………………'}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {!isHeadOffice && renderSignatureImg(zmSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {isHeadOffice ? 'প্রযোজ্য নহে' : (zmSig ? `${zmSig.user?.name || ''} (${formatBengaliDate(zmSig.signed_at)})` : 'স্বাক্ষর ও তারিখ')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-3 border-x border-b border-black divide-x divide-black text-[11px] leading-tight">
                    {/* Row 2, Col 1: বিভাগীয় প্রধানের সুপারিশ ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[135px]">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5">
                                বিভাগীয় প্রধানের সুপারিশ ও স্বাক্ষর:
                            </div>
                            <p className="mt-1">
                                <span className="font-semibold">
                                    {directorSig?.recommended_date ? formatBengaliDate(directorSig.recommended_date) : '………. '}
                                </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকরের সুপারিশ করছি।
                            </p>
                            <p className="mt-1 text-gray-700 italic">
                                অন্যান্য মন্তব্য (যদি থাকে): {directorSig?.comments ? `"${directorSig.comments}"` : '……………………………'}
                            </p>
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {renderSignatureImg(directorSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {directorSig ? `${directorSig.user?.name || ''} (${formatBengaliDate(directorSig.signed_at)})` : 'স্বাক্ষর ও তারিখ'}
                            </div>
                        </div>
                    </div>

                    {/* Row 2, Col 2: মানবসম্পদ বিভাগের সুপারিশ ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[135px]">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5">
                                মানবসম্পদ বিভাগের সুপারিশ ও স্বাক্ষর:
                            </div>
                            <p className="mt-1">
                                <span className="font-semibold">
                                    {hrSig?.recommended_date ? formatBengaliDate(hrSig.recommended_date) : '………. '}
                                </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকরের সুপারিশ করছি।
                            </p>
                            <p className="mt-1 text-gray-700 italic">
                                অন্যান্য মন্তব্য (যদি থাকে): {hrSig?.comments ? `"${hrSig.comments}"` : '……………………………'}
                            </p>
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {renderSignatureImg(hrSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {hrSig ? `${hrSig.user?.name || ''} (${formatBengaliDate(hrSig.signed_at)})` : 'স্বাক্ষর ও তারিখ'}
                            </div>
                        </div>
                    </div>

                    {/* Row 2, Col 3: নির্বাহী পরিচালকের অনুমোদন ও স্বাক্ষর */}
                    <div className="p-2 flex flex-col justify-between min-h-[135px] bg-slate-50/50">
                        <div>
                            <div className="font-bold border-b border-black pb-1 mb-1.5 text-emerald-900">
                                নির্বাহী পরিচালকের অনুমোদন ও স্বাক্ষর:
                            </div>
                            <p className="mt-1">
                                <span className="font-bold text-emerald-800">
                                    {application.approved_effective_date
                                        ? formatBengaliDate(application.approved_effective_date)
                                        : (edSig?.recommended_date ? formatBengaliDate(edSig.recommended_date) : '………. ')}
                                </span> খ্রি. তারিখ থেকে অব্যাহতি কার্যকর করা হলো। অব্যাহতি কার্যকরের চিঠি তৈরির জন্য মানবসম্পদ বিভাগে প্রেরণ করা হলো।
                            </p>
                            {application.ed_decision_notes && (
                                <p className="mt-1 text-gray-700 italic">
                                    মন্তব্য: "{application.ed_decision_notes}"
                                </p>
                            )}
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-400 text-right">
                            {renderSignatureImg(edSig)}
                            <div className="font-mono text-[9px] text-gray-600">
                                {edSig ? `${edSig.user?.name || 'নির্বাহী পরিচালক'} (${formatBengaliDate(edSig.signed_at)})` : 'স্বাক্ষর ও তারিখ'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

