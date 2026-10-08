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
    User, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    FileText, 
    Send,
    Building2,
    Calendar,
    Briefcase,
    Eye,
    Edit3,
    Save,
    AlertTriangle
} from 'lucide-react';
import FormA from './components/FormA';
import FormB from './components/FormB';
import FormC from './components/FormC';
import MonthPickerSelect from '@/components/MonthPickerSelect';
import ConfirmationOfficialFormDocument from './components/ConfirmationOfficialFormDocument';
import { 
    calculateGrade,
    getFormStructure
} from './confirmation-config';

interface EditProps {
    evaluation: any;
    isReviewerEdit?: boolean;
    returnComment?: string | null;
    userHasSignature?: boolean;
    templates?: any[];
}

export default function ConfirmationEvaluationEdit({ 
    evaluation,
    isReviewerEdit = false,
    returnComment = null,
    templates = [],
}: EditProps) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('conf_eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    const toggleLang = (newLang: 'bn' | 'en') => {
        setLang(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('conf_eval_lang', newLang);
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
        probation_end_date: formatForInput(evaluation.probation_end_date) || '',
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
            ...s,
            touched: true,
            raw_input: s.obtained_score !== undefined ? String(s.obtained_score) : '',
        })),

        // 4 Official Qualitative Questions
        strengths: evaluation.strengths || '',
        weaknesses: evaluation.weaknesses || '',
        training_need: evaluation.training_need || '',
        other_remarks: evaluation.other_remarks || '',

        // Official Recommendation
        recommendation_status: evaluation.recommendation_status || 'recommended',
        extend_probation_months: evaluation.extend_probation_months || '3',
        submit_now: false,
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const selectedEmployee = evaluation.employee || {};
    const formType = evaluation.form_type || 'officer_abm';

    // Resolve structure
    const dynamicStructure = useMemo(() => {
        const codeMap: Record<string, string> = {
            officer_abm: 'conf_officer_abm',
            accountant: 'conf_accountant',
            bm_and_above: 'conf_bm_and_above',
        };
        const dbTemplate = templates.find((t: any) => t.code === codeMap[formType] || t.code === formType);
        if (dbTemplate && dbTemplate.sections && dbTemplate.sections.length > 0) {
            return dbTemplate.sections.map((sec: any) => ({
                section_key: sec.section_key,
                section_name_en: sec.name_en,
                section_name_bn: sec.name_bn,
                items: sec.criteria.map((crit: any) => ({
                    key: crit.criteria_key,
                    name_en: crit.name_en,
                    name_bn: crit.name_bn,
                    max: Number(crit.max_score),
                }))
            }));
        }
        return getFormStructure(formType);
    }, [templates, formType]);

    // Keep total score & grade updated in real time
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

    // Difference calculation
    const calcDiff = (joiningVal: string, closingVal: string) => {
        if (joiningVal === '' && closingVal === '') return { text: '-', color: 'text-slate-400' };
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
        if (data.recommendation_status === 'extend_probation' && !data.extend_probation_months) {
            errs.extend_probation_months = lang === 'bn' ? 'বর্ধিত মাসের সংখ্যা উল্লেখ করুন।' : 'Specify number of months.';
        }

        const scoreExceeds = (data.scores || []).some((s: any) => Number(s.obtained_score) > Number(s.max_score));
        if (scoreExceeds) {
            errs.scores = lang === 'bn' ? 'কোনো মানদণ্ডের নম্বর তার সর্বোচ্চ নম্বরের চেয়ে বেশি হতে পারবে না।' : 'A criterion score exceeds maximum score limit.';
        }

        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = (submitNow: boolean = false) => {
        if (!validateForm()) {
            setViewMode('edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setData('submit_now', submitNow);
        put(`/confirmation-evaluations/${evaluation.id}`, {
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
            ...data,
            diff_members_count: diffNum(data.closing_members_count, data.joining_members_count),
            diff_borrowers_count: diffNum(data.closing_borrowers_count, data.joining_borrowers_count),
            diff_loan_balance: diffNum(data.closing_loan_balance, data.joining_loan_balance),
            diff_savings_balance: diffNum(data.closing_savings_balance, data.joining_savings_balance),
            diff_overdue_borrowers: diffNum(data.closing_overdue_borrowers, data.joining_overdue_borrowers),
            diff_overdue_amount: diffNum(data.closing_overdue_amount, data.joining_overdue_amount),
            diff_otr_pct: diffNum(data.closing_otr_pct, data.joining_otr_pct),
            diff_par_pct: diffNum(data.closing_par_pct, data.joining_par_pct),
            employee: selectedEmployee,
            signatures: evaluation.signatures || [],
        };
    }, [evaluation, data, selectedEmployee]);

    const mergedErrors = { ...errors, ...clientErrors };

    return (
        <Layout>
            <Head title={lang === 'bn' ? `মূল্যায়ন সম্পাদনা: ${selectedEmployee?.name_bn || selectedEmployee?.name_en}` : 'Edit Confirmation Evaluation'} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/confirmation-evaluations/${evaluation.id}`}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Award className="h-3.5 w-3.5" />
                                    {lang === 'bn' ? 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন' : 'Confirmation Evaluation'}
                                </span>
                                {isReviewerEdit && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                                        {lang === 'bn' ? 'পর্যালোচনা পর্যায় সম্পাদনা' : 'Reviewer Edit Mode'}
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {lang === 'bn' 
                                    ? `মূল্যায়ন ফরম সম্পাদনা: ${selectedEmployee?.name_bn || selectedEmployee?.name_en || ''}` 
                                    : `Edit Appraisal: ${selectedEmployee?.name_en || selectedEmployee?.name_bn || ''}`}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                [{selectedEmployee?.pin}] — {selectedEmployee?.designation?.name || '-'} ({selectedEmployee?.branch?.name || '-'})
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {/* Tab Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    viewMode === 'edit' 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'সম্পাদন মোড' : 'Edit Mode'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview' 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'অফিসিয়াল প্রিভিউ মোড' : 'Official Preview'}</span>
                            </button>
                        </div>

                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => toggleLang('bn')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleLang('en')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'en' 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 font-medium">{lang === 'bn' ? 'অর্জিত স্কোর' : 'Live Score'}</div>
                                <div className="text-base font-black text-blue-700 leading-tight">
                                    {Number(data.total_score || 0)} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                                </div>
                            </div>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <div className="text-[10px] text-slate-500 font-medium">{lang === 'bn' ? 'গ্রেড' : 'Grade'}</div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                    {typeof data.calculated_grade === 'object'
                                        ? ((data.calculated_grade as any)?.grade?.replace('_', ' ') || '-')
                                        : (data.calculated_grade ? String(data.calculated_grade).replace('_', ' ').toUpperCase() : '-')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sent Back Callout */}
                {returnComment && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold">
                                {lang === 'bn' ? 'সংশোধনের জন্য ফেরত পাঠানোর কারণ:' : 'Reason for Return:'}
                            </h4>
                            <p className="text-xs italic mt-0.5 font-medium">"{returnComment}"</p>
                            <p className="text-[11px] text-amber-700 mt-1">
                                {lang === 'bn' ? 'অনুগ্রহ করে উল্লেখিত বিষয়গুলো সংশোধন করে পুনরায় দাখিল করুন।' : 'Please update the form accordingly and resubmit.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Conditional View */}
                {viewMode === 'preview' ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-700 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-blue-950">
                                        {lang === 'bn' ? 'অফিসিয়াল ফরম লাইভ প্রিভিউ' : 'Official Appraisal Form Live Preview'}
                                    </h4>
                                    <p className="text-[11px] text-blue-700">
                                        {lang === 'bn' ? 'ফরমের সব ইনপুট রিয়েলটাইমে প্রদর্শিত হচ্ছে। আপনি সরাসরি এখান থেকেও সেভ বা দাখিল করতে পারবেন।' : 'All inputs are mapped in real-time. You can submit directly from here or return to edit.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setViewMode('edit')}
                                    className="text-xs h-9 bg-white border-slate-300"
                                >
                                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                                    {lang === 'bn' ? 'সম্পাদনে ফিরে যান' : 'Back to Edit'}
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={() => handleSave(true)} 
                                    disabled={processing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                >
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    {processing ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'দাখিল করুন' : 'Submit')}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200">
                            <ConfirmationOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 pb-24">
                        {/* Errors */}
                        {Object.keys(mergedErrors).length > 0 && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-xs animate-in fade-in">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-red-900">{lang === 'bn' ? 'ত্রুটিসমূহ:' : 'Errors:'}</h4>
                                    <ul className="list-disc list-inside text-xs space-y-0.5 text-red-700">
                                        {Object.entries(mergedErrors).map(([key, msg]) => (
                                            <li key={key}>{msg as string}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Candidate Overview */}
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <span>{lang === 'bn' ? '১. কর্মীর তথ্য ও সার্ভিস বিবরণ' : '1. Candidate Information'}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium">{lang === 'bn' ? 'নাম ও পিন' : 'Name & PIN'}</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                            [{selectedEmployee.pin}] {selectedEmployee.name_bn || selectedEmployee.name_en}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium">{lang === 'bn' ? 'পদবী' : 'Designation'}</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                            {selectedEmployee.designation?.name || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium">{lang === 'bn' ? 'শাখা ও অঞ্চল' : 'Branch & Region'}</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                            {selectedEmployee.branch?.name || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium">{lang === 'bn' ? 'শিক্ষানবিশকাল সমাপ্তির তারিখ' : 'Probation End Date'}</span>
                                        <p className="text-xs sm:text-sm font-bold text-blue-700 mt-0.5">
                                            {data.probation_end_date || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {lang === 'bn' ? 'সংস্থায় যোগদানের তারিখ' : 'Joining Date'}
                                        </Label>
                                        <Input 
                                            type="date" 
                                            value={data.joining_date} 
                                            onChange={e => setData('joining_date', e.target.value)} 
                                            className="bg-white border-slate-300 text-xs h-9"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {lang === 'bn' ? 'শিক্ষানবিশকাল সমাপ্তির তারিখ' : 'Probation End Date'}
                                        </Label>
                                        <Input 
                                            type="date" 
                                            value={data.probation_end_date} 
                                            onChange={e => setData('probation_end_date', e.target.value)} 
                                            className="bg-white border-slate-300 text-xs h-9"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (যোগদানের সময়)' : 'Education at Joining'}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.education_at_joining} 
                                            onChange={e => setData('education_at_joining', e.target.value)} 
                                            className="bg-white border-slate-300 text-xs h-9"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (বর্তমান)' : 'Current Education'}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.education_current} 
                                            onChange={e => setData('education_current', e.target.value)} 
                                            className="bg-white border-slate-300 text-xs h-9"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 2: Comparative Operational Performance Table */}
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        <span>{lang === 'bn' ? '২. তুলনামূলক অর্জন ও পারফরম্যান্স মেট্রিক্স' : '2. Comparative Performance Metrics'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-slate-600 font-semibold shrink-0">
                                            {lang === 'bn' ? 'ক্লোজিং মাস:' : 'Closing Month:'} <span className="text-red-500">*</span>
                                        </Label>
                                        <MonthPickerSelect 
                                            value={data.closing_month} 
                                            onChange={val => setData('closing_month', val)} 
                                            lang={lang}
                                            className="h-8 min-w-[150px]"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-5">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                                <th className="p-3 font-bold w-2/5">{lang === 'bn' ? 'সূচক / পারফরম্যান্স মেট্রিক্স' : 'Performance Parameter'}</th>
                                                {formType !== 'accountant' && (
                                                    <th className="p-3 font-bold text-center w-1/5">{lang === 'bn' ? 'যোগদানের সময়' : 'At Joining'}</th>
                                                )}
                                                <th className="p-3 font-bold text-center w-1/5">{lang === 'bn' ? 'সমাপ্তির সময় (সর্বশেষ ক্লোজিং)' : 'At Probation End'}</th>
                                                {formType !== 'accountant' && (
                                                    <th className="p-3 font-bold text-center w-1/5">{lang === 'bn' ? 'বৃদ্ধি / হ্রাস (পার্থক্য)' : 'Difference'}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* 1. Members */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '১. সক্রিয় সদস্য সংখ্যা (জন)' : '1. Active Members (Count)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" value={data.joining_members_count} onChange={e => setData('joining_members_count', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" value={data.closing_members_count} onChange={e => setData('closing_members_count', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_members_count, data.closing_members_count).color}`}>
                                                            {calcDiff(data.joining_members_count, data.closing_members_count).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 2. Borrowers */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '২. ঋণী সদস্য সংখ্যা (জন)' : '2. Borrower Members (Count)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" value={data.joining_borrowers_count} onChange={e => setData('joining_borrowers_count', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" value={data.closing_borrowers_count} onChange={e => setData('closing_borrowers_count', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_borrowers_count, data.closing_borrowers_count).color}`}>
                                                            {calcDiff(data.joining_borrowers_count, data.closing_borrowers_count).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 3. Loan Balance */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৩. মোট ঋণ স্থিতি (টাকা)' : '3. Total Loan Balance (Tk)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" step="0.01" value={data.joining_loan_balance} onChange={e => setData('joining_loan_balance', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" step="0.01" value={data.closing_loan_balance} onChange={e => setData('closing_loan_balance', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_loan_balance, data.closing_loan_balance).color}`}>
                                                            {calcDiff(data.joining_loan_balance, data.closing_loan_balance).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 4. Savings Balance */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৪. মোট সঞ্চয় স্থিতি (টাকা)' : '4. Total Savings Balance (Tk)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" step="0.01" value={data.joining_savings_balance} onChange={e => setData('joining_savings_balance', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" step="0.01" value={data.closing_savings_balance} onChange={e => setData('closing_savings_balance', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_savings_balance, data.closing_savings_balance).color}`}>
                                                            {calcDiff(data.joining_savings_balance, data.closing_savings_balance).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 5. Overdue Borrowers */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৫. মেয়াদোত্তীর্ণ ঋণী সংখ্যা (জন)' : '5. Overdue Borrowers (Count)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" value={data.joining_overdue_borrowers} onChange={e => setData('joining_overdue_borrowers', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" value={data.closing_overdue_borrowers} onChange={e => setData('closing_overdue_borrowers', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_overdue_borrowers, data.closing_overdue_borrowers).color}`}>
                                                            {calcDiff(data.joining_overdue_borrowers, data.closing_overdue_borrowers).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 6. Overdue Amount */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৬. মেয়াদোত্তীর্ণ ঋণ (টাকা)' : '6. Overdue Amount (Tk)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" step="0.01" value={data.joining_overdue_amount} onChange={e => setData('joining_overdue_amount', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" step="0.01" value={data.closing_overdue_amount} onChange={e => setData('closing_overdue_amount', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_overdue_amount, data.closing_overdue_amount).color}`}>
                                                            {calcDiff(data.joining_overdue_amount, data.closing_overdue_amount).text}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 7. OTR */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৭. অন-টাইম আদায়ের হার OTR (%)' : '7. On-Time Recovery Rate OTR (%)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" step="0.01" value={data.joining_otr_pct} onChange={e => setData('joining_otr_pct', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" step="0.01" value={data.closing_otr_pct} onChange={e => setData('closing_otr_pct', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_otr_pct, data.closing_otr_pct).color}`}>
                                                            {calcDiff(data.joining_otr_pct, data.closing_otr_pct).text}%
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* 8. PAR */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{lang === 'bn' ? '৮. পোর্টফোলিও এট রিস্ক PAR (%)' : '8. Portfolio At Risk PAR (%)'}</td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <Input type="number" step="0.01" value={data.joining_par_pct} onChange={e => setData('joining_par_pct', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300" />
                                                    </td>
                                                )}
                                                <td className="p-2 text-center">
                                                    <Input type="number" step="0.01" value={data.closing_par_pct} onChange={e => setData('closing_par_pct', e.target.value)} className="h-8 text-center text-xs bg-white border-slate-300 font-bold" />
                                                </td>
                                                {formType !== 'accountant' && (
                                                    <td className="p-2 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${calcDiff(data.joining_par_pct, data.closing_par_pct).color}`}>
                                                            {calcDiff(data.joining_par_pct, data.closing_par_pct).text}%
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {formType === 'accountant' && (
                                    <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={Boolean(data.has_cashier)} 
                                                onChange={e => setData('has_cashier', e.target.checked as any)} 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <span className="text-xs font-semibold text-slate-800">
                                                {lang === 'bn' ? 'শাখাটিতে ক্যাশিয়ার কর্মরত আছেন' : 'Branch has dedicated Cashier in place'}
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Step 3: Dynamic Scorecard */}
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                            <Award className="h-5 w-5 text-blue-600" />
                                            <span>{lang === 'bn' ? '৩. নম্বর বণ্টন ও মূল্যায়ন মানদণ্ড' : '3. Evaluation Scoring Rubrics'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-3">
                                        <div>
                                            <span className="text-[11px] text-slate-500 font-medium">{lang === 'bn' ? 'মোট অর্জিত নম্বর' : 'Total Score'}</span>
                                            <div className="text-xl font-bold text-blue-700">{Number(data.total_score || 0)} / 100</div>
                                        </div>
                                        <div className="h-8 w-px bg-blue-200" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 font-medium">{lang === 'bn' ? 'অর্জিত গ্রেড' : 'Grade'}</span>
                                            <div className="text-xs font-black uppercase text-slate-800">
                                                {typeof data.calculated_grade === 'object'
                                                    ? ((data.calculated_grade as any)?.grade?.replace('_', ' ') || '-')
                                                    : (data.calculated_grade ? String(data.calculated_grade).replace('_', ' ').toUpperCase() : '-')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-5">
                                {formType === 'officer_abm' && (
                                    <FormA 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        lang={lang}
                                        setScores={(newScores: any) => setData('scores', newScores)}
                                        onChange={(newScores: any) => setData('scores', newScores)} 
                                    />
                                )}

                                {formType === 'accountant' && (
                                    <FormB 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        lang={lang}
                                        setScores={(newScores: any) => setData('scores', newScores)}
                                        onChange={(newScores: any) => setData('scores', newScores)} 
                                    />
                                )}

                                {formType === 'bm_and_above' && (
                                    <FormC 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        lang={lang}
                                        setScores={(newScores: any) => setData('scores', newScores)}
                                        onChange={(newScores: any) => setData('scores', newScores)} 
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Step 4: 4 Official Questions */}
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <span>{lang === 'bn' ? '৪. গুণগত মূল্যায়ন ও মন্তব্য' : '4. Qualitative Assessment & Remarks'}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-800 text-xs font-bold leading-normal">
                                        {lang === 'bn' ? '১. শিক্ষানবিশকালে কর্মকর্তা/কর্মচারীর কাজের প্রতি আগ্রহ এবং দায়িত্ববোধ কেমন ছিল?' : '1. Interest and sense of responsibility:'}
                                    </Label>
                                    <Textarea value={data.strengths} onChange={e => setData('strengths', e.target.value)} className="bg-white border-slate-300 text-xs" rows={3} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-slate-800 text-xs font-bold leading-normal">
                                        {lang === 'bn' ? '২. সংস্থার নিয়ম-শৃঙ্খলা, আচরণবিধি ও মূল্যবোধের প্রতি তার দৃষ্টিভঙ্গি কেমন?' : '2. Attitude towards discipline and values:'}
                                    </Label>
                                    <Textarea value={data.weaknesses} onChange={e => setData('weaknesses', e.target.value)} className="bg-white border-slate-300 text-xs" rows={3} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-slate-800 text-xs font-bold leading-normal">
                                        {lang === 'bn' ? '৩. ভবিষ্যতে উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা কেমন?' : '3. Potential for higher responsibilities:'}
                                    </Label>
                                    <Textarea value={data.training_need} onChange={e => setData('training_need', e.target.value)} className="bg-white border-slate-300 text-xs" rows={3} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-slate-800 text-xs font-bold leading-normal">
                                        {lang === 'bn' ? '৪. কর্মকর্তা/কর্মচারী সম্পর্কে অন্যান্য কোনো মূল্যায়ন বা মন্তব্য (যদি থাকে):' : '4. Other remarks (if any):'}
                                    </Label>
                                    <Textarea value={data.other_remarks} onChange={e => setData('other_remarks', e.target.value)} className="bg-white border-slate-300 text-xs" rows={2} />
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    <Label className="text-slate-900 font-bold text-sm block mb-2">
                                        {lang === 'bn' ? '৫. মূল্যায়নকারীর চূড়ান্ত সুপারিশ' : '5. Official Confirmation Recommendation'} <span className="text-red-500">*</span>
                                    </Label>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div 
                                            onClick={() => setData('recommendation_status', 'recommended')}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                data.recommendation_status === 'recommended'
                                                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                                                <CheckCircle2 className={`h-4 w-4 ${data.recommendation_status === 'recommended' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                {lang === 'bn' ? 'শিক্ষানবিশকাল শেষে স্থায়ীকরণ করা যায়' : 'Recommend for Confirmation'}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {lang === 'bn' ? 'কর্মকর্তা/কর্মচারীর পারফরম্যান্স সন্তোষজনক এবং স্থায়ীকরণের উপযোগী।' : 'Performance meets confirmation benchmarks.'}
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => setData('recommendation_status', 'extend_probation')}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                data.recommendation_status === 'extend_probation'
                                                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                                                <Clock className={`h-4 w-4 ${data.recommendation_status === 'extend_probation' ? 'text-amber-500' : 'text-slate-400'}`} />
                                                {lang === 'bn' ? 'আরও শিক্ষানবিশকাল বৃদ্ধি করা যায়' : 'Extend Probation Period'}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {lang === 'bn' ? 'আরও নিবিড় পর্যবেক্ষণ ও উন্নতির জন্য শিক্ষানবিশকাল বৃদ্ধি সুপারিশ।' : 'Requires extended probation for improvement.'}
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => setData('recommendation_status', 'not_suitable')}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                data.recommendation_status === 'not_suitable'
                                                    ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                                                <AlertCircle className={`h-4 w-4 ${data.recommendation_status === 'not_suitable' ? 'text-rose-500' : 'text-slate-400'}`} />
                                                {lang === 'bn' ? 'সংস্থায় বহাল রাখার জন্য উপযুক্ত নয়' : 'Not Suitable for Retention'}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {lang === 'bn' ? 'কাজের মান সন্তোষজনক নয় এবং সংস্থায় বহাল রাখার উপযোগী নয়।' : 'Does not meet organization standards.'}
                                            </p>
                                        </div>
                                    </div>

                                    {data.recommendation_status === 'extend_probation' && (
                                        <div className="mt-3 p-4 bg-amber-50/50 border border-amber-200 rounded-xl max-w-sm">
                                            <Label className="text-xs font-semibold text-amber-900">
                                                {lang === 'bn' ? 'কত মাস শিক্ষানবিশকাল বৃদ্ধি করতে চান?' : 'Extend Probation by Months'} <span className="text-red-500">*</span>
                                            </Label>
                                            <Input 
                                                type="number" 
                                                placeholder="e.g. 3" 
                                                value={data.extend_probation_months} 
                                                onChange={e => setData('extend_probation_months', e.target.value)} 
                                                className="bg-white border-amber-300 mt-1 h-9 text-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bottom Sticky Bar */}
                        <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                                <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500 font-medium">
                                        {lang === 'bn' ? 'মূল্যায়নকৃত কর্মী:' : 'Evaluated Staff:'}
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                                        [{selectedEmployee?.pin}] {lang === 'bn' ? (selectedEmployee?.name_bn || selectedEmployee?.name_en) : selectedEmployee?.name_en}
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 font-bold px-2.5 py-1 text-xs shrink-0">
                                    {lang === 'bn' ? 'স্কোর: ' : 'Score: '} 
                                    <span className="text-blue-700 ml-1 font-black">{Number(data.total_score || 0)}/100</span>
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setViewMode('preview')}
                                    className="border-slate-300 text-slate-700 text-xs font-semibold h-9 px-3 flex items-center gap-1.5 hover:bg-slate-50 flex-1 sm:flex-initial"
                                >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                    <span>{lang === 'bn' ? 'লাইভ প্রিভিউ দেখুন' : 'Live Preview'}</span>
                                </Button>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processing}
                                    onClick={() => handleSave(false)}
                                    className="border-slate-300 text-slate-700 text-xs font-semibold h-9 px-3 flex items-center gap-1.5 hover:bg-slate-50 flex-1 sm:flex-initial"
                                >
                                    <Save className="h-4 w-4 text-slate-600" />
                                    <span>{lang === 'bn' ? 'খসড়া সংরক্ষণ' : 'Save Draft'}</span>
                                </Button>
                                <Button 
                                    type="button" 
                                    size="sm"
                                    disabled={processing} 
                                    onClick={() => handleSave(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-xs flex items-center gap-1.5 flex-1 sm:flex-initial"
                                >
                                    <Send className="h-4 w-4" />
                                    {processing ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'দাখিল করুন' : 'Submit')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
