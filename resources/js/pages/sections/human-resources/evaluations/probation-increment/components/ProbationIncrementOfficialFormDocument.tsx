import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { getFormStructure } from '../probation-increment-config';

interface ProbationIncrementOfficialFormDocumentProps {
    evaluation: any;
    lang?: 'bn' | 'en';
}

const BN_SECTION_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ'];

function FitPage({ children, breakAfter = true }: { children: React.ReactNode; breakAfter?: boolean }) {
    const frameRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const fit = () => {
            const frame = frameRef.current;
            const inner = innerRef.current;
            if (!frame || !inner) return;

            inner.style.transform = 'none';
            inner.style.transformOrigin = 'top left';
            inner.style.width = '100%';
            inner.style.height = 'auto';

            const box = getComputedStyle(frame);
            const padTop = parseFloat(box.paddingTop) || 0;
            const padBottom = parseFloat(box.paddingBottom) || 0;
            const available = frame.clientHeight - padTop - padBottom;
            const needed = Math.max(inner.scrollHeight, inner.offsetHeight);
            if (available <= 0 || needed <= 0) return;

            const scale = Math.min(1, (available * 0.985) / needed);
            inner.style.width = scale < 0.995 ? `${100 / scale}%` : '100%';
            inner.style.transform = scale < 0.995 ? `scale(${Number(scale.toFixed(4))})` : 'none';
        };

        fit();
        const onPrint = () => {
            fit();
            requestAnimationFrame(fit);
        };
        const soon = window.setTimeout(fit, 60);
        const later = window.setTimeout(fit, 300);
        const images = Array.from(frameRef.current?.querySelectorAll('img') ?? []);
        images.forEach((img) => img.addEventListener('load', fit));
        window.addEventListener('beforeprint', onPrint);
        window.addEventListener('resize', fit);
        return () => {
            window.clearTimeout(soon);
            window.clearTimeout(later);
            images.forEach((img) => img.removeEventListener('load', fit));
            window.removeEventListener('beforeprint', onPrint);
            window.removeEventListener('resize', fit);
        };
    });

    return (
        <div
            ref={frameRef}
            className="probation-fit-page mx-auto w-full max-w-[194mm] bg-white mb-6 print:mb-0 print:max-w-none"
            style={{
                height: '270mm',
                overflow: 'hidden',
                boxSizing: 'border-box',
                paddingTop: '2mm',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                breakAfter: breakAfter ? 'page' : 'auto',
                pageBreakAfter: breakAfter ? 'always' : 'auto',
            }}
        >
            <div ref={innerRef} className="text-[10px] leading-tight [&_td]:py-[2px] [&_th]:py-[2px]">
                {children}
            </div>
        </div>
    );
}

const toBn = (num: number | string | null | undefined) => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
};

const formatDate = (dateStr?: string | null, targetLang: 'bn' | 'en' = 'bn') => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (!str || str === '-') return '';

    let formatted = str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        formatted = str;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [year, month, day] = str.slice(0, 10).split('-');
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

    return targetLang === 'bn' ? toBn(formatted) : formatted;
};

const formatClosingMonth = (val?: string | null, targetLang: 'bn' | 'en' = 'bn') => {
    if (!val) return '________________';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}$/.test(str)) {
        const [year, monthStr] = str.split('-');
        const monthNum = parseInt(monthStr, 10);
        const bnMonths = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
        ];
        const enMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        if (monthNum >= 1 && monthNum <= 12) {
            return targetLang === 'bn'
                ? `${bnMonths[monthNum - 1]} ${toBn(year)}`
                : `${enMonths[monthNum - 1]} ${year}`;
        }
    }
    return targetLang === 'bn' ? toBn(str) : str;
};

const shortSectionName = (nameBn: string) => {
    return nameBn
        .replace(/^[ক-হ]\.\s*/, '')
        .replace(/\s*\([^)]*\)\s*-\s*[০-৯\d]+\s*নম্বর\s*$/, '')
        .replace(/\s*-\s*[০-৯\d]+\s*নম্বর\s*$/, '')
        .replace(/\s*\([০-৯\d]+\s*নম্বর\)\s*$/, '')
        .trim();
};

const stripItemNumber = (name: string) => name.replace(/^([০-৯]+|\d+)\.\s*/, '');

