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
import FormA from './components/FormA';
import FormB from './components/FormB';
import FormC from './components/FormC';
import MonthPickerSelect from '@/components/MonthPickerSelect';
import ConfirmationOfficialFormDocument from './components/ConfirmationOfficialFormDocument';
import { 
    calculateGrade,
    getFormStructure,
    formAStructure,
    formBStructure,
    formCStructure,
    toBn
} from './confirmation-config';
import { format } from 'date-fns';

interface EmployeeOption {
    id: number;
    pin: string;
    name_en: string;
    name_bn: string;
    designation_id: number;
    designation?: { id: number; name: string; title: string };
    branch?: { 
        id: number; 
        name: string; 
        is_head_office?: boolean;
        regional_office?: any; 
        regional_office_name?: string;
        zone?: any; 
        zone_name?: string;
    };
    joining_date?: string;
    probation_end_date?: string;
    educational_qualification?: string;
    employee_type?: { id: number; name: string };
}

interface CreateProps {
    employees: EmployeeOption[];
    templates?: any[];
}

export default function ConfirmationEvaluationCreate({ employees = [], templates = [] }: CreateProps) {
    const { auth } = usePage<SharedData>().props;
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

    const { data, setData, post, processing, errors } = useForm({
        employee_id: '',
        form_type: 'officer_abm' as 'officer_abm' | 'accountant' | 'bm_and_above',
        joining_date: '',
        probation_end_date: '',
        education_at_joining: '',
        education_current: '',
        closing_month: new Date().toISOString().slice(0, 7),
        
        // Comparative Stats (Joining vs Closing)
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

        // 4 Official Qualitative Questions
        strengths: '', // কাজের প্রতি আগ্রহ এবং দায়িত্ববোধ
        weaknesses: '', // সংস্থার নিয়ম-শৃঙ্খলা, আচরণবিধি ও মূল্যবোধের প্রতি দৃষ্টিভঙ্গি
        training_need: '', // ভবিষ্যতে উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা
        other_remarks: '', // অন্যান্য মূল্যায়ন বা মন্তব্য

        // Official Recommendation
        recommendation_status: 'recommended' as 'recommended' | 'extend_probation' | 'not_suitable',
        extend_probation_months: '3',
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const selectedEmployee = useMemo(() => 
        employees.find((e: any) => e.id.toString() === data.employee_id),
        [data.employee_id, employees]
    );

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

            setData(d => ({
                ...d,
                joining_date: formatForInput(selectedEmployee.joining_date) || '',
                probation_end_date: formatForInput(selectedEmployee.probation_end_date) || '',
                education_at_joining: selectedEmployee.educational_qualification || '',
                education_current: selectedEmployee.educational_qualification || '',
            }));
        }
    }, [selectedEmployee]);

    // Resolve structure: Check if database template exists, or fallback to config
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

    // Helper for difference (closing - joining)
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
        if (!data.employee_id) {
            errs.employee_id = lang === 'bn' ? 'অনুগ্রহ করে একজন কর্মী নির্বাচন করুন।' : 'Please select an employee.';
        }
        if (!data.closing_month) {
            errs.closing_month = lang === 'bn' ? 'ক্লোজিং মাস নির্বাচন আবশ্যক।' : 'Closing month is required.';
        }
        if (data.recommendation_status === 'extend_probation' && !data.extend_probation_months) {
            errs.extend_probation_months = lang === 'bn' ? 'বর্ধিত মাসের সংখ্যা উল্লেখ করুন।' : 'Specify number of months.';
        }

        // Validate max scores
        const scoreExceeds = (data.scores || []).some((s: any) => Number(s.obtained_score) > Number(s.max_score));
        if (scoreExceeds) {
            errs.scores = lang === 'bn' ? 'কোনো মানদণ্ডের নম্বর তার সর্বোচ্চ নম্বরের চেয়ে বেশি হতে পারবে না।' : 'A criterion score exceeds maximum score limit.';
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

        post('/confirmation-evaluations', {
            onError: () => {
                setViewMode('edit');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    // Helper for formatting date in candidate card
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
            probation_end_date: data.probation_end_date,
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
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            training_need: data.training_need,
            other_remarks: data.other_remarks,
            recommendation_status: data.recommendation_status,
            extend_probation_months: data.extend_probation_months,
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

    return (
        <Layout>
            <Head title={lang === 'bn' ? 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন ফরম' : 'Probation Confirmation Evaluation'} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner with Bilingual & Mode Switcher */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/confirmation-evaluations"
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
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {lang === 'bn' ? 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন ফরম প্রস্তুত' : 'Create Confirmation Evaluation'}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                {lang === 'bn' 
                                    ? 'কর্মকর্তা ও কর্মচারীদের শিক্ষানবিশকাল সমাপ্তির স্থায়ীকরণ মূল্যায়ন প্রস্তুত ও অনুমোদন প্রক্রিয়া' 
                                    : 'Prepare probation period confirmation appraisal and approval workflow'}
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

                        {/* Language Switch Toggle */}
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

                        {selectedEmployee && (
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
                        )}
                    </div>
                </div>

                {/* Conditional View: Live Official Preview vs Edit Form */}
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
                                    {lang === 'bn' ? 'সম্পাদনে ফিরে যান' : 'Back to Edit'}
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit} 
                                    disabled={processing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                >
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    {processing ? (lang === 'bn' ? 'দাখিল হচ্ছে...' : 'Submitting...') : (lang === 'bn' ? 'স্থায়ীকরণ মূল্যায়ন জমা দিন' : 'Submit Evaluation')}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200">
                            <ConfirmationOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
                        {/* Top Error Alert Banner */}
                        {Object.keys(mergedErrors).length > 0 && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-xs animate-in fade-in">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-red-900">{lang === 'bn' ? 'অনুগ্রহ করে ত্রুটিগুলো সংশোধন করুন:' : 'Please correct errors:'}</h4>
                                    <ul className="list-disc list-inside text-xs space-y-0.5 text-red-700">
                                        {Object.entries(mergedErrors).map(([key, msg]) => (
                                            <li key={key}>{msg as string}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Employee Selection & Basic Details */}
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <span>{lang === 'bn' ? '১. কর্মী নির্বাচন ও প্রাথমিক পরিচিতি' : '1. Candidate Selection & Overview'}</span>
                                </div>
                                <CardDescription>
                                    {lang === 'bn' 
                                        ? 'স্থায়ীকরণের যোগ্য শিক্ষানবিশকালের কর্মীদের তালিকা থেকে কর্মী নির্বাচন করুন' 
                                        : 'Select candidate currently under probation period'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="employee-select" className="text-slate-700 font-medium">
                                        {lang === 'bn' ? 'মূল্যায়নযোগ্য কর্মী নির্বাচন করুন' : 'Select Employee for Confirmation'} <span className="text-red-500">*</span>
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
                                            <SelectValue placeholder={lang === 'bn' ? 'কর্মী নির্বাচন করুন (পিন বা নাম)' : 'Select Employee (PIN or Name)'} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-80">
                                            {employees.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-slate-500">
                                                    {lang === 'bn' ? 'শিক্ষানবিশকালে কোনো সক্রিয় কর্মী পাওয়া যায়নি।' : 'No active probationary employees found.'}
                                                </div>
                                            ) : (
                                                employees.map((emp: any) => {
                                                    const empName = lang === 'bn' ? (emp.name_bn || emp.name_en) : emp.name_en;
                                                    const desig = emp.designation?.name || emp.designation?.title || 'No Designation';
                                                    const brName = emp.branch?.name || (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office');
                                                    const empType = emp.employee_type?.name || 'PROBATION';
                                                    return (
                                                        <SelectItem key={emp.id} value={emp.id.toString()}>
                                                            [{emp.pin}] {empName} — {desig} ({brName}) [{empType}]
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
                                        {/* Employee Profile Badges */}
                                        {(() => {
                                            const br = selectedEmployee.branch;
                                            const regName = br?.regionalOffice?.name || br?.regional_office?.name || br?.regional_office_name || (typeof br?.regional_office === 'string' ? br.regional_office : '') || (br?.is_head_office ? (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office') : '');
                                            const znName = br?.regionalOffice?.zone?.name || br?.regional_office?.zone?.name || br?.zone_name || (typeof br?.zone === 'string' ? br.zone : '') || (br?.is_head_office ? (lang === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office') : '');
                                            const edu = selectedEmployee.educational_qualification || data.education_current || '-';

                                            return (
                                                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'পদবী' : 'Designation'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
                                                            {selectedEmployee.designation?.name || '-'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'শাখা ও অঞ্চল' : 'Branch & Region'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                                            {br?.name || '-'} 
                                                            {regName ? ` (${regName})` : ''}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'জোন' : 'Zone'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                                            {znName || '-'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা' : 'Education'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-blue-900 mt-0.5 truncate" title={edu}>
                                                            {edu}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Award className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'কর্মীর ধরণ' : 'Employee Type'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                                                {selectedEmployee.employee_type?.name || 'PROBATION'}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Clock className="h-3.5 w-3.5 text-slate-400" /> {lang === 'bn' ? 'সম্ভাব্য সমাপ্তি' : 'Probation End'}
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-bold text-blue-700 mt-0.5">
                                                            {formatDisplayDate(selectedEmployee.probation_end_date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Editable Employee Qualifications & Dates */}
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
                                                    placeholder={lang === 'bn' ? 'যেমন: বি.এ / এম.এস.এস' : 'e.g. B.A / M.S.S'}
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
                                                    placeholder={lang === 'bn' ? 'যেমন: এম.এ / এম.বি.এ' : 'e.g. M.A / M.B.A'}
                                                    value={data.education_current} 
                                                    onChange={e => setData('education_current', e.target.value)} 
                                                    className="bg-white border-slate-300 text-xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {selectedEmployee && (
                            <>
                                {/* Step 2: Comparative Operational Performance Table */}
                                <Card className="border-slate-200 shadow-xs overflow-hidden">
                                    <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                                <span>
                                                    {lang === 'bn' ? '২. তুলনামূলক অর্জন ও পারফরম্যান্স মেট্রিক্স' : '2. Comparative Performance Metrics'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs text-slate-600 font-semibold shrink-0">
                                                    {lang === 'bn' ? 'ক্লোজিং মাস:' : 'Closing Month:'} <span className="text-red-500">*</span>
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
                                                    className={`h-8 min-w-[150px] ${mergedErrors.closing_month ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        <CardDescription>
                                            {formType === 'accountant' 
                                                ? (lang === 'bn' ? 'শাখার সর্বশেষ মাস ক্লোজিং অনুযায়ী অর্জন তথ্য লিখুন।' : 'Enter branch closing figures for accountant.')
                                                : (lang === 'bn' ? 'যোগদানের সময় এবং শিক্ষানবিশকাল সমাপ্তির সর্বশেষ মাস ক্লোজিং অনুযায়ী তথ্যের স্বয়ংক্রিয় তুলনামূলক হিসাব।' : 'Comparison between joining time and probation closing month figures.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 sm:p-5">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                                        <th className="p-3 font-bold w-2/5">
                                                            {lang === 'bn' ? 'সূচক / পারফরম্যান্স মেট্রিক্স' : 'Performance Parameter'}
                                                        </th>
                                                        {formType !== 'accountant' && (
                                                            <th className="p-3 font-bold text-center w-1/5">
                                                                {lang === 'bn' ? 'যোগদানের সময়' : 'At Joining'}
                                                            </th>
                                                        )}
                                                        <th className="p-3 font-bold text-center w-1/5">
                                                            {lang === 'bn' ? 'সমাপ্তির সময় (সর্বশেষ ক্লোজিং)' : 'At Probation End'}
                                                        </th>
                                                        {formType !== 'accountant' && (
                                                            <th className="p-3 font-bold text-center w-1/5">
                                                                {lang === 'bn' ? 'বৃদ্ধি / হ্রাস (পার্থক্য)' : 'Difference'}
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {/* 1. Members */}
                                                    <tr className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '১. সক্রিয় সদস্য সংখ্যা (জন)' : '1. Active Members (Count)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="0"
                                                                    value={data.joining_members_count} 
                                                                    onChange={e => setData('joining_members_count', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="0"
                                                                value={data.closing_members_count} 
                                                                onChange={e => setData('closing_members_count', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '২. ঋণী সদস্য সংখ্যা (জন)' : '2. Borrower Members (Count)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="0"
                                                                    value={data.joining_borrowers_count} 
                                                                    onChange={e => setData('joining_borrowers_count', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="0"
                                                                value={data.closing_borrowers_count} 
                                                                onChange={e => setData('closing_borrowers_count', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৩. মোট ঋণ স্থিতি (টাকা)' : '3. Total Loan Balance (Tk)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={data.joining_loan_balance} 
                                                                    onChange={e => setData('joining_loan_balance', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                value={data.closing_loan_balance} 
                                                                onChange={e => setData('closing_loan_balance', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৪. মোট সঞ্চয় স্থিতি (সকল কম্পোনেন্ট মোট টাকা)' : '4. Total Savings Balance (Tk)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={data.joining_savings_balance} 
                                                                    onChange={e => setData('joining_savings_balance', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                value={data.closing_savings_balance} 
                                                                onChange={e => setData('closing_savings_balance', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৫. মেয়াদোত্তীর্ণ ঋণী সংখ্যা (জন)' : '5. Overdue Borrowers (Count)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="0"
                                                                    value={data.joining_overdue_borrowers} 
                                                                    onChange={e => setData('joining_overdue_borrowers', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="0"
                                                                value={data.closing_overdue_borrowers} 
                                                                onChange={e => setData('closing_overdue_borrowers', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৬. মেয়াদোত্তীর্ণ ঋণ (টাকা)' : '6. Overdue Amount (Tk)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={data.joining_overdue_amount} 
                                                                    onChange={e => setData('joining_overdue_amount', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                value={data.closing_overdue_amount} 
                                                                onChange={e => setData('closing_overdue_amount', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৭. অন-টাইম আদায়ের হার OTR (%)' : '7. On-Time Recovery Rate OTR (%)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    placeholder="e.g. 99.5"
                                                                    value={data.joining_otr_pct} 
                                                                    onChange={e => setData('joining_otr_pct', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                placeholder="e.g. 99.8"
                                                                value={data.closing_otr_pct} 
                                                                onChange={e => setData('closing_otr_pct', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                        <td className="p-3 font-medium text-slate-800">
                                                            {lang === 'bn' ? '৮. পোর্টফোলিও এট রিস্ক PAR (%)' : '8. Portfolio At Risk PAR (%)'}
                                                        </td>
                                                        {formType !== 'accountant' && (
                                                            <td className="p-2 text-center">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    placeholder="e.g. 1.2"
                                                                    value={data.joining_par_pct} 
                                                                    onChange={e => setData('joining_par_pct', e.target.value)} 
                                                                    className="h-8 text-center text-xs bg-white border-slate-300"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                placeholder="e.g. 0.8"
                                                                value={data.closing_par_pct} 
                                                                onChange={e => setData('closing_par_pct', e.target.value)} 
                                                                className="h-8 text-center text-xs bg-white border-slate-300 font-bold"
                                                            />
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
                                                <CardDescription>
                                                    {lang === 'bn' 
                                                        ? 'নির্ধারিত ১০০ নম্বরের কাঠামোর প্রতিটি মানদণ্ডে নম্বর প্রদান করুন' 
                                                        : 'Score each criterion according to 100-mark rubric'}
                                                </CardDescription>
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

                                        {formType === 'bm_and_above' && (
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

                                {/* Step 4: 4 Official Questions (গুণগত মূল্যায়ন ও মন্তব্য) */}
                                <Card className="border-slate-200 shadow-xs overflow-hidden">
                                    <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            <span>{lang === 'bn' ? '৪. গুণগত মূল্যায়ন ও মন্তব্য' : '4. Qualitative Assessment & Remarks'}</span>
                                        </div>
                                        <CardDescription>
                                            {lang === 'bn' 
                                                ? 'অফিসিয়াল ফরমের ৪টি নির্ধারিত প্রশ্নের উত্তর ও মূল্যায়নকারীর মতামত প্রদান করুন' 
                                                : 'Answer the 4 official appraisal questions from official form'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {/* Q1 */}
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-800 text-xs font-bold leading-normal">
                                                {lang === 'bn' 
                                                    ? '১. শিক্ষানবিশকালে কর্মকর্তা/কর্মচারীর কাজের প্রতি আগ্রহ এবং দায়িত্ববোধ কেমন ছিল?' 
                                                    : '1. How was the employee\'s interest and sense of responsibility during probation?'}
                                            </Label>
                                            <Textarea 
                                                placeholder={lang === 'bn' ? 'কাজের প্রতি আগ্রহ ও দায়িত্ববোধ সম্পর্কে লিখুন...' : 'Enter remarks on interest and dedication...'} 
                                                value={data.strengths} 
                                                onChange={e => setData('strengths', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        {/* Q2 */}
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-800 text-xs font-bold leading-normal">
                                                {lang === 'bn' 
                                                    ? '২. সংস্থার নিয়ম-শৃঙ্খলা, আচরণবিধি ও মূল্যবোধের প্রতি তার দৃষ্টিভঙ্গি কেমন?' 
                                                    : '2. Attitude towards organizational discipline, code of conduct and core values:'}
                                            </Label>
                                            <Textarea 
                                                placeholder={lang === 'bn' ? 'শৃঙ্খলা ও মূল্যবোধের দৃষ্টিভঙ্গি লিখুন...' : 'Enter remarks on discipline and conduct...'} 
                                                value={data.weaknesses} 
                                                onChange={e => setData('weaknesses', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        {/* Q3 */}
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-800 text-xs font-bold leading-normal">
                                                {lang === 'bn' 
                                                    ? '৩. ভবিষ্যতে উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা কেমন?' 
                                                    : '3. Potential to assume higher responsibilities in future:'}
                                            </Label>
                                            <Textarea 
                                                placeholder={lang === 'bn' ? 'ভবিষ্যৎ নেতৃত্বের সম্ভাবনা সম্পর্কে লিখুন...' : 'Enter remarks on future potential...'} 
                                                value={data.training_need} 
                                                onChange={e => setData('training_need', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={3} 
                                            />
                                        </div>

                                        {/* Q4 */}
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-800 text-xs font-bold leading-normal">
                                                {lang === 'bn' 
                                                    ? '৪. কর্মকর্তা/কর্মচারী সম্পর্কে অন্যান্য কোনো মূল্যায়ন বা মন্তব্য (যদি থাকে):' 
                                                    : '4. Other remarks or assessment regarding the employee (if any):'}
                                            </Label>
                                            <Textarea 
                                                placeholder={lang === 'bn' ? 'অন্যান্য মন্তব্য লিখুন (ঐচ্ছিক)...' : 'Enter any other observations (optional)...'} 
                                                value={data.other_remarks} 
                                                onChange={e => setData('other_remarks', e.target.value)} 
                                                className="bg-white border-slate-300 text-xs" 
                                                rows={2} 
                                            />
                                        </div>

                                        {/* Recommendation */}
                                        <div className="pt-3 border-t border-slate-100">
                                            <Label className="text-slate-900 font-bold text-sm block mb-2">
                                                {lang === 'bn' ? '৫. মূল্যায়নকারীর চূড়ান্ত সুপারিশ' : '5. Official Confirmation Recommendation'} <span className="text-red-500">*</span>
                                            </Label>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {/* Option 1: Recommended */}
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

                                                {/* Option 2: Extend Probation */}
                                                <div 
                                                    onClick={() => {
                                                        setData('recommendation_status', 'extend_probation');
                                                        if (clientErrors.recommendation_status) {
                                                            setClientErrors(ce => {
                                                                const copy = { ...ce };
                                                                delete copy.recommendation_status;
                                                                return copy;
                                                            });
                                                        }
                                                    }}
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

                                                {/* Option 3: Not Suitable */}
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
                                                {lang === 'bn' ? 'নির্বাচিত কর্মী:' : 'Selected Candidate:'}
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
                                        <Link href="/confirmation-evaluations" className="hidden sm:inline-block">
                                            <Button type="button" variant="ghost" size="sm" className="text-xs h-9 text-slate-600">
                                                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                            </Button>
                                        </Link>
                                        <Button 
                                            type="submit" 
                                            size="sm"
                                            disabled={processing} 
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-xs flex items-center gap-1.5 flex-1 sm:flex-initial"
                                        >
                                            <Send className="h-4 w-4" />
                                            {processing ? (lang === 'bn' ? 'দাখিল হচ্ছে...' : 'Submitting...') : (lang === 'bn' ? 'স্থায়ীকরণ মূল্যায়ন জমা দিন' : 'Submit Evaluation')}
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
