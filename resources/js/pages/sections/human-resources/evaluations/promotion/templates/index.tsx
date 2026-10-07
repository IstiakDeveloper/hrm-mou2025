import React, { useState } from 'react';
import Layout from '@/layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { 
    ArrowLeft, 
    Edit, 
    Plus, 
    Trash2, 
    Layers, 
    TrendingUp,
    SlidersHorizontal,
    Sparkles,
    FolderPlus
} from 'lucide-react';

interface Criterion {
    id: number;
    section_id: number;
    criteria_key: string;
    name_en: string;
    name_bn: string;
    max_score: number | string;
    order: number;
    is_active: boolean;
}

interface Section {
    id: number;
    template_id: number;
    section_key: string;
    name_en: string;
    name_bn: string;
    max_marks: number | string;
    order: number;
    criteria: Criterion[];
}

interface Template {
    id: number;
    appraisal_type?: string;
    category_name_bn?: string;
    category_name_en?: string;
    description?: string;
    code: string;
    title_en: string;
    title_bn: string;
    total_marks: number | string;
    is_active: boolean;
    sections: Section[];
}

interface PageProps {
    templates: Template[];
    canManage?: boolean;
}

export default function EvaluationTemplatesIndex({ templates = [], canManage = true }: PageProps) {
    const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(
        templates[0]?.code || 'officer_abm'
    );
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Active Template
    const activeTemplate = templates.find(t => t.code === selectedTemplateCode) || templates[0];

    // Modals state
    const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
    const [addingToSection, setAddingToSection] = useState<Section | null>(null);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [addingSectionToTemplate, setAddingSectionToTemplate] = useState<Template | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    // Edit Criterion Form
    const editForm = useForm({
        name_bn: '',
        name_en: '',
        max_score: '',
    });

    // Add Criterion Form
    const addForm = useForm({
        criteria_key: '',
        name_bn: '',
        name_en: '',
        max_score: '',
    });

    // Template Edit Form
    const templateEditForm = useForm({
        title_bn: '',
        title_en: '',
        description: '',
    });

    // Section Form
    const sectionForm = useForm({
        section_key: '',
        name_bn: '',
        name_en: '',
        max_marks: '',
    });

    // Handlers
    const openEditCriterion = (criterion: Criterion) => {
        setEditingCriterion(criterion);
        editForm.setData({
            name_bn: criterion.name_bn,
            name_en: criterion.name_en,
            max_score: String(criterion.max_score),
        });
    };

    const handleUpdateCriterion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCriterion) return;

        editForm.put(`/promotion-evaluations/templates/criteria/${editingCriterion.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCriterion(null);
            },
        });
    };

    const openAddCriterion = (section: Section) => {
        setAddingToSection(section);
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        addForm.setData({
            criteria_key: `crit_${section.section_key.toLowerCase()}_${randomSuffix}`,
            name_bn: '',
            name_en: '',
            max_score: '2',
        });
    };

    const handleAddCriterion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addingToSection) return;

        addForm.post(`/promotion-evaluations/templates/sections/${addingToSection.id}/criteria`, {
            preserveScroll: true,
            onSuccess: () => {
                setAddingToSection(null);
                addForm.reset();
            },
        });
    };

    const handleDeleteCriterion = (criterionId: number) => {
        if (confirm('আপনি কি নিশ্চিত যে এই মানদণ্ডটি মুছে ফেলতে চান?')) {
            router.delete(`/promotion-evaluations/templates/criteria/${criterionId}`, {
                preserveScroll: true,
            });
        }
    };

    const openEditTemplate = (tmpl: Template) => {
        setEditingTemplate(tmpl);
        templateEditForm.setData({
            title_bn: tmpl.title_bn,
            title_en: tmpl.title_en,
            description: tmpl.description || '',
        });
    };

    const handleUpdateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        templateEditForm.put(`/promotion-evaluations/templates/${editingTemplate.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingTemplate(null);
            },
        });
    };

    const openAddSection = (tmpl: Template) => {
        setAddingSectionToTemplate(tmpl);
        sectionForm.setData({
            section_key: String.fromCharCode(65 + (tmpl.sections?.length || 0)),
            name_bn: '',
            name_en: '',
            max_marks: '20',
        });
    };

    const handleAddSection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addingSectionToTemplate) return;

        sectionForm.post(`/promotion-evaluations/templates/${addingSectionToTemplate.id}/sections`, {
            preserveScroll: true,
            onSuccess: () => {
                setAddingSectionToTemplate(null);
                sectionForm.reset();
            },
        });
    };

    const openEditSection = (section: Section) => {
        setEditingSection(section);
        sectionForm.setData({
            section_key: section.section_key,
            name_bn: section.name_bn,
            name_en: section.name_en,
            max_marks: String(section.max_marks),
        });
    };

    const handleUpdateSection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSection) return;

        sectionForm.put(`/promotion-evaluations/templates/sections/${editingSection.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingSection(null);
            },
        });
    };

    const handleDeleteSection = (sectionId: number) => {
        if (confirm('আপনি কি নিশ্চিত যে এই সেকশন এবং এর অন্তর্গত সকল মানদণ্ড মুছে ফেলতে চান?')) {
            router.delete(`/promotion-evaluations/templates/sections/${sectionId}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <Layout>
            <Head title="মূল্যায়ন রুব্রিক্স সেটআপ - Promotion Evaluation Rubrics" />

            <PageSurface className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* 1. MINIMAL PROFESSIONAL HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/promotion-evaluations"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="মূল্যায়ন তালিকায় ফিরে যান"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                    মূল্যায়ন ফরম ও রুব্রিক্স সেটআপ
                                </h1>
                                <Badge variant="outline" className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                                    অ্যাডমিন কনফিগ
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                প্রতিটি মূল্যায়ন ফরমের সেকশন, মানদণ্ড এবং নম্বর বণ্টন কাঠামো নিয়ন্ত্রণ করুন
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/promotion-evaluations">
                            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-300 font-medium">
                                মূল্যায়ন তালিকায় ফিরে যান
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 2. CATEGORY ARCHITECTURE PILL BAR */}
                <div className="bg-slate-50/80 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                            মূল্যায়ন ক্যাটাগরি:
                        </span>
                        
                        {/* Current Active Category: Promotion Evaluation */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 shadow-2xs font-semibold text-xs sm:text-sm text-emerald-900">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span>পদোন্নতি মূল্যায়ন (Promotion Evaluation)</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[11px] font-normal text-slate-500">
                                {templates.length} টি ফরম
                            </span>
                        </div>

                        {/* Future Extensibility: Add New Category Button */}
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setIsCategoryModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-white text-xs font-medium text-slate-600 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                                <span>নতুন ক্যাটাগরি</span>
                            </button>
                        )}
                    </div>

                    <span className="text-[11px] text-slate-500">
                        পদোন্নতির সকল অফিসিয়াল ফরম নিচে তালিকাভুক্ত
                    </span>
                </div>

                {/* 3. SUB-FORMS SELECTOR (Form A, Form B, Form C) */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    {templates.map(tmpl => {
                        const isCurrent = selectedTemplateCode === tmpl.code;
                        return (
                            <button
                                key={tmpl.code}
                                type="button"
                                onClick={() => setSelectedTemplateCode(tmpl.code)}
                                className={`flex-1 min-w-[200px] px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2 ${
                                    isCurrent
                                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Layers className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span className="truncate">{tmpl.title_bn}</span>
                                </div>
                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono shrink-0 ${
                                    isCurrent ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400'
                                }`}>
                                    {Number(tmpl.total_marks)} নম্বর
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 4. ACTIVE FORM DETAILS HEADER CARD */}
                {activeTemplate && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        পদোন্নতি মূল্যায়ন
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {activeTemplate.code}
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 mt-1">
                                    {activeTemplate.title_bn}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeTemplate.title_en}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-auto">
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs px-2.5 py-1">
                                    মোট নম্বর: <strong className="ml-1 text-slate-900">{Number(activeTemplate.total_marks)}</strong>
                                </Badge>
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs px-2.5 py-1">
                                    সেকশন: <strong className="ml-1 text-slate-900">{activeTemplate.sections?.length || 0} টি</strong>
                                </Badge>

                                {canManage && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditTemplate(activeTemplate)}
                                            className="h-8 text-xs border-slate-200"
                                            title="শিরোনাম পরিবর্তন"
                                        >
                                            <Edit className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                            সম্পাদনা
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => openAddSection(activeTemplate)}
                                            className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            নতুন সেকশন
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeTemplate.description && (
                            <p className="text-xs text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                                {activeTemplate.description}
                            </p>
                        )}
                    </div>
                )}

                {/* 5. SECTIONS & CRITERIA ACCORDION LIST */}
                {activeTemplate && (
                    <div className="space-y-4">
                        {activeTemplate.sections?.map(section => (
                            <div 
                                key={section.id} 
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
                            >
                                {/* Section Header */}
                                <div className="bg-slate-50/70 px-5 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                            {section.section_key}
                                        </span>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                                {section.name_bn}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {section.name_en}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto pl-10 sm:pl-0">
                                        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs px-2.5 py-0.5">
                                            সর্বোচ্চ {Number(section.max_marks)} নম্বর
                                        </Badge>

                                        {canManage && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openAddCriterion(section)}
                                                    className="h-7 px-2 text-xs bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                    প্রশ্ন যোগ
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditSection(section)}
                                                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                                    title="সেকশন সম্পাদনা"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteSection(section.id)}
                                                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                    title="সেকশন ডিলিট"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Criteria Rows */}
                                <div className="divide-y divide-slate-100">
                                    {section.criteria?.map((item, idx) => (
                                        <div 
                                            key={item.id}
                                            className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <span className="text-xs text-slate-400 font-semibold w-5 pt-0.5 text-right shrink-0">
                                                    {idx + 1}.
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                                        {item.name_bn}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {item.name_en}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                                    {Number(item.max_score)} নম্বর
                                                </span>

                                                {canManage && (
                                                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditCriterion(item)}
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                                                            title="সংশোধন"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteCriterion(item.id)}
                                                            className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                            title="মুছে ফেলুন"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {(!section.criteria || section.criteria.length === 0) && (
                                        <div className="py-6 text-center text-xs text-slate-400">
                                            এই সেকশনে এখনও কোনো প্রশ্ন বা মানদণ্ড যুক্ত করা হয়নি।
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 6. DIALOGS */}

                {/* Info / Placeholder modal for new categories */}
                <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FolderPlus className="h-5 w-5 text-emerald-600" />
                                নতুন মূল্যায়ন ক্যাটাগরি সেটআপ
                            </DialogTitle>
                            <DialogDescription>
                                বর্তমানে সিস্টেমে শুধু পদোন্নতি মূল্যায়ন (Promotion Evaluation) সক্রিয় রয়েছে।
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-3 text-xs sm:text-sm text-slate-600 space-y-2.5">
                            <p>
                                ভবিষ্যতে যখন অন্যান্য মূল্যায়ন মডিউল (যেমন: <strong>বার্ষিক কর্মমূল্যায়ন / ACR</strong>, <strong>শিক্ষানবিস ও স্থায়ীকরণ মূল্যায়ন</strong> ইত্যাদি) বাস্তবায়িত হবে, তখন এখান থেকে নতুন ক্যাটাগরি তৈরি করে সম্পূর্ণ স্বাধীন ফরম ও রুব্রিক্স সংজ্ঞায়িত করা যাবে।
                            </p>
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                                বর্তমানে আপনার পদোন্নতি মূল্যায়নের ৩টি ফরম (ক, খ, গ) সম্পূর্ণ চালু ও কার্যকর রয়েছে।
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                type="button" 
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="bg-slate-900 text-white"
                            >
                                বুঝেছি
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Criterion Dialog */}
                <Dialog open={!!editingCriterion} onOpenChange={() => setEditingCriterion(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>মানদণ্ড সংশোধন করুন</DialogTitle>
                            <DialogDescription>
                                মানদণ্ডের বাংলা ও ইংরেজি নাম এবং সর্বোচ্চ নম্বর পরিবর্তন করুন।
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateCriterion} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">শিরোনাম (বাংলা)</Label>
                                <Input
                                    value={editForm.data.name_bn}
                                    onChange={e => editForm.setData('name_bn', e.target.value)}
                                    placeholder="মানদণ্ডের বাংলা নাম"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Title (English)</Label>
                                <Input
                                    value={editForm.data.name_en}
                                    onChange={e => editForm.setData('name_en', e.target.value)}
                                    placeholder="Criterion English name"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">সর্বোচ্চ নম্বর (Max Score)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    value={editForm.data.max_score}
                                    onChange={e => editForm.setData('max_score', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm font-bold w-32"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingCriterion(null)}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    সংরক্ষণ করুন
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Add Criterion Dialog */}
                <Dialog open={!!addingToSection} onOpenChange={() => setAddingToSection(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>নতুন মানদণ্ড / প্রশ্ন যুক্ত করুন</DialogTitle>
                            <DialogDescription>
                                সেকশন {addingToSection?.section_key}-এ একটি নতুন মানদণ্ড যুক্ত করুন।
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleAddCriterion} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">শিরোনাম (বাংলা)</Label>
                                <Input
                                    value={addForm.data.name_bn}
                                    onChange={e => addForm.setData('name_bn', e.target.value)}
                                    placeholder="মানদণ্ডের বাংলা নাম লিখুন"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Title (English)</Label>
                                <Input
                                    value={addForm.data.name_en}
                                    onChange={e => addForm.setData('name_en', e.target.value)}
                                    placeholder="Criterion English title"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">সর্বোচ্চ নম্বর (Max Score)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    value={addForm.data.max_score}
                                    onChange={e => addForm.setData('max_score', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm font-bold w-32"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAddingToSection(null)}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={addForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    যুক্ত করুন
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Template Dialog */}
                <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>ফরমের তথ্য সম্পাদনা</DialogTitle>
                            <DialogDescription>
                                ফরমের বাংলা ও ইংরেজি শিরোনাম পরিবর্তন করুন।
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateTemplate} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">ফরমের নাম (বাংলা)</Label>
                                <Input
                                    value={templateEditForm.data.title_bn}
                                    onChange={e => templateEditForm.setData('title_bn', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Form Title (English)</Label>
                                <Input
                                    value={templateEditForm.data.title_en}
                                    onChange={e => templateEditForm.setData('title_en', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">বিবরণ (ঐচ্ছিক)</Label>
                                <Input
                                    value={templateEditForm.data.description}
                                    onChange={e => templateEditForm.setData('description', e.target.value)}
                                    placeholder="কাদের জন্য প্রযোজ্য..."
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingTemplate(null)}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={templateEditForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    সংরক্ষণ করুন
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Add Section Dialog */}
                <Dialog open={!!addingSectionToTemplate} onOpenChange={() => setAddingSectionToTemplate(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>নতুন সেকশন যোগ করুন</DialogTitle>
                            <DialogDescription>
                                {addingSectionToTemplate?.title_bn}-এ একটি নতুন সেকশন তৈরি করুন।
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleAddSection} className="space-y-4 py-2">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5 col-span-1">
                                    <Label className="text-xs font-semibold">কী (Key)</Label>
                                    <Input
                                        value={sectionForm.data.section_key}
                                        onChange={e => sectionForm.setData('section_key', e.target.value.toUpperCase())}
                                        placeholder="A, B, C..."
                                        maxLength={5}
                                        required
                                        className="text-xs sm:text-sm uppercase font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label className="text-xs font-semibold">সর্বোচ্চ নম্বর</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={sectionForm.data.max_marks}
                                        onChange={e => sectionForm.setData('max_marks', e.target.value)}
                                        required
                                        className="text-xs sm:text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">সেকশনের নাম (বাংলা)</Label>
                                <Input
                                    value={sectionForm.data.name_bn}
                                    onChange={e => sectionForm.setData('name_bn', e.target.value)}
                                    placeholder="যেমন: লক্ষ্যমাত্রা ও অর্জন"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Section Name (English)</Label>
                                <Input
                                    value={sectionForm.data.name_en}
                                    onChange={e => sectionForm.setData('name_en', e.target.value)}
                                    placeholder="e.g. Targets & Achievements"
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAddingSectionToTemplate(null)}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={sectionForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    সেকশন তৈরি করুন
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Section Dialog */}
                <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>সেকশন তথ্য পরিবর্তন</DialogTitle>
                            <DialogDescription>
                                সেকশন {editingSection?.section_key}-এর শিরোনাম ও বরাদ্দকৃত সর্বোচ্চ নম্বর পরিবর্তন করুন।
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateSection} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">সর্বোচ্চ নম্বর</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={sectionForm.data.max_marks}
                                    onChange={e => sectionForm.setData('max_marks', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm font-bold w-32"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">সেকশনের নাম (বাংলা)</Label>
                                <Input
                                    value={sectionForm.data.name_bn}
                                    onChange={e => sectionForm.setData('name_bn', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Section Name (English)</Label>
                                <Input
                                    value={sectionForm.data.name_en}
                                    onChange={e => sectionForm.setData('name_en', e.target.value)}
                                    required
                                    className="text-xs sm:text-sm"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingSection(null)}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={sectionForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    আপডেট করুন
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageSurface>
        </Layout>
    );
}