const FORM_COPY = {
    officer_abm: {
        titleBn: 'শিক্ষানবিশকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম',
        subtitleBn: '(অফিসার ও সহকারী শাখা ব্যবস্থাপক পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Probation 2nd Step Salary Increment Evaluation Form',
        subtitleEn: '(Applicable for Officer & Assistant Branch Manager)',
        deptBn: 'মাইক্রোফাইন্যান্স বিভাগের মন্তব্য ও সুপারিশ:',
        deptEn: 'Microfinance Department remarks & recommendation:',
        pages: 2,
        firstPageSections: 4,
    },
    accountant: {
        titleBn: 'শিক্ষানবিশকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম',
        subtitleBn: '(হিসাবরক্ষক পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Probation 2nd Step Salary Increment Evaluation Form',
        subtitleEn: '(Applicable for Accountant)',
        deptBn: 'অর্থ ও হিসাব বিভাগের মন্তব্য ও সুপারিশ:',
        deptEn: 'Finance & Accounts Department remarks & recommendation:',
        pages: 3,
        firstPageSections: 3,
    },
    bm_and_above: {
        titleBn: 'শিক্ষানবিশকালীন ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম',
        subtitleBn: '(শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Probation 2nd Step Salary Increment Evaluation Form',
        subtitleEn: '(Applicable for Branch Manager and above)',
        deptBn: 'মাইক্রোফাইন্যান্স বিভাগের মন্তব্য ও সুপারিশ:',
        deptEn: 'Microfinance Department remarks & recommendation:',
        pages: 3,
        firstPageSections: 4,
    },
} as const;

const HR_ITEMS = [
    { key: 'hr_financial_irregularity', labelBn: 'প্রমাণিত কোনো আর্থিক অনিয়ম/অর্থ আত্মসাৎ', labelEn: 'Proven financial irregularity / embezzlement' },
    { key: 'hr_disciplinary_action', labelBn: 'যেকোনো শাস্তিমূলক ব্যবস্থার আওতায় দেওয়া কোনো চিঠিপত্র', labelEn: 'Any letter issued under disciplinary action' },
    { key: 'hr_audit_objection', labelBn: 'সর্বশেষ অডিটে গুরুতর আপত্তি', labelEn: 'Serious objection in the latest audit' },
    { key: 'hr_leave_without_pay', labelBn: 'বিনা বেতনে ছুটি ভোগ', labelEn: 'Leave without pay' },
] as const;

