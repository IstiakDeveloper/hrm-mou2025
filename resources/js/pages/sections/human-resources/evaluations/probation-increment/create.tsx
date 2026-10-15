import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { PageSurface } from '@/components/page-surface';
import { AppraisalEmployeeCombo } from '@/components/appraisal/AppraisalEmployeeCombo';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Head, Link, usePage } from '@inertiajs/react';
import { gapMap, initiatorGaps, scoreGapKeys, withEnteredScores } from '@/lib/appraisal-required';
import { MissingFieldsAlert, scrollToMissingFields } from '@/components/appraisal/MissingFieldsAlert';
import { type SharedData } from '@/types';
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
    FileText, 
    Send,
    Building2,
    Calendar,
    Briefcase,
    GraduationCap,
    Eye, 
    Edit3, 
    Printer,
    Sparkles,
    Check
} from 'lucide-react';
import FormAIncrement from './components/FormAIncrement';
import FormBIncrement from './components/FormBIncrement';
import FormCIncrement from './components/FormCIncrement';
import MonthPickerSelect from '@/components/MonthPickerSelect';
const ProbationIncrementOfficialFormDocument = lazy(() => import('./components/ProbationIncrementOfficialFormDocument'));
import { 
    calculateGrade,
    getFormStructure,
    toBn
} from './probation-increment-config';
import { addMonths, format } from 'date-fns';

interface CreateProps {
    employeeLookupUrl?: string;
    templates?: any[];
    isSuperAdmin?: boolean;
}

