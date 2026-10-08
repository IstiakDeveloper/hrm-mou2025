import { useState, useMemo, useEffect } from 'react';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Award, 
    ArrowLeft, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    Eye, 
    Edit3, 
    Save, 
    AlertTriangle 
} from 'lucide-react';
import FormAIncrement from './components/FormAIncrement';
import FormBIncrement from './components/FormBIncrement';
import FormCIncrement from './components/FormCIncrement';
import MonthPickerSelect from '@/components/MonthPickerSelect';
import ProbationIncrementOfficialFormDocument from './components/ProbationIncrementOfficialFormDocument';
import { 
    calculateGrade,
    getFormStructure,
    toBn
} from './probation-increment-config';

interface EditProps {
    evaluation: any;
    isReviewerEdit?: boolean;
    returnComment?: string | null;
    userHasSignature?: boolean;
    templates?: any[];
}

export default function ProbationIncrementEvaluationEdit({ 
    evaluation,
    isReviewerEdit = false,
    returnComment = null,
    templates = [],
}: EditProps) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('prob_inc_eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    const toggleLang = (newLang: 'bn' | 'en') => {
        setLang(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('prob_inc_eval_lang', newLang);
        }
    };

    const formatForInput = (dStr?: string | null) => {
        if (!dStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) {
            const [d, m, y] = dStr.split('/');
            return `${y}-${m}-${d}`;
        }
        return dStr;
    };

    const { data, setData, put, processing, errors } = useForm({
        joining_date: formatForInput(evaluation.joining_date) || '',
        probation_3m_completion_date: formatForInput(evaluation.probation_3m_completion_date) || '',
        education_at_joining: evaluation.education_at_joining || evaluation.employee?.educational_qualification || '',
        education_current: evaluation.education_current || evaluation.employee?.educational_qualification || '',
        closing_month: evaluation.closing_month || '',
        
        // Comparative Stats
        joining_members_count: evaluation.joining_members_count ?? '',
        closing_members_count: evaluation.closing_members_count ?? '',
        joining_borrowers_count: evaluation.joining_borrowers_count ?? '',
        closing_borrowers_count: evaluation.closing_borrowers_count ?? '',
        joining_loan_balance: evaluation.joining_loan_balance ?? '',
        closing_loan_balance: evaluation.closing_loan_balance ?? '',
        joining_savings_balance: evaluation.joining_savings_balance ?? '',
        closing_savings_balance: evaluation.closing_savings_balance ?? '',
        joining_overdue_borrowers: evaluation.joining_overdue_borrowers ?? '',
        closing_overdue_borrowers: evaluation.closing_overdue_borrowers ?? '',
        joining_overdue_amount: evaluation.joining_overdue_amount ?? '',
        closing_overdue_amount: evaluation.closing_overdue_amount ?? '',
        joining_otr_pct: evaluation.joining_otr_pct ?? '',
        closing_otr_pct: evaluation.closing_otr_pct ?? '',
        joining_par_pct: evaluation.joining_par_pct ?? '',
        closing_par_pct: evaluation.closing_par_pct ?? '',
        has_cashier: Boolean(evaluation.has_cashier),

        // Score
        total_score: evaluation.total_score || 0,
        calculated_grade: evaluation.calculated_grade || '',
        scores: (evaluation.scores || []).map((s: any) => ({
            criteria_key: s.criteria_key,
            section_key: s.section_key,
            section_name: s.section_name,
            criteria_name: s.criteria_name,
            max_score: s.max_score,
            obtained_score: s.obtained_score,
            touched: true,
        })),

        // Recommendation
        supervisor_recommendation: evaluation.supervisor_recommendation || 'recommend_increment',
        initiator_remarks: evaluation.initiator_remarks || evaluation.remarks || '',
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const formType = evaluation.form_type || 'officer_abm';
    const dynamicStructure = useMemo(() => getFormStructure(formType), [formType]);

    // Update total score in real-time
    useEffect(() => {
        const total = (data.scores || []).reduce((acc: number, curr: any) => {
            const val = parseFloat(curr.obtained_score);
            return isNaN(val) ? acc : acc + val;
        }, 0);

        const roundedTotal = Number(total.toFixed(2));
        const grade = calculateGrade(roundedTotal);

        setData(d => ({
            ...d,
            total_score: roundedTotal,
            calculated_grade: grade.grade,
        }));
    }, [data.scores]);

    const calcDiff = (joiningVal: any, closingVal: any) => {
        if ((joiningVal === '' || joiningVal === null) && (closingVal === '' || closingVal === null)) {
            return { text: '-', color: 'text-slate-400' };
        }
        const j = parseFloat(joiningVal) || 0;
        const c = parseFloat(closingVal) || 0;
        const diff = c - j;
        const formatted = Number.isInteger(diff) ? String(diff) : diff.toFixed(2);
        if (diff > 0) {
            return { text: `+${formatted}`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
        } else if (diff < 0) {
            return { text: `${formatted}`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
        }
        return { text: '০', color: 'text-slate-600 bg-slate-50 border-slate-200' };
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!data.closing_month) {
            errs.closing_month = lang === 'bn' ? 'ক্লোজিং মাস নির্বাচন আবশ্যক।' : 'Closing month is required.';
        }

        const scoreExceeds = (data.scores || []).some((s: any) => Number(s.obtained_score) > Number(s.max_score));
        if (scoreExceeds) {
            errs.scores = lang === 'bn' ? 'কোনো মানদণ্ডের নম্বর তার সর্বোচ্চ নম্বরের চেয়ে বেশি হতে পারবে না।' : 'A criterion score exceeds maximum limit.';
        }

        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            setViewMode('edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        put(`/probation-increment-evaluations/${evaluation.id}`, {
            onError: () => {
                setViewMode('edit');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    // Live preview object
    const previewEvaluation = useMemo(() => {
        const diffNum = (c: any, j: any) => {
            const hasC = c !== '' && c !== null && c !== undefined;
            const hasJ = j !== '' && j !== null && j !== undefined;
            if (!hasC && !hasJ) return null;
            return (parseFloat(c || '0') - parseFloat(j || '0'));
        };

        return {
            ...evaluation,
            form_type: formType,
            joining_date: data.joining_date,
            probation_3m_completion_date: data.probation_3m_completion_date,
            education_at_joining: data.education_at_joining,
            education_current: data.education_current,
            closing_month: data.closing_month,

            joining_members_count: data.joining_members_count,
            closing_members_count: data.closing_members_count,
            diff_members_count: diffNum(data.closing_members_count, data.joining_members_count),

            joining_borrowers_count: data.joining_borrowers_count,
            closing_borrowers_count: data.closing_borrowers_count,
            diff_borrowers_count: diffNum(data.closing_borrowers_count, data.joining_borrowers_count),

            joining_loan_balance: data.joining_loan_balance,
            closing_loan_balance: data.closing_loan_balance,
            diff_loan_balance: diffNum(data.closing_loan_balance, data.joining_loan_balance),

            joining_savings_balance: data.joining_savings_balance,
            closing_savings_balance: data.closing_savings_balance,
            diff_savings_balance: diffNum(data.closing_savings_balance, data.joining_savings_balance),

            joining_overdue_borrowers: data.joining_overdue_borrowers,
            closing_overdue_borrowers: data.closing_overdue_borrowers,
            diff_overdue_borrowers: diffNum(data.closing_overdue_borrowers, data.joining_overdue_borrowers),

            joining_overdue_amount: data.joining_overdue_amount,
            closing_overdue_amount: data.closing_overdue_amount,
            diff_overdue_amount: diffNum(data.closing_overdue_amount, data.joining_overdue_amount),

            joining_otr_pct: data.joining_otr_pct,
            closing_otr_pct: data.closing_otr_pct,
            diff_otr_pct: diffNum(data.closing_otr_pct, data.joining_otr_pct),

            joining_par_pct: data.joining_par_pct,
            closing_par_pct: data.closing_par_pct,
            diff_par_pct: diffNum(data.closing_par_pct, data.joining_par_pct),

            has_cashier: data.has_cashier,

            total_score: data.total_score,
            calculated_grade: data.calculated_grade,
            supervisor_recommendation: data.supervisor_recommendation,
            initiator_remarks: data.initiator_remarks,
            scores: data.scores,
        };
    }, [evaluation, data, formType]);

    const employeeName = lang === 'bn' 
        ? (evaluation.employee?.name_bn || evaluation.employee?.name_en) 
        : (evaluation.employee?.name_en || evaluation.employee?.name_bn);

    return (
        <Layout>
            <Head title={`${employeeName} - ${lang === 'bn' ? 'মূল্যায়ন ফরম সম্পাদনা' : 'Edit Increment Evaluation'}`} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/probation-increment-evaluations/${evaluation.id}`}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="h-3.5 w-3.5" />
                                    {lang === 'bn' ? 'শিক্ষানবিসকাল ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'}
                                </span>
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                                    {lang === 'bn' ? 'সম্পাদনা মোড' : 'Edit Mode'}
                                </Badge>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {employeeName}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                PIN: <span className="font-semibold text-slate-700">{evaluation.employee?.pin}</span> • {evaluation.employee?.designation?.name || '-'} • {evaluation.employee?.branch?.name || '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                        {/* Edit vs Preview Toggle */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'edit'
                                        ? 'bg-white text-emerald-800 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'ফরম ইনপুট' : 'Form Input'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'preview'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
                            </button>
                        </div>

                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => toggleLang('bn')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'bn' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleLang('en')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'en' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {/* Return reason banner if available */}
                {returnComment && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-900">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold">{lang === 'bn' ? 'সংশোধনের জন্য ফেরত পাঠানোর কারণ:' : 'Reason for Revision:'}</h4>
                            <p className="text-xs italic mt-0.5 font-medium">"{returnComment}"</p>
                        </div>
                    </div>
                )}

                {/* VIEW MODE: LIVE PREVIEW */}
                {viewMode === 'preview' ? (
                    <div className="space-y-4">
                        <div className="bg-slate-100/70 p-2 sm:p-6 rounded-2xl border border-slate-200">
                            <ProbationIncrementOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                        </div>
                    </div>
                ) : (
                    /* VIEW MODE: EDIT FORM */
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Dates & Education */}
                        <Card className="border-slate-200 shadow-xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '১. সাধারণ তথ্যাবলী ও শিক্ষাগত যোগ্যতা' : '1. Profile & Educational Background'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">যোগদানের তারিখ:</Label>
                                    <Input 
                                        type="date"
                                        value={data.joining_date}
                                        onChange={e => setData('joining_date', e.target.value)}
                                        className="h-9 text-xs bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">০৩ মাস পূর্তির তারিখ:</Label>
                                    <Input 
                                        type="date"
                                        value={data.probation_3m_completion_date}
                                        onChange={e => setData('probation_3m_completion_date', e.target.value)}
                                        className="h-9 text-xs bg-white font-semibold text-emerald-900"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">শিক্ষাগত যোগ্যতা (যোগদানকালীন):</Label>
                                    <Input 
                                        type="text"
                                        value={data.education_at_joining}
                                        onChange={e => setData('education_at_joining', e.target.value)}
                                        className="h-9 text-xs bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">শিক্ষাগত যোগ্যতা (বর্তমান):</Label>
                                    <Input 
                                        type="text"
                                        value={data.education_current}
                                        onChange={e => setData('education_current', e.target.value)}
                                        className="h-9 text-xs bg-white"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Statistics */}
                        <Card className="border-slate-200 shadow-xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' 
                                            ? (formType === 'accountant' 
                                                ? '৩. মূল্যায়ণকালীন অর্জন (সর্বশেষ মাস ক্লোজিং অনুযায়ী):' 
                                                : '৩. মূল্যায়ণকালীন অর্জন (যোগদান এবং সর্বশেষ মাস ক্লোজিং অনুযায়ী):')
                                            : '3. Performance Metrics'}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs font-semibold text-slate-700 shrink-0">
                                        {lang === 'bn' ? 'ক্লোজিং মাসের নাম:' : 'Closing Month:'} <span className="text-red-500">*</span>
                                    </Label>
                                    <MonthPickerSelect 
                                        value={data.closing_month}
                                        onChange={val => setData('closing_month', val)}
                                        lang={lang}
                                        className="h-8 min-w-[150px]"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                {formType === 'accountant' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার সদস্য (জন)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_members_count}
                                                onChange={e => setData('closing_members_count', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার ঋণী (জন)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_borrowers_count}
                                                onChange={e => setData('closing_borrowers_count', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার ঋণ স্থিতি (টাকা)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_loan_balance}
                                                onChange={e => setData('closing_loan_balance', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_savings_balance}
                                                onChange={e => setData('closing_savings_balance', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার বকেয়া (জন)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_overdue_borrowers}
                                                onChange={e => setData('closing_overdue_borrowers', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার বকেয়া (টাকা)</Label>
                                            <Input 
                                                type="number"
                                                value={data.closing_overdue_amount}
                                                onChange={e => setData('closing_overdue_amount', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার OTR (%)</Label>
                                            <Input 
                                                type="number"
                                                step="any"
                                                value={data.closing_otr_pct}
                                                onChange={e => setData('closing_otr_pct', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">শাখার PAR (%)</Label>
                                            <Input 
                                                type="number"
                                                step="any"
                                                value={data.closing_par_pct}
                                                onChange={e => setData('closing_par_pct', e.target.value)}
                                                className="h-9 text-xs bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                            <Label className="text-xs font-bold text-slate-800">শাখায় ক্যাশিয়ার আছে কি না?</Label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="has_cashier" 
                                                        checked={data.has_cashier === true}
                                                        onChange={() => setData('has_cashier', true)}
                                                    />
                                                    <span>হ্যাঁ (Yes)</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="has_cashier" 
                                                        checked={data.has_cashier === false}
                                                        onChange={() => setData('has_cashier', false)}
                                                    />
                                                    <span>না (No)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                                    <th className="p-2.5 text-left w-1/3">সূচক</th>
                                                    <th className="p-2.5 text-center w-1/4">যোগদানের সময়</th>
                                                    <th className="p-2.5 text-center w-1/4">ক্লোজিং মাসে</th>
                                                    <th className="p-2.5 text-center w-1/6">পার্থক্য</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="p-2 font-medium">সদস্য (জন):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_members_count}
                                                            onChange={e => setData('joining_members_count', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_members_count}
                                                            onChange={e => setData('closing_members_count', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_members_count, data.closing_members_count).color}`}>
                                                            {calcDiff(data.joining_members_count, data.closing_members_count).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">ঋণী (জন):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_borrowers_count}
                                                            onChange={e => setData('joining_borrowers_count', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_borrowers_count}
                                                            onChange={e => setData('closing_borrowers_count', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_borrowers_count, data.closing_borrowers_count).color}`}>
                                                            {calcDiff(data.joining_borrowers_count, data.closing_borrowers_count).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">ঋণ স্থিতি (টাকা):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_loan_balance}
                                                            onChange={e => setData('joining_loan_balance', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_loan_balance}
                                                            onChange={e => setData('closing_loan_balance', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_loan_balance, data.closing_loan_balance).color}`}>
                                                            {calcDiff(data.joining_loan_balance, data.closing_loan_balance).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_savings_balance}
                                                            onChange={e => setData('joining_savings_balance', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_savings_balance}
                                                            onChange={e => setData('closing_savings_balance', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_savings_balance, data.closing_savings_balance).color}`}>
                                                            {calcDiff(data.joining_savings_balance, data.closing_savings_balance).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">বকেয়া (জন):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_overdue_borrowers}
                                                            onChange={e => setData('joining_overdue_borrowers', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_overdue_borrowers}
                                                            onChange={e => setData('closing_overdue_borrowers', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_overdue_borrowers, data.closing_overdue_borrowers).color}`}>
                                                            {calcDiff(data.joining_overdue_borrowers, data.closing_overdue_borrowers).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">বকেয়া (টাকা):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.joining_overdue_amount}
                                                            onChange={e => setData('joining_overdue_amount', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            value={data.closing_overdue_amount}
                                                            onChange={e => setData('closing_overdue_amount', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_overdue_amount, data.closing_overdue_amount).color}`}>
                                                            {calcDiff(data.joining_overdue_amount, data.closing_overdue_amount).text}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">OTR (%):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            step="any"
                                                            value={data.joining_otr_pct}
                                                            onChange={e => setData('joining_otr_pct', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            step="any"
                                                            value={data.closing_otr_pct}
                                                            onChange={e => setData('closing_otr_pct', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_otr_pct, data.closing_otr_pct).color}`}>
                                                            {calcDiff(data.joining_otr_pct, data.closing_otr_pct).text}%
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-medium">PAR (%):</td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            step="any"
                                                            value={data.joining_par_pct}
                                                            onChange={e => setData('joining_par_pct', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number"
                                                            step="any"
                                                            value={data.closing_par_pct}
                                                            onChange={e => setData('closing_par_pct', e.target.value)}
                                                            className="h-8 text-xs text-center bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${calcDiff(data.joining_par_pct, data.closing_par_pct).color}`}>
                                                            {calcDiff(data.joining_par_pct, data.closing_par_pct).text}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Score Banner */}
                        <div className="bg-emerald-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                            <div>
                                <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold block">
                                    মোট মূল্যায়িত নম্বর
                                </span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                                        {lang === 'bn' ? toBn(data.total_score) : data.total_score}
                                    </span>
                                    <span className="text-emerald-300 text-sm font-semibold">/ ১০০</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400 text-xs px-3 py-1 font-bold">
                                    {calculateGrade(data.total_score).labelBn}
                                </Badge>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setViewMode('preview')}
                                    className="bg-white/10 hover:bg-white/20 text-white border-emerald-400 text-xs h-9"
                                >
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    <span>প্রিভিউ দেখুন</span>
                                </Button>
                            </div>
                        </div>

                        {/* Rubrics Scoring */}
                        <Card className="border-slate-200 shadow-xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '৩. মূল্যায়নের ক্ষেত্র ও নির্দেশকসমূহ নম্বর প্রদান' : '3. Evaluation Rubrics & Scoring'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                {formType === 'accountant' ? (
                                    <FormBIncrement 
                                        scores={data.scores} 
                                        setScores={(sc: any) => setData('scores', sc)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                ) : formType === 'bm_and_above' ? (
                                    <FormCIncrement 
                                        scores={data.scores} 
                                        setScores={(sc: any) => setData('scores', sc)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                ) : (
                                    <FormAIncrement 
                                        scores={data.scores} 
                                        setScores={(sc: any) => setData('scores', sc)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Recommendation */}
                        <Card className="border-slate-200 shadow-xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                                    {lang === 'bn' 
                                        ? '৪. বিগত ০৩ মাসের সার্বিক মূল্যায়নের প্রেক্ষিতে সুপারভাইজারের সুপারিশ' 
                                        : "4. Supervisor's Recommendation (Based on last 03 months)"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                                        data.supervisor_recommendation === 'recommend_increment'
                                            ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="recommend_increment"
                                            checked={data.supervisor_recommendation === 'recommend_increment'}
                                            onChange={() => setData('supervisor_recommendation', 'recommend_increment')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                                                বেতন বৃদ্ধির জন্য সুপারিশ করা হলো
                                            </span>
                                            <span className="text-[11px] text-slate-500">Recommend for Increment</span>
                                        </div>
                                    </label>

                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                                        data.supervisor_recommendation === 'defer_increment'
                                            ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="defer_increment"
                                            checked={data.supervisor_recommendation === 'defer_increment'}
                                            onChange={() => setData('supervisor_recommendation', 'defer_increment')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                                                বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন করা হোক
                                            </span>
                                            <span className="text-[11px] text-slate-500">Defer Increment & Re-evaluate</span>
                                        </div>
                                    </label>

                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                                        data.supervisor_recommendation === 'not_suitable'
                                            ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="not_suitable"
                                            checked={data.supervisor_recommendation === 'not_suitable'}
                                            onChange={() => setData('supervisor_recommendation', 'not_suitable')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                                                বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে
                                            </span>
                                            <span className="text-[11px] text-slate-500">Not Suitable / Discharge</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        সুপারভাইজার / শাখা ব্যবস্থাপকের সার্বিক মন্তব্য ও পর্যবেক্ষণ:
                                    </Label>
                                    <Textarea 
                                        rows={3}
                                        value={data.initiator_remarks}
                                        onChange={e => setData('initiator_remarks', e.target.value)}
                                        className="bg-white border-slate-300 text-xs"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Actions */}
                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Link href={`/probation-increment-evaluations/${evaluation.id}`}>
                                <Button type="button" variant="outline" className="text-xs h-10 border-slate-300">
                                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                </Button>
                            </Link>

                            <Button 
                                type="submit" 
                                disabled={processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-6 font-bold shadow-xs"
                            >
                                <Save className="h-4 w-4 mr-1.5" />
                                {processing 
                                    ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') 
                                    : (lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}
                            </Button>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
