import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { initiatorGaps } from '@/lib/appraisal-required';
import { MissingFieldsAlert, scrollToMissingFields } from '@/components/appraisal/MissingFieldsAlert';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    TRAINEE_FORM_CONFIGS, 
    QUALITATIVE_RATING_OPTIONS,
    calculateTraineeGrade, 
    TRAINEE_RECOMMENDATION_OPTIONS,
    formatClosingMonth,
} from './trainee-config';
import { AppraisalEmployeeCombo } from '@/components/appraisal/AppraisalEmployeeCombo';
const TraineeOfficialFormDocument = lazy(() => import('./components/TraineeOfficialFormDocument'));
import MonthPickerSelect from '@/components/MonthPickerSelect';
import { 
    FileText, 
    Award, 
    Save, 
    ArrowLeft, 
    Eye, 
    Edit3, 
    AlertCircle, 
    UserCheck,
    CheckCircle2,
    Calendar,
    Sparkles,
    Check,
    Search,
    ChevronRight,
    Building2,
    MapPin,
    BadgeCheck
} from 'lucide-react';

interface CreateProps {
    employeeLookupUrl?: string;
    templates?: any[];
    branches: any[];
    currentUserBranch?: any;
    userHasSignature?: boolean;
}

export default function TraineeEvaluationCreate({
    employeeLookupUrl = '/trainee-evaluations/employees/lookup',
    templates = [],
    branches = [],
    currentUserBranch,
    userHasSignature = false,
}: CreateProps) {
    const [lang, setLang] = useState<'bn' | 'en'>('bn');
    const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');
    const [formType, setFormType] = useState<'officer_abm' | 'accountant' | 'bm_and_above'>('officer_abm');

    const config = TRAINEE_FORM_CONFIGS[formType] || TRAINEE_FORM_CONFIGS.officer_abm;

    // Helper to get rubrics dynamically from database templates if available, falling back to static config
    const getRubricsForType = (type: string) => {
        const codeMap: Record<string, string> = {
            officer_abm: 'trainee_officer_abm',
            accountant: 'trainee_accountant',
            bm_and_above: 'trainee_bm_and_above',
        };
        const templateCode = codeMap[type] || `trainee_${type}`;
        const template = templates?.find((t: any) => t.code === templateCode);
        if (template && template.sections && template.sections.length > 0) {
            const allCriteria = template.sections.flatMap((s: any) => s.criteria || []);
            if (allCriteria.length > 0) {
                return allCriteria.map((c: any, idx: number) => ({
                    sl_no: c.order ?? (idx + 1),
                    key: c.criteria_key || c.key || `crit_${c.id}`,
                    nameBn: c.name_bn || c.title_bn || c.name_en || '',
                    maxScore: Number(c.max_score ?? c.max_marks ?? 0),
                }));
            }
        }
        const conf = TRAINEE_FORM_CONFIGS[type] || TRAINEE_FORM_CONFIGS.officer_abm;
        return conf.rubrics.map((r: any, idx: number) => ({
            sl_no: r.sl_no ?? (idx + 1),
            key: r.key,
            nameBn: r.nameBn,
            maxScore: Number(r.maxScore ?? 0),
        }));
    };

    const currentRubrics = useMemo(() => {
        return getRubricsForType(formType);
    }, [templates, formType]);

    // Helper to build initial scores array
    const buildInitialScores = (type: string) => {
        const rubrics = getRubricsForType(type);
        return rubrics.map((r: any) => ({
            sl_no: r.sl_no,
            criteria_key: r.key,
            criteria_name: r.nameBn,
            max_score: r.maxScore,
            score: '',
        }));
    };

    // Helper to build initial qualitative ratings array
    const buildInitialRatings = (type: string) => {
        const conf = TRAINEE_FORM_CONFIGS[type] || TRAINEE_FORM_CONFIGS.officer_abm;
        return conf.qualitativeIndicators.map((q) => ({
            sl_no: q.sl_no,
            indicator_key: q.key,
            indicator_name: q.nameBn,
            rating: 'good',
        }));
    };

    const { data, setData, post, processing, errors } = useForm({
        form_type: formType,
        employee_id: '' as any,
        
        // Candidate Textual Info
        candidate_name: '',
        designation_name: '',
        pin: '',
        branch_name: currentUserBranch?.name || '',
        regional_office_name: currentUserBranch?.regional_office?.name || '',
        zone_name: currentUserBranch?.regional_office?.zone?.name || '',
        branch_id: currentUserBranch?.id || ('' as any),
        regional_office_id: currentUserBranch?.regional_office_id || ('' as any),
        zone_id: currentUserBranch?.regional_office?.zone_id || ('' as any),
        
        evaluation_month: new Date().toISOString().slice(0, 7),
        training_joining_date: '',
        training_completion_date: '',
        
        // Scoring & Rubrics
        scores: buildInitialScores(formType),
        ratings: buildInitialRatings(formType),
        total_score: 0,
        calculated_grade: 'not_satisfactory',
        other_remarks: '',
        
        // 1st Supervisor Recommendation
        recommendation_type: 'recommend_appointment',
        extension_days: '' as any,
        supervisor_remarks: '',
    });

    // When formType changes, reset rubrics and ratings according to new role
    const handleFormTypeChange = (newType: 'officer_abm' | 'accountant' | 'bm_and_above') => {
        setFormType(newType);
        setData((prev) => ({
            ...prev,
            form_type: newType,
            scores: buildInitialScores(newType),
            ratings: buildInitialRatings(newType),
            total_score: 0,
            calculated_grade: 'not_satisfactory',
        }));
    };

    // Employee selector helper
    const handleEmployeeSelect = (emp: any | null) => {
        if (!emp) {
            setData((prev) => ({
                ...prev,
                employee_id: '',
            }));
            return;
        }

        const desigName = emp.designation?.name || emp.designation?.title || '';
        const brName = emp.branch?.name || '';
        const regName = emp.branch?.regional_office?.name || '';
        const zName = emp.branch?.regional_office?.zone?.name || '';

        // Auto-detect form type if possible
        let detectedType: 'officer_abm' | 'accountant' | 'bm_and_above' = formType;
        const lowerDesig = desigName.toLowerCase();
        if (lowerDesig.includes('accountant') || lowerDesig.includes('হিসাবরক্ষক')) {
            detectedType = 'accountant';
        } else if (
            lowerDesig.includes('branch manager') || 
            lowerDesig.includes('শাখা ব্যবস্থাপক') || 
            lowerDesig.includes('regional manager')
        ) {
            if (!lowerDesig.includes('assistant') && !lowerDesig.includes('সহকারী')) {
                detectedType = 'bm_and_above';
            }
        }

        if (detectedType !== formType) {
            setFormType(detectedType);
        }

        setData((prev) => ({
            ...prev,
            employee_id: emp.id,
            form_type: detectedType,
            candidate_name: emp.name_bn || emp.name_en || prev.candidate_name,
            designation_name: desigName || prev.designation_name,
            pin: emp.pin || prev.pin,
            branch_name: brName || prev.branch_name,
            regional_office_name: regName || prev.regional_office_name,
            zone_name: zName || prev.zone_name,
            branch_id: emp.branch?.id || prev.branch_id,
            regional_office_id: emp.branch?.regional_office_id || prev.regional_office_id,
            zone_id: emp.branch?.regional_office?.zone_id || prev.zone_id,
            training_joining_date: emp.joining_date || prev.training_joining_date,
            scores: detectedType !== formType ? buildInitialScores(detectedType) : prev.scores,
            ratings: detectedType !== formType ? buildInitialRatings(detectedType) : prev.ratings,
        }));
    };

    // Auto-populate Region and Zone when branch is selected or typed
    const handleBranchChange = (branchIdentifier: string) => {
        const branch = branches.find(
            (b) => String(b.id) === String(branchIdentifier) || b.name.toLowerCase() === branchIdentifier.toLowerCase().trim()
        );

        if (branch) {
            const reg = branch.regionalOffice || branch.regional_office;
            const regName = reg?.name || '';
            const zName = reg?.zone?.name || '';
            setData((prev) => ({
                ...prev,
                branch_id: branch.id,
                branch_name: branch.name,
                regional_office_id: reg?.id || branch.regional_office_id || prev.regional_office_id,
                regional_office_name: regName || prev.regional_office_name,
                zone_id: reg?.zone?.id || reg?.zone_id || prev.zone_id,
                zone_name: zName || prev.zone_name,
            }));
        } else {
            setData((prev) => ({
                ...prev,
                branch_name: branchIdentifier,
            }));
        }
    };

    // Calculate total score automatically whenever scores change
    useEffect(() => {
        const total = data.scores.reduce((sum, item) => {
            const val = parseFloat(String(item.score));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        const safeTotal = isNaN(total) ? 0 : Math.min(100, Math.max(0, parseFloat(total.toFixed(2))));
        const gradeConfig = calculateTraineeGrade(safeTotal);
        setData((prev) => ({
            ...prev,
            total_score: safeTotal,
            calculated_grade: gradeConfig.grade,
        }));
    }, [data.scores]);

    const handleScoreChange = (criteriaKey: string, val: string) => {
        const foundRubric = currentRubrics.find((r: any) => r.key === criteriaKey);
        const maxScore = Number(foundRubric?.maxScore) || 100;
        let numVal: number | string = '';
        if (val !== '') {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) {
                numVal = Math.max(0, Math.min(maxScore, parsed));
            }
        }

        setData('scores', data.scores.map((s) => {
            if (s.criteria_key === criteriaKey) {
                return { ...s, score: numVal };
            }
            return s;
        }));
    };

    const handleRatingChange = (indicatorKey: string, ratingVal: any) => {
        setData('ratings', data.ratings.map((r) => {
            if (r.indicator_key === indicatorKey) {
                return { ...r, rating: ratingVal };
            }
            return r;
        }));
    };

    const [attempted, setAttempted] = useState(false);
    const liveGaps = useMemo(
        () => (attempted ? initiatorGaps('trainee', data, lang, formType) : []),
        [attempted, data, lang, formType],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const gaps = initiatorGaps('trainee', data, lang, formType);
        setAttempted(true);
        if (gaps.length > 0) {
            scrollToMissingFields();
            return;
        }
        post('/trainee-evaluations');
    };

    // Prepare memoized preview evaluation object
    const previewEvaluation = useMemo(() => {
        return {
            form_type: formType,
            candidate_name: data.candidate_name,
            designation_name: data.designation_name,
            pin: data.pin,
            branch_name: data.branch_name,
            regional_office_name: data.regional_office_name,
            zone_name: data.zone_name,
            evaluation_month: data.evaluation_month,
            training_joining_date: data.training_joining_date,
            training_completion_date: data.training_completion_date,
            total_score: data.total_score,
            calculated_grade: data.calculated_grade,
            other_remarks: data.other_remarks,
            recommendation_type: data.recommendation_type,
            extension_days: data.extension_days,
            supervisor_remarks: data.supervisor_remarks,
            scores: data.scores,
            ratings: data.ratings,
            signatures: [],
        };
    }, [data, formType]);

    const currentGrade = calculateTraineeGrade(data.total_score);

    return (
        <Layout>
            <Head title={lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন ফরম পূরণ' : 'Create Trainee Evaluation'} />
            
            <PageSurface className="space-y-4 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Link href="/trainee-evaluations">
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-white border-slate-300 hover:bg-slate-50">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'তালিকায় ফিরুন' : 'Back'}
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-emerald-600" />
                                    {lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন ফরম' : 'New Trainee Evaluation'}
                                </h1>
                                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {formType === 'officer_abm' && 'অফিসার ও সহকারী শাখা ব্যবস্থাপক (৭টি সূচক)'}
                                    {formType === 'accountant' && 'হিসাবরক্ষক (১০টি সূচক)'}
                                    {formType === 'bm_and_above' && 'শাখা ব্যবস্থাপক ও তদূর্ধ্ব (৮টি সূচক)'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                {lang === 'bn' 
                                    ? 'প্রশিক্ষণার্থীর সার্বিক মূল্যায়ন ও তত্ত্বাবধায়কের সুপারিশ ফরম' 
                                    : 'Comprehensive performance evaluation and supervisor recommendation'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Form / Live Official Document Preview */}
                        <div className="p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center">
                            <button
                                type="button"
                                onClick={() => setViewMode('form')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'form' 
                                        ? 'bg-white text-emerald-700 shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'ফরম পূরণ' : 'Form'}
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
                                {lang === 'bn' ? 'অফিসিয়াল প্রিভিউ' : 'Preview'}
                            </button>
                        </div>

                        {/* Language Toggle */}
                        <div className="p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center">
                            <button
                                type="button"
                                onClick={() => setLang('bn')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                                    lang === 'bn' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => setLang('en')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                                    lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                EN
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'preview' ? (
                    /* LIVE PREVIEW OF THE OFFICIAL 2-PAGE DOCUMENT */
                    <div className="bg-slate-100/80 p-3 sm:p-6 rounded-xl border border-slate-200">
                        <div className="max-w-4xl mx-auto shadow-md rounded-xl overflow-hidden bg-white">
                            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">{lang === 'bn' ? 'ফরম লোড হচ্ছে…' : 'Loading form…'}</div>}>
                                <TraineeOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                            </Suspense>
                        </div>
                    </div>
                ) : (
                    /* FORM ENTRY MODE */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <MissingFieldsAlert
                            gaps={liveGaps.length > 0 ? liveGaps : Object.entries(errors).map(([key, message]) => ({ key, message: String(message) }))}
                            lang={lang}
                        />
                        
                        {/* 1. Category Switch & Candidate Details Card (Compact Grid Layout) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            {/* Form Category Selector Strip */}
                            <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-2.5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                        <FileText className="w-4 h-4 text-emerald-600" />
                                        <span>পদবী ক্যাটাগরি:</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-2xl">
                                        <button
                                            type="button"
                                            onClick={() => handleFormTypeChange('officer_abm')}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                                                formType === 'officer_abm'
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            অফিসার ও সহকারী শাখা ব্যবস্থাপক (৭টি সূচক)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFormTypeChange('accountant')}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                                                formType === 'accountant'
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            হিসাবরক্ষক (১০টি সূচক)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFormTypeChange('bm_and_above')}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                                                formType === 'bm_and_above'
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            শাখা ব্যবস্থাপক ও তদূর্ধ্ব (৮টি সূচক)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Candidate Info Grid */}
                            <CardContent className="p-4 space-y-3">
                                {/* Top Helper & Employee Auto-picker */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-slate-900">প্রশিক্ষণার্থীর সাধারণ তথ্যাবলী</span>
                                        <span className="text-[11px] text-slate-500 hidden sm:inline">(ম্যানুয়ালি লিখুন বা কর্মী নির্বাচন করে অটো-ফিল করুন)</span>
                                    </div>
                                    <div className="w-full sm:w-72">
                                        <AppraisalEmployeeCombo
                                            lookupUrl={employeeLookupUrl}
                                            value={data.employee_id ? Number(data.employee_id) : null}
                                            lang={lang}
                                            placeholder={lang === 'bn' ? 'কর্মী দিয়ে অটো-ফিল করুন...' : 'Search employee to auto-fill'}
                                            onSelect={handleEmployeeSelect}
                                        />
                                    </div>
                                </div>

                                {/* High-Density Form Inputs Grid: 4 columns on desktop, 2 on tablet, 1 on mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Evaluation Month */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'মূল্যায়ন মাস:*' : 'Evaluation Month:*'}
                                        </Label>
                                        <MonthPickerSelect 
                                            data-req="evaluation_month" value={data.evaluation_month}
                                            onChange={val => setData('evaluation_month', val)}
                                            lang={lang}
                                            className="h-8.5 w-full bg-white font-medium text-xs border-slate-300"
                                        />
                                        {errors.evaluation_month && <p className="text-[11px] text-rose-600">{errors.evaluation_month}</p>}
                                    </div>

                                    {/* Candidate Name */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'প্রশিক্ষণার্থীর নাম:*' : 'Trainee Name:*'}
                                        </Label>
                                        <Input 
                                            type="text"
                                            data-req="candidate_name" value={data.candidate_name}
                                            onChange={e => setData('candidate_name', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-semibold text-slate-900 border-slate-300"
                                            placeholder="প্রশিক্ষণার্থীর নাম"
                                            required
                                        />
                                        {errors.candidate_name && <p className="text-[11px] text-rose-600">{errors.candidate_name}</p>}
                                    </div>

                                    {/* Designation */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'পদবী:*' : 'Designation:*'}
                                        </Label>
                                        <Input 
                                            type="text"
                                            data-req="designation_name" value={data.designation_name}
                                            onChange={e => setData('designation_name', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-medium border-slate-300"
                                            placeholder="উদা: প্রশিক্ষণার্থী হিসাবরক্ষক"
                                            required
                                        />
                                        {errors.designation_name && <p className="text-[11px] text-rose-600">{errors.designation_name}</p>}
                                    </div>

                                    {/* PIN No */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'পিন নং:' : 'PIN No:'}
                                        </Label>
                                        <Input 
                                            type="text"
                                            data-req="pin" value={data.pin}
                                            onChange={e => setData('pin', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-mono font-medium border-slate-300"
                                            placeholder="উদা: 10452"
                                        />
                                    </div>

                                    {/* Branch Name */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'শাখার নাম:' : 'Branch Name:'}
                                        </Label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                list="branch-list-create"
                                                data-req="branch_name" value={data.branch_name}
                                                onChange={e => handleBranchChange(e.target.value)}
                                                className="w-full h-8.5 text-xs bg-white border border-slate-300 rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                                placeholder="শাখার নাম লিখুন বা সিলেক্ট করুন"
                                            />
                                            <datalist id="branch-list-create">
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.name} />
                                                ))}
                                            </datalist>
                                        </div>
                                        {errors.branch_name && <p className="text-[11px] text-rose-600">{errors.branch_name}</p>}
                                    </div>

                                    {/* Regional Office */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] font-semibold text-slate-700">
                                                {lang === 'bn' ? 'অঞ্চলের নাম:' : 'Regional Office:'}
                                            </Label>
                                            <span className="text-[10px] text-slate-400">(অটো-ফিল)</span>
                                        </div>
                                        <Input 
                                            type="text"
                                            data-req="regional_office_name" value={data.regional_office_name}
                                            onChange={e => setData('regional_office_name', e.target.value)}
                                            className="h-8.5 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                            placeholder="শাখা নির্বাচন করলে আসবে"
                                        />
                                        {errors.regional_office_name && <p className="text-[11px] text-rose-600">{errors.regional_office_name}</p>}
                                    </div>

                                    {/* Zone */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] font-semibold text-slate-700">
                                                {lang === 'bn' ? 'জোন:' : 'Zone:'}
                                            </Label>
                                            <span className="text-[10px] text-slate-400">(অটো-ফিল)</span>
                                        </div>
                                        <Input 
                                            type="text"
                                            data-req="zone_name" value={data.zone_name}
                                            onChange={e => setData('zone_name', e.target.value)}
                                            className="h-8.5 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                            placeholder="শাখা নির্বাচন করলে আসবে"
                                        />
                                        {errors.zone_name && <p className="text-[11px] text-rose-600">{errors.zone_name}</p>}
                                    </div>

                                    {/* Training Joining Date */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'যোগদানের তারিখ:' : 'Joining Date:'}
                                        </Label>
                                        <Input 
                                            type="date"
                                            data-req="training_joining_date" value={data.training_joining_date}
                                            onChange={e => setData('training_joining_date', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-medium border-slate-300"
                                        />
                                    </div>

                                    {/* Training Completion Date */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            {lang === 'bn' ? 'সমাপ্তির তারিখ (চিঠি অনুযায়ী):' : 'Completion Date:'}
                                        </Label>
                                        <Input 
                                            type="date"
                                            data-req="training_completion_date" value={data.training_completion_date}
                                            onChange={e => setData('training_completion_date', e.target.value)}
                                            className="h-8.5 text-xs bg-white font-medium border-slate-300"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Quantitative Scoring Table (Clean High-Density Rubrics) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4 flex flex-row items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' 
                                            ? '১ম তত্ত্বাবধায়ক কর্তৃক প্রশিক্ষণকালীন সার্বিক মূল্যায়ন (মোট ১০০ নম্বর)' 
                                            : 'Quantitative Performance Rubrics (100 Marks)'}
                                    </CardTitle>
                                    <p className="text-[11px] text-slate-500">
                                        {lang === 'bn' 
                                            ? 'নির্ধারিত সর্বোচ্চ নম্বরের ভিত্তিতে প্রাপ্ত নম্বর লিখুন' 
                                            : 'Enter score for each indicator out of maximum allowed'}
                                    </p>
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
                            <CardContent className="p-3 sm:p-4 space-y-3">
                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                                                <th className="p-2 text-center w-10">ক্র.</th>
                                                <th className="p-2 text-left">মূল্যায়ন সূচক</th>
                                                <th className="p-2 text-center w-24">সর্বোচ্চ নম্বর</th>
                                                <th className="p-2 text-center w-32">প্রাপ্ত নম্বর</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {currentRubrics.map((rubric: any, idx: number) => {
                                                const currentScore = data.scores.find((s) => s.criteria_key === rubric.key)?.score ?? '';
                                                return (
                                                    <tr key={rubric.key} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="p-2 text-center font-bold text-slate-600">
                                                            {rubric.sl_no || idx + 1}.
                                                        </td>
                                                        <td className="p-2 text-slate-900 font-medium leading-relaxed">
                                                            {rubric.nameBn}
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-slate-700">
                                                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                                                                {rubric.maxScore}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Input 
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                max={rubric.maxScore}
                                                                data-req={`score:${rubric.key}`}
                                                                value={currentScore}
                                                                onChange={(e) => handleScoreChange(rubric.key, e.target.value)}
                                                                className="h-7 text-xs text-center font-bold text-emerald-800 bg-white w-24 mx-auto border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                                placeholder={`০ - ${rubric.maxScore}`}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-emerald-50/50 border-t-2 border-emerald-300 font-bold">
                                                <td className="p-2.5 text-center" colSpan={2}>
                                                    <div className="flex items-center justify-between px-2">
                                                        <span className="text-xs font-bold text-emerald-950">
                                                            সর্বমোট নম্বর (Total Score)
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-500">
                                                            ({currentRubrics.length} টি সূচক)
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-center text-slate-800 font-extrabold">
                                                    {currentRubrics.reduce((sum: number, r: any) => sum + (Number(r.maxScore) || 0), 0)}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <span className="text-sm font-extrabold text-emerald-800">
                                                        {data.total_score}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Other Remarks Area */}
                                <div className="space-y-1 pt-1">
                                    <Label className="text-[11px] font-semibold text-slate-700">
                                        {lang === 'bn' ? 'অন্যান্য মন্তব্য (যদি থাকে):' : 'Other Remarks (If Any):'}
                                    </Label>
                                    <Textarea 
                                        data-req="other_remarks" value={data.other_remarks}
                                        onChange={e => setData('other_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[46px] border-slate-300"
                                        placeholder="প্রশিক্ষণার্থীর কাজের বিষয়ে বিশেষ কোনো পর্যবেক্ষণ বা মন্তব্য থাকলে লিখুন..."
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Qualitative Indicators (Compact Matrix Table Format) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' ? 'বিশেষ গুরুত্বপূর্ণ সূচক মূল্যায়ন (১৪টি সূচক)' : 'Qualitative Indicator Ratings (14 Items)'}
                                    </CardTitle>
                                    <p className="text-[11px] text-slate-500">
                                        {lang === 'bn' ? 'প্রতিটি সূচকে যথাযথ রেটিং কলামে ক্লিক করুন' : 'Click the appropriate rating for each indicator'}
                                    </p>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                                    রেটিং ম্যাট্রিক্স
                                </span>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4">
                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                                                <th className="p-2 text-center w-10">ক্র.</th>
                                                <th className="p-2 text-left min-w-[200px]">সূচক</th>
                                                {QUALITATIVE_RATING_OPTIONS.map(opt => (
                                                    <th key={opt.key} className="p-2 text-center w-24">
                                                        <span className="block text-[11px] font-bold">{opt.labelBn}</span>
                                                        <span className="block text-[9px] text-slate-500 font-normal">{opt.labelEn}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {config.qualitativeIndicators.map((ind) => {
                                                const currentRating = data.ratings.find((r) => r.indicator_key === ind.key)?.rating;
                                                return (
                                                    <tr key={ind.key} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="p-1.5 text-center font-bold text-slate-600">
                                                            {ind.sl_no}.
                                                        </td>
                                                        <td className="p-1.5 font-semibold text-slate-900">
                                                            {ind.nameBn}
                                                        </td>
                                                        {QUALITATIVE_RATING_OPTIONS.map((opt) => {
                                                            const isSelected = currentRating === opt.key;
                                                            return (
                                                                <td 
                                                                    key={opt.key} 
                                                                    className="p-1 text-center cursor-pointer"
                                                                    onClick={() => handleRatingChange(ind.key, opt.key)}
                                                                >
                                                                    <div className={`mx-auto flex items-center justify-center h-7 rounded-md border text-[11px] transition-all font-medium ${
                                                                        isSelected 
                                                                            ? `${opt.color} font-bold ring-2 ring-emerald-500/20 shadow-2xs` 
                                                                            : 'border-slate-200 text-slate-500 hover:bg-slate-100/80'
                                                                    }`}>
                                                                        <input 
                                                                            type="radio"
                                                                            name={`rating_${ind.key}`}
                                                                            value={opt.key}
                                                                            checked={isSelected}
                                                                            onChange={() => handleRatingChange(ind.key, opt.key)}
                                                                            className="sr-only"
                                                                        />
                                                                        <span className="flex items-center gap-1">
                                                                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                                                                            <span>{opt.labelBn}</span>
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. Supervisor Recommendation (Compact Grid Layout) */}
                        <Card className="border-slate-200 shadow-2xs overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-2.5 px-4">
                                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ' : 'First Supervisor Recommendation'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4 space-y-3">
                                {/* 3 Card Options in a Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    {/* Option 1: Recommend Appointment */}
                                    <label 
                                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_type === 'recommend_appointment'
                                                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <input 
                                            type="radio"
                                            name="recommendation_type"
                                            checked={data.recommendation_type === 'recommend_appointment'}
                                            onChange={() => setData('recommendation_type', 'recommend_appointment')}
                                            className="w-4 h-4 text-emerald-600 mt-0.5"
                                        />
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">নিয়োগের জন্য সুপারিশ</div>
                                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">নিয়োগের জন্য সুপারিশ করা হলো (Recommended for Appointment)</div>
                                        </div>
                                    </label>

                                    {/* Option 2: Extend Probation */}
                                    <label 
                                        className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_type === 'extend_probation'
                                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <input 
                                                type="radio"
                                                name="recommendation_type"
                                                checked={data.recommendation_type === 'extend_probation'}
                                                onChange={() => setData('recommendation_type', 'extend_probation')}
                                                className="w-4 h-4 text-amber-600 mt-0.5"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">প্রশিক্ষণকাল বৃদ্ধি ও পুনর্মূল্যায়ন</div>
                                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">প্রশিক্ষণকাল বৃদ্ধি করে পুনর্মূল্যায়ন করা হোক</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-6 pt-1">
                                            <span className="text-[11px] text-slate-600 font-medium">বৃদ্ধি করার দিন:</span>
                                            <Input 
                                                type="number"
                                                min="1"
                                                data-req="extension_days" value={data.extension_days}
                                                onChange={e => setData('extension_days', e.target.value)}
                                                className="h-7 w-20 text-xs text-center font-bold bg-white border-amber-300"
                                                placeholder="দিন"
                                                disabled={data.recommendation_type !== 'extend_probation'}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-[11px] text-slate-600">দিন</span>
                                        </div>
                                    </label>

                                    {/* Option 3: Discontinue */}
                                    <label 
                                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                            data.recommendation_type === 'not_satisfactory'
                                                ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 text-rose-950 font-bold'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <input 
                                            type="radio"
                                            name="recommendation_type"
                                            checked={data.recommendation_type === 'not_satisfactory'}
                                            onChange={() => setData('recommendation_type', 'not_satisfactory')}
                                            className="w-4 h-4 text-rose-600 mt-0.5"
                                        />
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">প্রশিক্ষণ সন্তোষজনক নয়</div>
                                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">প্রশিক্ষণ সন্তোষজনক নয়, সমাপ্ত করা যেতে পারে (Discontinue)</div>
                                        </div>
                                    </label>
                                </div>

                                {/* Supervisor Remarks Textarea */}
                                <div className="space-y-1 pt-1">
                                    <Label className="text-[11px] font-semibold text-slate-700">
                                        {lang === 'bn' ? '১ম তত্ত্বাবধায়কের মন্তব্য / সুপারিশের বিবরণ:' : 'Supervisor Remarks:'}
                                    </Label>
                                    <Textarea 
                                        data-req="supervisor_remarks" value={data.supervisor_remarks}
                                        onChange={e => setData('supervisor_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[50px] border-slate-300"
                                        placeholder="সুপারিশ বা সার্বিক মূল্যায়নের কারণ ও বিস্তারিত মন্তব্য লিখুন..."
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit & Summary Bottom Bar */}
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
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                    {processing ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ ও প্রকাশ করুন' : 'Save & Publish')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
