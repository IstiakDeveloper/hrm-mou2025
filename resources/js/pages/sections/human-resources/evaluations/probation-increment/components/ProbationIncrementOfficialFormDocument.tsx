import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { 
    formAStructure, 
    formBStructure, 
    formCStructure, 
    getFormStructure, 
    calculateGrade 
} from '../probation-increment-config';

interface ProbationIncrementOfficialFormDocumentProps {
    evaluation: any;
    lang?: 'bn' | 'en';
}

const toBn = (num: number | string | null | undefined) => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
};

const formatDate = (dateStr?: string | null, targetLang: 'bn' | 'en' = 'bn') => {
    if (!dateStr) return '-';
    const str = String(dateStr).trim();
    if (!str || str === '-') return '-';

    let formatted = str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        formatted = str;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [year, month, day] = str.split('-');
        formatted = `${day}/${month}/${year}`;
    } else {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                formatted = format(d, 'dd/MM/yyyy');
            }
        } catch {
            formatted = str;
        }
    }

    if (targetLang === 'bn') {
        return toBn(formatted);
    }
    return formatted;
};

const formatClosingMonth = (val?: string | null, targetLang: 'bn' | 'en' = 'bn') => {
    if (!val) return '__________________';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}$/.test(str)) {
        const [year, monthStr] = str.split('-');
        const monthNum = parseInt(monthStr, 10);
        const bnMonths = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const enMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
            if (targetLang === 'bn') {
                return `${bnMonths[monthNum - 1]} ${toBn(year)}`;
            } else {
                return `${enMonths[monthNum - 1]} ${year}`;
            }
        }
    }
    return targetLang === 'bn' ? toBn(str) : str;
};

