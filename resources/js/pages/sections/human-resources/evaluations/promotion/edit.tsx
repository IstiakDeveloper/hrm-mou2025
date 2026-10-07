import { useState, useMemo, useEffect } from 'react';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Head, Link, router } from '@inertiajs/react';
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
    GraduationCap,
    Eye,
    Edit3,
    Save,
    ShieldCheck
} from 'lucide-react';
import { calculateServiceLengthFromDate } from '@/lib/utils';
import FormA from './components/FormA';
import FormB from './components/FormB';
import FormC from './components/FormC';
import OfficialFormDocument from './components/OfficialFormDocument';
import { evalTranslations, getFormName, getStructureForForm, getOperationalLabels } from './evaluation-config';
import { format } from 'date-fns';

export default function PromotionEvaluationEdit({ 
    evaluation,
    isReviewerEdit = false,
    returnComment = null,
    userHasSignature = false,
    templates = [],
}: any) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    const toggleLang = (newLang: 'bn' | 'en') => {
        setLang(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('eval_lang', newLang);
        }
    };

    const t = evalTranslations[lang];

    const { data, setData, put, processing, errors } = useForm({
        current_station_joining_date: evaluation.current_station_joining_date || '',
        service_length_current_post: evaluation.service_length_current_post || '',
        education_at_joining: evaluation.education_at_joining || '',
        education_current: evaluation.education_current || '',
        closing_month: evaluation.closing_month || '',
        members_count: evaluation.members_count ?? '',
        borrowers_count: evaluation.borrowers_count ?? '',
        loan_balance: evaluation.loan_balance ?? '',
        savings_balance: evaluation.savings_balance ?? '',
        overdue_borrowers: evaluation.overdue_borrowers ?? '',
        overdue_amount: evaluation.overdue_amount ?? '',
        otr_pct: evaluation.otr_pct ?? '',
        par_pct: evaluation.par_pct ?? '',
        has_cashier: Boolean(evaluation.has_cashier),
        total_score: evaluation.total_score || 0,
        calculated_grade: evaluation.calculated_grade || '',
        strengths: evaluation.strengths || '',
        weaknesses: evaluation.weaknesses || '',
        training_need: evaluation.training_need || '',
        recommendation_status: evaluation.recommendation_status || 'recommended',
        consider_after_months: evaluation.consider_after_months || '',
        hr_financial_irregularity: Boolean(evaluation.hr_financial_irregularity),
        hr_disciplinary_action: Boolean(evaluation.hr_disciplinary_action),
        hr_audit_objection: Boolean(evaluation.hr_audit_objection),
        hr_leave_without_pay: Boolean(evaluation.hr_leave_without_pay),
        hr_acr_satisfactory: Boolean(evaluation.hr_acr_satisfactory),
        scores: (evaluation.scores || []).map((s: any) => ({
            ...s,
            touched: true,
            raw_input: s.obtained_score !== undefined ? String(s.obtained_score) : '',
        })),
        submit_now: false,
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const selectedEmployee = evaluation.employee || {};
    const formType = evaluation.form_type;
    const opLabels = useMemo(() => getOperationalLabels(formType, lang), [formType, lang]);
    const dynamicStructure = useMemo(
        () => getStructureForForm(formType, templates),
        [formType, templates]
    );

    // Calculate total score & grade when scores change
    useEffect(() => {
        if (data.scores.length > 0) {
            const total = data.scores.reduce((sum: number, s: any) => sum + (Number(s.obtained_score) || 0), 0);
            let grade = 'not_satisfactory';
            if (total >= 85) grade = 'excellent';
            else if (total >= 65) grade = 'very_good';
            else if (total >= 50) grade = 'good';
            
            setData(d => ({ 
                ...d, 
                total_score: parseFloat(total.toFixed(2)), 
                calculated_grade: grade 
            }));
        }
    }, [data.scores]);

    const mergedErrors = { ...errors, ...clientErrors };

    const getGradeLabel = (g: string) => {
        if (g === 'excellent') return t.excellent;
        if (g === 'very_good') return t.veryGood;
        if (g === 'good') return t.good;
        if (g === 'not_satisfactory') return t.notSatisfactory;
        return t.pending;
    };

    const handleSave = (approveOrSubmit: boolean = false) => {
        const newErrors: Record<string, string> = {};

        if (!data.recommendation_status) {
            newErrors.recommendation_status = t.errRecommendation;
        }
        if (data.recommendation_status === 'consider_later' && !data.consider_after_months) {
            newErrors.consider_after_months = t.errConsiderMonths;
        }
        if (!data.scores || data.scores.length === 0) {
            newErrors.scores = t.errScores;
        }

        if (Object.keys(newErrors).length > 0) {
            setClientErrors(newErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (isReviewerEdit) {
            router.put(`/promotion-evaluations/${evaluation.id}`, {
                ...data,
                approve_now: approveOrSubmit,
                submit_now: false,
            });
        } else {
            router.put(`/promotion-evaluations/${evaluation.id}`, {
                ...data,
                submit_now: approveOrSubmit,
                approve_now: false,
            });
        }
    };

    const previewEvaluation = useMemo(() => {
        return {
            id: evaluation.id,
            form_type: formType,
            status: evaluation.status,
            current_station_joining_date: data.current_station_joining_date,
            service_length_current_post: data.service_length_current_post,
            education_at_joining: data.education_at_joining,
            education_current: data.education_current,
            closing_month: data.closing_month,
            members_count: data.members_count,
            borrowers_count: data.borrowers_count,
            loan_balance: data.loan_balance,
            savings_balance: data.savings_balance,
            overdue_borrowers: data.overdue_borrowers,
            overdue_amount: data.overdue_amount,
            otr_pct: data.otr_pct,
            par_pct: data.par_pct,
            has_cashier: data.has_cashier,
            total_score: data.total_score,
            calculated_grade: data.calculated_grade,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            training_need: data.training_need,
            recommendation_status: data.recommendation_status,
            consider_after_months: data.consider_after_months,
            scores: data.scores,
            initiator: evaluation.initiator,
            signatures: evaluation.signatures || [],
            created_at: evaluation.created_at,
        };
    }, [data, formType, evaluation]);

    const employeeName = lang === 'bn' 
        ? (selectedEmployee?.name_bn || selectedEmployee?.name_en || '') 
        : (selectedEmployee?.name_en || selectedEmployee?.name_bn || '');

    const designationName = lang === 'bn'
        ? (selectedEmployee?.designation?.name_bn || selectedEmployee?.designation?.name || selectedEmployee?.designation?.title || '')
        : (selectedEmployee?.designation?.name_en || selectedEmployee?.designation?.name || selectedEmployee?.designation?.title || '');

    const branchName = lang === 'bn'
        ? (selectedEmployee?.branch?.name_bn || selectedEmployee?.branch?.name || '')
        : (selectedEmployee?.branch?.name_en || selectedEmployee?.branch?.name || '');

    return (
        <Layout>
            <Head title={`${lang === 'bn' ? 'মূল্যায়ন খসড়া সম্পাদনা' : 'Edit Evaluation Draft'} - ${employeeName}`} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/promotion-evaluations/${evaluation.id}`}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Edit3 className="h-3.5 w-3.5" /> {lang === 'bn' ? 'খসড়া সম্পাদনা' : 'Edit Draft'}
                                </span>
                                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                                    {getFormName(formType, lang)}
                                </Badge>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {employeeName}
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                PIN: <span className="font-semibold text-slate-700">{selectedEmployee.pin}</span> • {designationName} • {branchName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Tab Toggle: Form vs Preview */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'edit'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{lang === 'bn' ? 'ফর্ম সম্পাদনা' : 'Edit Form'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                <span>{lang === 'bn' ? 'অফিসিয়াল প্রিভিউ' : 'Official Preview'}</span>
                            </button>
                        </div>

                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => toggleLang('bn')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleLang('en')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {/* View Mode: Live Official Form Document Preview */}
                {viewMode === 'preview' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-center justify-between">
                            <span>
                                {lang === 'bn' 
                                    ? 'ℹ️ এটি একটি লাইভ প্রিভিউ। ফর্মে কোনো পরিবর্তন করলে তা এখানে তাৎক্ষণিকভাবে প্রতিফলিত হবে।' 
                                    : 'ℹ️ This is a live preview. Any changes in the form will immediately reflect here.'}
                            </span>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setViewMode('edit')}
                                className="h-7 text-xs bg-white border-amber-300 text-amber-900"
                            >
                                {lang === 'bn' ? 'ফর্মে ফিরে যান' : 'Back to Edit'}
                            </Button>
                        </div>
                        <div className="bg-slate-100/70 p-2 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <OfficialFormDocument 
                                evaluation={previewEvaluation} 
                                lang={lang} 
                            />
                        </div>
                    </div>
                )}

                {/* View Mode: Form Edit Inputs */}
                {viewMode === 'edit' && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="space-y-6">
                        {/* Sent Back Alert (If Returned to Creator) */}
                        {returnComment && (
                            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/90 text-rose-900 shadow-sm flex items-start gap-3.5">
                                <div className="p-2 rounded-lg bg-rose-200 text-rose-800 shrink-0 mt-0.5">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h4 className="text-sm font-bold text-rose-950">
                                        {lang === 'bn' ? '⚠️ মূল্যায়নটি পর্যালোচকের দ্বারা সংশোধনের জন্য ফেরত পাঠানো হয়েছে' : '⚠️ Evaluation Sent Back for Revision'}
                                    </h4>
                                    <div className="text-xs text-rose-900 bg-white/80 p-2.5 rounded-lg border border-rose-200">
                                        <span className="font-bold">{lang === 'bn' ? 'পর্যালোচকের মন্তব্য: ' : 'Reviewer Comments: '}</span>
                                        "{returnComment}"
                                    </div>
                                    <p className="text-[11px] text-rose-800">
                                        {lang === 'bn' 
                                            ? 'অনুগ্রহ করে নিচে প্রয়োজনীয় তথ্য বা স্কোর সংশোধন করুন এবং সংশোধন শেষে "সংরক্ষণ ও আরএম সমীপে দাখিল করুন" বাটনে ক্লিক করুন।' 
                                            : 'Please correct the scores or information below, then click "Save & Submit to RM".'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reviewer Notice (When RM/Approver edits before approval) */}
                        {isReviewerEdit && (
                            <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/80 text-blue-900 shadow-sm flex items-start gap-3.5">
                                <div className="p-2 rounded-lg bg-blue-200 text-blue-800 shrink-0 mt-0.5">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h4 className="text-sm font-bold text-blue-950">
                                        {lang === 'bn' ? 'ℹ️ অনুমোদনের পূর্বে মূল্যায়ন পর্যালোচনা ও তথ্য সম্পাদনা' : 'ℹ️ Review & Edit Before Approval'}
                                    </h4>
                                    <p className="text-xs text-blue-800">
                                        {lang === 'bn' 
                                            ? 'আপনি বর্তমান পর্যায়ের অনুমোদক হিসেবে মূল্যায়নটির স্কোর বা তথ্য সংশোধন করছেন। সংশোধনের পর শুধু পরিবর্তন সংরক্ষণ করতে চাইলে "পরিবর্তন সংরক্ষণ করুন" বাটনে ক্লিক করুন অথবা এক ক্লিকেই অনুমোদন করতে "সংরক্ষণ ও অনুমোদন করুন" বাটনে ক্লিক করুন।' 
                                            : 'As the current reviewer, you can adjust scores or operational data. Click "Save Changes" to keep in review, or "Save & Approve" to immediately approve and forward.'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* Step 1: Employee Information (Editable fields) */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <User className="h-5 w-5 text-emerald-600" />
                                    <span>{t.employeeProfile}</span>
                                </div>
                                <CardDescription>
                                    {lang === 'bn' 
                                        ? 'কর্মীর প্রোফাইল ও অফিশিয়াল তথ্যাবলি (প্রয়োজনে সম্পাদনা করুন)' 
                                        : 'Employee profile & official details (Edit if needed)'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
                                    <div>
                                        <span className="text-slate-500 font-medium">{t.joiningDate}:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">
                                            {selectedEmployee.joining_date ? format(new Date(selectedEmployee.joining_date), 'dd/MM/yyyy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">{t.lastPromotionDate}:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">
                                            {selectedEmployee.last_promotion_date ? format(new Date(selectedEmployee.last_promotion_date), 'dd/MM/yyyy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">{t.branch}:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">{branchName}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">{t.designation}:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">{designationName}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {t.currentStationJoiningDate}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.current_station_joining_date} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                const autoCalc = calculateServiceLengthFromDate(val, lang === 'bn');
                                                setData(prev => ({
                                                    ...prev,
                                                    current_station_joining_date: val,
                                                    ...(autoCalc ? { service_length_current_post: autoCalc } : {})
                                                }));
                                            }} 
                                            placeholder="dd/mm/yyyy" 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {t.serviceLengthCurrentPost}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.service_length_current_post} 
                                            onChange={e => setData('service_length_current_post', e.target.value)} 
                                            placeholder={lang === 'bn' ? 'যেমন: ২ বছর ৪ মাস' : 'e.g. 2 Years 4 Months'} 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {t.educationAtJoining}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.education_at_joining} 
                                            onChange={e => setData('education_at_joining', e.target.value)} 
                                            placeholder={lang === 'bn' ? 'যেমন: এইচএসসি' : 'e.g. HSC'} 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {t.educationCurrent}
                                        </Label>
                                        <Input 
                                            type="text" 
                                            value={data.education_current} 
                                            onChange={e => setData('education_current', e.target.value)} 
                                            placeholder={lang === 'bn' ? 'যেমন: স্নাতক' : 'e.g. B.A / B.Sc'} 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 2: Operational Achievement */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    <span>{t.opAchievementHeader}</span>
                                </div>
                                <CardDescription>
                                    {t.opAchievementSub}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">
                                            {t.closingMonth} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            type="month" 
                                            value={data.closing_month} 
                                            onChange={e => {
                                                setData('closing_month', e.target.value);
                                                if (clientErrors.closing_month) {
                                                    setClientErrors(ce => {
                                                        const copy = { ...ce };
                                                        delete copy.closing_month;
                                                        return copy;
                                                    });
                                                }
                                            }} 
                                            className={`bg-white ${mergedErrors.closing_month ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400' : 'border-slate-300'}`}
                                        />
                                        {mergedErrors.closing_month && (
                                            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                {mergedErrors.closing_month}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.membersCount}</Label>
                                        <Input 
                                            type="number" 
                                            value={data.members_count} 
                                            onChange={e => setData('members_count', e.target.value)} 
                                            placeholder="0" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.borrowersCount}</Label>
                                        <Input 
                                            type="number" 
                                            value={data.borrowers_count} 
                                            onChange={e => setData('borrowers_count', e.target.value)} 
                                            placeholder="0" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.loanBalance}</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={data.loan_balance} 
                                            onChange={e => setData('loan_balance', e.target.value)} 
                                            placeholder="0.00" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.savingsBalance}</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={data.savings_balance} 
                                            onChange={e => setData('savings_balance', e.target.value)} 
                                            placeholder="0.00" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.overdueBorrowers}</Label>
                                        <Input 
                                            type="number" 
                                            value={data.overdue_borrowers} 
                                            onChange={e => setData('overdue_borrowers', e.target.value)} 
                                            placeholder="0" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.overdueAmount}</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={data.overdue_amount} 
                                            onChange={e => setData('overdue_amount', e.target.value)} 
                                            placeholder="0.00" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.otrPct}</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={data.otr_pct} 
                                            onChange={e => setData('otr_pct', e.target.value)} 
                                            placeholder="e.g. 99.5" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{opLabels.parPct}</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={data.par_pct} 
                                            onChange={e => setData('par_pct', e.target.value)} 
                                            placeholder="e.g. 1.2" 
                                            className="bg-white border-slate-300"
                                        />
                                    </div>

                                    {formType === 'accountant' && opLabels.hasCashier && (
                                        <div className="sm:col-span-2 lg:col-span-3 pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.has_cashier} 
                                                    onChange={e => setData('has_cashier', e.target.checked)} 
                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                                />
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {opLabels.hasCashier}
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 3: Dynamic Scorecard */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                            <Award className="h-5 w-5 text-emerald-600" />
                                            <span>{t.scorecardHeader}</span>
                                        </div>
                                        <CardDescription>
                                            {t.scorecardSub}
                                        </CardDescription>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-3">
                                        <div>
                                            <span className="text-[11px] text-slate-500 font-medium">{t.totalScoreObtained}</span>
                                            <div className="text-xl font-bold text-emerald-700">{Number(data.total_score || 0)} / 100</div>
                                        </div>
                                        <div className="h-8 w-px bg-emerald-200" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 font-medium">{t.calculatedGrade}</span>
                                            <div className="text-xs font-black uppercase text-slate-800">{getGradeLabel(data.calculated_grade)}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-5">
                                {mergedErrors.scores && (
                                    <p className="p-4 text-xs text-red-600 font-semibold flex items-center gap-1 border-b border-red-100 bg-red-50">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {mergedErrors.scores}
                                    </p>
                                )}

                                {formType === 'officer_abm' && (
                                    <FormA 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        lang={lang}
                                        setScores={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        onChange={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }} 
                                    />
                                )}

                                {formType === 'accountant' && (
                                    <FormB 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        hasCashier={data.has_cashier} 
                                        lang={lang}
                                        setScores={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        onChange={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }} 
                                    />
                                )}

                                {(formType === 'bm_and_above' || formType === 'bm_above') && (
                                    <FormC 
                                        scores={data.scores} 
                                        structure={dynamicStructure}
                                        lang={lang}
                                        setScores={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        onChange={(newScores: any[]) => {
                                            setData('scores', newScores);
                                            if (clientErrors.scores) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.scores;
                                                    return copy;
                                                });
                                            }
                                        }} 
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Step 4: Remarks & Recommendation */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                    <span>{t.remarksHeader}</span>
                                </div>
                                <CardDescription>
                                    {t.remarksSub}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{t.strengths}</Label>
                                        <Textarea 
                                            placeholder={t.strengthsPlaceholder} 
                                            value={data.strengths} 
                                            onChange={e => setData('strengths', e.target.value)} 
                                            rows={3} 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">{t.weaknesses}</Label>
                                        <Textarea 
                                            placeholder={t.weaknessesPlaceholder} 
                                            value={data.weaknesses} 
                                            onChange={e => setData('weaknesses', e.target.value)} 
                                            rows={3} 
                                            className="bg-white border-slate-300 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-slate-700 text-xs font-semibold">{t.trainingNeed}</Label>
                                    <Input 
                                        placeholder={t.trainingNeedPlaceholder} 
                                        value={data.training_need} 
                                        onChange={e => setData('training_need', e.target.value)} 
                                        className="bg-white border-slate-300 text-xs"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                    <Label className="text-slate-900 text-sm font-bold block mb-2">
                                        {t.recommendation} <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_status === 'recommended' 
                                                ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500' 
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="recommendation_status" 
                                                value="recommended" 
                                                checked={data.recommendation_status === 'recommended'} 
                                                onChange={e => setData('recommendation_status', e.target.value)} 
                                                className="text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">{t.recommended}</div>
                                                <div className="text-[11px] text-slate-500">{t.recommendedDesc}</div>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_status === 'consider_later' 
                                                ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500' 
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="recommendation_status" 
                                                value="consider_later" 
                                                checked={data.recommendation_status === 'consider_later'} 
                                                onChange={e => setData('recommendation_status', e.target.value)} 
                                                className="text-amber-600 focus:ring-amber-500"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">{t.considerLater}</div>
                                                <div className="text-[11px] text-slate-500">{t.considerLaterDesc}</div>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_status === 'not_suitable' 
                                                ? 'bg-rose-50/80 border-rose-500 ring-1 ring-rose-500' 
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="recommendation_status" 
                                                value="not_suitable" 
                                                checked={data.recommendation_status === 'not_suitable'} 
                                                onChange={e => setData('recommendation_status', e.target.value)} 
                                                className="text-rose-600 focus:ring-rose-500"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">{t.notSuitable}</div>
                                                <div className="text-[11px] text-slate-500">{t.notSuitableDesc}</div>
                                            </div>
                                        </label>
                                    </div>

                                    {data.recommendation_status === 'consider_later' && (
                                        <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 max-w-sm">
                                            <Label className="text-amber-900 text-xs font-semibold">
                                                {t.considerAfterMonths} <span className="text-red-500">*</span>
                                            </Label>
                                            <Input 
                                                type="number" 
                                                value={data.consider_after_months} 
                                                onChange={e => setData('consider_after_months', e.target.value)} 
                                                placeholder={t.considerAfterMonthsPlaceholder} 
                                                className="bg-white border-amber-300"
                                            />
                                            {mergedErrors.consider_after_months && (
                                                <p className="text-xs text-red-600 font-medium">
                                                    {mergedErrors.consider_after_months}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 5: HR Department Verification (If at HR Stage) */}
                        {evaluation.status === 'submitted_to_hr' && (
                            <Card className="border-purple-200 shadow-sm overflow-hidden bg-purple-50/20">
                                <CardHeader className="bg-purple-100/60 border-b border-purple-200/80 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-purple-950 font-semibold text-sm">
                                            <ShieldCheck className="h-5 w-5 text-purple-700" />
                                            <span>{t.hrChecklistTitle}</span>
                                        </div>
                                        <Badge className="bg-purple-600 text-white text-[10px]">
                                            {lang === 'bn' ? 'এইচআর বিভাগ' : 'HR Dept'}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-purple-800 text-xs">
                                        {lang === 'bn' ? 'নিচের যেকোনো একটি গত ০২ বছরের মধ্যে হয়েছে কি না?' : 'Has any of the following occurred within the last 02 years?'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-2xs">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-purple-100/70 text-purple-900 font-semibold">
                                                    <th className="p-2.5 text-left">{lang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                                                    <th className="p-2.5 text-center w-20">{lang === 'bn' ? 'হ্যাঁ' : 'Yes'}</th>
                                                    <th className="p-2.5 text-center w-20">{lang === 'bn' ? 'না' : 'No'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-purple-100">
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2.5 text-slate-800">১. {t.hrFinancialIrregularity}</td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_financial_irregularity" 
                                                            checked={data.hr_financial_irregularity === true} 
                                                            onChange={() => setData('hr_financial_irregularity', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_financial_irregularity" 
                                                            checked={data.hr_financial_irregularity === false} 
                                                            onChange={() => setData('hr_financial_irregularity', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2.5 text-slate-800">২. {t.hrDisciplinaryAction}</td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_disciplinary_action" 
                                                            checked={data.hr_disciplinary_action === true} 
                                                            onChange={() => setData('hr_disciplinary_action', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_disciplinary_action" 
                                                            checked={data.hr_disciplinary_action === false} 
                                                            onChange={() => setData('hr_disciplinary_action', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2.5 text-slate-800">৩. {t.hrAuditObjection}</td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_audit_objection" 
                                                            checked={data.hr_audit_objection === true} 
                                                            onChange={() => setData('hr_audit_objection', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_audit_objection" 
                                                            checked={data.hr_audit_objection === false} 
                                                            onChange={() => setData('hr_audit_objection', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2.5 text-slate-800">৪. {t.hrLeaveWithoutPay}</td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_leave_without_pay" 
                                                            checked={data.hr_leave_without_pay === true} 
                                                            onChange={() => setData('hr_leave_without_pay', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_leave_without_pay" 
                                                            checked={data.hr_leave_without_pay === false} 
                                                            onChange={() => setData('hr_leave_without_pay', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2.5 text-slate-800">৫. {t.hrAcrSatisfactory}</td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_acr_satisfactory" 
                                                            checked={data.hr_acr_satisfactory === true} 
                                                            onChange={() => setData('hr_acr_satisfactory', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="edit_hr_acr_satisfactory" 
                                                            checked={data.hr_acr_satisfactory === false} 
                                                            onChange={() => setData('hr_acr_satisfactory', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bottom Sticky Action Bar */}
                        <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                                <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500 font-medium">
                                        {lang === 'bn' ? 'বর্তমান মূল্যায়ন' : 'Current Evaluation'}
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                        [{evaluation.employee?.pin}] {lang === 'bn' ? (evaluation.employee?.name_bn || evaluation.employee?.name_en) : evaluation.employee?.name_en}
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold px-2.5 py-1 text-xs shrink-0">
                                    {lang === 'bn' ? 'মোট নম্বর: ' : 'Score: '}
                                    <span className="text-emerald-700 ml-1">{Number(data.total_score || 0)}/100</span>
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 justify-end">
                                <Link href={`/promotion-evaluations/${evaluation.id}`}>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="h-9 px-3 border-slate-300 text-slate-700 text-xs font-semibold"
                                    >
                                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                    </Button>
                                </Link>

                                <Button 
                                    type="button" 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSave(false)} 
                                    disabled={processing} 
                                    className="h-9 px-3.5 border-slate-300 text-slate-800 bg-white hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5"
                                >
                                    <Save className="h-3.5 w-3.5 text-slate-600" />
                                    <span>
                                        {isReviewerEdit
                                            ? (lang === 'bn' ? 'সংরক্ষণ' : 'Save Changes')
                                            : (lang === 'bn' ? 'খসড়া সংরক্ষণ' : 'Save Draft')}
                                    </span>
                                </Button>

                                <Button 
                                    type="button" 
                                    size="sm"
                                    onClick={() => handleSave(true)} 
                                    disabled={processing} 
                                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>
                                        {isReviewerEdit
                                            ? (lang === 'bn' ? 'অনুমোদন করুন' : 'Approve')
                                            : (lang === 'bn' ? 'দাখিল করুন' : 'Submit')}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