export default function ProbationIncrementOfficialFormDocument({
    evaluation,
    lang = 'bn',
}: ProbationIncrementOfficialFormDocumentProps) {
    const { auth } = usePage<SharedData>().props;
    const { employee = {}, scores = [], signatures = [] } = evaluation;

    const formType = (evaluation.form_type || 'officer_abm') as keyof typeof FORM_COPY;
    const copy = FORM_COPY[formType] || FORM_COPY.officer_abm;
    const activeStructure = useMemo(() => getFormStructure(formType), [formType]);

    const scoreMap = useMemo(() => {
        const map: Record<string, any> = {};
        scores.forEach((s: any) => {
            map[s.criteria_key] = s;
        });
        return map;
    }, [scores]);

    const sectionTotals = useMemo(() => {
        return activeStructure.map((sec) => {
            let maxTotal = 0;
            let obtainedTotal = 0;
            let anyScored = false;
            sec.items.forEach((it) => {
                maxTotal += Number(it.max || 0);
                const scored = scoreMap[it.key]?.obtained_score;
                if (scored !== undefined && scored !== null && String(scored) !== '' && !isNaN(Number(scored))) {
                    obtainedTotal += Number(scored);
                    anyScored = true;
                }
            });
            return { ...sec, maxTotal, obtainedTotal, anyScored };
        });
    }, [activeStructure, scoreMap]);

    const formatMark = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        const num = Number(val);
        if (isNaN(num)) return String(val);
        const str = Number(num.toFixed(2)).toString();
        return lang === 'bn' ? toBn(str) : str;
    };

    const formatStat = (val: any, suffix = '') => {
        if (val === null || val === undefined || val === '') return '';
        const text = `${val}${suffix}`;
        return lang === 'bn' ? toBn(text) : text;
    };

    const getDiffDisplay = (joiningVal: any, closingVal: any, explicitDiff?: any, isPercentage = false) => {
        const suffix = isPercentage ? '%' : '';
        if (explicitDiff !== undefined && explicitDiff !== null && String(explicitDiff).trim() !== '') {
            const num = parseFloat(String(explicitDiff));
            if (!isNaN(num)) {
                const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2);
                const prefix = num > 0 ? '+' : '';
                return formatStat(`${prefix}${formatted}`, suffix);
            }
            return formatStat(explicitDiff, suffix);
        }
        const hasJ = joiningVal !== undefined && joiningVal !== null && String(joiningVal).trim() !== '';
        const hasC = closingVal !== undefined && closingVal !== null && String(closingVal).trim() !== '';
        if (!hasJ && !hasC) return '';
        const diff = (hasC ? parseFloat(String(closingVal)) : 0) - (hasJ ? parseFloat(String(joiningVal)) : 0);
        if (isNaN(diff)) return '';
        const formatted = Number.isInteger(diff) ? String(diff) : diff.toFixed(2);
        const prefix = diff > 0 ? '+' : '';
        return formatStat(`${prefix}${formatted}`, suffix);
    };

    const getSignature = (stage: string) => signatures.find((s: any) => s.stage === stage);

    const initiatorSig = getSignature('initiator') || (evaluation.initiator || evaluation.created_at
        ? {
            stage: 'initiator',
            user: evaluation.initiator || auth?.user,
            signed_at: evaluation.created_at,
            comments: evaluation.other_remarks || evaluation.initiator_remarks || '',
        }
        : null);
    const rmSig = getSignature('rm');
    const zmSig = getSignature('zm');
    const directorSig = getSignature('director_mf') || getSignature('director_fa') || signatures.find((s: any) => String(s.stage || '').includes('director'));
    const hrSig = getSignature('hr');
    const edSig = getSignature('ed') || signatures.find((s: any) => s.stage === 'approved');

    const renderSignatureImage = (sig: any, fallbackUser?: any) => {
        const sigPath = sig?.user?.signature || sig?.user?.employee?.signature || fallbackUser?.signature || fallbackUser?.employee?.signature;
        if (!sigPath) return null;
        return (
            <div className="flex justify-end mb-0.5">
                <img src={`/storage/${sigPath}`} alt="Signature" className="h-7 max-h-7 max-w-[120px] object-contain" />
            </div>
        );
    };

    const employeeName = lang === 'bn'
        ? (employee.name_bn || employee.name_en || '')
        : (employee.name_en || employee.name_bn || '');

    const designationName = lang === 'bn'
        ? (employee.designation?.name_bn || employee.designation?.name || employee.designation?.title || '')
        : (employee.designation?.name_en || employee.designation?.name || employee.designation?.title || '');

    const branchName = employee.branch?.name || evaluation.branch?.name || '';

    const resolveRegionName = () => {
        const br = employee.branch || evaluation.branch;
        return br?.regionalOffice?.name
            || br?.regional_office?.name
            || (typeof br?.regional_office === 'string' ? br.regional_office : '')
            || br?.regional_office_name
            || evaluation.regionalOffice?.name
            || evaluation.regional_office?.name
            || employee.regionalOffice?.name
            || employee.regional_office?.name
            || (br?.is_head_office ? (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office') : '');
    };

    const resolveZoneName = () => {
        const br = employee.branch || evaluation.branch;
        return br?.regionalOffice?.zone?.name
            || br?.regional_office?.zone?.name
            || (typeof br?.zone === 'string' ? br.zone : '')
            || br?.zone_name
            || evaluation.zone?.name
            || evaluation.regionalOffice?.zone?.name
            || employee.zone?.name
            || (br?.is_head_office ? (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office') : '');
    };

    const recommendation = evaluation.supervisor_recommendation || evaluation.recommendation_status;
    const totalLetters = sectionTotals.map((_, i) => BN_SECTION_LETTERS[i]).filter(Boolean).join('+');
    const anyScore = sectionTotals.some((sec) => sec.anyScored);
    const grade = evaluation.calculated_grade;

    const firstPageSections = sectionTotals.slice(0, copy.firstPageSections);
    const restSections = sectionTotals.slice(copy.firstPageSections);

    let itemNo = 0;

    const renderScoreBody = (sections: typeof sectionTotals, showGrandTotal: boolean) => (
        <>
            {sections.map((sec) => (
                <React.Fragment key={sec.section_key}>
                    <tr className="bg-gray-100 font-bold">
                        <td className="border border-black px-1.5 py-0.5" colSpan={4}>
                            {lang === 'bn' ? sec.section_name_bn : sec.section_name_en}
                        </td>
                    </tr>
                    {sec.items.map((it) => {
                        itemNo += 1;
                        const current = itemNo;
                        const entry = scoreMap[it.key];
                        const obtained = entry?.obtained_score;
                        const hasScore = obtained !== undefined && obtained !== null && String(obtained) !== '';
                        return (
                            <tr key={it.key}>
                                <td className="border border-black px-1 py-0.5 text-center font-mono w-8">
                                    {lang === 'bn' ? toBn(current) : current}
                                </td>
                                <td className="border border-black px-1.5 py-0.5">
                                    {stripItemNumber(lang === 'bn' ? it.name_bn : it.name_en)}
                                </td>
                                <td className="border border-black px-1 py-0.5 text-center font-mono w-16">
                                    {formatMark(it.max)}
                                </td>
                                <td className="border border-black px-1 py-0.5 text-center font-mono font-bold w-16">
                                    {hasScore ? formatMark(obtained) : ''}
                                </td>
                            </tr>
                        );
                    })}
                    <tr className="font-semibold bg-gray-50">
                        <td className="border border-black px-1 py-0.5 text-right font-bold" colSpan={2}>
                            {lang === 'bn' ? 'উপ-মোট' : 'Sub-total'}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                            {formatMark(sec.maxTotal)}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                            {sec.anyScored ? formatMark(sec.obtainedTotal) : ''}
                        </td>
                    </tr>
                </React.Fragment>
            ))}
            {showGrandTotal && (
                <tr className="bg-gray-100 font-bold">
                    <td className="border border-black px-1.5 py-1 text-right" colSpan={2}>
                        {lang === 'bn' ? `সর্বমোট (${totalLetters})` : 'Grand total'}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-mono">{lang === 'bn' ? '১০০' : '100'}</td>
                    <td className="border border-black px-1 py-1 text-center font-mono">
                        {anyScore ? formatMark(evaluation.total_score || 0) : ''}
                    </td>
                </tr>
            )}
        </>
    );

    const scoreHead = (
        <thead>
            <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center w-8">{lang === 'bn' ? 'ক্র.' : 'SL'}</th>
                <th className="border border-black p-1 text-left">{lang === 'bn' ? 'মূল্যায়ন সূচক' : 'Criteria'}</th>
                <th className="border border-black p-1 text-center w-16">{lang === 'bn' ? 'সর্বোচ্চ নম্বর' : 'Max'}</th>
                <th className="border border-black p-1 text-center w-16">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
            </tr>
        </thead>
    );

    const pageHeader = (
        <div className="flex justify-between items-start mb-1 border-b border-black pb-1 pt-0.5">
            <img
                src="/logo.png"
                alt="মৌসুমী"
                className="h-9 w-auto object-contain shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="text-center flex-1 px-2">
                <h1 className="text-lg font-black leading-snug">{lang === 'bn' ? 'মৌসুমী' : 'MOUSUMI'}</h1>
                <p className="text-[10px] mt-0.5">{lang === 'bn' ? 'উকিলপাড়া, নওগাঁ।' : 'Ukilpara, Naogaon.'}</p>
                <h2 className="text-[12px] font-bold mt-0.5">{lang === 'bn' ? copy.titleBn : copy.titleEn}</h2>
                <h3 className="text-[10px] font-bold">{lang === 'bn' ? copy.subtitleBn : copy.subtitleEn}</h3>
            </div>
            <div className="w-9 shrink-0" />
        </div>
    );

    const pageNumber = (page: number) => (
        <div className="text-right text-[9px] font-mono text-gray-600 mt-2">
            Page {page} of {copy.pages}
        </div>
    );

    const tick = (on: boolean) => (on ? '✓' : '');

    const ynCell = (value: any, expect: boolean) => {
        if (value === null || value === undefined || value === '') return '';
        const yes = value === true || value === 1 || value === '1';
        return tick(expect ? yes : !yes);
    };

    const summaryTable = (
        <div className="grid grid-cols-2 gap-2 mb-2">
            <table className="w-full border-collapse border border-black text-[10px] h-fit">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1 text-center" colSpan={3}>
                            {lang === 'bn' ? 'মোট নম্বর' : 'Total marks'}
                        </th>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                        <th className="border border-black p-1 text-left">{lang === 'bn' ? 'মূল্যায়ন সূচক' : 'Section'}</th>
                        <th className="border border-black p-1 text-center w-10">{lang === 'bn' ? 'নম্বর' : 'Max'}</th>
                        <th className="border border-black p-1 text-center w-12">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Got'}</th>
                    </tr>
                </thead>
                <tbody>
                    {sectionTotals.map((sec) => (
                        <tr key={sec.section_key}>
                            <td className="border border-black px-1 py-0.5">{lang === 'bn' ? shortSectionName(sec.section_name_bn) : sec.section_name_en}</td>
                            <td className="border border-black px-1 py-0.5 text-center font-mono">{formatMark(sec.maxTotal)}</td>
                            <td className="border border-black px-1 py-0.5 text-center font-mono font-bold">
                                {sec.anyScored ? formatMark(sec.obtainedTotal) : ''}
                            </td>
                        </tr>
                    ))}
                    <tr className="font-bold bg-gray-100">
                        <td className="border border-black px-1 py-0.5 text-right">{lang === 'bn' ? 'সর্বমোট' : 'Total'}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono">{lang === 'bn' ? '১০০' : '100'}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono">
                            {anyScore ? formatMark(evaluation.total_score || 0) : ''}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full border-collapse border border-black text-[10px] h-fit">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1 text-center" colSpan={2}>
                            {lang === 'bn' ? 'প্রাপ্ত নম্বর অনুযায়ী অবস্থান' : 'Position by obtained marks'}
                        </th>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                        <th className="border border-black p-1 text-center w-16">{lang === 'bn' ? 'স্কোর' : 'Score'}</th>
                        <th className="border border-black p-1 text-left">{lang === 'bn' ? 'ফলাফল' : 'Result'}</th>
                    </tr>
                </thead>
                <tbody>
                    {[
                        { id: 'excellent', score: '৮৫-১০০', en: '85-100', resultBn: 'Excellent (বেতন বৃদ্ধির জন্য অত্যন্ত উপযুক্ত)', resultEn: 'Excellent (highly suitable for increment)' },
                        { id: 'very_good', score: '৬৫-৮৪', en: '65-84', resultBn: 'Very Good (বেতন বৃদ্ধির জন্য উপযুক্ত)', resultEn: 'Very Good (suitable for increment)' },
                        { id: 'good', score: '৫০-৬৪', en: '50-64', resultBn: 'Good (বেতন বৃদ্ধির জন্য বিবেচনাযোগ্য)', resultEn: 'Good (may be considered for increment)' },
                        { id: 'not_satisfactory', score: '৫০-এর নিচে', en: 'Below 50', resultBn: 'Not Satisfactory (বেতন বৃদ্ধির জন্য অনুপযুক্ত)', resultEn: 'Not Satisfactory (not suitable for increment)' },
                    ].map((row) => (
                        <tr key={row.id} className={grade === row.id ? 'bg-emerald-50 font-bold' : ''}>
                            <td className="border border-black px-1 py-1 text-center align-top">{lang === 'bn' ? row.score : row.en}</td>
                            <td className="border border-black px-1 py-1 align-top">{lang === 'bn' ? row.resultBn : row.resultEn}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const personalFile = (
        <div className="mb-2">
            <p className="font-bold text-[11px] mb-1">
                {lang === 'bn'
                    ? 'ব্যক্তিগত ফাইল পর্যবেক্ষণ (মানবসম্পদ বিভাগ কর্তৃক পূরণ করা হবে): নিচের যেকোনো একটি গত ০৩ মাসের মধ্যে হয়েছে কি না?'
                    : 'Personal file review (to be filled by HR): has any of the following occurred in the last 03 months?'}
            </p>
            <table className="w-full border-collapse border border-black text-[10.5px]">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1 text-left">{lang === 'bn' ? 'বিষয়' : 'Item'}</th>
                        <th className="border border-black p-1 text-center w-12">{lang === 'bn' ? 'হ্যাঁ' : 'Yes'}</th>
                        <th className="border border-black p-1 text-center w-12">{lang === 'bn' ? 'না' : 'No'}</th>
                    </tr>
                </thead>
                <tbody>
                    {HR_ITEMS.map((item) => (
                        <tr key={item.key}>
                            <td className="border border-black px-1.5 py-0.5">{lang === 'bn' ? item.labelBn : item.labelEn}</td>
                            <td className="border border-black text-center font-bold">{ynCell(evaluation[item.key], true)}</td>
                            <td className="border border-black text-center font-bold">{ynCell(evaluation[item.key], false)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const signLine = (sig: any, fallbackUser?: any) => (
        <div className="flex justify-end items-end mt-1">
            <div className="text-right text-[10px]">
                {renderSignatureImage(sig, fallbackUser)}
                {(sig?.user?.name || fallbackUser?.name) && (
                    <div className="font-semibold">{sig?.user?.name || fallbackUser?.name}</div>
                )}
                <div className="font-mono">{formatDate(sig?.signed_at, lang)}</div>
                <div className="border-t border-black w-36 mt-0.5 pt-0.5 text-center font-bold">
                    {lang === 'bn' ? 'স্বাক্ষর, তারিখ ও সিল' : 'Signature, date & seal'}
                </div>
            </div>
        </div>
    );

    const commentBox = (title: string, body?: string | null, sig?: any, fallbackUser?: any) => (
        <div className="border border-black p-1.5 mb-1.5 break-inside-avoid">
            <div className="font-bold text-[11px]">{title}</div>
            {body ? <p className="mt-0.5 whitespace-pre-wrap">{body}</p> : <div className="min-h-[16px]" />}
            {signLine(sig, fallbackUser)}
        </div>
    );

    const supervisorBlock = (
        <div className="border border-black p-1.5 mb-1.5 break-inside-avoid">
            <div className="font-bold text-[11px] mb-1">
                {lang === 'bn' ? '১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ:' : '1st supervisor remarks & recommendation:'}
            </div>
            <div className="space-y-0.5 text-[10.5px]">
                <div><span className="font-semibold">➢ {lang === 'bn' ? 'উক্ত কর্মচারীর প্রধান শক্তি/দক্ষতা (Strength):' : 'Strength:'}</span> {evaluation.strengths || ''}</div>
                <div><span className="font-semibold">➢ {lang === 'bn' ? 'উক্ত কর্মচারীর দুর্বলতা/উন্নয়নের ক্ষেত্রসমূহ (Weakness/Area to Develop):' : 'Weakness / area to develop:'}</span> {evaluation.weaknesses || ''}</div>
                <div><span className="font-semibold">➢ {lang === 'bn' ? 'উক্ত কর্মচারীর প্রশিক্ষণের প্রয়োজন কি না:' : 'Training needed:'}</span> {evaluation.training_need || ''}</div>
                <div><span className="font-semibold">➢ {lang === 'bn' ? 'অন্যান্য মন্তব্য (যদি থাকে):' : 'Other remarks:'}</span> {evaluation.other_remarks || evaluation.initiator_remarks || ''}</div>
            </div>
            <div className="mt-1 text-[10.5px]">
                <div className="font-semibold mb-0.5">{lang === 'bn' ? 'সুপারিশ (টিক চিহ্ন দিতে হবে):' : 'Recommendation (tick one):'}</div>
                <div className="flex items-start gap-1.5">
                    <span className="font-mono">{recommendation === 'recommend_increment' ? '☑' : '☐'}</span>
                    <span>{lang === 'bn' ? 'বেতন বৃদ্ধির জন্য সুপারিশ করা হলো।' : 'Recommended for salary increment.'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                    <span className="font-mono">{recommendation === 'defer_increment' ? '☑' : '☐'}</span>
                    <span>{lang === 'bn' ? 'বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন করা হোক।' : 'Defer increment and re-evaluate.'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                    <span className="font-mono">{recommendation === 'not_suitable' ? '☑' : '☐'}</span>
                    <span>{lang === 'bn' ? 'বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে।' : 'Not suitable; discharge may be considered.'}</span>
                </div>
            </div>
            {signLine(initiatorSig, evaluation.initiator || auth?.user)}
        </div>
    );

    const closingBlocks = (
        <>
            {personalFile}
            {supervisorBlock}
            {commentBox(
                lang === 'bn' ? 'আঞ্চলিক ব্যবস্থাপকের মন্তব্য ও সুপারিশ:' : 'Regional Manager remarks & recommendation:',
                rmSig?.comments,
                rmSig,
            )}
            {commentBox(
                lang === 'bn' ? 'জোনাল ম্যানেজারের মন্তব্য ও সুপারিশ:' : 'Zonal Manager remarks & recommendation:',
                zmSig?.comments,
                zmSig,
            )}
            {commentBox(lang === 'bn' ? copy.deptBn : copy.deptEn, directorSig?.comments, directorSig)}
            {commentBox(
                lang === 'bn' ? 'মানবসম্পদ বিভাগের মন্তব্য ও সুপারিশ:' : 'Human Resources remarks & recommendation:',
                hrSig?.comments,
                hrSig,
            )}
            {commentBox(
                lang === 'bn' ? 'নির্বাহী পরিচালক কর্তৃক মন্তব্য ও অনুমোদন:' : 'Executive Director remarks & approval:',
                edSig?.comments,
                edSig,
            )}
        </>
    );

    const achievementTitle = lang === 'bn'
        ? (formType === 'accountant'
            ? 'মূল্যায়নকালীন অর্জন (সর্বশেষ মাস ক্লোজিং অনুযায়ী):'
            : 'মূল্যায়নকালীন অর্জন (যোগদান এবং সর্বশেষ মাস ক্লোজিং অনুযায়ী):')
        : (formType === 'accountant'
            ? 'Achievements during evaluation (latest month closing):'
            : 'Achievements during evaluation (at joining and latest closing):');

    return (
        <div className="bg-white text-black font-sans mx-auto print:m-0">
            <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } .probation-fit-page { height: 270mm !important; max-height: 270mm !important; overflow: hidden !important; margin: 0 !important; break-inside: avoid; page-break-inside: avoid; } }`}</style>
            <FitPage>
                {pageHeader}

                <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                    <tbody>
                        <tr>
                            <td className="border border-black px-1.5 py-1 w-[40%]"><b>{lang === 'bn' ? 'নাম:' : 'Name:'}</b> {employeeName}</td>
                            <td className="border border-black px-1.5 py-1 w-[40%]"><b>{lang === 'bn' ? 'পদবী:' : 'Designation:'}</b> {designationName}</td>
                            <td className="border border-black px-1.5 py-1"><b>{lang === 'bn' ? 'পিন নং:' : 'PIN:'}</b> {formatStat(employee.pin)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-1.5 py-1"><b>{lang === 'bn' ? 'শাখার নাম:' : 'Branch:'}</b> {branchName}</td>
                            <td className="border border-black px-1.5 py-1"><b>{lang === 'bn' ? 'অঞ্চলের নাম:' : 'Region:'}</b> {resolveRegionName()}</td>
                            <td className="border border-black px-1.5 py-1"><b>{lang === 'bn' ? 'জোন:' : 'Zone:'}</b> {resolveZoneName()}</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-1.5 py-1">
                                <b>{lang === 'bn' ? 'সংস্থায় যোগদানের তারিখ:' : 'Date of joining:'}</b> {formatDate(evaluation.joining_date, lang)}
                            </td>
                            <td className="border border-black px-1.5 py-1" colSpan={2}>
                                <b>{lang === 'bn' ? 'শিক্ষানবিশকাল ০৩ মাস পূর্তির তারিখ:' : 'Probation 03-month completion date:'}</b> {formatDate(evaluation.probation_3m_completion_date, lang)}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black px-1.5 py-1">
                                <b>{lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (যোগদানের সময়):' : 'Education (at joining):'}</b> {evaluation.education_at_joining || employee.educational_qualification || ''}
                            </td>
                            <td className="border border-black px-1.5 py-1" colSpan={2}>
                                <b>{lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (বর্তমান):' : 'Education (current):'}</b> {evaluation.education_current || ''}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="flex items-end justify-between gap-2 mb-1 font-bold text-[11px]">
                    <span>{achievementTitle}</span>
                    <span className="shrink-0">
                        {lang === 'bn' ? 'ক্লোজিং মাসের নাম:' : 'Closing month:'}{' '}
                        <span className="font-semibold underline">{formatClosingMonth(evaluation.closing_month, lang)}</span>
                    </span>
                </div>

                {formType === 'accountant' ? (
                    <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                        <tbody>
                            {[
                                [lang === 'bn' ? 'শাখার সদস্য (জন):' : 'Branch members:', evaluation.closing_members_count, lang === 'bn' ? 'শাখার ঋণী (জন):' : 'Branch borrowers:', evaluation.closing_borrowers_count],
                                [lang === 'bn' ? 'শাখার ঋণ স্থিতি (টাকা):' : 'Branch loan balance:', evaluation.closing_loan_balance, lang === 'bn' ? 'শাখার সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):' : 'Branch savings balance:', evaluation.closing_savings_balance],
                                [lang === 'bn' ? 'শাখার বকেয়া (জন):' : 'Branch overdue (persons):', evaluation.closing_overdue_borrowers, lang === 'bn' ? 'শাখার বকেয়া (টাকা):' : 'Branch overdue (Tk):', evaluation.closing_overdue_amount],
                                [lang === 'bn' ? 'শাখার OTR (%):' : 'Branch OTR (%):', evaluation.closing_otr_pct, lang === 'bn' ? 'শাখার PAR (%):' : 'Branch PAR (%):', evaluation.closing_par_pct],
                            ].map((row, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black px-1.5 py-0.5 w-[30%]">{row[0]}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-center font-mono w-[20%]">
                                        {formatStat(row[1], idx === 3 && row[1] !== '' && row[1] !== null && row[1] !== undefined ? '%' : '')}
                                    </td>
                                    <td className="border border-black px-1.5 py-0.5 w-[30%]">{row[2]}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-center font-mono w-[20%]">
                                        {formatStat(row[3], idx === 3 && row[3] !== '' && row[3] !== null && row[3] !== undefined ? '%' : '')}
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td className="border border-black px-1.5 py-0.5" colSpan={2}>
                                    {lang === 'bn' ? 'শাখায় ক্যাশিয়ার আছে কি না?' : 'Does the branch have a cashier?'}
                                </td>
                                <td className="border border-black px-1.5 py-0.5 text-center font-bold" colSpan={2}>
                                    {evaluation.has_cashier === true || evaluation.has_cashier === 1
                                        ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes')
                                        : evaluation.has_cashier === false || evaluation.has_cashier === 0
                                            ? (lang === 'bn' ? 'না' : 'No')
                                            : ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full border-collapse border border-black mb-2 text-[11px] text-center">
                        <thead>
                            <tr className="bg-gray-100 font-bold">
                                <th className="border border-black p-1 text-left">{lang === 'bn' ? 'সূচক' : 'Indicator'}</th>
                                <th className="border border-black p-1 w-[18%]">{lang === 'bn' ? 'যোগদানের সময়' : 'At joining'}</th>
                                <th className="border border-black p-1 w-[18%]">{lang === 'bn' ? 'ক্লোজিং মাসে' : 'Closing month'}</th>
                                <th className="border border-black p-1 w-[16%]">{lang === 'bn' ? 'পার্থক্য' : 'Difference'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                [lang === 'bn' ? 'সদস্য (জন):' : 'Members:', evaluation.joining_members_count, evaluation.closing_members_count, evaluation.diff_members_count, false],
                                [lang === 'bn' ? 'ঋণী (জন):' : 'Borrowers:', evaluation.joining_borrowers_count, evaluation.closing_borrowers_count, evaluation.diff_borrowers_count, false],
                                [lang === 'bn' ? 'ঋণ স্থিতি (টাকা):' : 'Loan balance (Tk):', evaluation.joining_loan_balance, evaluation.closing_loan_balance, evaluation.diff_loan_balance, false],
                                [lang === 'bn' ? 'সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):' : 'Savings balance:', evaluation.joining_savings_balance, evaluation.closing_savings_balance, evaluation.diff_savings_balance, false],
                                [lang === 'bn' ? 'বকেয়া (জন):' : 'Overdue (persons):', evaluation.joining_overdue_borrowers, evaluation.closing_overdue_borrowers, evaluation.diff_overdue_borrowers, false],
                                [lang === 'bn' ? 'বকেয়া (টাকা):' : 'Overdue (Tk):', evaluation.joining_overdue_amount, evaluation.closing_overdue_amount, evaluation.diff_overdue_amount, false],
                                [lang === 'bn' ? 'OTR (%):' : 'OTR (%):', evaluation.joining_otr_pct, evaluation.closing_otr_pct, evaluation.diff_otr_pct, true],
                                [lang === 'bn' ? 'PAR (%):' : 'PAR (%):', evaluation.joining_par_pct, evaluation.closing_par_pct, evaluation.diff_par_pct, true],
                            ].map((row) => (
                                <tr key={String(row[0])}>
                                    <td className="border border-black px-1.5 py-0.5 text-left">{row[0]}</td>
                                    <td className="border border-black px-1 py-0.5 font-mono">{formatStat(row[1], row[5] && row[1] !== '' && row[1] != null ? '%' : '')}</td>
                                    <td className="border border-black px-1 py-0.5 font-mono">{formatStat(row[2], row[5] && row[2] !== '' && row[2] != null ? '%' : '')}</td>
                                    <td className="border border-black px-1 py-0.5 font-mono">{getDiffDisplay(row[1], row[2], row[3], Boolean(row[5]))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div className="font-bold text-[11px] mb-1">
                    {lang === 'bn'
                        ? '১ম তত্ত্বাবধায়ক কর্তৃক বিগত ০৩ মাসের সার্বিক মূল্যায়নের প্রেক্ষিতে রেটিং করতে হবে:'
                        : 'The 1st supervisor shall rate the last 03 months of overall performance:'}
                </div>
                <table className="w-full border-collapse border border-black mb-2">
                    {scoreHead}
                    <tbody>{renderScoreBody(firstPageSections, restSections.length === 0)}</tbody>
                </table>
                {pageNumber(1)}
            </FitPage>

            {restSections.length > 0 && (
                <FitPage>
                    <table className="w-full border-collapse border border-black mb-2">
                        {scoreHead}
                        <tbody>{renderScoreBody(restSections, true)}</tbody>
                    </table>
                    {summaryTable}
                    {pageNumber(2)}
                </FitPage>
            )}

            <FitPage breakAfter={false}>
                {restSections.length === 0 && summaryTable}
                {closingBlocks}
                {pageNumber(restSections.length === 0 ? 2 : 3)}
            </FitPage>
        </div>
    );
}
