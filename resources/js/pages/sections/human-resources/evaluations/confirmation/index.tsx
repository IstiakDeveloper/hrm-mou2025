import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AppraisalApprovalDialog } from '@/components/appraisal/AppraisalApprovalDialog';
import { AppraisalDeleteDialog } from '@/components/appraisal/AppraisalDeleteDialog';
import Layout from '@/layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
    Plus, 
    Eye, 
    Printer, 
    Search, 
    Award, 
    Clock, 
    CheckCircle2, 
    Users, 
    RotateCcw,
    Building2,
    Calendar,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Edit3,
    Trash2,
    SlidersHorizontal,
    Send,
    Check,
    XCircle,
    UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { formatClosingMonth } from './confirmation-config';

interface ConfirmationEvaluationIndexProps {
    evaluations: any;
    metrics?: {
        total: number;
        pending: number;
        approved: number;
        recommended: number;
    };
    filters?: {
        search?: string;
        status?: string;
        form_type?: string;
        per_page?: string;
    };
    canCreate: boolean;
    isSuperAdmin?: boolean;
    currentUserId?: number | null;
    userHasSignature?: boolean;
}

export default function ConfirmationEvaluationIndex({ 
    evaluations, 
    metrics = { total: 0, pending: 0, approved: 0, recommended: 0 }, 
    filters = {}, 
    canCreate,
    isSuperAdmin = false,
    currentUserId = null,
    userHasSignature = false,
}: ConfirmationEvaluationIndexProps) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [formType, setFormType] = useState(filters.form_type || 'all');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const [selectedEvaluationForApproval, setSelectedEvaluationForApproval] = useState<any | null>(null);

    const openApprovalModal = (ev: any) => {
        if (!userHasSignature) {
            alert(
                lang === 'bn'
                    ? 'স্থায়ীকরণ মূল্যায়ন অনুমোদন দেওয়ার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।'
                    : 'You must upload a digital signature to your profile before approving an evaluation.'
            );
            window.location.href = '/settings/profile';
            return;
        }
        setSelectedEvaluationForApproval(ev);
    };

    const handleFilter = (newSearch?: string, newStatus?: string, newFormType?: string, newPerPage?: string) => {
        const query: any = {};
        const s = newSearch !== undefined ? newSearch : search;
        const st = newStatus !== undefined ? newStatus : status;
        const ft = newFormType !== undefined ? newFormType : formType;
        const pp = newPerPage !== undefined ? newPerPage : perPage;

        if (s) query.search = s;
        if (st && st !== 'all') query.status = st;
        if (ft && ft !== 'all') query.form_type = ft;
        if (pp && pp !== '15') query.per_page = pp;

        if (newPerPage !== undefined) {
            setPerPage(newPerPage);
        }

        router.get('/confirmation-evaluations', query, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setSearch('');
        setStatus('all');
        setFormType('all');
        setPerPage('15');
        router.get('/confirmation-evaluations', {}, { replace: true });
    };

    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    const handleDelete = (id: number) => {
        setDeleteUrl(`/confirmation-evaluations/${id}`);
    };

    const getFormTypeBadge = (type: string) => {
        if (type === 'officer_abm') {
            return (
                <span 
                    title={lang === 'bn' ? 'মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপক' : 'Officer & Assistant Branch Manager'}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
                >
                    {lang === 'bn' ? 'ফরম ক' : 'Form A'}
                </span>
            );
        }
        if (type === 'accountant') {
            return (
                <span 
                    title={lang === 'bn' ? 'শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষক' : 'Accountant'}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap"
                >
                    {lang === 'bn' ? 'ফরম খ' : 'Form B'}
                </span>
            );
        }
        if (type === 'bm_and_above') {
            return (
                <span 
                    title={lang === 'bn' ? 'শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব' : 'Branch Manager to Zonal Manager'}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap"
                >
                    {lang === 'bn' ? 'ফরম গ' : 'Form C'}
                </span>
            );
        }
        return <Badge variant="outline" className="text-[10px] py-0 px-1">{type}</Badge>;
    };

    const getStatusBadge = (evaluationStatus: string) => {
        const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
            draft: { label: lang === 'bn' ? 'খসড়া' : 'Draft', bg: 'bg-slate-100', text: 'text-slate-700 border-slate-200', dot: 'bg-slate-400' },
            submitted_to_rm: { label: lang === 'bn' ? 'আরএম পর্যালোচনা' : 'RM Review', bg: 'bg-amber-50', text: 'text-amber-800 border-amber-200', dot: 'bg-amber-500' },
            submitted_to_zm: { label: lang === 'bn' ? 'জেডএম পর্যালোচনা' : 'ZM Review', bg: 'bg-blue-50', text: 'text-blue-800 border-blue-200', dot: 'bg-blue-500' },
            submitted_to_director: { label: lang === 'bn' ? 'পরিচালক পর্যালোচনা' : 'Director Review', bg: 'bg-indigo-50', text: 'text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
            submitted_to_director_fa: { label: lang === 'bn' ? 'পরিচালক (অর্থ) পর্যালোচনা' : 'Director FA Review', bg: 'bg-indigo-50', text: 'text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
            submitted_to_hr: { label: lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification', bg: 'bg-purple-50', text: 'text-purple-800 border-purple-200', dot: 'bg-purple-500' },
            submitted_to_ed: { label: lang === 'bn' ? 'ইডি অনুমোদন' : 'ED Approval', bg: 'bg-sky-50', text: 'text-sky-800 border-sky-200', dot: 'bg-sky-500' },
            approved: { label: lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
            rejected: { label: lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected', bg: 'bg-rose-50', text: 'text-rose-800 border-rose-200', dot: 'bg-rose-500' },
            sent_back: { label: lang === 'bn' ? 'ফেরত পাঠানো' : 'Sent Back', bg: 'bg-rose-50', text: 'text-rose-800 border-rose-200', dot: 'bg-rose-500' },
        };

        const config = configs[evaluationStatus] || { 
            label: evaluationStatus.replace(/_/g, ' ').toUpperCase(), 
            bg: 'bg-slate-100', 
            text: 'text-slate-700 border-slate-200', 
            dot: 'bg-slate-400' 
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.text} whitespace-nowrap`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot} shrink-0`} />
                <span>{config.label}</span>
            </span>
        );
    };

    const getRecommendationBadge = (rec: string, months?: number | null) => {
        if (rec === 'recommended') {
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                    {lang === 'bn' ? 'স্থায়ীকরণ যোগ্য' : 'Confirmed'}
                </span>
            );
        }
        if (rec === 'extend_probation') {
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                    {lang === 'bn' ? `বৃদ্ধি (${months || 3} মাস)` : `Extend (${months || 3}M)`}
                </span>
            );
        }
        if (rec === 'not_suitable') {
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                    {lang === 'bn' ? 'অনুপযুক্ত' : 'Not Suitable'}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">
                {lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
            </span>
        );
    };

    const totalEvaluationsCount = metrics.total || evaluations.total || (evaluations.data ? evaluations.data.length : 0);

    return (
        <Layout>
            <Head title={lang === 'bn' ? 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন তালিকা' : 'Probation Confirmation Evaluations'} />
            
            {/* 100% FULL-WIDTH CONTAINER: No max-w-7xl restriction, fills entire parent surface */}
            <div className="w-full space-y-3.5">
                {/* Header Banner - Compact & Clean (Emerald Design System) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                            <span>{lang === 'bn' ? 'মানবসম্পদ' : 'HR'}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                            <span>{lang === 'bn' ? 'শিক্ষানবিশকাল মূল্যায়ন' : 'Probation Appraisal'}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                            <span className="text-emerald-700 font-semibold">{lang === 'bn' ? 'স্থায়ীকরণ মূল্যায়ন' : 'Confirmation Evaluation'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 shrink-0">
                                <Award className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                    {lang === 'bn' ? 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন' : 'Probation Confirmation Evaluations'}
                                </h1>
                                <p className="text-[11px] text-slate-500">
                                    {lang === 'bn' 
                                        ? 'শিক্ষানবিশকালে কর্মরত কর্মকর্তা ও কর্মচারীদের চাকরি স্থায়ীকরণ মূল্যায়ন ও অনুমোদন পোর্টাল' 
                                        : 'Confirmation appraisal, scoring & hierarchical approval portal'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        {/* Language Switcher */}
                        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('bn');
                                    localStorage.setItem('eval_lang', 'bn');
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-2xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('en');
                                    localStorage.setItem('eval_lang', 'en');
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-2xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        {/* Evaluation Rubrics Setup Button */}
                        <Link href="/promotion-evaluations/templates">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8.5 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{lang === 'bn' ? 'মূল্যায়ন রুব্রিক্স' : 'Rubrics'}</span>
                            </Button>
                        </Link>

                        {/* Create New Confirmation Evaluation */}
                        {canCreate ? (
                            <Link href="/confirmation-evaluations/create" className="shrink-0">
                                <Button className="h-8.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs transition-all flex items-center gap-1.5 px-3 rounded-lg text-xs">
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>{lang === 'bn' ? 'নতুন মূল্যায়ন শুরু করুন' : 'Start Evaluation'}</span>
                                </Button>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
                                <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                                <span>{lang === 'bn' ? 'শুধুমাত্র প্রদর্শন' : 'View Only'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI Metrics Summary Cards - Compact & Slim */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <Card className="border-slate-200 shadow-2xs bg-white">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {lang === 'bn' ? 'মোট মূল্যায়ন' : 'Total Evaluated'}
                                </p>
                                <h3 className="text-xl font-bold text-slate-900 mt-0.5 leading-none">{totalEvaluationsCount}</h3>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <Users className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-2xs bg-white">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                                    {lang === 'bn' ? 'চলমান / অপেক্ষমাণ' : 'Pending Review'}
                                </p>
                                <h3 className="text-xl font-bold text-amber-800 mt-0.5 leading-none">{metrics.pending}</h3>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <Clock className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-2xs bg-white">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                                    {lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved'}
                                </p>
                                <h3 className="text-xl font-bold text-emerald-800 mt-0.5 leading-none">{metrics.approved}</h3>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-2xs bg-white">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                                    {lang === 'bn' ? 'স্থায়ীকরণ সুপারিশকৃত' : 'Recommended'}
                                </p>
                                <h3 className="text-xl font-bold text-emerald-800 mt-0.5 leading-none">{metrics.recommended}</h3>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <UserCheck className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar - Compact Single Row */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input 
                            placeholder={lang === 'bn' ? 'পিন বা নাম দিয়ে খুঁজুন...' : 'Search by PIN or Name...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter(search)}
                            className="pl-8 bg-slate-50/50 border-slate-200 h-8 rounded-md text-xs placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <Select 
                            value={status} 
                            onValueChange={(val) => {
                                setStatus(val);
                                handleFilter(undefined, val, undefined);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-40 h-8 border-slate-200 bg-slate-50/50 text-[11px]">
                                <SelectValue placeholder={lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</SelectItem>
                                <SelectItem value="draft">{lang === 'bn' ? 'খসড়া (Draft)' : 'Draft'}</SelectItem>
                                <SelectItem value="submitted_to_rm">{lang === 'bn' ? 'আরএম পর্যালোচনা' : 'RM Review'}</SelectItem>
                                <SelectItem value="submitted_to_zm">{lang === 'bn' ? 'জেডএম পর্যালোচনা' : 'ZM Review'}</SelectItem>
                                <SelectItem value="submitted_to_director">{lang === 'bn' ? 'পরিচালক পর্যালোচনা' : 'Director Review'}</SelectItem>
                                <SelectItem value="submitted_to_director_fa">{lang === 'bn' ? 'পরিচালক (অর্থ) পর্যালোচনা' : 'Director FA Review'}</SelectItem>
                                <SelectItem value="submitted_to_hr">{lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification'}</SelectItem>
                                <SelectItem value="submitted_to_ed">{lang === 'bn' ? 'ইডি অনুমোদন' : 'ED Approval'}</SelectItem>
                                <SelectItem value="approved">{lang === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}</SelectItem>
                                <SelectItem value="rejected">{lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected'}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select 
                            value={formType} 
                            onValueChange={(val) => {
                                setFormType(val);
                                handleFilter(undefined, undefined, val);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-36 h-8 border-slate-200 bg-slate-50/50 text-[11px]">
                                <SelectValue placeholder={lang === 'bn' ? 'সকল ফরম' : 'All Forms'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{lang === 'bn' ? 'সকল ফরম' : 'All Forms'}</SelectItem>
                                <SelectItem value="officer_abm">{lang === 'bn' ? 'ফরম ক (অফিসার)' : 'Form A'}</SelectItem>
                                <SelectItem value="accountant">{lang === 'bn' ? 'ফরম খ (হিসাবরক্ষক)' : 'Form B'}</SelectItem>
                                <SelectItem value="bm_and_above">{lang === 'bn' ? 'ফরম গ (শাখা ব্য.)' : 'Form C'}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleFilter(search)}
                            className="h-8 px-2.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        >
                            <Search className="h-3.5 w-3.5" />
                        </Button>

                        {(search || status !== 'all' || formType !== 'all') && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleReset}
                                className="h-8 px-2 text-slate-500 hover:text-slate-800"
                                title="Reset filters"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table Content - Professional, Compact, Zero Horizontal Scroll */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <Table className="w-full table-fixed">
                        <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow className="text-[11px] font-semibold text-slate-600 hover:bg-transparent">
                                <TableHead className="w-[10%] py-2 px-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</TableHead>
                                <TableHead className="w-[24%] py-2 px-3">{lang === 'bn' ? 'কর্মী বিবরণ' : 'Staff Details'}</TableHead>
                                <TableHead className="w-[20%] py-2 px-3">{lang === 'bn' ? 'পদবী ও শাখা' : 'Designation & Branch'}</TableHead>
                                <TableHead className="w-[11%] py-2 px-3">{lang === 'bn' ? 'ফরমের ধরন' : 'Form Type'}</TableHead>
                                <TableHead className="w-[12%] py-2 px-3 text-center">{lang === 'bn' ? 'মোট স্কোর ও সুপারিশ' : 'Score & Recommendation'}</TableHead>
                                <TableHead className="w-[11%] py-2 px-3">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                                <TableHead className="w-[12%] py-2 px-3 text-right">{lang === 'bn' ? 'পদক্ষেপ' : 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {evaluations.data && evaluations.data.length > 0 ? (
                                evaluations.data.map((ev: any) => {
                                    const employeeName = lang === 'bn' 
                                        ? (ev.employee?.name_bn || ev.employee?.name_en) 
                                        : (ev.employee?.name_en || ev.employee?.name_bn);
                                    
                                    const designationName = ev.employee?.designation?.name || '-';
                                    const branchName = ev.employee?.branch?.name || '-';

                                    return (
                                        <TableRow key={ev.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                                            {/* Date */}
                                            <TableCell className="py-2 px-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                                    <span>{format(new Date(ev.created_at), 'dd/MM/yyyy')}</span>
                                                </div>
                                                {ev.closing_month && (
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        {formatClosingMonth(ev.closing_month, lang)}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Employee Name & PIN */}
                                            <TableCell className="py-2 px-3">
                                                <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                                                    {employeeName}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                                        PIN: {ev.employee?.pin}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Designation & Branch */}
                                            <TableCell className="py-2 px-3">
                                                <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                                                    {designationName}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                                    <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                                    <span className="truncate">{branchName}</span>
                                                </div>
                                            </TableCell>

                                            {/* Form Type */}
                                            <TableCell className="py-2 px-3">
                                                {getFormTypeBadge(ev.form_type)}
                                            </TableCell>

                                            {/* Score & Recommendation */}
                                            <TableCell className="py-2 px-3 text-center">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <span className="font-bold text-xs text-slate-900 leading-none">
                                                        {Number(ev.total_score || 0)} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                                                    </span>
                                                    {getRecommendationBadge(ev.recommendation_status, ev.extend_months)}
                                                </div>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="py-2 px-3">
                                                <div className="flex flex-col gap-0.5 items-start">
                                                    {getStatusBadge(ev.status)}
                                                    {ev.status === 'draft' && ev.sent_back_reason && (
                                                        <span 
                                                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"
                                                            title={`ফেরত পাঠানোর কারণ: ${ev.sent_back_reason}`}
                                                        >
                                                            <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                                                            {lang === 'bn' ? 'সংশোধন প্রয়োজন' : 'Needs Revision'}
                                                        </span>
                                                    )}
                                                    {ev.has_user_signed && !ev.can_approve && !['approved', 'rejected'].includes(ev.status) && (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 whitespace-nowrap">
                                                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                                            {lang === 'bn' ? 'স্বাক্ষর সম্পন্ন' : 'Signed'}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-2 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Strict Approve Button */}
                                                    {ev.can_approve && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => openApprovalModal(ev)}
                                                            className="h-6.5 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-2xs flex items-center gap-1"
                                                            title={lang === 'bn' ? 'অনুমোদন ও অগ্রবর্তী করুন' : 'Approve & Forward'}
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span>{lang === 'bn' ? 'অনুমোদন' : 'Approve'}</span>
                                                        </Button>
                                                    )}

                                                    {/* View */}
                                                    <Link href={`/confirmation-evaluations/${ev.id}`}>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-6.5 w-6.5 p-0 border-slate-200 hover:bg-slate-50 text-slate-700"
                                                            title={lang === 'bn' ? 'বিস্তারিত দেখুন' : 'View'}
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                                                        </Button>
                                                    </Link>

                                                    {/* Edit */}
                                                    {ev.can_edit && (
                                                        <Link href={`/confirmation-evaluations/${ev.id}/edit`}>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-6.5 w-6.5 p-0 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
                                                                title={lang === 'bn' ? 'সম্পাদনা করুন' : 'Edit'}
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {/* Print */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => window.open(`/confirmation-evaluations/${ev.id}/print`, '_blank')}
                                                        className="h-6.5 w-6.5 p-0 border-slate-200 hover:bg-slate-50 text-slate-700"
                                                        title={lang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}
                                                    >
                                                        <Printer className="h-3.5 w-3.5 text-slate-600" />
                                                    </Button>

                                                    {/* Delete */}
                                                    {ev.can_delete && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handleDelete(ev.id)}
                                                            className="h-6.5 w-6.5 p-0 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
                                                            title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3 ring-1 ring-emerald-600/10">
                                                <Award className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900">{lang === 'bn' ? 'কোনো মূল্যায়ন পাওয়া যায়নি' : 'No evaluations found'}</h3>
                                            <p className="text-[11px] text-slate-500 mt-1 text-center">
                                                {search || status !== 'all' || formType !== 'all' 
                                                    ? (lang === 'bn' ? 'আপনার অনুসন্ধানের সাথে কোনো মূল্যায়ন মেলেনি।' : 'No confirmation evaluations matched your search filters.')
                                                    : (lang === 'bn' ? 'আপনার আওতায় এখনও কোনো শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন শুরু করা হয়নি।' : 'No confirmation evaluations have been initiated yet in your jurisdiction.')}
                                            </p>

                                            {canCreate && (
                                                <div className="mt-4">
                                                    <Link href="/confirmation-evaluations/create">
                                                        <Button className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs">
                                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                                            <span>{lang === 'bn' ? 'নতুন মূল্যায়ন শুরু করুন' : 'Start Evaluation'}</span>
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination and per-page footer (Identical to Promotion Evaluation Index) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80 p-3 sm:p-4 bg-slate-50/50 text-xs text-slate-500">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span>{lang === 'bn' ? 'প্রতি পৃষ্ঠায়:' : 'Rows per page:'}</span>
                                <Select
                                    value={String(perPage)}
                                    onValueChange={(val) => handleFilter(undefined, undefined, undefined, val)}
                                >
                                    <SelectTrigger className="h-7 w-[68px] text-xs bg-white border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="15">15</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                                {lang === 'bn' ? (
                                    <>
                                        মোট <span className="font-bold text-slate-700">{evaluations.total || 0}</span> টির মধ্যে{' '}
                                        <span className="font-bold text-slate-700">
                                             {evaluations.total > 0 ? (evaluations.current_page - 1) * (evaluations.per_page || 15) + 1 : 0}
                                        </span>{' '}
                                        থেকে{' '}
                                        <span className="font-bold text-slate-700">
                                            {Math.min(evaluations.current_page * (evaluations.per_page || 15), evaluations.total || 0)}
                                        </span>{' '}
                                        দেখানো হচ্ছে
                                    </>
                                ) : (
                                    <>
                                        Showing{' '}
                                        <span className="font-bold text-slate-700">
                                            {evaluations.total > 0 ? (evaluations.current_page - 1) * (evaluations.per_page || 15) + 1 : 0}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-bold text-slate-700">
                                            {Math.min(evaluations.current_page * (evaluations.per_page || 15), evaluations.total || 0)}
                                        </span>{' '}
                                        of <span className="font-bold text-slate-700">{evaluations.total || 0}</span> entries
                                    </>
                                )}
                            </div>
                        </div>

                        {evaluations.last_page > 1 && evaluations.links && (
                            <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                                {evaluations.current_page > 1 && evaluations.links[0]?.url ? (
                                    <Link
                                        href={evaluations.links[0].url}
                                        preserveState
                                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-600 hover:border-emerald-200 text-xs shadow-2xs"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Link>
                                ) : null}

                                {evaluations.links.slice(1, -1).map((link: any, i: number) => {
                                    const isActive = link.active;
                                    const isDots = link.label === '...';

                                    if (isDots) {
                                        return (
                                            <span key={i} className="inline-flex h-7.5 w-7.5 items-center justify-center text-xs font-semibold text-slate-400">
                                                ...
                                            </span>
                                        );
                                    }

                                    if (isActive && !link.url) {
                                        return (
                                            <span
                                                key={i}
                                                className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={i}
                                            href={link.url || '#'}
                                            preserveState
                                            className={`inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-600 shadow-2xs'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}

                                {evaluations.current_page < evaluations.last_page && evaluations.links[evaluations.links.length - 1]?.url ? (
                                    <Link
                                        href={evaluations.links[evaluations.links.length - 1].url!}
                                        preserveState
                                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-600 hover:border-emerald-200 text-xs shadow-2xs"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                ) : null}
                            </nav>
                        )}
                    </div>
                </div>

            <AppraisalApprovalDialog
                kind="confirmation"
                lang={lang}
                evaluation={selectedEvaluationForApproval}
                onClose={() => setSelectedEvaluationForApproval(null)}
            />
            <AppraisalDeleteDialog
                open={deleteUrl !== null}
                onOpenChange={(open) => { if (!open) setDeleteUrl(null); }}
                url={deleteUrl}
                lang={lang}
            />
            </div>
        </Layout>
    );
}
