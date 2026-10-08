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
} from '../confirmation-config';

interface ConfirmationOfficialFormDocumentProps {
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

export default function ConfirmationOfficialFormDocument({
    evaluation,
    lang = 'bn',
}: ConfirmationOfficialFormDocumentProps) {
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
        // 1. If explicitDiff is passed and not empty
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

        // 2. Fallback: Check if both are empty
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
        ? 'স্থায়ীকরণ মূল্যায়ন ফরম (হিসাবরক্ষক পদবীর জন্য প্রযোজ্য)'
        : formType === 'bm_and_above'
        ? 'স্থায়ীকরণ মূল্যায়ন ফরম (শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব পদবীর জন্য প্রযোজ্য)'
        : 'স্থায়ীকরণ মূল্যায়ন ফরম (অফিসার ও সহকারী শাখা ব্যবস্থাপক পদবীর জন্য প্রযোজ্য)';

    const formTitleEn = formType === 'accountant'
        ? 'Confirmation Evaluation Form (For Accountant)'
        : formType === 'bm_and_above'
        ? 'Confirmation Evaluation Form (Branch Manager to Higher Tier)'
        : 'Confirmation Evaluation Form (Officer & Assistant Branch Manager)';

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
                            <b>শিক্ষানবিসকাল সমাপ্তির তারিখ:</b> {formatDateVal(evaluation.probation_end_date)}
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
                                <th className="border-r border-black p-1 text-left">সূচক</th>
                                <th className="border-r border-black p-1 w-32">যোগদানের সময়</th>
                                <th className="border-r border-black p-1 w-32">ক্লোজিং মাসে</th>
                                <th className="p-1 w-32">পার্থক্য</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">সদস্য (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_members_count)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_members_count)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_members_count, evaluation.closing_members_count, evaluation.diff_members_count)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">ঋণী (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_borrowers_count)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_borrowers_count)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_borrowers_count, evaluation.closing_borrowers_count, evaluation.diff_borrowers_count)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">ঋণ স্থিতি (টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_loan_balance)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_loan_balance)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_loan_balance, evaluation.closing_loan_balance, evaluation.diff_loan_balance)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_savings_balance)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_savings_balance)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_savings_balance, evaluation.closing_savings_balance, evaluation.diff_savings_balance)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">বকেয়া (জন):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_overdue_borrowers)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_overdue_borrowers)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_overdue_borrowers, evaluation.closing_overdue_borrowers, evaluation.diff_overdue_borrowers)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">বকেয়া (টাকা):</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.joining_overdue_amount)}</td>
                                <td className="border-r border-black p-1">{formatNum(evaluation.closing_overdue_amount)}</td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_overdue_amount, evaluation.closing_overdue_amount, evaluation.diff_overdue_amount)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1 text-left font-semibold">OTR (%):</td>
                                <td className="border-r border-black p-1">
                                    {evaluation.joining_otr_pct !== null && evaluation.joining_otr_pct !== undefined && evaluation.joining_otr_pct !== ''
                                        ? `${formatNum(evaluation.joining_otr_pct)}%`
                                        : '-'}
                                </td>
                                <td className="border-r border-black p-1">
                                    {evaluation.closing_otr_pct !== null && evaluation.closing_otr_pct !== undefined && evaluation.closing_otr_pct !== ''
                                        ? `${formatNum(evaluation.closing_otr_pct)}%`
                                        : '-'}
                                </td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_otr_pct, evaluation.closing_otr_pct, evaluation.diff_otr_pct, true)}</td>
                            </tr>
                            <tr>
                                <td className="border-r border-black p-1 text-left font-semibold">PAR (%):</td>
                                <td className="border-r border-black p-1">
                                    {evaluation.joining_par_pct !== null && evaluation.joining_par_pct !== undefined && evaluation.joining_par_pct !== ''
                                        ? `${formatNum(evaluation.joining_par_pct)}%`
                                        : '-'}
                                </td>
                                <td className="border-r border-black p-1">
                                    {evaluation.closing_par_pct !== null && evaluation.closing_par_pct !== undefined && evaluation.closing_par_pct !== ''
                                        ? `${formatNum(evaluation.closing_par_pct)}%`
                                        : '-'}
                                </td>
                                <td className="p-1 font-bold">{getDiffDisplay(evaluation.joining_par_pct, evaluation.closing_par_pct, evaluation.diff_par_pct, true)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* 1st Supervisor Evaluation Rubrics Table */}
            <div className="mb-4">
                <div className="font-bold text-[11px] mb-1">
                    ১ম তত্ত্বাবধায়ক কর্তৃক বিগত ০৬ মাসের সার্বিক মূল্যায়নের প্রেক্ষিতে রেটিং করতে হবে:
                </div>

                <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50 font-bold text-center">
                            <th className="border-r border-black p-1 w-8">ক্র.</th>
                            <th className="border-r border-black p-1 text-left">মূল্যায়ন সূচক</th>
                            <th className="border-r border-black p-1 w-20">সর্বোচ্চ নম্বর</th>
                            <th className="p-1 w-20">প্রাপ্ত নম্বর</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeStructure.map((sec) => {
                            const secObtained = sec.items.reduce((acc, it) => acc + (Number(scoreMap[it.key]?.obtained_score) || 0), 0);
                            const secMax = sec.items.reduce((acc, it) => acc + it.max, 0);

                            return (
                                <React.Fragment key={sec.section_key}>
                                    <tr className="border-b border-black bg-slate-100 font-bold">
                                        <td className="border-r border-black p-1 text-center font-mono">{sec.section_key}</td>
                                        <td className="border-r border-black p-1">{sec.section_name_bn}</td>
                                        <td className="border-r border-black p-1 text-center font-mono">{formatNum(secMax)}</td>
                                        <td className="p-1 text-center font-mono">{formatNum(secObtained)}</td>
                                    </tr>
                                    {sec.items.map((it, idx) => {
                                        const sItem = scoreMap[it.key];
                                        const obtained = sItem?.obtained_score !== undefined && sItem?.obtained_score !== null ? sItem.obtained_score : '';

                                        return (
                                            <tr key={it.key} className="border-b border-black">
                                                <td className="border-r border-black p-1 text-center font-mono">{formatNum(idx + 1)}</td>
                                                <td className="border-r border-black p-1">
                                                    {it.name_bn}
                                                </td>
                                                <td className="border-r border-black p-1 text-center font-mono">{formatNum(it.max)}</td>
                                                <td className="p-1 text-center font-bold font-mono">{formatNum(obtained)}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="border-b border-black bg-slate-50 font-bold">
                                        <td className="border-r border-black p-1 text-right" colSpan={2}>উপ-মোট</td>
                                        <td className="border-r border-black p-1 text-center font-mono">{formatNum(secMax)}</td>
                                        <td className="p-1 text-center font-bold font-mono">{formatNum(secObtained)}</td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        <tr className="border-t-2 border-black font-extrabold bg-slate-100">
                            <td className="border-r border-black p-1.5 text-right" colSpan={2}>সর্বমোট</td>
                            <td className="border-r border-black p-1.5 text-center font-mono">{formatNum(100)}</td>
                            <td className="p-1.5 text-center font-mono text-xs">{formatNum(totalScore)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Page Break for printing */}
            <div className="print:break-before-page pt-4" />

            {/* Score & Grading Summary Table */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                {/* Left: Section-wise Scores Table */}
                <table className="w-full border-collapse border border-black text-center">
                    <thead>
                        <tr className="border-b border-black bg-slate-50 font-bold">
                            <th className="p-1 border-r border-black text-left">মূল্যায়ন সূচক</th>
                            <th className="p-1 border-r border-black w-14">নম্বর</th>
                            <th className="p-1 w-16">প্রাপ্ত নম্বর</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeStructure.map((sec) => {
                            const secObtained = sec.items.reduce((acc, it) => acc + (Number(scoreMap[it.key]?.obtained_score) || 0), 0);
                            const secMax = sec.items.reduce((acc, it) => acc + it.max, 0);

                            return (
                                <tr key={sec.section_key} className="border-b border-black">
                                    <td className="p-1 border-r border-black text-left">{sec.section_name_bn.split('(')[0]}</td>
                                    <td className="p-1 border-r border-black font-mono">{formatNum(secMax)}</td>
                                    <td className="p-1 font-bold font-mono">{formatNum(secObtained)}</td>
                                </tr>
                            );
                        })}
                        <tr className="font-bold bg-slate-50">
                            <td className="p-1 border-r border-black text-left">সর্বমোট</td>
                            <td className="p-1 border-r border-black font-mono">১০০</td>
                            <td className="p-1 font-bold font-mono">{formatNum(totalScore)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Right: Grade Scales Table */}
                <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50 font-bold">
                            <th className="p-1 border-r border-black w-16 text-center">স্কোর</th>
                            <th className="p-1 text-center">ফলাফল</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className={`border-b border-black ${totalScore >= 85 ? 'bg-emerald-50 font-bold' : ''}`}>
                            <td className="p-1 border-r border-black text-center font-mono">৮৫-১০০</td>
                            <td className="p-1">Excellent (স্থায়ীকরণের জন্য অত্যন্ত উপযুক্ত)</td>
                        </tr>
                        <tr className={`border-b border-black ${totalScore >= 65 && totalScore < 85 ? 'bg-blue-50 font-bold' : ''}`}>
                            <td className="p-1 border-r border-black text-center font-mono">৬৫-৮৪</td>
                            <td className="p-1">Very Good (স্থায়ীকরণের জন্য উপযুক্ত)</td>
                        </tr>
                        <tr className={`border-b border-black ${totalScore >= 50 && totalScore < 65 ? 'bg-amber-50 font-bold' : ''}`}>
                            <td className="p-1 border-r border-black text-center font-mono">৫০-৬৪</td>
                            <td className="p-1">Good (স্থায়ীকরণের জন্য বিবেচনাযোগ্য)</td>
                        </tr>
                        <tr className={`${totalScore < 50 ? 'bg-rose-50 font-bold' : ''}`}>
                            <td className="p-1 border-r border-black text-center font-mono">৫০-এর নিচে</td>
                            <td className="p-1">Not Satisfactory (স্থায়ীকরণের জন্য অনুপযুক্ত)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* HR Personal File Verification Section */}
            <div className="mb-4 border border-black p-2 text-[11px]">
                <div className="font-bold mb-1">
                    ব্যক্তিগত ফাইল পর্যবেক্ষণ (মানবসম্পদ বিভাগ কর্তৃক পূরণ করা হবে): নিচের যেকোনো একটি গত ০৬ মাসের মধ্যে হয়েছে কি না?
                </div>
                <table className="w-full border-collapse border border-black text-center text-[10.5px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50 font-bold">
                            <th className="p-1 border-r border-black text-left">বিষয়</th>
                            <th className="p-1 border-r border-black w-20">হ্যাঁ</th>
                            <th className="p-1 w-20">না</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="p-1 border-r border-black text-left">প্রমাণিত কোনো আর্থিক অনিয়ম/অর্থ আত্মসাৎ</td>
                            <td className="p-1 border-r border-black font-bold">{evaluation.hr_financial_irregularity ? '✓' : ''}</td>
                            <td className="p-1 font-bold">{evaluation.hr_financial_irregularity === false ? '✓' : ''}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-1 border-r border-black text-left">যেকোনো শাস্তিমূলক ব্যবস্থার আওতায় দেওয়া কোনো চিঠিপত্র</td>
                            <td className="p-1 border-r border-black font-bold">{evaluation.hr_disciplinary_action ? '✓' : ''}</td>
                            <td className="p-1 font-bold">{evaluation.hr_disciplinary_action === false ? '✓' : ''}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-1 border-r border-black text-left">সর্বশেষ অডিটে গুরুতর আপত্তি</td>
                            <td className="p-1 border-r border-black font-bold">{evaluation.hr_audit_objection ? '✓' : ''}</td>
                            <td className="p-1 font-bold">{evaluation.hr_audit_objection === false ? '✓' : ''}</td>
                        </tr>
                        <tr>
                            <td className="p-1 border-r border-black text-left">বিনা বেতনে ছুটি ভোগ</td>
                            <td className="p-1 border-r border-black font-bold">{evaluation.hr_leave_without_pay ? '✓' : ''}</td>
                            <td className="p-1 font-bold">{evaluation.hr_leave_without_pay === false ? '✓' : ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 1st Supervisor Remarks and Recommendations Block */}
            <div className="border border-black p-2.5 mb-3 text-[11px]">
                <div className="font-bold mb-1.5 underline">১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ:</div>
                <div className="space-y-1 mb-2">
                    <div><b>➢ উক্ত কর্মকর্তার প্রধান শক্তি/দক্ষতা (Strength):</b> {evaluation.strengths || '________________________________________________'}</div>
                    <div><b>➢ উক্ত কর্মকর্তার দুর্বলতা/উন্নয়নের ক্ষেত্রসমূহ (Weakness/Area to Develop):</b> {evaluation.weaknesses || '________________________________________________'}</div>
                    <div><b>➢ উক্ত কর্মকর্তার প্রশিক্ষণের প্রয়োজন কি না:</b> {evaluation.training_need || '________________________________________________'}</div>
                    {evaluation.other_remarks && <div><b>➢ অন্যান্য মন্তব্য (যদি থাকে):</b> {evaluation.other_remarks}</div>}
                </div>

                <div className="pt-1.5 border-t border-slate-300">
                    <div className="font-bold mb-1">সুপারিশ (টিক চিহ্ন দিতে হবে):</div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span>[{evaluation.recommendation_status === 'recommended' ? ' ✓ ' : '   '}]</span>
                            <span>স্থায়ীকরণের জন্য সুপারিশ করা হলো।</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>[{evaluation.recommendation_status === 'extend_probation' ? ' ✓ ' : '   '}]</span>
                            <span>শিক্ষানবিসকাল <u>&nbsp;{evaluation.extend_months ? formatNum(evaluation.extend_months) : '......'}&nbsp;</u> মাস বৃদ্ধি করা যেতে পারে।</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>[{evaluation.recommendation_status === 'not_suitable' ? ' ✓ ' : '   '}]</span>
                            <span>স্থায়ীকরণের উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে।</span>
                        </div>
                    </div>
                </div>

                {/* 1st Supervisor Signature */}
                <div className="flex justify-end mt-2 pt-1">
                    <div className="text-center w-48">
                        {renderSignatureImage(initiatorSig, evaluation.initiator)}
                        <div className="border-t border-black pt-0.5 text-[10px]">
                            <b>১ম তত্ত্বাবধায়কের স্বাক্ষর, তারিখ ও সিল</b>
                            <div className="text-[9px] text-slate-700">{formatDateVal(initiatorSig?.signed_at)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Higher Management Approval Signature Blocks */}
            <div className="space-y-2 text-[10.5px]">
                {/* 1. Regional Manager */}
                <div className="border border-black p-2">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <b>আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:</b>
                            <p className="mt-0.5 italic">{rmSig?.comments || '____________________________________________________________'}</p>
                        </div>
                        <div className="text-center w-48 shrink-0">
                            {renderSignatureImage(rmSig)}
                            <div className="border-t border-black pt-0.5 text-[10px]">
                                <b>স্বাক্ষর, তারিখ ও সিল</b>
                                <div className="text-[9px] text-slate-700">{formatDateVal(rmSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Zonal Manager */}
                <div className="border border-black p-2">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <b>জোনাল ম্যানেজারের মন্তব্য ও সুপারিশ:</b>
                            <p className="mt-0.5 italic">{zmSig?.comments || '____________________________________________________________'}</p>
                        </div>
                        <div className="text-center w-48 shrink-0">
                            {renderSignatureImage(zmSig)}
                            <div className="border-t border-black pt-0.5 text-[10px]">
                                <b>স্বাক্ষর, তারিখ ও সিল</b>
                                <div className="text-[9px] text-slate-700">{formatDateVal(zmSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Director (Microfinance OR Finance & Accounts) */}
                <div className="border border-black p-2">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <b>{formType === 'accountant' ? 'অর্থ ও হিসাব বিভাগের মন্তব্য ও সুপারিশ:' : 'মাইক্রোফাইন্যান্স বিভাগের মন্তব্য ও সুপারিশ:'}</b>
                            <p className="mt-0.5 italic">{directorSig?.comments || '____________________________________________________________'}</p>
                        </div>
                        <div className="text-center w-48 shrink-0">
                            {renderSignatureImage(directorSig)}
                            <div className="border-t border-black pt-0.5 text-[10px]">
                                <b>স্বাক্ষর, তারিখ ও সিল</b>
                                <div className="text-[9px] text-slate-700">{formatDateVal(directorSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. HR Department */}
                <div className="border border-black p-2">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <b>মানবসম্পদ বিভাগের মন্তব্য ও সুপারিশ:</b>
                            <p className="mt-0.5 italic">{hrSig?.comments || '____________________________________________________________'}</p>
                        </div>
                        <div className="text-center w-48 shrink-0">
                            {renderSignatureImage(hrSig)}
                            <div className="border-t border-black pt-0.5 text-[10px]">
                                <b>স্বাক্ষর, তারিখ ও সিল</b>
                                <div className="text-[9px] text-slate-700">{formatDateVal(hrSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Executive Director (ED) */}
                <div className="border border-black p-2 bg-slate-50/50">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <b>নির্বাহী পরিচালক কর্তৃক মন্তব্য ও অনুমোদন:</b>
                            <p className="mt-0.5 italic">{edSig?.comments || '____________________________________________________________'}</p>
                        </div>
                        <div className="text-center w-48 shrink-0">
                            {renderSignatureImage(edSig)}
                            <div className="border-t border-black pt-0.5 text-[10px]">
                                <b>স্বাক্ষর, তারিখ ও সিল</b>
                                <div className="text-[9px] text-slate-700">{formatDateVal(edSig?.signed_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