export default function ProbationIncrementOfficialFormDocument({
    evaluation,
    lang = 'bn',
}: ProbationIncrementOfficialFormDocumentProps) {
    const { auth } = usePage<SharedData>().props;
    const { employee = {}, scores = [], signatures = [] } = evaluation;

    const formType = evaluation.form_type || 'officer_abm';
    const activeStructure = useMemo(() => getFormStructure(formType), [formType]);

    const scoreMap = useMemo(() => {
        const map: Record<string, any> = {};
        scores.forEach((s: any) => {
            map[s.criteria_key] = s;
        });
        return map;
    }, [scores]);

    const formatNum = (val: any) => {
        if (val === null || val === undefined || val === '') return '-';
        return lang === 'bn' ? toBn(val) : String(val);
    };

    const formatDateVal = (dateStr?: string | null) => formatDate(dateStr, lang);

    const getDiffDisplay = (
        joiningVal: any, 
        closingVal: any, 
        explicitDiff?: any,
        isPercentage: boolean = false
    ) => {
        if (explicitDiff !== undefined && explicitDiff !== null && String(explicitDiff).trim() !== '') {
            const num = parseFloat(String(explicitDiff));
            if (!isNaN(num)) {
                const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2);
                const prefix = num > 0 ? '+' : '';
                const localized = formatNum(formatted);
                return `${prefix}${localized}${isPercentage ? '%' : ''}`;
            }
            return `${formatNum(explicitDiff)}${isPercentage ? '%' : ''}`;
        }

        const hasJ = joiningVal !== undefined && joiningVal !== null && String(joiningVal).trim() !== '';
        const hasC = closingVal !== undefined && closingVal !== null && String(closingVal).trim() !== '';

        if (!hasJ && !hasC) return '-';

        const j = hasJ ? parseFloat(String(joiningVal)) : 0;
        const c = hasC ? parseFloat(String(closingVal)) : 0;

        if (isNaN(j) || isNaN(c)) return '-';

        const diff = c - j;
        const formatted = Number.isInteger(diff) ? String(diff) : diff.toFixed(2);
        const prefix = diff > 0 ? '+' : '';
        const localized = formatNum(formatted);
        return `${prefix}${localized}${isPercentage ? '%' : ''}`;
    };

    const getSignature = (stage: string) => {
        return signatures.find((s: any) => s.stage === stage);
    };

    const initiatorSig = getSignature('initiator') || {
        stage: 'initiator',
        user: evaluation.initiator || auth?.user,
        signed_at: evaluation.created_at || new Date().toISOString(),
    };
    const rmSig = getSignature('rm');
    const zmSig = getSignature('zm');
    const directorSig = getSignature('director_mf') || getSignature('director_fa') || signatures.find((s: any) => s.stage?.includes('director'));
    const hrSig = getSignature('hr');
    const edSig = getSignature('ed') || signatures.find((s: any) => s.stage === 'approved');

    const renderSignatureImage = (sig: any, fallbackUser?: any) => {
        const sigPath = sig?.user?.signature || sig?.user?.employee?.signature || fallbackUser?.signature || fallbackUser?.employee?.signature;
        if (!sigPath) return null;
        return (
            <div className="flex justify-center mb-0.5">
                <img src={`/storage/${sigPath}`} alt="Signature" className="h-7 max-h-7 max-w-[120px] object-contain" />
            </div>
        );
    };

    const formTitleBn = formType === 'accountant'
        ? 'শিক্ষানবিসকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম (হিসাবরক্ষক পদবীর জন্য প্রযোজ্য)'
        : formType === 'bm_and_above'
        ? 'শিক্ষানবিসকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম (শাখা ব্যবস্থাপক থেকে জোনাল ম্যানেজার পদবীর জন্য প্রযোজ্য)'
        : 'শিক্ষানবিসকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম (অফিসার ও সহকারী শাখা ব্যবস্থাপক পদবীর জন্য প্রযোজ্য)';

    const formTitleEn = formType === 'accountant'
        ? 'Probation Increment Evaluation Form (Accountant)'
        : formType === 'bm_and_above'
        ? 'Probation Increment Evaluation Form (Branch Manager to Zonal Manager)'
        : 'Probation Increment Evaluation Form (Officer & Assistant Branch Manager)';

    const employeeName = lang === 'bn'
        ? (employee.name_bn || employee.name_en || 'কর্মীর নাম')
        : (employee.name_en || employee.name_bn || 'Employee Name');

    const designationName = lang === 'bn'
        ? (employee.designation?.name_bn || employee.designation?.name || employee.designation?.title || '-')
        : (employee.designation?.name_en || employee.designation?.name || employee.designation?.title || '-');

    const branchName = employee.branch?.name || evaluation.branch?.name || '-';

    const resolveRegionName = () => {
        const br = employee.branch || evaluation.branch;
        if (br?.regionalOffice?.name) return br.regionalOffice.name;
        if (br?.regional_office?.name) return br.regional_office.name;
        if (typeof br?.regional_office === 'string' && br.regional_office) return br.regional_office;
        if (br?.regional_office_name) return br.regional_office_name;
        if (evaluation.regionalOffice?.name) return evaluation.regionalOffice.name;
        if (evaluation.regional_office?.name) return evaluation.regional_office.name;
        if (employee.regionalOffice?.name) return employee.regionalOffice.name;
        if (employee.regional_office?.name) return employee.regional_office.name;
        if (br?.is_head_office) return lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office';
        return '-';
    };

    const resolveZoneName = () => {
        const br = employee.branch || evaluation.branch;
        if (br?.regionalOffice?.zone?.name) return br.regionalOffice.zone.name;
        if (br?.regional_office?.zone?.name) return br.regional_office.zone.name;
        if (typeof br?.zone === 'string' && br.zone) return br.zone;
        if (br?.zone_name) return br.zone_name;
        if (evaluation.zone?.name) return evaluation.zone.name;
        if (evaluation.regionalOffice?.zone?.name) return evaluation.regionalOffice.zone.name;
        if (employee.zone?.name) return employee.zone.name;
        if (br?.is_head_office) return lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office';
        return '-';
    };

    const regionName = resolveRegionName();
    const zoneName = resolveZoneName();

    const totalScore = Number(evaluation.total_score || 0);

    return (
        <div className="bg-white text-black text-[12px] leading-tight font-serif p-6 max-w-[210mm] mx-auto shadow-none print:p-0 print:max-w-none print:m-0">
            {/* Header with Logo */}
            <div className="text-center mb-3">
                <div className="flex justify-center mb-1">
                    <img src="/logo.png" alt="Organization Logo" className="h-14 w-auto object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                </div>
                <h1 className="text-xl font-bold tracking-wide">মৌসুমী</h1>
                <p className="text-xs">উকিলপাড়া, নওগাঁ।</p>
                <div className="mt-1 inline-block border-b-2 border-black pb-0.5">
                    <h2 className="text-sm font-bold">
                        {lang === 'bn' ? formTitleBn : formTitleEn}
                    </h2>
                </div>
            </div>

            {/* Basic Info Table */}
            <table className="w-full border-collapse border border-black mb-3 text-[11px]">
                <tbody>
                    <tr className="border-b border-black">
                        <td className="border-r border-black p-1.5 w-1/4"><b>নাম:</b> {employeeName}</td>
                        <td className="border-r border-black p-1.5 w-1/4"><b>পদবী:</b> {designationName}</td>
                        <td className="p-1.5 w-1/2" colSpan={2}><b>পিন নং:</b> {formatNum(employee.pin)}</td>
                    </tr>
                    <tr className="border-b border-black">
                        <td className="border-r border-black p-1.5"><b>শাখার নাম:</b> {branchName}</td>
                        <td className="border-r border-black p-1.5"><b>অঞ্চলের নাম:</b> {regionName}</td>
                        <td className="p-1.5" colSpan={2}><b>জোন:</b> {zoneName}</td>
                    </tr>
                    <tr className="border-b border-black">
                        <td className="border-r border-black p-1.5" colSpan={2}>
                            <b>সংস্থায় যোগদানের তারিখ:</b> {formatDateVal(evaluation.joining_date)}
                        </td>
                        <td className="p-1.5" colSpan={2}>
                            <b>শিক্ষানবিসকাল ০৩ মাস পূর্তির তারিখ:</b> {formatDateVal(evaluation.probation_3m_completion_date)}
                        </td>
                    </tr>
                    <tr>
                        <td className="border-r border-black p-1.5" colSpan={2}>
                            <b>শিক্ষাগত যোগ্যতা (যোগদানের সময়):</b> {evaluation.education_at_joining || employee.educational_qualification || '-'}
                        </td>
                        <td className="p-1.5" colSpan={2}>
                            <b>শিক্ষাগত যোগ্যতা (বর্তমান):</b> {evaluation.education_current || employee.educational_qualification || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Achievement Statistics Table */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1 text-[11px] font-bold">
                    <span>
                        {lang === 'bn'
                            ? (formType === 'accountant' ? 'মূল্যায়ণকালীন অর্জন (সর্বশেষ মাস ক্লোজিং অনুযায়ী):' : 'মূল্যায়ণকালীন অর্জন (যোগদান এবং সর্বশেষ মাস ক্লোজিং অনুযায়ী):')
                            : 'Performance Statistics (At Joining and Latest Closing):'
                        }
                    </span>
                    <span>
                        {lang === 'bn' ? 'ক্লোজিং মাসের নাম:' : 'Closing Month:'}{' '}
                        <u>{formatClosingMonth(evaluation.closing_month, lang)}</u>
                    </span>
                </div>

                {formType === 'accountant' ? (
                    <table className="w-full border-collapse border border-black text-[11px] text-center">
                        <tbody>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left w-1/4 font-semibold">শাখার সদস্য (জন):</td>
                                <td className="border-r border-black p-1 w-1/4">{formatNum(evaluation.closing_members_count)}</td>
                                <td className="border-r border-black p-1 text-left w-1/4 font-semibold">শাখার ঋণী (জন):</td>
                                <td className="p-1 w-1/4">{formatNum(evaluation.closing_borrowers_count)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার ঋণ স্থিতি (টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_loan_balance)}</td>
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):</td>
                                <td className="p-1">{formatNum(evaluation.closing_savings_balance)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার বকেয়া (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_overdue_borrowers)}</td>
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার বকেয়া (টাকা):</td>
                                <td className="p-1">{formatNum(evaluation.closing_overdue_amount)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার OTR (%):</td>
                                <td className="border-r border-black p-1">
                                    {evaluation.closing_otr_pct !== null && evaluation.closing_otr_pct !== undefined && evaluation.closing_otr_pct !== ''
                                        ? `${formatNum(evaluation.closing_otr_pct)}%`
                                        : '-'}
                                </td>
                                <td className="border-r border-black p-1 text-left font-semibold">শাখার PAR (%):</td>
                                <td className="p-1">
                                    {evaluation.closing_par_pct !== null && evaluation.closing_par_pct !== undefined && evaluation.closing_par_pct !== ''
                                        ? `${formatNum(evaluation.closing_par_pct)}%`
                                        : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="border-r border-black p-1 text-left font-semibold" colSpan={2}>
                                    শাখায় ক্যাশিয়ার আছে কি না?
                                </td>
                                <td className="p-1 text-center font-bold" colSpan={2}>
                                    {evaluation.has_cashier ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes') : (lang === 'bn' ? 'না' : 'No')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full border-collapse border border-black text-[11px] text-center">
                        <thead>
                            <tr className="border-b border-black bg-slate-50 font-bold">
                                <th className="border-r border-black p-1 text-left w-1/3">সূচক</th>
                                <th className="border-r border-black p-1 w-1/5">যোগদানের সময়</th>
                                <th className="border-r border-black p-1 w-1/4">ক্লোজিং মাসে</th>
                                <th className="p-1 w-1/5">পার্থক্য</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">সদস্য (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_members_count)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_members_count)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_members_count, evaluation.closing_members_count, evaluation.diff_members_count)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">ঋণী (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_borrowers_count)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_borrowers_count)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_borrowers_count, evaluation.closing_borrowers_count, evaluation.diff_borrowers_count)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">ঋণ স্থিতি (টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_loan_balance)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_loan_balance)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_loan_balance, evaluation.closing_loan_balance, evaluation.diff_loan_balance)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_savings_balance)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_savings_balance)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_savings_balance, evaluation.closing_savings_balance, evaluation.diff_savings_balance)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">বকেয়া (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_overdue_borrowers)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_overdue_borrowers)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_overdue_borrowers, evaluation.closing_overdue_borrowers, evaluation.diff_overdue_borrowers)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">বকেয়া (টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_overdue_amount)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_overdue_amount)}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_overdue_amount, evaluation.closing_overdue_amount, evaluation.diff_overdue_amount)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-medium">OTR (%):</td>
                                <td className="border-r border-black p-1">{evaluation.joining_otr_pct !== null && evaluation.joining_otr_pct !== undefined && evaluation.joining_otr_pct !== '' ? `${formatNum(evaluation.joining_otr_pct)}%` : '-'}</td>
                                <td className="border-r border-black p-1">{evaluation.closing_otr_pct !== null && evaluation.closing_otr_pct !== undefined && evaluation.closing_otr_pct !== '' ? `${formatNum(evaluation.closing_otr_pct)}%` : '-'}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_otr_pct, evaluation.closing_otr_pct, evaluation.diff_otr_pct, true)}</td>
                            </tr>
                            <tr>
                                <td className="border-r border-black p-1 text-left font-medium">PAR (%):</td>
                                <td className="border-r border-black p-1">{evaluation.joining_par_pct !== null && evaluation.joining_par_pct !== undefined && evaluation.joining_par_pct !== '' ? `${formatNum(evaluation.joining_par_pct)}%` : '-'}</td>
                                <td className="border-r border-black p-1">{evaluation.closing_par_pct !== null && evaluation.closing_par_pct !== undefined && evaluation.closing_par_pct !== '' ? `${formatNum(evaluation.closing_par_pct)}%` : '-'}</td>
                                <td className="p-1">{getDiffDisplay(evaluation.joining_par_pct, evaluation.closing_par_pct, evaluation.diff_par_pct, true)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Evaluation Criteria & Scores */}
            <div className="mb-3">
                <div className="text-center font-bold text-xs border border-black bg-slate-100 p-1 mb-1">
                    {lang === 'bn' ? 'মূল্যায়ন নির্দেশক ও নম্বর বিভাজন' : 'Evaluation Rubrics & Scoring'}
                </div>

                <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50 font-bold text-center">
                            <th className="border-r border-black p-1 w-10">ক্র: নং</th>
                            <th className="border-r border-black p-1 text-left">মূল্যায়নের ক্ষেত্র ও নির্দেশকসমূহ</th>
                            <th className="border-r border-black p-1 w-16">সর্বোচ্চ নম্বর</th>
                            <th className="p-1 w-20">প্রাপ্ত নম্বর</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeStructure.map((sec: any, sIdx: number) => {
                            let secTotal = 0;
                            let secMax = 0;
                            sec.items.forEach((item: any) => {
                                secMax += Number(item.max || 0);
                                const scored = scoreMap[item.key]?.obtained_score;
                                if (scored !== undefined && scored !== null && !isNaN(Number(scored))) {
                                    secTotal += Number(scored);
                                }
                            });

                            return (
                                <React.Fragment key={sec.section_key}>
                                    {/* Section Heading Row */}
                                    <tr className="border-b border-black bg-slate-50 font-bold">
                                        <td className="border-r border-black p-1 text-center">{toBn(sIdx + 1)}</td>
                                        <td className="border-r border-black p-1">{lang === 'bn' ? sec.section_name_bn : sec.section_name_en}</td>
                                        <td className="border-r border-black p-1 text-center">{toBn(secMax)}</td>
                                        <td className="p-1 text-center font-bold">{toBn(Number(secTotal.toFixed(2)))}</td>
                                    </tr>
                                    {/* Items */}
                                    {sec.items.map((it: any, iIdx: number) => {
                                        const curScore = scoreMap[it.key]?.obtained_score;
                                        return (
                                            <tr key={it.key} className="border-b border-black">
                                                <td className="border-r border-black p-1 text-center text-slate-500">
                                                    {toBn(sIdx + 1)}.{toBn(iIdx + 1)}
                                                </td>
                                                <td className="border-r border-black p-1 pl-3">
                                                    {lang === 'bn' ? it.name_bn : it.name_en}
                                                </td>
                                                <td className="border-r border-black p-1 text-center text-slate-600">
                                                    {toBn(it.max)}
                                                </td>
                                                <td className="p-1 text-center font-semibold">
                                                    {curScore !== undefined && curScore !== null && curScore !== '' ? toBn(curScore) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                        {/* Grand Total */}
                        <tr className="border-t-2 border-black font-bold bg-slate-100 text-center">
                            <td className="border-r border-black p-1" colSpan={2}>
                                {lang === 'bn' ? 'সর্বমোট অর্জিত নম্বর' : 'Grand Total Score'}
                            </td>
                            <td className="border-r border-black p-1">{toBn(100)}</td>
                            <td className="p-1 text-sm font-extrabold">{toBn(Number(totalScore.toFixed(2)))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Score Interpretation Scale */}
            <div className="border border-black p-1.5 mb-3 text-[10.5px]">
                <div className="font-bold mb-0.5">{lang === 'bn' ? 'নম্বর বিভাজন ও গ্রেড মূল্যায়ন:' : 'Grading Scale:'}</div>
                <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="border border-slate-300 p-0.5">
                        <span className="font-bold">৮৫-১০০:</span> {lang === 'bn' ? 'অতি উত্তম (বেতন বৃদ্ধির জন্য অত্যন্ত উপযুক্ত)' : 'Excellent'}
                    </div>
                    <div className="border border-slate-300 p-0.5">
                        <span className="font-bold">৬৫-৮৪:</span> {lang === 'bn' ? 'উত্তম (বেতন বৃদ্ধির জন্য উপযুক্ত)' : 'Very Good'}
                    </div>
                    <div className="border border-slate-300 p-0.5">
                        <span className="font-bold">৫০-৬৪:</span> {lang === 'bn' ? 'সন্তোষজনক (বেতন বৃদ্ধির জন্য বিবেচনাযোগ্য)' : 'Good'}
                    </div>
                    <div className="border border-slate-300 p-0.5">
                        <span className="font-bold">&lt; ৫০:</span> {lang === 'bn' ? 'অসন্তোষজনক (বেতন বৃদ্ধির জন্য অনুপযুক্ত)' : 'Poor'}
                    </div>
                </div>
            </div>

            {/* Supervisor Recommendation */}
            <div className="border border-black p-2 mb-3 text-[11px]">
                <div className="font-bold mb-1">
                    {lang === 'bn' 
                        ? 'বিগত ০৩ মাসের সার্বিক মূল্যায়নের প্রেক্ষিতে সুপারভাইজারের সুপারিশ:' 
                        : "Supervisor's Recommendation (Based on last 03 months):"}
                </div>
                <div className="space-y-1 ml-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                            {evaluation.supervisor_recommendation === 'recommend_increment' ? '✓' : ''}
                        </span>
                        <span>বেতন বৃদ্ধির জন্য সুপারিশ করা হলো।</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                            {evaluation.supervisor_recommendation === 'defer_increment' ? '✓' : ''}
                        </span>
                        <span>বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন করা হোক।</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                            {evaluation.supervisor_recommendation === 'not_suitable' ? '✓' : ''}
                        </span>
                        <span>বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে।</span>
                    </div>
                </div>
            </div>

            {/* Comments & Signatures Workflow Sections */}
            <div className="space-y-2 mb-3">
                {/* Initiator (BM / RM) */}
                <div className="border border-black p-1.5 text-[11px]">
                    <div className="font-bold mb-0.5">
                        {formType === 'bm_and_above' 
                            ? 'সুপারভাইজার / আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:' 
                            : 'শাখা ব্যবস্থাপকের মন্তব্য ও সুপারিশ:'}
                    </div>
                    <div className="min-h-[22px] italic text-slate-800">
                        {initiatorSig?.comments || evaluation.initiator_remarks || evaluation.remarks || '-'}
                    </div>
                    <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                        <div>
                            <b>স্বাক্ষরকারীর নাম:</b> {initiatorSig?.user?.name || evaluation.initiator?.name || '-'}
                            <span className="ml-3"><b>পদবী:</b> {initiatorSig?.user?.designation?.name || '-'}</span>
                        </div>
                        <div className="text-right">
                            {renderSignatureImage(initiatorSig, evaluation.initiator)}
                            <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(initiatorSig?.signed_at || evaluation.created_at)}</div>
                        </div>
                    </div>
                </div>

                {/* RM Comments (for Form A & Form B) */}
                {formType !== 'bm_and_above' && (
                    <div className="border border-black p-1.5 text-[11px]">
                        <div className="font-bold mb-0.5">আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:</div>
                        <div className="min-h-[22px] italic text-slate-800">
                            {rmSig?.comments || evaluation.rm_remarks || '-'}
                        </div>
                        <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                            <div>
                                <b>স্বাক্ষরকারীর নাম:</b> {rmSig?.user?.name || '-'}
                                <span className="ml-3"><b>পদবী:</b> {rmSig?.user?.designation?.name || 'আঞ্চলিক ব্যবস্থাপক'}</span>
                            </div>
                            <div className="text-right">
                                {renderSignatureImage(rmSig)}
                                <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(rmSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ZM Comments */}
                <div className="border border-black p-1.5 text-[11px]">
                    <div className="font-bold mb-0.5">জোনাল ম্যানেজারের মন্তব্য ও সুপারিশ:</div>
                    <div className="min-h-[22px] italic text-slate-800">
                        {zmSig?.comments || evaluation.zm_remarks || '-'}
                    </div>
                    <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                        <div>
                            <b>স্বাক্ষরকারীর নাম:</b> {zmSig?.user?.name || '-'}
                            <span className="ml-3"><b>পদবী:</b> {zmSig?.user?.designation?.name || 'জোনাল ম্যানেজার'}</span>
                        </div>
                        <div className="text-right">
                            {renderSignatureImage(zmSig)}
                            <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(zmSig?.signed_at)}</div>
                        </div>
                    </div>
                </div>

                {/* Director Comments (Microfinance or Finance & Accounts) */}
                <div className="border border-black p-1.5 text-[11px]">
                    <div className="font-bold mb-0.5">
                        {formType === 'accountant' 
                            ? 'পরিচালক (অর্থ ও হিসাব) এর মন্তব্য ও সুপারিশ:' 
                            : 'পরিচালক (মাইক্রোফাইন্যান্স) এর মন্তব্য ও সুপারিশ:'}
                    </div>
                    <div className="min-h-[22px] italic text-slate-800">
                        {directorSig?.comments || evaluation.director_remarks || '-'}
                    </div>
                    <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                        <div>
                            <b>স্বাক্ষরকারীর নাম:</b> {directorSig?.user?.name || '-'}
                            <span className="ml-3">
                                <b>পদবী:</b> {directorSig?.user?.designation?.name || (formType === 'accountant' ? 'পরিচালক (অর্থ ও হিসাব)' : 'পরিচালক (মাইক্রোফাইন্যান্স)')}
                            </span>
                        </div>
                        <div className="text-right">
                            {renderSignatureImage(directorSig)}
                            <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(directorSig?.signed_at)}</div>
                        </div>
                    </div>
                </div>

                {/* HR Comments */}
                <div className="border border-black p-1.5 text-[11px]">
                    <div className="font-bold mb-0.5">মানবসম্পদ বিভাগের সুপারিশ / সিদ্ধান্ত:</div>
                    <div className="min-h-[22px] italic text-slate-800">
                        {hrSig?.comments || evaluation.hr_remarks || '-'}
                    </div>
                    <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                        <div>
                            <b>স্বাক্ষরকারীর নাম:</b> {hrSig?.user?.name || '-'}
                            <span className="ml-3"><b>পদবী:</b> {hrSig?.user?.designation?.name || 'মানবসম্পদ বিভাগ'}</span>
                        </div>
                        <div className="text-right">
                            {renderSignatureImage(hrSig)}
                            <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(hrSig?.signed_at)}</div>
                        </div>
                    </div>
                </div>

                {/* ED Approval */}
                <div className="border border-black p-1.5 text-[11px]">
                    <div className="font-bold mb-0.5">নির্বাহী পরিচালকের চূড়ান্ত অনুমোদন / সিদ্ধান্ত:</div>
                    <div className="min-h-[22px] italic text-slate-800">
                        {edSig?.comments || evaluation.ed_remarks || '-'}
                    </div>
                    <div className="flex justify-between items-end mt-1 text-[10px] pt-1 border-t border-dotted border-slate-300">
                        <div>
                            <b>স্বাক্ষরকারীর নাম:</b> {edSig?.user?.name || '-'}
                            <span className="ml-3"><b>পদবী:</b> {edSig?.user?.designation?.name || 'নির্বাহী পরিচালক'}</span>
                        </div>
                        <div className="text-right">
                            {renderSignatureImage(edSig)}
                            <div><b>স্বাক্ষর ও তারিখ:</b> {formatDateVal(edSig?.signed_at)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Footer */}
            <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
                মুদ্রণ তারিখ ও সময়: {formatDate(new Date().toISOString(), 'bn')} | সিস্টেম জেনারেটেড মূল্যায়ন ফরম
            </div>
        </div>
    );
}
