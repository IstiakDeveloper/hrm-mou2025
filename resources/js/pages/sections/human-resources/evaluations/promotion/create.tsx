import { useState, useMemo, useEffect } from 'react';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Head, Link, usePage } from '@inertiajs/react';
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
    Clock, 
    FileText, 
    Send,
    Building2,
    Calendar,
    Briefcase,
    GraduationCap,
    Eye,
    Edit3
} from 'lucide-react';
import { calculateServiceLengthFromDate } from '@/lib/utils';
import FormA from './components/FormA';
import FormB from './components/FormB';
import FormC from './components/FormC';
import OfficialFormDocument from './components/OfficialFormDocument';
import MonthPickerSelect from '@/components/MonthPickerSelect';
import { evalTranslations, getFormName, getInitialScoresForForm, getStructureForForm, getOperationalLabels } from './evaluation-config';
import { format } from 'date-fns';

export default function PromotionEvaluationCreate({ employees = [], templates = [] }: any) {
    const { auth } = usePage<SharedData>().props;
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

    const { data, setData, post, processing, errors } = useForm({
        employee_id: '',
        current_station_joining_date: '',
        service_length_current_post: '',
        education_at_joining: '',
        education_current: '',
        closing_month: new Date().toISOString().slice(0, 7),
        members_count: '',
        borrowers_count: '',
        loan_balance: '',
        savings_balance: '',
        overdue_borrowers: '',
        overdue_amount: '',
        otr_pct: '',
        par_pct: '',
        has_cashier: false,
        total_score: 0,
        calculated_grade: '',
        strengths: '',
        weaknesses: '',
        training_need: '',
        recommendation_status: 'recommended',
        consider_after_months: '',
        scores: [] as any[],
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const selectedEmployee = useMemo(() => 
        employees.find((e: any) => e.id.toString() === data.employee_id),
        [data.employee_id, employees]
    );

    // Auto-populate employee profile fields when an employee is selected
    useEffect(() => {
        if (selectedEmployee) {
            const stationDate = selectedEmployee.current_station_joining_date || selectedEmployee.joining_date || '';
            const calculatedDuration = calculateServiceLengthFromDate(stationDate, lang === 'bn');
            setData(d => ({
                ...d,
                current_station_joining_date: stationDate,
                service_length_current_post: selectedEmployee.service_length_current_post || calculatedDuration || (lang === 'bn' ? '১ বছর' : '1 Year'),
                education_at_joining: selectedEmployee.educational_qualification || '',
                education_current: selectedEmployee.educational_qualification || '',
            }));
        }
    }, [selectedEmployee, lang]);

    const formType = useMemo(() => {
        if (!selectedEmployee) return null;
        const title = (selectedEmployee.designation?.name || selectedEmployee.designation?.title || '').toLowerCase();
        
        // 1. Assistant Branch Manager -> Form A (Officer & ABM)
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

        // Default -> Form A (Officer & ABM)
        return 'officer_abm';
    }, [selectedEmployee]);

    const opLabels = useMemo(() => getOperationalLabels(formType, lang), [formType, lang]);

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'N/A';
        const str = String(dateStr).trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            return str;
        }
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

    const dynamicStructure = useMemo(
        () => getStructureForForm(formType, templates),
        [formType, templates]
    );

    // Auto-populate scores when form type changes
    useEffect(() => {
        if (formType) {
            setData(d => ({
                ...d,
                scores: getInitialScoresForForm(formType, templates)
            }));
        } else {
            setData(d => ({ ...d, scores: [] }));
        }
    }, [formType, templates]);

    // Calculate total score & grade
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!data.employee_id) {
            newErrors.employee_id = t.errEmployee;
        }
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
            setViewMode('edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setClientErrors({});
        post('/promotion-evaluations', {
            onError: () => {
                setViewMode('edit');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    // Live preview object constructed in real-time
    const previewEvaluation = useMemo(() => {
        return {
            form_type: formType,
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
            current_station_joining_date: data.current_station_joining_date,
            service_length_current_post: data.service_length_current_post,
            education_at_joining: data.education_at_joining,
            education_current: data.education_current,
            total_score: data.total_score,
            calculated_grade: data.calculated_grade,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            training_need: data.training_need,
            recommendation_status: data.recommendation_status,
            consider_after_months: data.consider_after_months,
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

    return (
        <Layout>
            <Head title={t.pageTitle} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner with Bilingual & Mode Switcher */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/promotion-evaluations"
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="h-3.5 w-3.5" /> {t.badgeTitle}
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {t.pageTitle}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                {t.pageSubtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {/* Tab Switcher: Form Edit vs Official Preview */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    viewMode === 'edit' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{t.editFormTab}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{t.livePreviewTab}</span>
                            </button>
                        </div>

                        {/* Language Switch Toggle */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => toggleLang('bn')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        {selectedEmployee && (
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-medium">{t.liveScore}</div>
                                    <div className="text-base font-black text-emerald-600 leading-tight">
                                        {Number(data.total_score || 0)} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-slate-200" />
                                <div>
                                    <div className="text-[10px] text-slate-500 font-medium">{t.grade}</div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                        {getGradeLabel(data.calculated_grade)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Conditional View: Live Official Preview vs Edit Form */}
                {viewMode === 'preview' ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-950">
                                        {lang === 'bn' ? 'অফিসিয়াল ফরম লাইভ প্রিভিউ' : 'Official Appraisal Form Live Preview'}
                                    </h4>
                                    <p className="text-[11px] text-emerald-700">
                                        {lang === 'bn' ? 'ফরমের সব ইনপুট রিয়েলটাইমে প্রদর্শিত হচ্ছে। আপনি সরাসরি এখান থেকেও সাবমিট করতে পারবেন।' : 'All inputs are mapped in real-time. You can submit directly from here or return to edit.'}
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
                                    {t.backToEdit}
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit} 
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold shadow-sm"
                                >
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    {processing ? t.submitting : t.submit}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200">
                            <OfficialFormDocument evaluation={previewEvaluation} lang={lang} isLivePreview={true} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
                        {/* Top Error Alert Banner */}
                        {Object.keys(mergedErrors).length > 0 && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-sm animate-in fade-in">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-red-900">{t.reviewErrorsTitle}</h4>
                                    <ul className="list-disc list-inside text-xs space-y-0.5 text-red-700">
                                        {Object.entries(mergedErrors).map(([key, msg]) => (
                                            <li key={key}>{msg as string}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Employee Selection & 1st Section Details */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <User className="h-5 w-5 text-emerald-600" />
                                    <span>{t.selectEmployeeHeader}</span>
                                </div>
                                <CardDescription>
                                    {t.selectEmployeeSub}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="employee-select" className="text-slate-700 font-medium">
                                        {t.selectEmployeeLabel} <span className="text-red-500">*</span>
                                    </Label>
                                    <Select 
                                        value={data.employee_id} 
                                        onValueChange={(v) => {
                                            setData('employee_id', v);
                                            if (clientErrors.employee_id) {
                                                setClientErrors(ce => {
                                                    const copy = { ...ce };
                                                    delete copy.employee_id;
                                                    return copy;
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="employee-select" className={`h-11 bg-white ${mergedErrors.employee_id ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'}`}>
                                            <SelectValue placeholder={t.selectEmployeePlaceholder} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-80">
                                            {employees.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-slate-500">
                                                    {t.noEmployeesFound}
                                                </div>
                                            ) : (
                                                employees.map((emp: any) => {
                                                    const empName = lang === 'bn' ? (emp.name_bn || emp.name_en) : emp.name_en;
                                                    const desig = emp.designation?.name || emp.designation?.title || 'No Designation';
                                                    const brName = emp.branch?.name || (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office');
                                                    return (
                                                        <SelectItem key={emp.id} value={emp.id.toString()}>
                                                            [{emp.pin}] {empName} — {desig} ({brName})
                                                        </SelectItem>
                                                    );
                                                })
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {mergedErrors.employee_id && (
                                        <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {mergedErrors.employee_id}
                                        </p>
                                    )}
                                </div>
                                
                                {selectedEmployee && (
                                    <>
                                        {/* Employee Basic Badges */}
                                        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {t.designation}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                                                    {selectedEmployee.designation?.name || selectedEmployee.designation?.title || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> {t.branch}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                                                    {selectedEmployee.branch?.name || (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> {t.joiningDate}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">
                                                    {formatDate(selectedEmployee.joining_date)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <FileText className="h-3.5 w-3.5 text-slate-400" /> {t.evaluationForm}
                                                </span>
                                                <div className="mt-0.5">
                                                    <Badge className="bg-emerald-600 text-white font-medium hover:bg-emerald-700">
                                                        {formType ? formType.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="col-span-2 md:col-span-4 pt-2 border-t border-emerald-200/50 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <span>{t.autoLoadedScorecard} {getFormName(formType, lang)}</span>
                                            </div>
                                        </div>

                                        {/* 1st Section Detailed Profile Inputs (Matching User's Provided Image) */}
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                <GraduationCap className="h-4 w-4 text-emerald-600" />
                                                <span>
                                                    {lang === 'bn' 
                                                        ? '১ম সেকশন: শিক্ষাগত যোগ্যতা ও কর্মকাল সংক্রান্ত তথ্য (প্রয়োজনে হালনাগাদ করুন)' 
                                                        : 'Section 1: Education & Service Duration Details (Review or update)'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {/* 1. Educational Qualification (At Joining) */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-slate-700 text-xs font-semibold">
                                                        {t.educationAtJoining}
                                                    </Label>
                                                    <Input 
                                                        type="text" 
                                                        placeholder={lang === 'bn' ? 'যেমন: এইচএসসি / ডিগ্রি / অনার্স' : 'e.g. HSC / BA / B.Sc'}
                                                        value={data.education_at_joining} 
                                                        onChange={e => setData('education_at_joining', e.target.value)} 
                                                        className="bg-white border-slate-300 text-xs h-9"
                                                    />
                                                </div>

                                                {/* 2. Educational Qualification (Current) */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-slate-700 text-xs font-semibold">
                                                        {t.educationCurrent}
                                                    </Label>
                                                    <Input 
                                                        type="text" 
                                                        placeholder={lang === 'bn' ? 'যেমন: মাস্টার্স / এমবিএ' : 'e.g. Masters / MBA'}
                                                        value={data.education_current} 
                                                        onChange={e => setData('education_current', e.target.value)} 
                                                        className="bg-white border-slate-300 text-xs h-9"
                                                    />
                                                </div>

                                                {/* 3. Current Station Joining Date */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-slate-700 text-xs font-semibold">
                                                        {t.currentStationJoiningDate}
                                                    </Label>
                                                    <Input 
                                                        type="text" 
                                                        placeholder="DD/MM/YYYY"
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
                                                        className="bg-white border-slate-300 text-xs h-9 font-mono"
                                                    />
                                                </div>

                                                {/* 4. Total Service Length in Current Post */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-slate-700 text-xs font-semibold">
                                                        {t.serviceLengthCurrentPost}
                                                    </Label>
                                                    <Input 
                                                        type="text" 
                                                        placeholder={lang === 'bn' ? 'যেমন: ২ বছর ৩ মাস' : 'e.g. 2 Years 3 Months'}
                                                        value={data.service_length_current_post} 
                                                        onChange={e => setData('service_length_current_post', e.target.value)} 
                                                        className="bg-white border-slate-300 text-xs h-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {formType && (
                            <>
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
                                                    {opLabels.closingMonth} <span className="text-red-500">*</span>
                                                </Label>
                                                <MonthPickerSelect 
                                                    value={data.closing_month} 
                                                    onChange={val => {
                                                        setData('closing_month', val);
                                                        if (clientErrors.closing_month) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.closing_month;
                                                                return copy;
                                                            });
                                                        }
                                                    }} 
                                                    lang={lang}
                                                    className={`bg-white w-full h-9 ${mergedErrors.closing_month ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'}`}
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
                                                            checked={Boolean(data.has_cashier)} 
                                                            onChange={e => setData('has_cashier', e.target.checked as any)} 
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
                                                setScores={(newScores: any) => {
                                                    setData('scores', newScores);
                                                    if (clientErrors.scores) {
                                                        setClientErrors(ce => {
                                                            const copy = { ...ce };
                                                            delete copy.scores;
                                                            return copy;
                                                        });
                                                    }
                                                }}
                                                onChange={(newScores: any) => {
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
                                                setScores={(newScores: any) => {
                                                    setData('scores', newScores);
                                                    if (clientErrors.scores) {
                                                        setClientErrors(ce => {
                                                            const copy = { ...ce };
                                                            delete copy.scores;
                                                            return copy;
                                                        });
                                                    }
                                                }}
                                                onChange={(newScores: any) => {
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

                                        {((formType as string) === 'bm_and_above' || (formType as string) === 'bm_above') && (
                                            <FormC 
                                                scores={data.scores} 
                                                structure={dynamicStructure}
                                                lang={lang}
                                                setScores={(newScores: any) => {
                                                    setData('scores', newScores);
                                                    if (clientErrors.scores) {
                                                        setClientErrors(ce => {
                                                            const copy = { ...ce };
                                                            delete copy.scores;
                                                            return copy;
                                                        });
                                                    }
                                                }}
                                                onChange={(newScores: any) => {
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
                                    <CardContent className="p-5 space-y-5">
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-700 text-xs font-semibold">{t.strengths}</Label>
                                            <Textarea 
                                                placeholder={t.strengthsPlaceholder} 
                                                value={data.strengths} 
                                                onChange={e => setData('strengths', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-slate-700 text-xs font-semibold">{t.weaknesses}</Label>
                                            <Textarea 
                                                placeholder={t.weaknessesPlaceholder} 
                                                value={data.weaknesses} 
                                                onChange={e => setData('weaknesses', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-slate-700 text-xs font-semibold">{t.trainingNeed}</Label>
                                            <Textarea 
                                                placeholder={t.trainingNeedPlaceholder} 
                                                value={data.training_need} 
                                                onChange={e => setData('training_need', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <Label className="text-slate-900 font-bold text-sm block mb-2">
                                                {t.recommendation} <span className="text-red-500">*</span>
                                            </Label>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div 
                                                    onClick={() => {
                                                        setData('recommendation_status', 'recommended');
                                                        if (clientErrors.recommendation_status) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.recommendation_status;
                                                                return copy;
                                                            });
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                        data.recommendation_status === 'recommended'
                                                            ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                                                        <CheckCircle2 className={`h-4 w-4 ${data.recommendation_status === 'recommended' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                        {t.recommended}
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {t.recommendedDesc}
                                                    </p>
                                                </div>

                                                <div 
                                                    onClick={() => {
                                                        setData('recommendation_status', 'consider_later');
                                                        if (clientErrors.recommendation_status) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.recommendation_status;
                                                                return copy;
                                                            });
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                        data.recommendation_status === 'consider_later'
                                                            ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                                                        <Clock className={`h-4 w-4 ${data.recommendation_status === 'consider_later' ? 'text-amber-500' : 'text-slate-400'}`} />
                                                        {t.considerLater}
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {t.considerLaterDesc}
                                                    </p>
                                                </div>

                                                <div 
                                                    onClick={() => {
                                                        setData('recommendation_status', 'not_suitable');
                                                        if (clientErrors.recommendation_status) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.recommendation_status;
                                                                return copy;
                                                            });
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                        data.recommendation_status === 'not_suitable'
                                                            ? 'border-rose-500 bg-rose-50/60 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                                                        <AlertCircle className={`h-4 w-4 ${data.recommendation_status === 'not_suitable' ? 'text-rose-500' : 'text-slate-400'}`} />
                                                        {t.notSuitable}
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {t.notSuitableDesc}
                                                    </p>
                                                </div>
                                            </div>
                                            {mergedErrors.recommendation_status && (
                                                <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    {mergedErrors.recommendation_status}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {data.recommendation_status === 'consider_later' && (
                                            <div className="space-y-1.5 p-4 bg-amber-50/50 border border-amber-200 rounded-lg max-w-sm">
                                                <Label className="text-xs font-semibold text-amber-900">{t.considerAfterMonths} <span className="text-red-500">*</span></Label>
                                                <Input 
                                                    type="number" 
                                                    placeholder={t.considerAfterMonthsPlaceholder} 
                                                    value={data.consider_after_months} 
                                                    onChange={e => {
                                                        setData('consider_after_months', e.target.value);
                                                        if (clientErrors.consider_after_months) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.consider_after_months;
                                                                return copy;
                                                            });
                                                        }
                                                    }} 
                                                    className={`bg-white ${mergedErrors.consider_after_months ? 'border-red-400 ring-1 ring-red-400' : 'border-amber-300'}`}
                                                />
                                                {mergedErrors.consider_after_months && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                        {mergedErrors.consider_after_months}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Bottom Sticky Bar */}
                                <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                    <div className="flex items-center justify-between sm:justify-start gap-3">
                                        <div className="min-w-0">
                                            <div className="text-[11px] text-slate-500 font-medium">{t.selectedStaff}</div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                                                [{selectedEmployee?.pin}] {lang === 'bn' ? (selectedEmployee?.name_bn || selectedEmployee?.name_en) : selectedEmployee?.name_en}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold px-2.5 py-1 text-xs shrink-0">
                                            {t.score}: <span className="text-emerald-700 ml-1">{Number(data.total_score || 0)}/100</span>
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
                                            <Eye className="h-4 w-4 text-emerald-600" />
                                            <span>{t.livePreviewTab}</span>
                                        </Button>
                                        <Link href="/promotion-evaluations" className="hidden sm:inline-block">
                                            <Button type="button" variant="ghost" size="sm" className="text-xs h-9 text-slate-600">
                                                {t.cancel}
                                            </Button>
                                        </Link>
                                        <Button 
                                            type="submit" 
                                            size="sm"
                                            disabled={processing} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-sm flex items-center gap-1.5 flex-1 sm:flex-initial"
                                        >
                                            <Send className="h-4 w-4" />
                                            {processing ? t.submitting : t.submit}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
