import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { formBStructure, formatClosingMonth } from '../evaluation-config';
import { CheckCircle2, Clock } from 'lucide-react';

interface AccountantFormDocumentProps {
    evaluation: any;
    lang: 'bn' | 'en';
    isLivePreview?: boolean;
}

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const str = String(dateStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [year, month, day] = str.split('-');
        return `${day}/${month}/${year}`;
    }
    try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        return format(d, 'dd/MM/yyyy');
    } catch {
        return str;
    }
};

const toBengaliNumber = (num: number | string | null | undefined) => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[Number(d)]);
};

export default function AccountantFormDocument({
    evaluation,
    lang = 'bn',
    isLivePreview = false,
}: AccountantFormDocumentProps) {
    const { auth } = usePage<SharedData>().props;
    const { employee = {}, scores = [], signatures = [] } = evaluation;

    const scoreMap = useMemo(() => {
        const map: Record<string, any> = {};
        scores.forEach((s: any) => {
            map[s.criteria_key] = s;
        });
        return map;
    }, [scores]);

    const formatMark = (val: any) => {
        if (val === null || val === undefined || val === '') return '০';
        const num = Number(val);
        if (isNaN(num)) return val;
        const str = Number(num.toFixed(2)).toString();
        return lang === 'bn' ? toBengaliNumber(str) : str;
    };

    const getSignature = (stage: string) => {
        return signatures.find((s: any) => s.stage === stage);
    };

    const initiatorSig = getSignature('initiator') || {
        stage: 'initiator',
        user: evaluation.initiator || auth?.user,
        signed_at: evaluation.created_at || new Date().toISOString(),
    };
    const rmSig = getSignature('rm') || signatures.find((s: any) => s.stage === 'submitted_to_rm' || s.stage === 'rm_review');
    const zmSig = getSignature('zm') || signatures.find((s: any) => s.stage === 'submitted_to_zm' || s.stage === 'zm_review');
    const directorFaSig = getSignature('director_fa') || getSignature('director') || signatures.find((s: any) => s.stage?.includes('director'));
    const hrSig = getSignature('hr') || signatures.find((s: any) => s.stage === 'submitted_to_hr' || s.stage === 'hr_review');
    const edSig = getSignature('ed') || signatures.find((s: any) => s.stage === 'submitted_to_ed' || s.stage === 'approved');

    const renderSignatureImage = (sig: any, fallbackUser?: any) => {
        const sigPath = sig?.user?.signature || sig?.user?.employee?.signature || fallbackUser?.signature || fallbackUser?.employee?.signature;
        if (!sigPath) return null;
        return (
            <div className="flex justify-center mb-0.5">
                <img src={`/storage/${sigPath}`} alt="Signature" className="h-7 max-h-7 max-w-[120px] object-contain" />
            </div>
        );
    };

    const employeeName = lang === 'bn'
        ? (employee.name_bn || employee.name_en || 'কর্মীর নাম')
        : (employee.name_en || employee.name_bn || 'Employee Name');

    const designationName = lang === 'bn'
        ? (employee.designation?.name_bn || employee.designation?.name || employee.designation?.title || '-')
        : (employee.designation?.name_en || employee.designation?.name || employee.designation?.title || '-');

    const getSafeText = (val: any): string => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') {
            return (lang === 'bn' ? (val.name_bn || val.name) : (val.name_en || val.name)) || val.title || val.code || '';
        }
        return '';
    };

    const branchName = getSafeText(evaluation.branch || employee.branch);
    const regionName = getSafeText(evaluation.regional_office || employee.branch?.regional_office || employee.branch?.regionalOffice);
    const zoneName = getSafeText(evaluation.zone || employee.branch?.regional_office?.zone || employee.branch?.regionalOffice?.zone);

    const currentStationDate = formatDate(evaluation.current_station_joining_date || employee.current_station_joining_date);
    const serviceLengthCurrentPost = evaluation.service_length_current_post || employee.service_length_current_post || '-';
    const educationAtJoining = evaluation.education_at_joining || employee.education_at_joining || employee.education || '-';
    const educationCurrent = evaluation.education_current || employee.education_current || employee.highest_degree || '-';

    // Calculate section sub-totals
    const sectionTotals = formBStructure.map(sec => {
        let maxTotal = 0;
        let obtainedTotal = 0;
        sec.items.forEach(it => {
            maxTotal += it.max;
            const entry = scoreMap[it.key];
            obtainedTotal += entry ? Number(entry.obtained_score || 0) : 0;
        });
        return {
            ...sec,
            maxTotal,
            obtainedTotal,
        };
    });

    // Page 1 has sections A, B, C, D (Items 1 to 28)
    const page1Sections = sectionTotals.slice(0, 4);
    // Page 2 has sections E, F, G, H (Items 29 to 48)
    const page2Sections = sectionTotals.slice(4);

    let page1ItemCounter = 0;
    let page2ItemCounter = 28;

    return (
        <div className="bg-white text-black p-4 sm:p-7 max-w-[850px] mx-auto shadow-sm border border-gray-300 font-sans print:p-0 print:border-none print:shadow-none print:max-w-none text-[11px] leading-tight">
            {/* ================= PAGE 1 ================= */}
            <div className="min-h-[1050px] flex flex-col justify-between print:min-h-0 print:break-after-page mb-6 pb-6 border-b print:border-b-0 print:mb-0 print:pb-0">
                <div>
                    {/* Page 1 Header */}
                    <div className="flex justify-between items-start mb-2 border-b border-black/80 pb-2">
                        <img src="/images/mousumi-logo.png" alt="Mousumi Logo" className="h-12 w-auto object-contain shrink-0" />
                        <div className="text-center flex-1 px-2">
                            <h1 className="text-xl font-black tracking-tight text-black leading-none">
                                {lang === 'bn' ? 'মৌসুমী' : 'MOUSUMI'}
                            </h1>
                            <p className="text-[11px] text-gray-700 mt-0.5">
                                {lang === 'bn' ? 'উকিলপাড়া, নওগাঁ।' : 'Head Office: Ukilpara, Naogaon.'}
                            </p>
                            <h2 className="text-sm font-bold mt-1 text-black">
                                {lang === 'bn' ? 'পদোন্নতি/গ্রেড পরিবর্তন মূল্যায়ন ফরম' : 'Promotion / Grade Change Evaluation Form'}
                            </h2>
                            <h3 className="text-[11px] font-bold text-gray-900 mt-0.5">
                                {lang === 'bn' ? '(হিসাবরক্ষক পদবীর জন্য প্রযোজ্য)' : '(Applicable for Accountant)'}
                            </h3>
                        </div>
                        <div className="text-right text-[10px] font-mono text-gray-600 w-16 shrink-0 pt-1">
                            Page 1 of 3
                        </div>
                    </div>

                    {/* Section 1: Employee Details Table */}
                    <div className="mb-2.5">
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr>
                                    <td className="border border-black px-2 py-1 w-[38%]">
                                        <span className="font-bold">{lang === 'bn' ? 'নাম:' : 'Name:'}</span>{' '}
                                        <span className="font-semibold">{employeeName}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1 w-[42%]">
                                        <span className="font-bold">{lang === 'bn' ? 'পদবী:' : 'Designation:'}</span>{' '}
                                        <span className="font-semibold">{designationName}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1 w-[20%]">
                                        <span className="font-bold">{lang === 'bn' ? 'পিন নং:' : 'PIN No:'}</span>{' '}
                                        <span className="font-mono font-bold">{employee.pin || '-'}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'শাখার নাম:' : 'Branch Name:'}</span>{' '}
                                        <span>{branchName}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'অঞ্চলের নাম:' : 'Region Name:'}</span>{' '}
                                        <span>{regionName}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'জোন:' : 'Zone:'}</span>{' '}
                                        <span>{zoneName}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'সংস্থায় যোগদানের তারিখ:' : 'Org Joining Date:'}</span>{' '}
                                        <span className="font-mono">{formatDate(employee.joining_date)}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1" colSpan={2}>
                                        <span className="font-bold">{lang === 'bn' ? 'সর্বশেষ পদোন্নতি/গ্রেড পরিবর্তনের তারিখ:' : 'Last Promotion / Grade Change Date:'}</span>{' '}
                                        <span className="font-mono">{formatDate(employee.last_promotion_date)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'বর্তমান কর্মস্থলে যোগদানের তারিখ:' : 'Current Station Joining Date:'}</span>{' '}
                                        <span className="font-mono">{currentStationDate}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1" colSpan={2}>
                                        <span className="font-bold">{lang === 'bn' ? 'বর্তমান পদে মোট কর্মকাল:' : 'Service Length in Current Post:'}</span>{' '}
                                        <span className="font-semibold">{serviceLengthCurrentPost}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">
                                        <span className="font-bold">{lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (যোগদানের সময়):' : 'Educational Qualification (At Joining):'}</span>{' '}
                                        <span className="font-semibold">{educationAtJoining}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1" colSpan={2}>
                                        <span className="font-bold">{lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (বর্তমান):' : 'Educational Qualification (Current):'}</span>{' '}
                                        <span className="font-semibold">{educationCurrent}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2: Operational Achievements (Exact Accountant Format with Cashier) */}
                    <div className="mb-2.5">
                        <div className="flex items-center justify-between font-bold text-[11px] mb-1 px-0.5">
                            <span>
                                {lang === 'bn' ? 'মূল্যায়নকালীন অর্জন (সর্বশেষ মাস ক্লোজিং অনুযায়ী):' : 'Achievements during evaluation (As per latest month closing):'}
                            </span>
                            <span>
                                {lang === 'bn' ? 'ক্লোজিং মাসের নাম:' : 'Closing Month Name:'}{' '}
                                <span className="font-semibold underline decoration-dotted ml-1">
                                    {formatClosingMonth(evaluation.closing_month, lang)}
                                </span>
                            </span>
                        </div>
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr>
                                    <td className="border border-black px-2 py-1 w-[30%] font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার সদস্য (জন):' : 'Branch Members (Person):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 w-[20%] font-mono text-center">
                                        {evaluation.members_count ?? ''}
                                    </td>
                                    <td className="border border-black px-2 py-1 w-[30%] font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার ঋণী (জন):' : 'Branch Borrowers (Person):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 w-[20%] font-mono text-center">
                                        {evaluation.borrowers_count ?? ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার ঋণ স্থিতি (টাকা):' : 'Branch Loan Balance (Tk):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center">
                                        {evaluation.loan_balance ? Number(evaluation.loan_balance).toLocaleString('en-US') : ''}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):' : 'Branch Savings Balance (All Components Total Tk):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center">
                                        {evaluation.savings_balance ? Number(evaluation.savings_balance).toLocaleString('en-US') : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার বকেয়া (জন):' : 'Branch Overdue (Person):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center">
                                        {evaluation.overdue_borrowers ?? ''}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার বকেয়া (টাকা):' : 'Branch Overdue (Tk):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center">
                                        {evaluation.overdue_amount ? Number(evaluation.overdue_amount).toLocaleString('en-US') : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার OTR (%):' : 'Branch OTR (%):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center font-bold">
                                        {evaluation.otr_pct ? `${evaluation.otr_pct}%` : ''}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50">
                                        {lang === 'bn' ? 'শাখার PAR (%):' : 'Branch PAR (%):'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-mono text-center font-bold">
                                        {evaluation.par_pct ? `${evaluation.par_pct}%` : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1 font-semibold bg-gray-50/50" colSpan={2}>
                                        {lang === 'bn' ? 'শাখায় ক্যাশিয়ার আছে কি না?' : 'Is there a cashier stationed in branch?'}
                                    </td>
                                    <td className="border border-black px-2 py-1 font-bold text-center" colSpan={2}>
                                        {evaluation.has_cashier ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes') : (lang === 'bn' ? 'না' : 'No')}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3 (Part 1): Items 1 to 28 (ক, খ, গ, ঘ) */}
                    <div>
                        <div className="font-bold text-[11px] mb-1">
                            {lang === 'bn' 
                                ? '১ম তত্ত্বাবধায়ক কর্তৃক বিগত ০১ বছরের সার্বিক মূল্যায়নের প্রেক্ষিতে রেটিং করতে হবে:' 
                                : 'Rating must be done by 1st supervisor based on overall performance of last 01 year:'}
                        </div>
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <thead>
                                <tr className="bg-gray-100 font-bold">
                                    <th className="border border-black p-1 text-center w-10">{lang === 'bn' ? 'ক্র.' : 'SL'}</th>
                                    <th className="border border-black p-1 text-left">{lang === 'bn' ? 'মূল্যায়ন সূচক' : 'Evaluation Criteria'}</th>
                                    <th className="border border-black p-1 text-center w-20">{lang === 'bn' ? 'সর্বোচ্চ নম্বর' : 'Max'}</th>
                                    <th className="border border-black p-1 text-center w-20">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {page1Sections.map((sec, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                        <tr className="bg-gray-100/90 font-bold">
                                            <td className="border border-black px-1.5 py-0.5 text-black" colSpan={4}>
                                                {lang === 'bn' ? sec.section_name_bn : sec.section_name_en}
                                            </td>
                                        </tr>
                                        {sec.items.map((it, iIdx) => {
                                            page1ItemCounter += 1;
                                            const entry = scoreMap[it.key];
                                            const cleanItemName = (lang === 'bn' ? it.name_bn : it.name_en).replace(/^([০-৯]+|\d+)\.\s*/, '');
                                            return (
                                                <tr key={iIdx}>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono">
                                                        {lang === 'bn' ? toBengaliNumber(page1ItemCounter) : page1ItemCounter}
                                                    </td>
                                                    <td className="border border-black px-2 py-0.5 text-gray-900">
                                                        {cleanItemName}
                                                    </td>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono">
                                                        {formatMark(it.max)}
                                                    </td>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                        {entry?.obtained_score !== undefined ? formatMark(entry.obtained_score) : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="border-t border-black font-semibold bg-gray-50/70 text-[10px]">
                                            <td className="border border-black px-1 py-0.5 text-center font-bold" colSpan={2}>
                                                {lang === 'bn' ? 'উপ-মোট' : 'Sub-total'}
                                            </td>
                                            <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                {formatMark(sec.maxTotal)}
                                            </td>
                                            <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                {formatMark(sec.obtainedTotal)}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ================= PAGE 2 ================= */}
            <div className="min-h-[1050px] flex flex-col justify-between print:min-h-0 print:break-after-page mb-6 pb-6 border-b print:border-b-0 print:mb-0 print:pb-0">
                <div>
                    {/* Page 2 Header */}
                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/80">
                        <span className="font-bold text-xs text-black">
                            {lang === 'bn' ? 'মৌসুমী — পদোন্নতি/গ্রেড পরিবর্তন মূল্যায়ন ফরম (হিসাবরক্ষক)' : 'MOUSUMI — Promotion Evaluation Form (Accountant)'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-600">Page 2 of 3</span>
                    </div>

                    {/* Section 3 (Part 2): Items 29 to 48 (ঙ, চ, ছ, জ) */}
                    <div className="mb-4">
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <thead>
                                <tr className="bg-gray-100 font-bold">
                                    <th className="border border-black p-1 text-center w-10">{lang === 'bn' ? 'ক্র.' : 'SL'}</th>
                                    <th className="border border-black p-1 text-left">{lang === 'bn' ? 'মূল্যায়ন সূচক (চলমান)' : 'Evaluation Criteria (Contd.)'}</th>
                                    <th className="border border-black p-1 text-center w-20">{lang === 'bn' ? 'সর্বোচ্চ নম্বর' : 'Max'}</th>
                                    <th className="border border-black p-1 text-center w-20">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {page2Sections.map((sec, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                        <tr className="bg-gray-100/90 font-bold">
                                            <td className="border border-black px-1.5 py-0.5 text-black" colSpan={4}>
                                                {lang === 'bn' ? sec.section_name_bn : sec.section_name_en}
                                            </td>
                                        </tr>
                                        {sec.items.map((it, iIdx) => {
                                            page2ItemCounter += 1;
                                            const entry = scoreMap[it.key];
                                            const cleanItemName = (lang === 'bn' ? it.name_bn : it.name_en).replace(/^([০-৯]+|\d+)\.\s*/, '');
                                            return (
                                                <tr key={iIdx}>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono">
                                                        {lang === 'bn' ? toBengaliNumber(page2ItemCounter) : page2ItemCounter}
                                                    </td>
                                                    <td className="border border-black px-2 py-0.5 text-gray-900">
                                                        {cleanItemName}
                                                    </td>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono">
                                                        {formatMark(it.max)}
                                                    </td>
                                                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                        {entry?.obtained_score !== undefined ? formatMark(entry.obtained_score) : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="border-t border-black font-semibold bg-gray-50/70 text-[10px]">
                                            <td className="border border-black px-1 py-0.5 text-center font-bold" colSpan={2}>
                                                {lang === 'bn' ? 'উপ-মোট' : 'Sub-total'}
                                            </td>
                                            <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                {formatMark(sec.maxTotal)}
                                            </td>
                                            <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                                {formatMark(sec.obtainedTotal)}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                                    <td colSpan={2} className="border border-black px-2 py-1 text-right">
                                        {lang === 'bn' ? 'সর্বমোট (ক+খ+গ+ঘ+ঙ+চ+ছ+জ):' : 'Total (A+B+C+D+E+F+G+H):'}
                                    </td>
                                    <td className="border border-black px-1 py-1 text-center font-mono font-bold">
                                        {lang === 'bn' ? '১০০' : '100'}
                                    </td>
                                    <td className="border border-black px-1 py-1 text-center font-mono font-black text-xs">
                                        {formatMark(evaluation.total_score || 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Page 2 Bottom: Summary Table & Position Scale */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Left: Total marks by section */}
                        <div className="border border-black">
                            <div className="bg-gray-100 font-bold p-1 border-b border-black text-center text-[10px]">
                                {lang === 'bn' ? 'মোট নম্বর' : 'Total Marks Summary'}
                            </div>
                            <table className="w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-black font-semibold">
                                        <th className="p-1 border-r border-black text-left">{lang === 'bn' ? 'মূল্যায়ন সূচক' : 'Section'}</th>
                                        <th className="p-1 border-r border-black text-center w-12">{lang === 'bn' ? 'নম্বর' : 'Max'}</th>
                                        <th className="p-1 text-center w-14">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectionTotals.map((sec, idx) => {
                                        const cleanSecName = (lang === 'bn' ? sec.section_name_bn : sec.section_name_en)
                                            .replace(/^[ক-হA-Z]\.\s*/, '')
                                            .replace(/\s*\(\d+\s*(নম্বর|Marks)\)/, '');
                                        return (
                                            <tr key={idx} className="border-b border-black/40">
                                                <td className="p-1 border-r border-black text-[9.5px] leading-tight">
                                                    {cleanSecName}
                                                </td>
                                                <td className="p-1 border-r border-black text-center font-mono">{formatMark(sec.maxTotal)}</td>
                                                <td className="p-1 text-center font-bold font-mono">{formatMark(sec.obtainedTotal)}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="font-bold bg-gray-100 border-t border-black">
                                        <td className="p-1 border-r border-black text-right">{lang === 'bn' ? 'সর্বমোট' : 'Grand Total'}</td>
                                        <td className="p-1 border-r border-black text-center font-mono">{lang === 'bn' ? '১০০' : '100'}</td>
                                        <td className="p-1 text-center font-bold font-mono">{formatMark(evaluation.total_score || 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Right: Position scale according to obtained marks */}
                        <div className="border border-black flex flex-col justify-between">
                            <div>
                                <div className="bg-gray-100 font-bold p-1 border-b border-black text-center text-[10px]">
                                    {lang === 'bn' ? 'প্রাপ্ত নম্বর অনুযায়ী অবস্থান' : 'Position According to Obtained Marks'}
                                </div>
                                <table className="w-full border-collapse text-[10px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-black font-semibold">
                                            <th className="p-1 border-r border-black text-center w-14">{lang === 'bn' ? 'স্কোর' : 'Score'}</th>
                                            <th className="p-1 text-left">{lang === 'bn' ? 'ফলাফল' : 'Result'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className={`border-b border-black/40 ${evaluation.calculated_grade === 'excellent' ? 'bg-emerald-50 font-bold' : ''}`}>
                                            <td className="p-1 border-r border-black text-center font-semibold">৮৫-১০০</td>
                                            <td className="p-1 text-[9.5px]">
                                                <span className="font-bold">Excellent</span> {lang === 'bn' ? '(গ্রেড পরিবর্তন/ পদোন্নতির জন্য অত্যন্ত উপযুক্ত)' : '(Highly suitable)'}
                                            </td>
                                        </tr>
                                        <tr className={`border-b border-black/40 ${evaluation.calculated_grade === 'very_good' ? 'bg-emerald-50 font-bold' : ''}`}>
                                            <td className="p-1 border-r border-black text-center font-semibold">৬৫-৮৪</td>
                                            <td className="p-1 text-[9.5px]">
                                                <span className="font-bold">Very Good</span> {lang === 'bn' ? '(গ্রেড পরিবর্তন/ পদোন্নতির জন্য উপযুক্ত)' : '(Suitable)'}
                                            </td>
                                        </tr>
                                        <tr className={`border-b border-black/40 ${evaluation.calculated_grade === 'good' ? 'bg-amber-50 font-bold' : ''}`}>
                                            <td className="p-1 border-r border-black text-center font-semibold">৫০-৬৪</td>
                                            <td className="p-1 text-[9.5px]">
                                                <span className="font-bold">Good</span> {lang === 'bn' ? '(গ্রেড পরিবর্তন/ পদোন্নতির জন্য বিবেচনাযোগ্য)' : '(Considerable)'}
                                            </td>
                                        </tr>
                                        <tr className={`${evaluation.calculated_grade === 'not_satisfactory' ? 'bg-rose-50 font-bold' : ''}`}>
                                            <td className="p-1 border-r border-black text-center font-semibold">৫০-এর নিচে</td>
                                            <td className="p-1 text-[9.5px]">
                                                <span className="font-bold">Not Satisfactory</span> {lang === 'bn' ? '(গ্রেড পরিবর্তন/ পদোন্নতির জন্য অনুপযুক্ত)' : '(Not suitable)'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= PAGE 3 ================= */}
            <div className="min-h-[1050px] flex flex-col justify-between print:min-h-0">
                <div>
                    {/* Page 3 Header */}
                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/80">
                        <span className="font-bold text-xs text-black">
                            {lang === 'bn' ? 'মৌসুমী — পদোন্নতি/গ্রেড পরিবর্তন মূল্যায়ন ফরম (হিসাবরক্ষক)' : 'MOUSUMI — Promotion Evaluation Form (Accountant)'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-600">Page 3 of 3</span>
                    </div>

                    {/* HR Verification Checklist */}
                    <div className="border border-black p-2.5 mb-2.5">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs">
                                {lang === 'bn' 
                                    ? 'ব্যক্তিগত ফাইল পর্যবেক্ষণ (মানবসম্পদ বিভাগ কর্তৃক পূরণ করা হবে):' 
                                    : 'Personal File Review (To be completed by HR department):'}
                            </span>
                            {hrSig && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> {lang === 'bn' ? 'যাচাই সম্পন্ন' : 'Verified'}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-700 mb-1.5 italic">
                            {lang === 'bn' ? 'নিচের যেকোনো একটি গত ০২ বছরের মধ্যে হয়েছে কি না?' : 'Has any of the following occurred within the last 02 years?'}
                        </p>
                        <table className="w-full border-collapse border border-black text-[10.5px] mb-2">
                            <thead>
                                <tr className="bg-gray-100 font-bold">
                                    <th className="border border-black p-1 text-left">{lang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                                    <th className="border border-black p-1 text-center w-14">{lang === 'bn' ? 'হ্যাঁ' : 'Yes'}</th>
                                    <th className="border border-black p-1 text-center w-14">{lang === 'bn' ? 'না' : 'No'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black px-2 py-1">১. প্রমাণিত কোনো আর্থিক অনিয়ম/অর্থ আত্মসাৎ</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{evaluation.hr_financial_irregularity ? '✓' : ''}</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{!evaluation.hr_financial_irregularity ? '✓' : ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">২. যেকোনো শাস্তিমূলক ব্যবস্থার আওতায় দেওয়া কোনো চিঠিপত্র</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{evaluation.hr_disciplinary_action ? '✓' : ''}</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{!evaluation.hr_disciplinary_action ? '✓' : ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">৩. সর্বশেষ অডিটে গুরুতর আপত্তি</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{evaluation.hr_audit_objection ? '✓' : ''}</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{!evaluation.hr_audit_objection ? '✓' : ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">৪. বিনা বেতনে ছুটি ভোগ</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{evaluation.hr_leave_without_pay ? '✓' : ''}</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{!evaluation.hr_leave_without_pay ? '✓' : ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1">৫. সর্বশেষ বাৎসরিক গোপনীয় প্রতিবেদন (ACR) মূল্যায়ন সন্তোষজনক ফলাফল</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{evaluation.hr_acr_satisfactory ? '✓' : ''}</td>
                                    <td className="border border-black p-1 text-center font-bold font-mono">{!evaluation.hr_acr_satisfactory ? '✓' : ''}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="flex justify-between items-end pt-1 text-[10px]">
                            <div>
                                {hrSig ? (
                                    <>
                                        <span className="font-semibold">{hrSig.user?.name}</span> ({hrSig.user?.employee?.designation?.name || 'HR Officer'})
                                        {hrSig.comments && <p className="italic text-gray-700">"{hrSig.comments}"</p>}
                                    </>
                                ) : (
                                    <span className="text-gray-400 italic">{lang === 'bn' ? 'এইচআর মতামত অপেক্ষমাণ' : 'HR opinion awaiting'}</span>
                                )}
                            </div>
                            <div className="text-right">
                                {renderSignatureImage(hrSig)}
                                <div className="font-mono">{formatDate(hrSig?.signed_at)}</div>
                                <div className="border-t border-black w-40 mt-0.5 text-center font-bold text-[9.5px]">
                                    {lang === 'bn' ? 'যাচাইকারীর স্বাক্ষর ও তারিখ' : 'HR Signature & Date'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6 Signatories Blocks */}
                    <div className="space-y-2.5">
                        {/* 1. First Supervisor Remarks & Recommendation */}
                        <div className="border border-black p-2.5">
                            <div className="font-bold text-xs mb-1">
                                {lang === 'bn' ? '১. ১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ:' : '1. 1st Supervisor Remarks & Recommendation:'}
                            </div>
                            <div className="space-y-1 text-[10.5px]">
                                <div>
                                    <span className="font-bold">➢ উক্ত কর্মকর্তার প্রধান শক্তি/দক্ষতা (Strength):</span>{' '}
                                    <span className="italic ml-1">{evaluation.strengths || (lang === 'bn' ? 'উল্লেখ নেই' : 'N/A')}</span>
                                </div>
                                <div>
                                    <span className="font-bold">➢ উক্ত কর্মকর্তার দুর্বলতা/উন্নয়নের ক্ষেত্রসমূহ (Weakness/Area to Develop):</span>{' '}
                                    <span className="italic ml-1">{evaluation.weaknesses || (lang === 'bn' ? 'উল্লেখ নেই' : 'N/A')}</span>
                                </div>
                                <div>
                                    <span className="font-bold">➢ উক্ত কর্মকর্তার প্রশিক্ষণের প্রয়োজন কি না:</span>{' '}
                                    <span className="italic ml-1">{evaluation.training_need || (lang === 'bn' ? 'উল্লেখ নেই' : 'N/A')}</span>
                                </div>
                                {evaluation.initiator_other_comments && (
                                    <div>
                                        <span className="font-bold">➢ অন্যান্য মন্তব্য (যদি থাকে):</span>{' '}
                                        <span className="italic ml-1">{evaluation.initiator_other_comments}</span>
                                    </div>
                                )}
                                <div className="pt-1 border-t border-gray-200">
                                    <span className="font-bold">সুপারিশ (টিক চিহ্ন দিতে হবে):</span>
                                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold">{evaluation.recommendation_status === 'recommended' ? '☑' : '☐'}</span>
                                            <span className={evaluation.recommendation_status === 'recommended' ? 'font-bold' : ''}>
                                                {lang === 'bn' ? 'গ্রেড পরিবর্তন/পদোন্নতির জন্য সুপারিশ করা হলো।' : 'Recommended for promotion.'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold">{evaluation.recommendation_status === 'consider_later' ? '☑' : '☐'}</span>
                                            <span className={evaluation.recommendation_status === 'consider_later' ? 'font-bold' : ''}>
                                                {lang === 'bn' 
                                                    ? `${evaluation.consider_after_months ? toBengaliNumber(evaluation.consider_after_months) : '………'} মাস পর মূল্যায়নের প্রেক্ষিতে বিবেচনা করা যেতে পারে।` 
                                                    : `May be considered after ${evaluation.consider_after_months || '...'} months.`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold">{evaluation.recommendation_status === 'not_suitable' ? '☑' : '☐'}</span>
                                            <span className={evaluation.recommendation_status === 'not_suitable' ? 'font-bold' : ''}>
                                                {lang === 'bn' ? 'বর্তমানে গ্রেড পরিবর্তন/পদোন্নতির জন্য উপযুক্ত নয়।' : 'Currently not suitable.'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-end pt-2 mt-1 border-t border-gray-200 text-[10px]">
                                <div>
                                    <span className="font-semibold">{initiatorSig?.user?.name || evaluation.initiator?.name || auth?.user?.name}</span> ({initiatorSig?.user?.employee?.designation?.name || 'Branch Manager'})
                                </div>
                                <div className="text-right">
                                    {renderSignatureImage(initiatorSig, evaluation.initiator || auth?.user)}
                                    <div className="font-mono">{formatDate(initiatorSig?.signed_at || evaluation.created_at)}</div>
                                    <div className="border-t border-black w-40 mt-0.5 text-center font-bold text-[9.5px]">
                                        {lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Regional Manager */}
                        <div className="border border-black p-2">
                            <div className="font-bold text-[11px] mb-0.5">{lang === 'bn' ? '২. আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:' : '2. Regional Manager Review:'}</div>
                            <p className="italic text-gray-800 text-[10.5px]">
                                {rmSig?.comments ? `"${rmSig.comments}"` : (lang === 'bn' ? 'সম্মত ও অগ্রবর্তী করা হলো।' : 'Agreed and forwarded.')}
                            </p>
                            <div className="flex justify-between items-end pt-1 text-[10px]">
                                <div><span className="font-semibold">{rmSig?.user?.name || 'Regional Manager'}</span></div>
                                <div className="text-right">
                                    {renderSignatureImage(rmSig)}
                                    <div className="font-mono">{formatDate(rmSig?.signed_at)}</div>
                                    <div className="border-t border-black w-36 mt-0.5 text-center font-bold text-[9.5px]">{lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Zonal Manager */}
                        <div className="border border-black p-2">
                            <div className="font-bold text-[11px] mb-0.5">{lang === 'bn' ? '৩. জোনাল ম্যানেজারের মন্তব্য ও সুপারিশ:' : '3. Zonal Manager Review:'}</div>
                            <p className="italic text-gray-800 text-[10.5px]">
                                {zmSig?.comments ? `"${zmSig.comments}"` : (lang === 'bn' ? 'সুপারিশ করা হলো।' : 'Recommended.')}
                            </p>
                            <div className="flex justify-between items-end pt-1 text-[10px]">
                                <div><span className="font-semibold">{zmSig?.user?.name || 'Zonal Manager'}</span></div>
                                <div className="text-right">
                                    {renderSignatureImage(zmSig)}
                                    <div className="font-mono">{formatDate(zmSig?.signed_at)}</div>
                                    <div className="border-t border-black w-36 mt-0.5 text-center font-bold text-[9.5px]">{lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Finance & Accounts Department (Specific to Accountant Form) */}
                        <div className="border border-black p-2">
                            <div className="font-bold text-[11px] mb-0.5">{lang === 'bn' ? '৪. অর্থ ও হিসাব বিভাগের মন্তব্য ও সুপারিশ:' : '4. Finance & Accounts Department Review:'}</div>
                            <p className="italic text-gray-800 text-[10.5px]">
                                {directorFaSig?.comments ? `"${directorFaSig.comments}"` : (lang === 'bn' ? 'পর্যালোচনাপূর্বক অনুমোদন সুপারিশ করা হলো।' : 'Reviewed and recommended.')}
                            </p>
                            <div className="flex justify-between items-end pt-1 text-[10px]">
                                <div><span className="font-semibold">{directorFaSig?.user?.name || 'Director (Finance & Accounts)'}</span></div>
                                <div className="text-right">
                                    {renderSignatureImage(directorFaSig)}
                                    <div className="font-mono">{formatDate(directorFaSig?.signed_at)}</div>
                                    <div className="border-t border-black w-36 mt-0.5 text-center font-bold text-[9.5px]">{lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Human Resources Department */}
                        <div className="border border-black p-2">
                            <div className="font-bold text-[11px] mb-0.5">{lang === 'bn' ? '৫. মানবসম্পদ বিভাগের মন্তব্য ও সুপারিশ:' : '5. Human Resources Department Review:'}</div>
                            <p className="italic text-gray-800 text-[10.5px]">
                                {hrSig?.comments ? `"${hrSig.comments}"` : (lang === 'bn' ? 'যাচাই সম্পন্ন ও পদোন্নতির জন্য সুপারিশ করা হলো।' : 'Verified and recommended.')}
                            </p>
                            <div className="flex justify-between items-end pt-1 text-[10px]">
                                <div><span className="font-semibold">{hrSig?.user?.name || 'Head of HR'}</span></div>
                                <div className="text-right">
                                    {renderSignatureImage(hrSig)}
                                    <div className="font-mono">{formatDate(hrSig?.signed_at)}</div>
                                    <div className="border-t border-black w-36 mt-0.5 text-center font-bold text-[9.5px]">{lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Executive Director Final Approval */}
                        <div className="border-2 border-black p-2 bg-slate-50/20">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-[11px]">{lang === 'bn' ? '৬. নির্বাহী পরিচালক কর্তৃক মন্তব্য ও অনুমোদন:' : '6. Executive Director Approval:'}</span>
                                {evaluation.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                        <CheckCircle2 className="h-3 w-3" /> {lang === 'bn' ? 'অনুমোদিত ও পদোন্নতি কার্যকর' : 'Approved & Promoted'}
                                    </span>
                                )}
                            </div>
                            <p className="italic text-gray-800 text-[10.5px] mb-1">
                                "{edSig?.comments || (evaluation.status === 'approved' ? (lang === 'bn' ? 'অনুমোদন করা হলো।' : 'Approved.') : (evaluation.status === 'rejected' ? (lang === 'bn' ? 'প্রত্যাখ্যাত হলো।' : 'Rejected.') : (lang === 'bn' ? 'চূড়ান্ত অনুমোদন অপেক্ষমাণ।' : 'Pending approval.')))}"
                            </p>
                            <div className="flex justify-between items-end pt-1 text-[10px]">
                                <div>
                                    <span className="font-semibold">{edSig?.user?.name || 'Executive Director'}</span>
                                    <div className="text-gray-600">{lang === 'bn' ? 'নির্বাহী পরিচালক, মৌসুমী' : 'Executive Director, Mousumi'}</div>
                                </div>
                                <div className="text-right">
                                    {renderSignatureImage(edSig)}
                                    <div className="font-mono">{formatDate(edSig?.signed_at)}</div>
                                    <div className="border-t border-black w-40 mt-0.5 text-center font-bold text-[9.5px]">{lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, Date & Seal'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