export default function ProbationIncrementEvaluationCreate({ 
    employeeLookupUrl = '/probation-increment-evaluations/employees/lookup', 
    templates = [] 
}: CreateProps) {
    const { auth } = usePage<SharedData>().props;
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

    const { data, setData, post, processing, errors, transform } = useForm({
        employee_id: '',
        form_type: 'officer_abm' as 'officer_abm' | 'accountant' | 'bm_and_above',
        joining_date: '',
        probation_3m_completion_date: '',
        education_at_joining: '',
        education_current: '',
        closing_month: new Date().toISOString().slice(0, 7),
        
        // Comparative Stats
        joining_members_count: '',
        closing_members_count: '',
        joining_borrowers_count: '',
        closing_borrowers_count: '',
        joining_loan_balance: '',
        closing_loan_balance: '',
        joining_savings_balance: '',
        closing_savings_balance: '',
        joining_overdue_borrowers: '',
        closing_overdue_borrowers: '',
        joining_overdue_amount: '',
        closing_overdue_amount: '',
        joining_otr_pct: '',
        closing_otr_pct: '',
        joining_par_pct: '',
        closing_par_pct: '',
        has_cashier: false,

        // Score
        total_score: 0,
        calculated_grade: '',
        scores: [] as any[],

        // Official 3-month Recommendation
        supervisor_recommendation: 'recommend_increment' as 'recommend_increment' | 'defer_increment' | 'not_suitable',
        strengths: '',
        weaknesses: '',
        training_need: '',
        other_remarks: '',
        initiator_remarks: '',
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [attempted, setAttempted] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    // Auto-detect form type based on designation
    const formType = useMemo<'officer_abm' | 'accountant' | 'bm_and_above'>(() => {
        if (!selectedEmployee) return 'officer_abm';
        const title = (selectedEmployee.designation?.name || selectedEmployee.designation?.title || '').toLowerCase();
        
        // 1. Assistant Branch Manager -> Form A
        if (
            title.includes('assistant branch manager') || 
            title.includes('asst. branch manager') || 
            title.includes('asst branch manager') || 
            title.includes('সহকারী শাখা ব্যবস্থাপক') ||
            title.includes('abm')
        ) {
            return 'officer_abm';
        }

        // 2. Accountant -> Form B
        if (
            title.includes('accountant') || 
            title.includes('হিসাবরক্ষক') || 
            title.includes('probationary-ac')
        ) {
            return 'accountant';
        }

        // 3. Branch Manager to ZM -> Form C
        if (
            title.includes('branch manager') || 
            title.includes('regional manager') || 
            title.includes('zonal manager') || 
            title.includes('area manager') ||
            title.includes('area coordinator') ||
            title.includes('শাখা ব্যবস্থাপক') || 
            title.includes('আঞ্চলিক ব্যবস্থাপক') || 
            title.includes('জোনাল ম্যানেজার')
        ) {
            return 'bm_and_above';
        }

        // Default -> Form A
        return 'officer_abm';
    }, [selectedEmployee]);

    // Update form_type in state
    useEffect(() => {
        setData('form_type', formType);
    }, [formType]);

    // Auto-populate employee profile fields when an employee is selected
    useEffect(() => {
        if (selectedEmployee) {
            const formatForInput = (dStr?: string | null) => {
                if (!dStr) return '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) {
                    const [d, m, y] = dStr.split('/');
                    return `${y}-${m}-${d}`;
                }
                return dStr;
            };

            const jDate = formatForInput(selectedEmployee.joining_date) || '';
            let threeMonthDate = '';
            if (jDate) {
                try {
                    const d = new Date(jDate);
                    if (!isNaN(d.getTime())) {
                        threeMonthDate = format(addMonths(d, 3), 'yyyy-MM-dd');
                    }
                } catch {
                    threeMonthDate = '';
                }
            }

            setData(d => ({
                ...d,
                joining_date: jDate,
                probation_3m_completion_date: threeMonthDate || formatForInput(selectedEmployee.probation_3m_completion_date) || '',
                education_at_joining: selectedEmployee.educational_qualification || '',
                education_current: selectedEmployee.educational_qualification || '',
            }));
        }
    }, [selectedEmployee]);

    const dynamicStructure = useMemo(() => {
        const codeMap: Record<string, string> = {
            officer_abm: 'prob_officer_abm',
            accountant: 'prob_accountant',
            bm_and_above: 'prob_bm_and_above',
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
                    max: Number(crit.max_score ?? crit.max_marks ?? 0),
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

    // Helper for difference (closing - joining)
    const calcDiff = (joiningVal: string, closingVal: string) => {
        if (joiningVal === '' && closingVal === '') return { text: '-', color: 'text-slate-400 bg-slate-50' };
        const j = parseFloat(joiningVal) || 0;
        const c = parseFloat(closingVal) || 0;
        const diff = c - j;
        const formatted = Number.isInteger(diff) ? String(diff) : diff.toFixed(2);
        if (diff > 0) {
            return { text: `+${formatted}`, color: 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold' };
        } else if (diff < 0) {
            return { text: `${formatted}`, color: 'text-rose-700 bg-rose-50 border-rose-300 font-bold' };
        }
        return { text: '০', color: 'text-slate-600 bg-slate-50 border-slate-200' };
    };

    const liveGaps = useMemo(
        () => (attempted ? initiatorGaps('probation', data, lang, formType) : []),
        [attempted, data, lang, formType],
    );

    useEffect(() => {
        if (!attempted) {
            return;
        }
        setClientErrors(gapMap(liveGaps));
    }, [attempted, liveGaps]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const gaps = initiatorGaps('probation', data, lang, formType);
        setAttempted(true);
        setClientErrors(gapMap(gaps));
        if (gaps.length > 0) {
            setViewMode('edit');
            scrollToMissingFields();
            return;
        }

        transform((payload) => ({
            ...payload,
            recommendation_status: payload.supervisor_recommendation,
            scores: withEnteredScores(payload.scores),
        }));
        post('/probation-increment-evaluations', {
            onError: () => {
                setViewMode('edit');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    const formatDisplayDate = (dStr?: string | null) => {
        if (!dStr) return '-';
        const str = String(dStr).trim();
        if (!str || str === '-') return '-';
        let formatted = str;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [year, month, day] = str.split('-');
            formatted = `${day}/${month}/${year}`;
        }
        return lang === 'bn' ? toBn(formatted) : formatted;
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
            form_type: formType,
            joining_date: data.joining_date,
            probation_3m_completion_date: data.probation_3m_completion_date,
            education_at_joining: data.education_at_joining || selectedEmployee?.educational_qualification || '',
            education_current: data.education_current || selectedEmployee?.educational_qualification || '',
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
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            training_need: data.training_need,
            other_remarks: data.other_remarks,
            initiator_remarks: data.other_remarks,
            branch: selectedEmployee?.branch || {},
            employee: selectedEmployee || {},
            scores: data.scores,
            initiator: {
                ...auth?.user,
                employee: (auth as any)?.employee,
            },
            signatures: [
                {
                    stage: 'initiator',
                    user: {
                        ...auth?.user,
                        employee: (auth as any)?.employee,
                    },
                    signed_at: new Date().toISOString(),
                }
            ],
            created_at: new Date().toISOString(),
        };
    }, [data, selectedEmployee, formType, auth]);

    const mergedErrors = { ...errors, ...clientErrors };
    const currentGrade = calculateGrade(data.total_score);

    return (
        <Layout>
            <Head title={lang === 'bn' ? 'শিক্ষানবিশকাল ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন' : 'Probation Increment Evaluation'} />
            
            <PageSurface className="space-y-4 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 print:hidden">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/probation-increment-evaluations"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-emerald-600" />
                                    {lang === 'bn' ? 'শিক্ষানবিশ ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'}
                                </h1>
                                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {formType === 'officer_abm' && 'অফিসার ও সহকারী শাখা ব্যবস্থাপক (Form A)'}
                                    {formType === 'accountant' && 'হিসাবরক্ষক (Form B)'}
                                    {formType === 'bm_and_above' && 'শাখা ব্যবস্থাপক ও তদূর্ধ্ব (Form C)'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                {lang === 'bn' 
                                    ? '০৩ মাস সন্তোষজনক কাজের ভিত্তিতে পরবর্তী ধাপে বেতন বৃদ্ধির জন্য মূল্যায়ন নির্দেশক ও অর্জন প্রদান করুন' 
                                    : 'Complete evaluation metrics and rubrics based on 03 months performance review'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Form / Live Official Document Preview */}
                        <div className="p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'edit' 
                                        ? 'bg-white text-emerald-700 shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'ফরম ইনপুট' : 'Form Input'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'অফিসিয়াল প্রিভিউ' : 'Official Preview'}
                            </button>
                        </div>

                        {/* Language Switcher */}
                        <div className="p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center">
                            <button
                                type="button"
                                onClick={() => toggleLang('bn')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                                    lang === 'bn' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleLang('en')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                                    lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                EN
                            </button>
                        </div>
                    </div>
                </div>

                {/* VIEW MODE: LIVE PREVIEW */}
                {viewMode === 'preview' ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 print:hidden">
                            <div className="flex items-center gap-2 text-emerald-900 text-xs font-medium">
                                <Eye className="h-4 w-4 text-emerald-600" />
                                <span>
                                    {lang === 'bn' 
                                        ? 'আপনি অফিসিয়াল ফরমটির লাইভ প্রিভিউ দেখছেন। ইনপুট পরিবর্তনের জন্য "ফরম ইনপুট" মোডে ফিরে যান।' 
                                        : 'You are viewing the live official form. Switch to "Form Input" to make edits.'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewMode('edit')}
                                    className="text-xs h-8 bg-white border-emerald-300 text-emerald-800"
                                >
                                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                                    {lang === 'bn' ? 'ইনপুটে ফিরুন' : 'Back to Edit'}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Printer className="h-3.5 w-3.5 mr-1" />
                                    {lang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}
                                </Button>
                            </div>
                        </div>
                        <div className="bg-slate-100/70 p-2 sm:p-6 rounded-xl border border-slate-200 print:bg-white print:p-0 print:border-0 print:rounded-none">
                            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">{lang === 'bn' ? 'ফরম লোড হচ্ছে…' : 'Loading form…'}</div>}>
                                <ProbationIncrementOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                            </Suspense>
                        </div>
                    </div>
                ) : (
                    /* VIEW MODE: EDIT FORM */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <MissingFieldsAlert
                            gaps={liveGaps.length > 0 ? liveGaps : Object.entries(errors).map(([key, message]) => ({ key, message: String(message) }))}
                            lang={lang}
                        />
                        
                        {/* 1. Unified Candidate Profile & Information Card (Compact Grid) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-600" />
                                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                                        {lang === 'bn' ? '১. মূল্যায়নাধীন কর্মী ও সাধারণ তথ্যাবলী' : '1. Candidate Profile & Information'}
                                    </CardTitle>
                                </div>
                                <div className="w-full sm:w-80">
                                    <AppraisalEmployeeCombo
                                        lookupUrl={employeeLookupUrl}
                                        value={data.employee_id ? Number(data.employee_id) : null}
                                        lang={lang}
                                        invalid={Boolean(mergedErrors.employee_id)}
                                        placeholder={lang === 'bn' ? 'কর্মী খুঁজুন (PIN/নাম/পদবী)...' : 'Search employee to auto-fill'}
                                        onSelect={(emp) => {
                                            setSelectedEmployee(emp);
                                            setData('employee_id', emp ? String(emp.id) : '');
                                            setClientErrors(prev => ({ ...prev, employee_id: '' }));
                                        }}
                                    />
                                    {mergedErrors.employee_id && (
                                        <p className="text-[11px] font-semibold text-rose-600 mt-1">
                                            {mergedErrors.employee_id}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4 space-y-3">
                                {/* Selected Employee Snapshot Capsule */}
                                {selectedEmployee && (
                                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-slate-900">{selectedEmployee.name_bn || selectedEmployee.name_en}</span>
                                            <span className="text-[11px] font-mono text-slate-600">({selectedEmployee.pin})</span>
                                            <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300 font-bold">
                                                {selectedEmployee.designation?.name || '-'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span>শাখা: <b>{selectedEmployee.branch?.name || '-'}</b></span>
                                            {selectedEmployee.branch?.regional_office_name && (
                                                <span className="hidden sm:inline">| অঞ্চল: <b>{selectedEmployee.branch.regional_office_name}</b></span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Compact 4-Column Responsive Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'সংস্থায় যোগদানের তারিখ:' : 'Joining Date:'}
                                        </Label>
                                        <Input 
                                            type="date"
                                            data-req="joining_date" value={data.joining_date}
                                            onChange={e => setData('joining_date', e.target.value)}
                                            className="h-8.5 text-xs bg-white border-slate-300 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? '০৩ মাস পূর্তির তারিখ:' : '03-Month Completion Date:'}
                                        </Label>
                                        <Input 
                                            type="date"
                                            data-req="probation_3m_completion_date" value={data.probation_3m_completion_date}
                                            onChange={e => setData('probation_3m_completion_date', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-semibold text-emerald-900 border-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (যোগদানকালীন):' : 'Education (At Joining):'}
                                        </Label>
                                        <Input 
                                            type="text"
                                            data-req="education_at_joining" value={data.education_at_joining}
                                            onChange={e => setData('education_at_joining', e.target.value)}
                                            className="h-8.5 text-xs bg-white border-slate-300"
                                            placeholder="উদা: বি.এ (অনার্স)"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা (বর্তমান):' : 'Education (Current):'}
                                        </Label>
                                        <Input 
                                            type="text"
                                            data-req="education_current" value={data.education_current}
                                            onChange={e => setData('education_current', e.target.value)}
                                            className="h-8.5 text-xs bg-white border-slate-300"
                                            placeholder="উদা: এম.এ"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Performance Statistics Section (Compact High-Density Comparison Table/Grid) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div>
                                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' 
                                            ? (formType === 'accountant' 
                                                ? '২. মূল্যায়ণকালীন অর্জন (সর্বশেষ মাস ক্লোজিং অনুযায়ী)' 
                                                : '২. মূল্যায়ণকালীন অর্জন (যোগদান এবং সর্বশেষ মাস ক্লোজিং অনুযায়ী)')
                                            : '2. Operational Performance Metrics'}
                                    </CardTitle>
                                    <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                                        {formType === 'accountant' 
                                            ? (lang === 'bn' ? 'সর্বশেষ মাস ক্লোজিং অনুযায়ী শাখার পরিসংখ্যান লিখুন' : 'Enter branch metrics as of closing month')
                                            : (lang === 'bn' ? 'যোগদান এবং ক্লোজিং মাসের পরিসংখ্যান দিন (পার্থক্য স্বয়ংক্রিয় গণনা হবে)' : 'Enter stats at joining & closing (difference auto-calculated)')}
                                    </CardDescription>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-[11px] font-semibold text-slate-700 shrink-0">
                                        {lang === 'bn' ? 'ক্লোজিং মাসের নাম:*' : 'Closing Month:*'}
                                    </Label>
                                    <MonthPickerSelect 
                                        data-req="closing_month" value={data.closing_month}
                                        onChange={val => setData('closing_month', val)}
                                        lang={lang}
                                        className="h-8 min-w-[140px] text-xs font-bold border-slate-300"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4">
                                {formType === 'accountant' ? (
                                    /* Form B Accountant Metrics - Compact 4-column Grid */
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার সদস্য (জন)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_members_count" value={data.closing_members_count}
                                                    onChange={e => setData('closing_members_count', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার ঋণী (জন)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_borrowers_count" value={data.closing_borrowers_count}
                                                    onChange={e => setData('closing_borrowers_count', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার ঋণ স্থিতি (টাকা)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_loan_balance" value={data.closing_loan_balance}
                                                    onChange={e => setData('closing_loan_balance', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার সঞ্চয় স্থিতি (মোট টাকা)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_savings_balance" value={data.closing_savings_balance}
                                                    onChange={e => setData('closing_savings_balance', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার বকেয়া (জন)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_overdue_borrowers" value={data.closing_overdue_borrowers}
                                                    onChange={e => setData('closing_overdue_borrowers', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার বকেয়া (টাকা)</Label>
                                                <Input 
                                                    type="number"
                                                    data-req="closing_overdue_amount" value={data.closing_overdue_amount}
                                                    onChange={e => setData('closing_overdue_amount', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার OTR (%)</Label>
                                                <Input 
                                                    type="number"
                                                    step="any"
                                                    data-req="closing_otr_pct" value={data.closing_otr_pct}
                                                    onChange={e => setData('closing_otr_pct', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-slate-700">শাখার PAR (%)</Label>
                                                <Input 
                                                    type="number"
                                                    step="any"
                                                    data-req="closing_par_pct" value={data.closing_par_pct}
                                                    onChange={e => setData('closing_par_pct', e.target.value)}
                                                    className="h-8 text-xs bg-white text-center font-bold border-slate-300"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                                            <Label className="text-xs font-bold text-slate-800">শাখায় ক্যাশিয়ার আছে কি না?</Label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="has_cashier" 
                                                        checked={data.has_cashier === true}
                                                        onChange={() => setData('has_cashier', true)}
                                                        className="w-3.5 h-3.5 text-emerald-600"
                                                    />
                                                    <span>হ্যাঁ (Yes)</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="has_cashier" 
                                                        checked={data.has_cashier === false}
                                                        onChange={() => setData('has_cashier', false)}
                                                        className="w-3.5 h-3.5 text-emerald-600"
                                                    />
                                                    <span>না (No)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Form A & Form C Metrics with High-Density Comparison Table */
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                                                    <th className="p-2 text-left w-2/5">সূচক (Metric)</th>
                                                    <th className="p-2 text-center w-1/4">যোগদানের সময়</th>
                                                    <th className="p-2 text-center w-1/4">ক্লোজিং মাসে</th>
                                                    <th className="p-2 text-center w-1/6">পার্থক্য (বৃদ্ধি/হ্রাস)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {[
                                                    { label: 'সদস্য (জন):', joinKey: 'joining_members_count', closeKey: 'closing_members_count', isPct: false },
                                                    { label: 'ঋণী (জন):', joinKey: 'joining_borrowers_count', closeKey: 'closing_borrowers_count', isPct: false },
                                                    { label: 'ঋণ স্থিতি (টাকা):', joinKey: 'joining_loan_balance', closeKey: 'closing_loan_balance', isPct: false },
                                                    { label: 'সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা):', joinKey: 'joining_savings_balance', closeKey: 'closing_savings_balance', isPct: false },
                                                    { label: 'বকেয়া (জন):', joinKey: 'joining_overdue_borrowers', closeKey: 'closing_overdue_borrowers', isPct: false },
                                                    { label: 'বকেয়া (টাকা):', joinKey: 'joining_overdue_amount', closeKey: 'closing_overdue_amount', isPct: false },
                                                    { label: 'OTR (%):', joinKey: 'joining_otr_pct', closeKey: 'closing_otr_pct', isPct: true },
                                                    { label: 'PAR (%):', joinKey: 'joining_par_pct', closeKey: 'closing_par_pct', isPct: true },
                                                ].map((row, idx) => {
                                                    const joinVal = (data as any)[row.joinKey];
                                                    const closeVal = (data as any)[row.closeKey];
                                                    const diff = calcDiff(joinVal, closeVal);
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-1.5 px-3 font-semibold text-slate-800">
                                                                {row.label}
                                                            </td>
                                                            <td className="p-1.5 text-center">
                                                                <Input 
                                                                    type="number"
                                                                    step={row.isPct ? "any" : undefined}
                                                                    data-req={row.joinKey}
                                                                    value={joinVal}
                                                                    onChange={e => setData(row.joinKey as any, e.target.value)}
                                                                    className="h-7 text-xs text-center bg-white font-medium border-slate-300 max-w-[160px] mx-auto"
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                            <td className="p-1.5 text-center">
                                                                <Input 
                                                                    type="number"
                                                                    step={row.isPct ? "any" : undefined}
                                                                    data-req={row.closeKey}
                                                                    value={closeVal}
                                                                    onChange={e => setData(row.closeKey as any, e.target.value)}
                                                                    className="h-7 text-xs text-center bg-white font-medium border-slate-300 max-w-[160px] mx-auto"
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                            <td className="p-1.5 text-center">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${diff.color}`}>
                                                                    {diff.text}{row.isPct && diff.text !== '-' ? '%' : ''}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. Rubrics Scoring Form (100 Marks) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div>
                                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' ? '৩. মূল্যায়নের ক্ষেত্র ও নির্দেশকসমূহ নম্বর প্রদান (মোট ১০০ নম্বর)' : '3. Evaluation Rubrics & Scoring (100 Marks)'}
                                    </CardTitle>
                                    <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                                        {lang === 'bn' 
                                            ? 'প্রতিটি নির্দেশকের জন্য নির্ধারিত সর্বোচ্চ নম্বরের মধ্যে প্রাপ্ত নম্বর প্রদান করুন' 
                                            : 'Input scores within max limits for each criteria'}
                                    </CardDescription>
                                </div>

                                {/* Running Score & Grade Summary Badge */}
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-600 font-semibold">প্রাপ্ত নম্বর:</span>
                                    <span className="text-sm font-extrabold text-emerald-700">{data.total_score} / ১০০</span>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentGrade.badgeVariant}`}>
                                        {currentGrade.labelBn}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4">
                                {formType === 'accountant' ? (
                                    <FormBIncrement 
                                        scores={data.scores} 
                                        invalidKeys={scoreGapKeys(liveGaps)}
                                        setScores={(sc: any) => setData('scores', sc)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                ) : formType === 'bm_and_above' ? (
                                    <FormCIncrement 
                                        scores={data.scores} 
                                        setScores={(sc: any) => setData('scores', sc)}
                                        invalidKeys={scoreGapKeys(liveGaps)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                ) : (
                                    <FormAIncrement 
                                        scores={data.scores} 
                                        setScores={(sc: any) => setData('scores', sc)}
                                        invalidKeys={scoreGapKeys(liveGaps)}
                                        lang={lang}
                                        structure={dynamicStructure}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. Supervisor Recommendation & Remarks */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4">
                                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' 
                                        ? '৪. বিগত ০৩ মাসের সার্বিক মূল্যায়নের প্রেক্ষিতে সুপারভাইজারের সুপারিশ' 
                                        : "4. Supervisor's Recommendation (Based on last 03 months)"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4 space-y-3">
                                {/* 3 Card Options in a Responsive Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                                        data.supervisor_recommendation === 'recommend_increment'
                                            ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="recommend_increment"
                                            checked={data.supervisor_recommendation === 'recommend_increment'}
                                            onChange={() => setData('supervisor_recommendation', 'recommend_increment')}
                                            className="w-4 h-4 text-emerald-600 mt-0.5"
                                        />
                                        <div>
                                            <span className="font-bold text-xs text-slate-900 block">
                                                বেতন বৃদ্ধির জন্য সুপারিশ করা হলো
                                            </span>
                                            <span className="text-[11px] text-slate-500">Recommend for Increment</span>
                                        </div>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                                        data.supervisor_recommendation === 'defer_increment'
                                            ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="defer_increment"
                                            checked={data.supervisor_recommendation === 'defer_increment'}
                                            onChange={() => setData('supervisor_recommendation', 'defer_increment')}
                                            className="w-4 h-4 text-amber-600 mt-0.5"
                                        />
                                        <div>
                                            <span className="font-bold text-xs text-slate-900 block">
                                                বেতন বৃদ্ধি স্থগিত রেখে পুনর্মূল্যায়ন করা হোক
                                            </span>
                                            <span className="text-[11px] text-slate-500">Defer Increment & Re-evaluate</span>
                                        </div>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                                        data.supervisor_recommendation === 'not_suitable'
                                            ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 text-rose-950 font-bold'
                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="supervisor_recommendation"
                                            value="not_suitable"
                                            checked={data.supervisor_recommendation === 'not_suitable'}
                                            onChange={() => setData('supervisor_recommendation', 'not_suitable')}
                                            className="w-4 h-4 text-rose-600 mt-0.5"
                                        />
                                        <div>
                                            <span className="font-bold text-xs text-slate-900 block">
                                                বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি দেওয়া যেতে পারে
                                            </span>
                                            <span className="text-[11px] text-slate-500">Not Suitable / Discharge</span>
                                        </div>
                                    </label>
                                </div>

                                {/* 4 Remarks Textareas in a Compact 2-column Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">উক্ত কর্মচারীর প্রধান শক্তি/দক্ষতা (Strength):</Label>
                                        <Textarea
                                            rows={2}
                                            data-req="strengths" value={data.strengths}
                                            onChange={e => setData('strengths', e.target.value)}
                                            className="bg-white border-slate-300 text-xs min-h-[46px]"
                                            placeholder="কর্মচারীর উল্লেখযোগ্য শক্তি বা দক্ষতা..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">দুর্বলতা/উন্নয়নের ক্ষেত্রসমূহ (Weakness/Area to Develop):</Label>
                                        <Textarea
                                            rows={2}
                                            data-req="weaknesses" value={data.weaknesses}
                                            onChange={e => setData('weaknesses', e.target.value)}
                                            className="bg-white border-slate-300 text-xs min-h-[46px]"
                                            placeholder="যেসব ক্ষেত্রে উন্নতি প্রয়োজন..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">প্রশিক্ষণের প্রয়োজন কি না (Training Need):</Label>
                                        <Textarea
                                            rows={2}
                                            data-req="training_need" value={data.training_need}
                                            onChange={e => setData('training_need', e.target.value)}
                                            className="bg-white border-slate-300 text-xs min-h-[46px]"
                                            placeholder="কোন বিষয়ে প্রশিক্ষণের প্রয়োজন..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">অন্যান্য মন্তব্য (যদি থাকে):</Label>
                                        <Textarea
                                            rows={2}
                                            data-req="other_remarks" value={data.other_remarks}
                                            onChange={e => setData('other_remarks', e.target.value)}
                                            className="bg-white border-slate-300 text-xs min-h-[46px]"
                                            placeholder="বিশেষ কোনো পর্যবেক্ষণ বা সুপারিশ..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sticky Bottom Action & Status Bar */}
                        <div className="sticky bottom-3 z-20 p-3 bg-white/95 backdrop-blur border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600">মোট প্রাপ্ত নম্বর:</span>
                                    <span className="text-base font-extrabold text-emerald-700">{data.total_score} / ১০০</span>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentGrade.badgeVariant}`}>
                                        {currentGrade.labelBn}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/probation-increment-evaluations">
                                    <Button type="button" variant="outline" className="text-xs h-8.5 border-slate-300 hover:bg-slate-50">
                                        {lang === 'bn' ? 'তালিকায় ফিরুন' : 'Back'}
                                    </Button>
                                </Link>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setViewMode('preview')}
                                    className="text-xs h-8.5 border-slate-300 hover:bg-slate-50"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    {lang === 'bn' ? 'প্রিভিউ দেখুন' : 'Preview'}
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8.5 px-5 font-bold shadow-xs"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    {processing 
                                        ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') 
                                        : (lang === 'bn' ? 'সংরক্ষণ ও প্রকাশ করুন' : 'Save & Publish')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
