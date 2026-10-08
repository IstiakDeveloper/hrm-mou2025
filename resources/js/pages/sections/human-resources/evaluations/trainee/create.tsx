import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
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
import TraineeOfficialFormDocument from './components/TraineeOfficialFormDocument';
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
    Sparkles
} from 'lucide-react';

interface CreateProps {
    employees: any[];
    branches: any[];
    regionalOffices: any[];
    zones: any[];
    currentUserBranch?: any;
    userHasSignature?: boolean;
}

export default function TraineeEvaluationCreate({
    employees = [],
    branches = [],
    regionalOffices = [],
    zones = [],
    currentUserBranch,
    userHasSignature = false,
}: CreateProps) {
    const [lang, setLang] = useState<'bn' | 'en'>('bn');
    const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');
    const [formType, setFormType] = useState<'officer_abm' | 'accountant' | 'bm_and_above'>('officer_abm');

    const config = TRAINEE_FORM_CONFIGS[formType] || TRAINEE_FORM_CONFIGS.officer_abm;

    // Helper to build initial scores array
    const buildInitialScores = (type: string) => {
        const conf = TRAINEE_FORM_CONFIGS[type] || TRAINEE_FORM_CONFIGS.officer_abm;
        return conf.rubrics.map((r) => ({
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
        
        // Candidate Textual Info (Manually typed or pre-filled)
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
    const handleEmployeeSelect = (empId: string) => {
        if (!empId) {
            setData((prev) => ({
                ...prev,
                employee_id: '',
            }));
            return;
        }

        const emp = employees.find((e) => String(e.id) === String(empId));
        if (emp) {
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
        }
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
            const val = parseFloat(String(item.score)) || 0;
            return sum + val;
        }, 0);

        const gradeConfig = calculateTraineeGrade(total);
        setData((prev) => ({
            ...prev,
            total_score: Math.min(100, Math.max(0, parseFloat(total.toFixed(2)))),
            calculated_grade: gradeConfig.grade,
        }));
    }, [data.scores]);

    const handleScoreChange = (criteriaKey: string, val: string) => {
        const foundRubric = config.rubrics.find((r) => r.key === criteriaKey);
        const maxScore = foundRubric?.maxScore || 100;
        let numVal = val === '' ? '' : Math.max(0, Math.min(maxScore, parseFloat(val) || 0));

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
            
            <PageSurface className="space-y-6 max-w-6xl mx-auto pb-16">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Link href="/trainee-evaluations">
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-white border-slate-300">
                                <ArrowLeft className="w-4 h-4" />
                                {lang === 'bn' ? 'তালিকায় ফিরে যান' : 'Back'}
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-600" />
                                {lang === 'bn' ? 'নতুন প্রশিক্ষণার্থী মূল্যায়ন ফরম' : 'New Trainee Evaluation'}
                            </h1>
                            <p className="text-xs text-slate-500">
                                {lang === 'bn' 
                                    ? 'প্রশিক্ষণার্থীর তথ্য ও সার্বিক মূল্যায়নের নম্বর প্রদান করুন' 
                                    : 'Enter trainee information and comprehensive performance evaluation'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Toggle Form / Live Official Document Preview */}
                        <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('form')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'form' 
                                        ? 'bg-white text-emerald-700 shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'ফরম পূরণ' : 'Edit Form'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                {lang === 'bn' ? 'অফিসিয়াল ফরম প্রিভিউ' : 'Official Preview'}
                            </button>
                        </div>

                        {/* Language Toggle */}
                        <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center">
                            <button
                                type="button"
                                onClick={() => setLang('bn')}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'bn' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => setLang('en')}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'preview' ? (
                    /* LIVE PREVIEW OF THE OFFICIAL 2-PAGE DOCUMENT */
                    <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200">
                        <div className="max-w-4xl mx-auto shadow-md rounded-xl overflow-hidden bg-white">
                            <TraineeOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                        </div>
                    </div>
                ) : (
                    /* FORM ENTRY MODE */
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* 1. Form Type Selector Tabs */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '১. পদবী অনুযায়ী ফরম ক্যাটাগরি নির্বাচন' : '1. Select Form Category'}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    {lang === 'bn' ? 'অফিসিয়াল মূল্যায়ন ফরমের ধরন নির্বাচন করুন' : 'Choose official form type'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleFormTypeChange('officer_abm')}
                                        className={`p-3.5 rounded-xl border text-left transition-all ${
                                            formType === 'officer_abm'
                                                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-bold">অফিসার ও সহকারী শাখা ব্যবস্থাপক</div>
                                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">Officer & ABM (৭টি সূচক)</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleFormTypeChange('accountant')}
                                        className={`p-3.5 rounded-xl border text-left transition-all ${
                                            formType === 'accountant'
                                                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-bold">হিসাবরক্ষক</div>
                                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">Accountant (১০টি সূচক)</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleFormTypeChange('bm_and_above')}
                                        className={`p-3.5 rounded-xl border text-left transition-all ${
                                            formType === 'bm_and_above'
                                                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-bold">শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব</div>
                                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">BM to ZM (৮টি সূচক)</div>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Candidate Information (Fully customizable & directly editable) */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' ? '২. প্রশিক্ষণার্থীর সাধারণ তথ্যাবলী' : '2. Trainee Information'}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500">
                                        {lang === 'bn' 
                                            ? 'এখানে সব তথ্য সরাসরি লিখে দেওয়া যাবে (প্রয়োজনে কর্মী ড্রপডাউন থেকেও সিলেক্ট করা যাবে)' 
                                            : 'Enter candidate details manually or select from existing employee records'}
                                    </CardDescription>
                                </div>

                                {/* Optional Employee Selector */}
                                <div className="w-full sm:w-64">
                                    <Label className="text-[10px] font-semibold text-slate-500 block mb-1">
                                        {lang === 'bn' ? 'কর্মী থেকে স্বয়ংক্রিয় পূরণ (ঐচ্ছিক):' : 'Pre-fill from Employee (Optional):'}
                                    </Label>
                                    <select
                                        className="h-8 text-xs w-full bg-white border border-slate-300 rounded-lg px-2 focus:ring-1 focus:ring-emerald-500"
                                        value={data.employee_id || ''}
                                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                                    >
                                        <option value="">— নতুন/সরাসরি লিখুন (Manual Entry) —</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name_bn || emp.name_en} ({emp.pin || 'No PIN'}) - {emp.designation?.name || ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'মূল্যায়ন মাসের নাম:*' : 'Evaluation Month:*'}
                                    </Label>
                                    <MonthPickerSelect 
                                        value={data.evaluation_month}
                                        onChange={val => setData('evaluation_month', val)}
                                        lang={lang}
                                        className="h-9 w-full bg-white font-bold"
                                    />
                                    {errors.evaluation_month && <p className="text-xs text-rose-600">{errors.evaluation_month}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'প্রশিক্ষণার্থীর নাম:*' : 'Trainee Name:*'}
                                    </Label>
                                    <Input 
                                        type="text"
                                        value={data.candidate_name}
                                        onChange={e => setData('candidate_name', e.target.value)}
                                        className="h-9 text-xs bg-white font-bold text-slate-900"
                                        placeholder="প্রশিক্ষণার্থীর নাম লিখুন"
                                        required
                                    />
                                    {errors.candidate_name && <p className="text-xs text-rose-600">{errors.candidate_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'পদবী:*' : 'Designation:*'}
                                    </Label>
                                    <Input 
                                        type="text"
                                        value={data.designation_name}
                                        onChange={e => setData('designation_name', e.target.value)}
                                        className="h-9 text-xs bg-white font-semibold"
                                        placeholder="উদা: প্রশিক্ষণার্থী হিসাবরক্ষক"
                                        required
                                    />
                                    {errors.designation_name && <p className="text-xs text-rose-600">{errors.designation_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'পিন নং:' : 'PIN No:'}
                                    </Label>
                                    <Input 
                                        type="text"
                                        value={data.pin}
                                        onChange={e => setData('pin', e.target.value)}
                                        className="h-9 text-xs bg-white font-mono font-medium"
                                        placeholder="উদা: 10452"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'শাখার নাম:' : 'Branch Name:'}
                                    </Label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            list="branch-list-create"
                                            value={data.branch_name}
                                            onChange={e => handleBranchChange(e.target.value)}
                                            className="w-full h-9 text-xs bg-white border border-slate-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                            placeholder="শাখার নাম নির্বাচন বা লিখুন"
                                        />
                                        <datalist id="branch-list-create">
                                            {branches.map(b => (
                                                <option key={b.id} value={b.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    {errors.branch_name && <p className="text-xs text-rose-600">{errors.branch_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700">
                                            {lang === 'bn' ? 'অঞ্চলের নাম:' : 'Regional Office:'}
                                        </Label>
                                        <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয় পূরণ)</span>
                                    </div>
                                    <Input 
                                        type="text"
                                        value={data.regional_office_name}
                                        onChange={e => setData('regional_office_name', e.target.value)}
                                        className="h-9 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                        placeholder="শাখা নির্বাচন করলে অটো আসবে"
                                    />
                                    {errors.regional_office_name && <p className="text-xs text-rose-600">{errors.regional_office_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700">
                                            {lang === 'bn' ? 'জোন:' : 'Zone:'}
                                        </Label>
                                        <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয় পূরণ)</span>
                                    </div>
                                    <Input 
                                        type="text"
                                        value={data.zone_name}
                                        onChange={e => setData('zone_name', e.target.value)}
                                        className="h-9 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                        placeholder="শাখা নির্বাচন করলে অটো আসবে"
                                    />
                                    {errors.zone_name && <p className="text-xs text-rose-600">{errors.zone_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'প্রশিক্ষণার্থী পদে যোগদানের তারিখ:' : 'Training Joining Date:'}
                                    </Label>
                                    <Input 
                                        type="date"
                                        value={data.training_joining_date}
                                        onChange={e => setData('training_joining_date', e.target.value)}
                                        className="h-9 text-xs bg-white font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'নিয়োগপত্র অনুযায়ী সমাপ্তির তারিখ:' : 'Completion Date as per Letter:'}
                                    </Label>
                                    <Input 
                                        type="date"
                                        value={data.training_completion_date}
                                        onChange={e => setData('training_completion_date', e.target.value)}
                                        className="h-9 text-xs bg-white font-medium"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Section 1: Rubric Scoring Table */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' 
                                            ? '৩. ১ম তত্ত্বাবধায়ক কর্তৃক প্রশিক্ষণকালীন সার্বিক মূল্যায়ন' 
                                            : '3. Performance Rubrics & Scoring'}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500">
                                        {lang === 'bn' 
                                            ? 'প্রতিটি সূচকে নির্ধারিত সর্বোচ্চ নম্বরের মধ্যে প্রাপ্ত নম্বর লিখুন (মোট নম্বর ১০০)' 
                                            : 'Enter score for each indicator out of 100'}
                                    </CardDescription>
                                </div>

                                {/* Running Score & Grade Summary Badge */}
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-xs text-slate-600 font-semibold">মোট নম্বর:</span>
                                    <span className="text-base font-extrabold text-emerald-700">{data.total_score} / ১০০</span>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentGrade.badgeVariant}`}>
                                        {currentGrade.labelBn}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                                <th className="p-2.5 text-center w-12">ক্র.</th>
                                                <th className="p-2.5 text-left">মূল্যায়ন সূচক</th>
                                                <th className="p-2.5 text-center w-28">সর্বোচ্চ নম্বর</th>
                                                <th className="p-2.5 text-center w-36">প্রাপ্ত নম্বর</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {config.rubrics.map((rubric) => {
                                                const currentScore = data.scores.find((s) => s.criteria_key === rubric.key)?.score ?? '';
                                                return (
                                                    <tr key={rubric.key} className="hover:bg-slate-50/50">
                                                        <td className="p-2.5 text-center font-bold text-slate-600">
                                                            {rubric.sl_no}.
                                                        </td>
                                                        <td className="p-2.5 text-slate-900 font-medium">
                                                            {rubric.nameBn}
                                                        </td>
                                                        <td className="p-2.5 text-center font-semibold text-slate-600">
                                                            {rubric.maxScore}
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <Input 
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                max={rubric.maxScore}
                                                                value={currentScore}
                                                                onChange={(e) => handleScoreChange(rubric.key, e.target.value)}
                                                                className="h-8 text-xs text-center font-bold bg-white w-24 mx-auto"
                                                                placeholder={`0 - ${rubric.maxScore}`}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-emerald-50/40 border-t-2 border-emerald-300 font-bold">
                                                <td className="p-3 text-center" colSpan={2}>
                                                    <span className="text-sm font-bold text-emerald-950">সর্বমোট (Total Score)</span>
                                                </td>
                                                <td className="p-3 text-center text-slate-800">
                                                    ১০০
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="text-base font-extrabold text-emerald-800">
                                                        {data.total_score}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Other Remarks Area */}
                                <div className="space-y-1.5 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? 'অন্যান্য মন্তব্য (যদি থাকে):' : 'Other Remarks (If Any):'}
                                    </Label>
                                    <Textarea 
                                        value={data.other_remarks}
                                        onChange={e => setData('other_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[50px]"
                                        placeholder="প্রশিক্ষণার্থীর কাজের বিষয়ে বিশেষ মন্তব্য লিখুন..."
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. Section 2: 14 Qualitative Indicators */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '৪. বিশেষ গুরুত্বপূর্ণ সূচক মূল্যায়ন' : '4. Qualitative Indicator Ratings'}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    {lang === 'bn' ? 'প্রতিটি বিশেষ সূচকের ক্ষেত্রে যথাযথ মূল্যায়নে টিক দিন' : 'Rate candidate across all 14 indicators'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                                <th className="p-2.5 text-left w-1/3">সূচক</th>
                                                <th className="p-2.5 text-center">মূল্যায়ন রেটিং (যে কোনো একটি নির্বাচন করুন)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {config.qualitativeIndicators.map((ind) => {
                                                const currentRating = data.ratings.find((r) => r.indicator_key === ind.key)?.rating;
                                                return (
                                                    <tr key={ind.key} className="hover:bg-slate-50/60">
                                                        <td className="p-2.5 font-semibold text-slate-900">
                                                            {ind.sl_no}. {ind.nameBn}
                                                        </td>
                                                        <td className="p-2.5">
                                                            <div className="flex flex-wrap items-center justify-around gap-2">
                                                                {QUALITATIVE_RATING_OPTIONS.map((opt) => (
                                                                    <label 
                                                                        key={opt.key}
                                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                                                                            currentRating === opt.key 
                                                                                ? `${opt.color} font-bold ring-2 ring-emerald-500/20`
                                                                                : 'border-slate-200 hover:bg-slate-100/60 text-slate-600'
                                                                        }`}
                                                                    >
                                                                        <input 
                                                                            type="radio"
                                                                            name={`rating_${ind.key}`}
                                                                            value={opt.key}
                                                                            checked={currentRating === opt.key}
                                                                            onChange={() => handleRatingChange(ind.key, opt.key)}
                                                                            className="w-3.5 h-3.5 text-emerald-600"
                                                                        />
                                                                        <span>{opt.labelBn}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 5. Section 3: 1st Supervisor Recommendation */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '৫. ১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ' : '5. First Supervisor Recommendation'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                                    <Label className="text-xs font-bold text-slate-800">
                                        সুপারিশ (টিক চিহ্ন দিন):
                                    </Label>
                                    
                                    <div className="space-y-2.5 text-xs">
                                        <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                                            <input 
                                                type="radio"
                                                name="recommendation_type"
                                                checked={data.recommendation_type === 'recommend_appointment'}
                                                onChange={() => setData('recommendation_type', 'recommend_appointment')}
                                                className="w-4 h-4 text-emerald-600"
                                            />
                                            <span>নিয়োগের জন্য সুপারিশ করা হলো। (Recommended for Appointment)</span>
                                        </label>

                                        <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                                            <label className="flex items-center gap-2.5 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="recommendation_type"
                                                    checked={data.recommendation_type === 'extend_probation'}
                                                    onChange={() => setData('recommendation_type', 'extend_probation')}
                                                    className="w-4 h-4 text-emerald-600"
                                                />
                                                <span>প্রশিক্ষণকাল</span>
                                            </label>
                                            <Input 
                                                type="number"
                                                min="1"
                                                value={data.extension_days}
                                                onChange={e => setData('extension_days', e.target.value)}
                                                className="h-8 w-20 text-xs text-center font-bold bg-white"
                                                placeholder="দিন"
                                                disabled={data.recommendation_type !== 'extend_probation'}
                                            />
                                            <span>দিন বৃদ্ধি করে পুনর্মূল্যায়ন করা হোক। (Extend and Re-evaluate)</span>
                                        </div>

                                        <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                                            <input 
                                                type="radio"
                                                name="recommendation_type"
                                                checked={data.recommendation_type === 'not_satisfactory'}
                                                onChange={() => setData('recommendation_type', 'not_satisfactory')}
                                                className="w-4 h-4 text-rose-600"
                                            />
                                            <span>প্রশিক্ষণ সন্তোষজনক নয়, প্রশিক্ষণকাল সমাপ্ত করা যেতে পারে। (Discontinue Training)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        {lang === 'bn' ? '১ম তত্ত্বাবধায়কের মন্তব্য / সুপারিশের বিবরণ:' : 'Supervisor Remarks:'}
                                    </Label>
                                    <Textarea 
                                        value={data.supervisor_remarks}
                                        onChange={e => setData('supervisor_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[70px]"
                                        placeholder="সুপারিশ বা সার্বিক মূল্যায়নের কারণ ও মন্তব্য লিখুন..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Button Bar */}
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                            <div className="text-xs text-slate-500">
                                {lang === 'bn' 
                                    ? 'ফরমটি সংরক্ষণ করার পর আপনি এটি রিভিউ করতে এবং পরবর্তী ধাপে অগ্রবর্তী করতে পারবেন।' 
                                    : 'Once saved, you can review and forward it through the workflow stages.'}
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setViewMode('preview')}
                                    className="text-xs h-9"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    {lang === 'bn' ? 'প্রিভিউ দেখুন' : 'Preview'}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-6 font-bold shadow-xs"
                                >
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                    {processing ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Evaluation')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
