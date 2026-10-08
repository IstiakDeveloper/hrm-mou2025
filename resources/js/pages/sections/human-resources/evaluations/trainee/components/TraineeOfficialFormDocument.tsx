import React from 'react';
import {
    TRAINEE_FORM_CONFIGS,
    QUALITATIVE_RATING_OPTIONS,
    calculateTraineeGrade,
    TRAINEE_SCORE_GRADES,
    formatClosingMonth,
} from '../trainee-config';

interface TraineeOfficialFormDocumentProps {
    evaluation: any;
    lang?: 'bn' | 'en';
}

export default function TraineeOfficialFormDocument({ evaluation, lang = 'bn' }: TraineeOfficialFormDocumentProps) {
    const formType = evaluation.form_type || 'officer_abm';
    const config = TRAINEE_FORM_CONFIGS[formType] || TRAINEE_FORM_CONFIGS.officer_abm;
    const scores = evaluation.scores || [];
    const ratings = evaluation.ratings || [];
    const signatures = evaluation.signatures || [];

    const formatNum = (num: any) => {
        if (num === null || num === undefined || num === '') return '-';
        if (lang !== 'bn') return String(num);
        const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(num).replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)]);
    };

    const formatDateVal = (dateVal: any) => {
        if (!dateVal) return '-';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const formatted = `${day}/${month}/${year}`;
            return lang === 'bn' ? formatNum(formatted) : formatted;
        } catch {
            return String(dateVal);
        }
    };

    const getScoreFor = (key: string, defaultMax: number) => {
        const found = scores.find((s: any) => s.criteria_key === key);
        return found ? found.score : 0;
    };

    const getRatingFor = (key: string) => {
        const found = ratings.find((r: any) => r.indicator_key === key);
        return found ? found.rating : null;
    };

    const totalScore = Number(evaluation.total_score || 0);

    const getSignature = (stageKey: string) => {
        return signatures.find((s: any) => s.stage === stageKey) || null;
    };

    const renderSignatureBlock = (sig: any, fallbackTitle: string) => {
        const sigPath = sig?.user?.signature || sig?.user?.employee?.signature;
        const userName = sig?.user?.name || sig?.user?.employee?.name_bn || sig?.user?.employee?.name_en;
        const userDesig = sig?.user?.employee?.designation?.name || sig?.user?.role_title || fallbackTitle;
        const signedDate = sig?.signed_at ? formatDateVal(sig.signed_at) : null;

        return (
            <div className="flex flex-col items-center justify-end text-center h-20 pt-1">
                {sigPath ? (
                    <img src={`/storage/${sigPath}`} alt="Signature" className="h-8 max-h-8 max-w-[120px] object-contain mb-0.5" />
                ) : (
                    <div className="h-7 w-24 border-b border-dashed border-slate-300 mb-0.5 flex items-center justify-center text-[10px] text-slate-400">
                        {sig ? '(স্বাক্ষরিত)' : ''}
                    </div>
                )}
                {userName && <span className="font-bold text-[10px] leading-tight">{userName}</span>}
                <span className="text-[10px] text-slate-700 leading-tight">{userDesig}</span>
                {signedDate && <span className="text-[9px] text-slate-500 leading-tight">{signedDate}</span>}
            </div>
        );
    };

    return (
        <div className="bg-white text-black text-[12px] leading-tight font-serif p-6 max-w-[210mm] mx-auto shadow-none print:p-0 print:max-w-none print:m-0 space-y-6">
            
            {/* ======================================================== */}
            {/* PAGE 1 */}
            {/* ======================================================== */}
            <div className="min-h-[1050px] relative print:page-break-after-always">
                {/* Header with Logo */}
                <div className="text-center mb-3">
                    <div className="flex justify-center mb-1">
                        <img 
                            src="/logo.png" 
                            alt="Organization Logo" 
                            className="h-14 w-auto object-contain" 
                            onError={(e) => { (e.target as any).style.display = 'none'; }} 
                        />
                    </div>
                    <h1 className="text-xl font-bold tracking-wide">মৌসুমী</h1>
                    <p className="text-xs">উকিলপাড়া, নওগাঁ।</p>
                    <div className="mt-1 inline-block border-b-2 border-black pb-0.5">
                        <h2 className="text-sm font-bold">
                            {lang === 'bn' ? config.titleBn : config.titleEn}
                        </h2>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-sans mt-0.5">
                        Page 1 of 2
                    </div>
                </div>

                {/* Candidate Information Header Table */}
                <div className="mb-3 text-[11px]">
                    <div className="flex justify-between items-center mb-1 font-semibold">
                        <span>
                            <b>মূল্যায়ন মাসের নাম:</b> <u>{formatClosingMonth(evaluation.evaluation_month, lang)}</u>
                        </span>
                    </div>
                    <table className="w-full border-collapse border border-black text-[11px]">
                        <tbody>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1.5 w-1/3">
                                    <b>নাম:</b> {evaluation.candidate_name || '-'}
                                </td>
                                <td className="border-r border-black p-1.5 w-1/3">
                                    <b>পদবী:</b> {evaluation.designation_name || '-'}
                                </td>
                                <td className="p-1.5 w-1/3">
                                    <b>পিন নং:</b> {formatNum(evaluation.pin || '') || '-'}
                                </td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1.5">
                                    <b>শাখার নাম:</b> {evaluation.branch_name || evaluation.branch?.name || '-'}
                                </td>
                                <td className="border-r border-black p-1.5">
                                    <b>অঞ্চলের নাম:</b> {evaluation.regional_office_name || evaluation.regionalOffice?.name || '-'}
                                </td>
                                <td className="p-1.5">
                                    <b>জোন:</b> {evaluation.zone_name || evaluation.zone?.name || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="border-r border-black p-1.5" colSpan={2}>
                                    <b>প্রশিক্ষণার্থী পদে যোগদানের তারিখ:</b> {formatDateVal(evaluation.training_joining_date)}
                                </td>
                                <td className="p-1.5">
                                    <b>নিয়োগপত্র অনুযায়ী প্রশিক্ষণকাল সমাপ্তির তারিখ:</b> {formatDateVal(evaluation.training_completion_date)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section 1: Criteria Scoring Table */}
                <div className="mb-3">
                    <div className="font-bold text-[11px] mb-1">
                        ১ম তত্ত্বাবধায়ক কর্তৃক প্রশিক্ষণকালীন সার্বিক মূল্যায়নের প্রেক্ষিতে রেটিং করতে হবে:
                    </div>
                    <table className="w-full border-collapse border border-black text-[11px]">
                        <thead>
                            <tr className="border-b border-black bg-slate-50 font-bold text-center">
                                <th className="border-r border-black p-1 w-10">ক্র.</th>
                                <th className="border-r border-black p-1 text-left">মূল্যায়ন সূচক</th>
                                <th className="border-r border-black p-1 w-20">সর্বোচ্চ নম্বর</th>
                                <th className="p-1 w-20">প্রাপ্ত নম্বর</th>
                            </tr>
                        </thead>
                        <tbody>
                            {config.rubrics.map((rubric) => {
                                const scoreVal = getScoreFor(rubric.key, rubric.maxScore);
                                return (
                                    <tr key={rubric.key} className="border-b border-black">
                                        <td className="border-r border-black p-1 text-center font-medium">
                                            {formatNum(rubric.sl_no)}.
                                        </td>
                                        <td className="border-r border-black p-1 text-left font-medium">
                                            {rubric.nameBn}
                                        </td>
                                        <td className="border-r border-black p-1 text-center">
                                            {formatNum(rubric.maxScore)}
                                        </td>
                                        <td className="p-1 text-center font-bold">
                                            {formatNum(scoreVal)}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="border-b border-black bg-slate-100/60 font-bold">
                                <td className="border-r border-black p-1.5 text-center" colSpan={2}>
                                    সর্বমোট
                                </td>
                                <td className="border-r border-black p-1.5 text-center">
                                    {formatNum(100)}
                                </td>
                                <td className="p-1.5 text-center text-sm font-extrabold text-emerald-950">
                                    {formatNum(totalScore)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Scale Grid and Other Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-[10.5px]">
                    {/* Scale Table */}
                    <table className="border-collapse border border-black text-center">
                        <thead>
                            <tr className="border-b border-black bg-slate-50 font-bold">
                                <th className="border-r border-black p-1 w-16">স্কোর</th>
                                <th className="p-1 text-left">প্রাপ্ত নম্বর অনুযায়ী অবস্থান</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TRAINEE_SCORE_GRADES.map((g) => {
                                const isCurrent = calculateTraineeGrade(totalScore).grade === g.grade;
                                return (
                                    <tr key={g.grade} className={`border-b border-black last:border-b-0 ${isCurrent ? 'bg-amber-100/60 font-bold' : ''}`}>
                                        <td className="border-r border-black p-1">
                                            {formatNum(g.grade === 'not_satisfactory' ? '৫০-এর নিচে' : `${g.min}-${g.max}`)}
                                        </td>
                                        <td className="p-1 text-left">
                                            {g.labelBn} - {g.descriptionBn}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Remarks Box */}
                    <div className="border border-black p-2 flex flex-col justify-between">
                        <div>
                            <div className="font-bold mb-1">অন্যান্য মন্তব্য (যদি থাকে):</div>
                            <p className="text-[11px] italic min-h-[45px] whitespace-pre-wrap">
                                {evaluation.other_remarks || '—'}
                            </p>
                        </div>
                        <div className="text-right text-[10px] font-semibold text-slate-700">
                            মূল্যায়ন স্থিতি: <b>{calculateTraineeGrade(totalScore).labelBn}</b>
                        </div>
                    </div>
                </div>

                {/* Section 2: 14 Qualitative Indicators */}
                <div className="mb-2">
                    <div className="font-bold text-[11px] mb-1">
                        বিশেষ গুরুত্বপূর্ণ সূচক মূল্যায়ন:
                    </div>
                    <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                            <tr className="border-b border-black bg-slate-50 font-bold text-center">
                                <th className="border-r border-black p-1 text-left w-1/3">সূচক</th>
                                <th className="p-1">মূল্যায়ন (যে কোনো একটিতে টিক চিহ্ন দিতে হবে)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {config.qualitativeIndicators.map((ind) => {
                                const selectedRating = getRatingFor(ind.key);
                                return (
                                    <tr key={ind.key} className="border-b border-black">
                                        <td className="border-r border-black p-1 font-semibold text-slate-900">
                                            {formatNum(ind.sl_no)}. {ind.nameBn}
                                        </td>
                                        <td className="p-1">
                                            <div className="flex items-center justify-around gap-1">
                                                {QUALITATIVE_RATING_OPTIONS.map((opt) => {
                                                    const isChecked = selectedRating === opt.key;
                                                    return (
                                                        <span key={opt.key} className={`inline-flex items-center gap-1 ${isChecked ? 'font-bold text-black' : 'text-slate-600'}`}>
                                                            <span className="inline-block w-3.5 h-3.5 border border-black text-[9px] text-center leading-3">
                                                                {isChecked ? '✓' : ''}
                                                            </span>
                                                            <span>{opt.labelBn}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ======================================================== */}
            {/* PAGE 2 */}
            {/* ======================================================== */}
            <div className="min-h-[1050px] relative pt-4 border-t border-dashed border-slate-300 print:border-t-0 print:pt-0">
                <div className="text-right text-[10px] text-slate-500 font-sans mb-3">
                    Page 2 of 2
                </div>

                {/* 1st Supervisor Recommendation */}
                <div className="border border-black p-3 mb-3 text-[11px]">
                    <div className="font-bold mb-1.5 text-xs border-b border-black pb-1">
                        ১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ:
                    </div>
                    <div className="space-y-1.5 mb-3">
                        <div className="font-semibold mb-1">সুপারিশ (টিক চিহ্ন দিতে হবে):</div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border border-black text-center text-xs font-bold leading-3.5">
                                {evaluation.recommendation_type === 'recommend_appointment' ? '✓' : ''}
                            </span>
                            <span>নিয়োগের জন্য সুপারিশ করা হলো।</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border border-black text-center text-xs font-bold leading-3.5">
                                {evaluation.recommendation_type === 'extend_probation' ? '✓' : ''}
                            </span>
                            <span>
                                প্রশিক্ষণকাল{' '}
                                <u className="font-bold px-1.5">
                                    {evaluation.extension_days ? formatNum(evaluation.extension_days) : '............'}
                                </u>{' '}
                                দিন বৃদ্ধি করে পুনর্মূল্যায়ন করা হোক।
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border border-black text-center text-xs font-bold leading-3.5">
                                {evaluation.recommendation_type === 'not_satisfactory' ? '✓' : ''}
                            </span>
                            <span>প্রশিক্ষণ সন্তোষজনক নয়, প্রশিক্ষণকাল সমাপ্ত করা যেতে পারে।</span>
                        </div>
                    </div>

                    {evaluation.supervisor_remarks && (
                        <div className="mb-2 italic text-[11px] p-2 bg-slate-50 border border-slate-200 rounded">
                            "{evaluation.supervisor_remarks}"
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-slate-300">
                        <div className="w-64 text-center">
                            {renderSignatureBlock(getSignature('initiator'), '১ম তত্ত্বাবধায়ক')}
                            <div className="border-t border-black text-[10px] font-semibold mt-1">
                                স্বাক্ষর, তারিখ ও সিল
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviewer / Approval Stages */}
                <div className="space-y-3 text-[11px]">
                    {/* 2. Regional Manager (RM) */}
                    <div className="border border-black p-2.5">
                        <div className="font-bold mb-1">
                            আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:
                        </div>
                        <div className="min-h-[35px] text-[11px] italic px-1 whitespace-pre-wrap">
                            {getSignature('rm')?.comments || '—'}
                        </div>
                        <div className="flex justify-end pt-1">
                            <div className="w-64 text-center">
                                {renderSignatureBlock(getSignature('rm'), 'আঞ্চলিক ব্যবস্থাপক (RM)')}
                                <div className="border-t border-black text-[10px] font-semibold mt-0.5">
                                    স্বাক্ষর, তারিখ ও সিল
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Zonal Manager (ZM) */}
                    <div className="border border-black p-2.5">
                        <div className="font-bold mb-1">
                            জোনাল ম্যানেজারের মন্তব্য ও সুপারিশ:
                        </div>
                        <div className="min-h-[35px] text-[11px] italic px-1 whitespace-pre-wrap">
                            {getSignature('zm')?.comments || '—'}
                        </div>
                        <div className="flex justify-end pt-1">
                            <div className="w-64 text-center">
                                {renderSignatureBlock(getSignature('zm'), 'জোনাল ম্যানেজার (ZM)')}
                                <div className="border-t border-black text-[10px] font-semibold mt-0.5">
                                    স্বাক্ষর, তারিখ ও সিল
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Finance & Accounts / Microfinance Department */}
                    <div className="border border-black p-2.5">
                        <div className="font-bold mb-1">
                            {formType === 'accountant' ? 'অর্থ ও হিসাব বিভাগের মন্তব্য ও সুপারিশ:' : 'মাইক্রোফাইন্যান্স বিভাগের মন্তব্য ও সুপারিশ:'}
                        </div>
                        <div className="min-h-[35px] text-[11px] italic px-1 whitespace-pre-wrap">
                            {(formType === 'accountant' ? getSignature('director_fa')?.comments : getSignature('director')?.comments) || '—'}
                        </div>
                        <div className="flex justify-end pt-1">
                            <div className="w-64 text-center">
                                {renderSignatureBlock(
                                    formType === 'accountant' ? getSignature('director_fa') : getSignature('director'),
                                    formType === 'accountant' ? 'পরিচালক (অর্থ ও হিসাব)' : 'পরিচালক (মাইক্রোফাইন্যান্স)'
                                )}
                                <div className="border-t border-black text-[10px] font-semibold mt-0.5">
                                    স্বাক্ষর, তারিখ ও সিল
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. HR Department */}
                    <div className="border border-black p-2.5">
                        <div className="font-bold mb-1">
                            মানবসম্পদ বিভাগের মন্তব্য ও সুপারিশ:
                        </div>
                        <div className="min-h-[35px] text-[11px] italic px-1 whitespace-pre-wrap">
                            {getSignature('hr')?.comments || '—'}
                        </div>
                        <div className="flex justify-end pt-1">
                            <div className="w-64 text-center">
                                {renderSignatureBlock(getSignature('hr'), 'মানবসম্পদ বিভাগ (HR)')}
                                <div className="border-t border-black text-[10px] font-semibold mt-0.5">
                                    স্বাক্ষর, তারিখ ও সিল
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Executive Director (ED) */}
                    <div className="border border-black p-2.5">
                        <div className="font-bold mb-1">
                            নির্বাহী পরিচালক কর্তৃক মন্তব্য ও অনুমোদন:
                        </div>
                        <div className="min-h-[35px] text-[11px] italic px-1 whitespace-pre-wrap">
                            {getSignature('ed')?.comments || '—'}
                        </div>
                        <div className="flex justify-end pt-1">
                            <div className="w-64 text-center">
                                {renderSignatureBlock(getSignature('ed'), 'নির্বাহী পরিচালক')}
                                <div className="border-t border-black text-[10px] font-semibold mt-0.5">
                                    স্বাক্ষর, তারিখ ও সিল
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
