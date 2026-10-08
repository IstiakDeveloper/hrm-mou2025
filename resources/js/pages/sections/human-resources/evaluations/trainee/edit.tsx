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
    UserCheck,
    CheckCircle2,
    Sparkles
} from 'lucide-react';

interface EditProps {
    evaluation: any;
    branches: any[];
    regionalOffices: any[];
    zones: any[];
}

export default function TraineeEvaluationEdit({
    evaluation,
    branches = [],
    regionalOffices = [],
    zones = [],
}: EditProps) {
    const [lang, setLang] = useState<'bn' | 'en'>('bn');
    const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');

    const formType = evaluation.form_type || 'officer_abm';
    const config = TRAINEE_FORM_CONFIGS[formType] || TRAINEE_FORM_CONFIGS.officer_abm;

    // Map existing scores or default from config rubrics
    const initialScores = useMemo(() => {
        const existing = evaluation.scores || [];
        return config.rubrics.map((r) => {
            const found = existing.find((e: any) => e.criteria_key === r.key);
            return {
                id: found?.id,
                sl_no: r.sl_no,
                criteria_key: r.key,
                criteria_name: r.nameBn,
                max_score: r.maxScore,
                score: found ? found.score : '',
            };
        });
    }, [evaluation.scores, config.rubrics]);

    // Map existing qualitative ratings or default from config
    const initialRatings = useMemo(() => {
        const existing = evaluation.ratings || [];
        return config.qualitativeIndicators.map((q) => {
            const found = existing.find((e: any) => e.indicator_key === q.key);
            return {
                id: found?.id,
                sl_no: q.sl_no,
                indicator_key: q.key,
                indicator_name: q.nameBn,
                rating: found?.rating || 'good',
            };
        });
    }, [evaluation.ratings, config.qualitativeIndicators]);

    const formatForDateInput = (val: any) => {
        if (!val) return '';
        try {
            return String(val).split('T')[0];
        } catch {
            return '';
        }
    };

    const { data, setData, put, processing, errors } = useForm({
        candidate_name: evaluation.candidate_name || '',
        designation_name: evaluation.designation_name || '',
        pin: evaluation.pin || '',
        branch_name: evaluation.branch_name || evaluation.branch?.name || '',
        regional_office_name: evaluation.regional_office_name || evaluation.regionalOffice?.name || '',
        zone_name: evaluation.zone_name || evaluation.zone?.name || '',
        branch_id: evaluation.branch_id || ('' as any),
        regional_office_id: evaluation.regional_office_id || ('' as any),
        zone_id: evaluation.zone_id || ('' as any),
        
        evaluation_month: evaluation.evaluation_month || '',
        training_joining_date: formatForDateInput(evaluation.training_joining_date),
        training_completion_date: formatForDateInput(evaluation.training_completion_date),
        
        scores: initialScores,
        ratings: initialRatings,
        total_score: evaluation.total_score || 0,
        calculated_grade: evaluation.calculated_grade || 'not_satisfactory',
        other_remarks: evaluation.other_remarks || '',
        
        recommendation_type: evaluation.recommendation_type || 'recommend_appointment',
        extension_days: evaluation.extension_days || ('' as any),
        supervisor_remarks: evaluation.supervisor_remarks || '',
    });

    // Auto-recalculate total score
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
        put(`/trainee-evaluations/${evaluation.id}`);
    };

    const previewEvaluation = useMemo(() => {
        return {
            ...evaluation,
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
        };
    }, [data, evaluation]);

    const currentGrade = calculateTraineeGrade(data.total_score);

    return (
        <Layout>
            <Head title={`${evaluation.candidate_name} - ${lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন সম্পাদনা' : 'Edit Trainee Evaluation'}`} />
            
            <PageSurface className="space-y-6 max-w-6xl mx-auto pb-16">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Link href={`/trainee-evaluations/${evaluation.id}`}>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-white border-slate-300">
                                <ArrowLeft className="w-4 h-4" />
                                {lang === 'bn' ? 'ফিরে যান' : 'Back'}
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-600" />
                                {lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন সম্পাদনা' : 'Edit Trainee Evaluation'} - {evaluation.candidate_name}
                            </h1>
                            <p className="text-xs text-slate-500">
                                {config.titleBn}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
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
                                {lang === 'bn' ? 'প্রিভিউ দেখুন' : 'Preview'}
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'preview' ? (
                    <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200">
                        <div className="max-w-4xl mx-auto shadow-md rounded-xl overflow-hidden bg-white">
                            <TraineeOfficialFormDocument evaluation={previewEvaluation} lang={lang} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Candidate Information Card */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? 'প্রশিক্ষণার্থীর সাধারণ তথ্যাবলী' : 'Trainee Information'}
                                </CardTitle>
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
                                    <Label className="text-xs font-semibold text-slate-700">প্রশিক্ষণার্থীর নাম:*</Label>
                                    <Input 
                                        type="text"
                                        value={data.candidate_name}
                                        onChange={e => setData('candidate_name', e.target.value)}
                                        className="h-9 text-xs bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">পদবী:*</Label>
                                    <Input 
                                        type="text"
                                        value={data.designation_name}
                                        onChange={e => setData('designation_name', e.target.value)}
                                        className="h-9 text-xs bg-white font-semibold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">পিন নং:</Label>
                                    <Input 
                                        type="text"
                                        value={data.pin}
                                        onChange={e => setData('pin', e.target.value)}
                                        className="h-9 text-xs bg-white font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">শাখার নাম:</Label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            list="branch-list-edit"
                                            value={data.branch_name}
                                            onChange={e => handleBranchChange(e.target.value)}
                                            className="w-full h-9 text-xs bg-white border border-slate-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                            placeholder="শাখার নাম নির্বাচন বা লিখুন"
                                        />
                                        <datalist id="branch-list-edit">
                                            {branches.map(b => (
                                                <option key={b.id} value={b.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    {errors.branch_name && <p className="text-xs text-rose-600">{errors.branch_name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700">অঞ্চলের নাম:</Label>
                                        <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয় পূরণ)</span>
                                    </div>
                                    <Input 
                                        type="text"
                                        value={data.regional_office_name}
                                        onChange={e => setData('regional_office_name', e.target.value)}
                                        className="h-9 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                        placeholder="শাখা নির্বাচন করলে অটো আসবে"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700">জোন:</Label>
                                        <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয় পূরণ)</span>
                                    </div>
                                    <Input 
                                        type="text"
                                        value={data.zone_name}
                                        onChange={e => setData('zone_name', e.target.value)}
                                        className="h-9 text-xs bg-slate-50 border-slate-300 font-medium text-slate-800"
                                        placeholder="শাখা নির্বাচন করলে অটো আসবে"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">প্রশিক্ষণার্থী পদে যোগদানের তারিখ:</Label>
                                    <Input 
                                        type="date"
                                        value={data.training_joining_date}
                                        onChange={e => setData('training_joining_date', e.target.value)}
                                        className="h-9 text-xs bg-white font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">নিয়োগপত্র অনুযায়ী সমাপ্তির তারিখ:</Label>
                                    <Input 
                                        type="date"
                                        value={data.training_completion_date}
                                        onChange={e => setData('training_completion_date', e.target.value)}
                                        className="h-9 text-xs bg-white font-medium"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Criteria Rubric Scoring */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-emerald-600" />
                                        {lang === 'bn' ? '১ম তত্ত্বাবধায়ক কর্তৃক প্রশিক্ষণকালীন সার্বিক মূল্যায়ন' : 'Performance Rubrics & Scoring'}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
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
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-emerald-50/40 border-t-2 border-emerald-300 font-bold">
                                                <td className="p-3 text-center" colSpan={2}>
                                                    <span className="text-sm font-bold text-emerald-950">সর্বমোট (Total Score)</span>
                                                </td>
                                                <td className="p-3 text-center text-slate-800">১০০</td>
                                                <td className="p-3 text-center">
                                                    <span className="text-base font-extrabold text-emerald-800">{data.total_score}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">অন্যান্য মন্তব্য (যদি থাকে):</Label>
                                    <Textarea 
                                        value={data.other_remarks}
                                        onChange={e => setData('other_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[50px]"
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Qualitative Indicators */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? 'বিশেষ গুরুত্বপূর্ণ সূচক মূল্যায়ন' : 'Qualitative Indicator Ratings'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                                <th className="p-2.5 text-left w-1/3">সূচক</th>
                                                <th className="p-2.5 text-center">মূল্যায়ন রেটিং</th>
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

                        {/* Supervisor Recommendation */}
                        <Card className="border-slate-200 shadow-2xs">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {lang === 'bn' ? '১ম তত্ত্বাবধায়কের মন্তব্য ও সুপারিশ' : 'First Supervisor Recommendation'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
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
                                    <Label className="text-xs font-semibold text-slate-700">১ম তত্ত্বাবধায়কের মন্তব্য / সুপারিশের বিবরণ:</Label>
                                    <Textarea 
                                        value={data.supervisor_remarks}
                                        onChange={e => setData('supervisor_remarks', e.target.value)}
                                        className="text-xs bg-white min-h-[70px]"
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save Bar */}
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-end gap-3 shadow-xs">
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
                                {processing ? (lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Evaluation')}
                            </Button>
                        </div>
                    </form>
                )}
            </PageSurface>
        </Layout>
    );
}
