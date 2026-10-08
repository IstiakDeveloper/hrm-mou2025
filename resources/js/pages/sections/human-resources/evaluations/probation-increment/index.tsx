import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
    UserCheck,
    TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ProbationIncrementEvaluationIndexProps {
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

export default function ProbationIncrementEvaluationIndex({ 
    evaluations, 
    metrics = { total: 0, pending: 0, approved: 0, recommended: 0 }, 
    filters = {}, 
    canCreate,
    isSuperAdmin = false,
    currentUserId = null,
    userHasSignature = false,
}: ProbationIncrementEvaluationIndexProps) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('prob_inc_eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [formType, setFormType] = useState(filters.form_type || 'all');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    // Quick Approval / Action Modal State
    const [selectedEvaluationForApproval, setSelectedEvaluationForApproval] = useState<any | null>(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [approvalRecommendation, setApprovalRecommendation] = useState('recommend_increment');
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [approvalMode, setApprovalMode] = useState<'approve' | 'send_back'>('approve');

    const openApprovalModal = (ev: any) => {
        if (!userHasSignature) {
            alert(
                lang === 'bn' 
                    ? 'শিক্ষানবিস মূল্যায়ন অনুমোদন দেওয়ার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।' 
                    : 'You must upload a digital signature to your profile before approving an evaluation.'
            );
            window.location.href = '/settings/profile';
            return;
        }
        setSelectedEvaluationForApproval(ev);
        setApprovalMode('approve');
        setApprovalRecommendation(ev.supervisor_recommendation || 'recommend_increment');
        if (ev.status === 'submitted_to_hr') {
            setApprovalComments('ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করা হলো এবং চূড়ান্ত সিদ্ধান্তের জন্য নির্বাহী পরিচালক বরাবর অগ্রবর্তী করা হলো।');
        } else {
            setApprovalComments('সুপারিশ ও স্বাক্ষরসহ অনুমোদন ও পরবর্তী স্তরে অগ্রবর্তী করা হলো।');
        }
    };

    const submitApproval = (isApproved: boolean = true) => {
        if (!selectedEvaluationForApproval) return;
        setIsSubmittingApproval(true);

        const ev = selectedEvaluationForApproval;
        if (ev.status === 'submitted_to_hr') {
            router.post(`/probation-increment-evaluations/${ev.id}/hr-verify`, {
                comments: approvalComments || 'ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করা হলো এবং চূড়ান্ত সিদ্ধান্তের জন্য নির্বাহী পরিচালক বরাবর অগ্রবর্তী করা হলো।',
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedEvaluationForApproval(null);
                    setIsSubmittingApproval(false);
                },
                onError: () => {
                    setIsSubmittingApproval(false);
                }
            });
            return;
        }

        if (ev.status === 'submitted_to_ed') {
            router.post(`/probation-increment-evaluations/${ev.id}/ed-approve`, {
                comments: approvalComments || 'চূড়ান্ত অনুমোদন প্রদান করা হলো।',
                is_approved: isApproved,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedEvaluationForApproval(null);
                    setIsSubmittingApproval(false);
                },
                onError: () => {
                    setIsSubmittingApproval(false);
                }
            });
            return;
        }

        router.post(`/probation-increment-evaluations/${ev.id}/forward`, {
            comments: approvalComments || 'সুপারিশ ও স্বাক্ষরসহ পরবর্তী স্তরে অগ্রবর্তী করা হলো।',
            supervisor_recommendation: approvalRecommendation,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedEvaluationForApproval(null);
                setIsSubmittingApproval(false);
            },
            onError: () => {
                setIsSubmittingApproval(false);
            }
        });
    };

    const submitSendBack = () => {
        if (!selectedEvaluationForApproval) return;
        if (!approvalComments.trim()) {
            alert(lang === 'bn' ? 'সংশোধনে ফেরত পাঠানোর কারণ উল্লেখ আবশ্যক।' : 'Please provide return reason.');
            return;
        }
        setIsSubmittingApproval(true);
        router.post(`/probation-increment-evaluations/${selectedEvaluationForApproval.id}/send-back`, {
            comments: approvalComments.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedEvaluationForApproval(null);
                setIsSubmittingApproval(false);
            },
            onError: () => {
                setIsSubmittingApproval(false);
            }
        });
    };

    const handleSearch = () => {
        router.get('/probation-increment-evaluations', {
            search,
            status,
            form_type: formType,
            per_page: perPage,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('all');
        setFormType('all');
        setPerPage('15');
        router.get('/probation-increment-evaluations', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = (id: number) => {
        if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই মূল্যায়নটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this evaluation?')) {
            router.delete(`/probation-increment-evaluations/${id}`);
        }
    };

    const toBn = (num: number | string) => {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
    };

    const formatNum = (num: number | string) => {
        return lang === 'bn' ? toBn(num) : String(num);
    };

    const getStatusBadge = (evaluationStatus: string) => {
        const configs: Record<string, { label: string; bg: string }> = {
            draft: { label: lang === 'bn' ? 'খসড়া' : 'Draft', bg: 'bg-slate-100 text-slate-700' },
            submitted_to_rm: { label: lang === 'bn' ? 'আরএম পর্যালোচনা' : 'RM Review', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_zm: { label: lang === 'bn' ? 'জেডএম পর্যালোচনা' : 'ZM Review', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_director: { label: lang === 'bn' ? 'পরিচালক পর্যালোচনা' : 'Director Review', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
            submitted_to_director_fa: { label: lang === 'bn' ? 'পরিচালক (অর্থ) পর্যালোচনা' : 'Director FA Review', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
            submitted_to_hr: { label: lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
            submitted_to_ed: { label: lang === 'bn' ? 'ইডি অনুমোদন' : 'ED Approval', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
            approved: { label: lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
            rejected: { label: lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
            sent_back: { label: lang === 'bn' ? 'ফেরত পাঠানো' : 'Sent Back', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
        };

        const config = configs[evaluationStatus] || { 
            label: evaluationStatus.replace(/_/g, ' ').toUpperCase(), 
            bg: 'bg-slate-100 text-slate-700' 
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
                {config.label}
            </span>
        );
    };

    const getFormTypeBadge = (type: string) => {
        const types: Record<string, { label: string; bg: string }> = {
            officer_abm: { 
                label: lang === 'bn' ? 'অফিসার ও সহকারী শাখা ব্যবস্থাপক' : 'Officer & ABM', 
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            },
            accountant: { 
                label: lang === 'bn' ? 'হিসাবরক্ষক' : 'Accountant', 
                bg: 'bg-purple-50 text-purple-700 border-purple-200' 
            },
            bm_and_above: { 
                label: lang === 'bn' ? 'শাখা ব্যবস্থাপক থেকে জেডএম' : 'BM to ZM', 
                bg: 'bg-amber-50 text-amber-700 border-amber-200' 
            },
        };
        const config = types[type] || { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${config.bg}`}>
                {config.label}
            </span>
        );
    };

    const getRecommendationBadge = (rec: string) => {
        if (rec === 'recommend_increment') {
            return (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold">
                    {lang === 'bn' ? 'বেতন বৃদ্ধি সুপারিশ' : 'Recommend Increment'}
                </Badge>
            );
        }
        if (rec === 'defer_increment') {
            return (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-[11px] font-semibold">
                    {lang === 'bn' ? 'স্থগিত / পুনমূল্যায়ন' : 'Defer Increment'}
                </Badge>
            );
        }
        if (rec === 'not_suitable') {
            return (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-[11px] font-semibold">
                    {lang === 'bn' ? 'অনুপযুক্ত' : 'Not Suitable'}
                </Badge>
            );
        }
        return <span className="text-slate-400 text-xs">-</span>;
    };

    const dataList = evaluations?.data || [];
    const meta = evaluations || {};

    return (
        <Layout>
            <Head title={lang === 'bn' ? 'শিক্ষানবিসকাল ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'} />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Award className="h-4 w-4" />
                                {lang === 'bn' ? 'এইচআর মূল্যায়ন ব্যবস্থাপনা' : 'HR Evaluations'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                            {lang === 'bn' ? 'শিক্ষানবিসকাল ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            {lang === 'bn' 
                                ? 'শিক্ষানবিসকাল ০৩ মাস পূর্তির ভিত্তিতে বেতন বৃদ্ধির মূল্যায়ন ও বহুস্তরীয় অনুমোদন প্রক্রিয়া।' 
                                : 'Multi-tier review and approval for 2nd step salary increment upon 03-month probation completion.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('bn');
                                    localStorage.setItem('prob_inc_eval_lang', 'bn');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('en');
                                    localStorage.setItem('prob_inc_eval_lang', 'en');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        {/* Create Button */}
                        {canCreate && (
                            <Link href="/probation-increment-evaluations/create">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-xs flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span>{lang === 'bn' ? 'নতুন ইনক্রিমেন্ট মূল্যায়ন' : 'New Increment Evaluation'}</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200/80 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    {lang === 'bn' ? 'সর্বমোট মূল্যায়ন' : 'Total Evaluations'}
                                </p>
                                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                    {formatNum(metrics.total)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    {lang === 'bn' ? 'অনুমোদন প্রক্রিয়াধীন' : 'Pending Review'}
                                </p>
                                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                    {formatNum(metrics.pending)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    {lang === 'bn' ? 'বেতন বৃদ্ধি সুপারিশকৃত' : 'Increment Recommended'}
                                </p>
                                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                    {formatNum(metrics.recommended)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    {lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Fully Approved'}
                                </p>
                                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                    {formatNum(metrics.approved)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Section */}
                <Card className="border-slate-200/80 shadow-xs">
                    <CardContent className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder={lang === 'bn' ? 'নাম, পিন, শাখা দিয়ে খুঁজুন...' : 'Search by name, PIN, branch...'}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-9 h-9 text-xs bg-white border-slate-300"
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                        <SelectValue placeholder={lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</SelectItem>
                                        <SelectItem value="draft">{lang === 'bn' ? 'খসড়া' : 'Draft'}</SelectItem>
                                        <SelectItem value="submitted_to_rm">{lang === 'bn' ? 'আরএম পর্যালোচনা' : 'RM Review'}</SelectItem>
                                        <SelectItem value="submitted_to_zm">{lang === 'bn' ? 'জেডএম পর্যালোচনা' : 'ZM Review'}</SelectItem>
                                        <SelectItem value="submitted_to_director">{lang === 'bn' ? 'পরিচালক পর্যালোচনা' : 'Director Review'}</SelectItem>
                                        <SelectItem value="submitted_to_hr">{lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification'}</SelectItem>
                                        <SelectItem value="submitted_to_ed">{lang === 'bn' ? 'ইডি অনুমোদন' : 'ED Approval'}</SelectItem>
                                        <SelectItem value="approved">{lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved'}</SelectItem>
                                        <SelectItem value="rejected">{lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Form Type Filter */}
                            <div>
                                <Select value={formType} onValueChange={setFormType}>
                                    <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                        <SelectValue placeholder={lang === 'bn' ? 'সকল পদবী স্তর' : 'All Form Types'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{lang === 'bn' ? 'সকল পদবী স্তর' : 'All Form Types'}</SelectItem>
                                        <SelectItem value="officer_abm">{lang === 'bn' ? 'অফিসার ও সহকারী শাখা ব্যবস্থাপক' : 'Officer & ABM'}</SelectItem>
                                        <SelectItem value="accountant">{lang === 'bn' ? 'হিসাবরক্ষক' : 'Accountant'}</SelectItem>
                                        <SelectItem value="bm_and_above">{lang === 'bn' ? 'শাখা ব্যবস্থাপক থেকে জেডএম' : 'BM to ZM'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filter Actions */}
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleSearch}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold flex-1 shadow-xs"
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                                    {lang === 'bn' ? 'ফিল্টার' : 'Filter'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleClearFilters}
                                    className="border-slate-300 text-slate-600 text-xs h-9"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Evaluations Table Card */}
                <Card className="border-slate-200/80 shadow-xs overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-12 text-center text-xs font-bold text-slate-700">#</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700">{lang === 'bn' ? 'কর্মী ও পদবী' : 'Employee'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700">{lang === 'bn' ? 'ফরম ধরন' : 'Form Type'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700">{lang === 'bn' ? '০৩ মাস পূর্তির তারিখ' : '03M Completion'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700 text-center">{lang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Score'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700">{lang === 'bn' ? 'সুপারিশ' : 'Recommendation'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700">{lang === 'bn' ? 'বর্তমান ধাপ' : 'Workflow Status'}</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-700 text-right pr-6">{lang === 'bn' ? 'পদক্ষেপ' : 'Actions'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {dataList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Award className="h-10 w-10 text-slate-300 mb-2" />
                                                    <p className="text-sm font-semibold text-slate-600">
                                                        {lang === 'bn' ? 'কোনো মূল্যায়ন রেকর্ড পাওয়া যায়নি' : 'No increment evaluations found'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {lang === 'bn' ? 'নতুন মূল্যায়ন যুক্ত করুন অথবা ফিল্টার পরিবর্তন করুন।' : 'Create a new evaluation or adjust your filter.'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dataList.map((item: any, idx: number) => {
                                            const emp = item.employee || {};
                                            const empName = lang === 'bn' ? (emp.name_bn || emp.name_en) : (emp.name_en || emp.name_bn);
                                            const desig = lang === 'bn' ? (emp.designation?.name_bn || emp.designation?.name) : (emp.designation?.name_en || emp.designation?.name);
                                            const branch = emp.branch?.name || item.branch?.name || '-';
                                            const canEdit = item.status === 'draft' || isSuperAdmin;
                                            const canDelete = item.status === 'draft' || isSuperAdmin;
                                            const canUserApprove = item.can_approve;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <TableCell className="text-center text-xs text-slate-500 font-medium">
                                                        {formatNum((meta.current_page - 1) * meta.per_page + idx + 1)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <Link 
                                                                href={`/probation-increment-evaluations/${item.id}`}
                                                                className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                                                            >
                                                                {empName}
                                                            </Link>
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-semibold text-slate-700">[{emp.pin}]</span>
                                                                <span>•</span>
                                                                <span>{desig || '-'}</span>
                                                                <span>•</span>
                                                                <span>{branch}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getFormTypeBadge(item.form_type)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 font-medium">
                                                        {item.probation_3m_completion_date ? formatNum(item.probation_3m_completion_date) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="text-xs font-extrabold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {formatNum(item.total_score || 0)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getRecommendationBadge(item.supervisor_recommendation)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(item.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Quick Review / Approve Button if authorized */}
                                                            {canUserApprove && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openApprovalModal(item)}
                                                                    className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1"
                                                                >
                                                                    <UserCheck className="h-3.5 w-3.5" />
                                                                    <span>{lang === 'bn' ? 'পর্যালোচনা' : 'Review'}</span>
                                                                </Button>
                                                            )}

                                                            {/* View Details */}
                                                            <Link href={`/probation-increment-evaluations/${item.id}`}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg border-slate-300 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                    title={lang === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Link>

                                                            {/* Print Form */}
                                                            <Link href={`/probation-increment-evaluations/${item.id}/print`} target="_blank">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                                                    title={lang === 'bn' ? 'প্রিন্ট' : 'Print'}
                                                                >
                                                                    <Printer className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Link>

                                                            {/* Edit */}
                                                            {canEdit && (
                                                                <Link href={`/probation-increment-evaluations/${item.id}/edit`}>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50"
                                                                        title={lang === 'bn' ? 'সম্পাদনা' : 'Edit'}
                                                                    >
                                                                        <Edit3 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </Link>
                                                            )}

                                                            {/* Delete */}
                                                            {canDelete && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(item.id)}
                                                                    className="h-8 w-8 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                                                                    title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {meta.last_page > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
                                <div>
                                    {lang === 'bn' 
                                        ? `মোট ${formatNum(meta.total)} টি রেকর্ডের মধ্যে ${formatNum(meta.from || 0)} - ${formatNum(meta.to || 0)} দেখানো হচ্ছে` 
                                        : `Showing ${meta.from || 0} to ${meta.to || 0} of ${meta.total} evaluations`}
                                </div>
                                <div className="flex items-center gap-1">
                                    {meta.links?.map((link: any, lIdx: number) => {
                                        if (!link.url) {
                                            return (
                                                <Button
                                                    key={lIdx}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    className="h-8 min-w-[32px] text-xs px-2.5 opacity-40"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        }
                                        return (
                                            <Link key={lIdx} href={link.url} preserveScroll preserveState>
                                                <Button
                                                    variant={link.active ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`h-8 min-w-[32px] text-xs px-2.5 ${
                                                        link.active 
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                                            : 'border-slate-300 text-slate-700'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Action / Review Modal */}
            <Dialog 
                open={Boolean(selectedEvaluationForApproval)} 
                onOpenChange={(open) => !open && setSelectedEvaluationForApproval(null)}
            >
                <DialogContent className="max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Award className="h-5 w-5 text-emerald-600" />
                            {lang === 'bn' ? 'মূল্যায়ন পর্যালোচনা ও অনুমোদন' : 'Evaluation Review & Approval'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-1">
                            {selectedEvaluationForApproval?.employee?.name_bn || selectedEvaluationForApproval?.employee?.name_en} 
                            ({selectedEvaluationForApproval?.employee?.pin}) - এর বেতন বৃদ্ধি মূল্যায়ন
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-2">
                        {/* Mode Switcher: Approve vs Send Back */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setApprovalMode('approve')}
                                className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    approvalMode === 'approve'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'অনুমোদন ও অগ্রবর্তী' : 'Approve & Forward'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setApprovalMode('send_back')}
                                className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    approvalMode === 'send_back'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>{lang === 'bn' ? 'সংশোধনে ফেরত পাঠান' : 'Send Back'}</span>
                            </button>
                        </div>

                        {approvalMode === 'approve' ? (
                            <div className="space-y-3">
                                {selectedEvaluationForApproval?.status !== 'submitted_to_hr' && selectedEvaluationForApproval?.status !== 'submitted_to_ed' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">
                                            {lang === 'bn' ? 'সুপারভাইজারের সুপারিশ:' : 'Recommendation:'}
                                        </label>
                                        <Select 
                                            value={approvalRecommendation} 
                                            onValueChange={setApprovalRecommendation}
                                        >
                                            <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recommend_increment">
                                                    বেতন বৃদ্ধির জন্য সুপারিশ করা হলো
                                                </SelectItem>
                                                <SelectItem value="defer_increment">
                                                    বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন করা হোক
                                                </SelectItem>
                                                <SelectItem value="not_suitable">
                                                    বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        {lang === 'bn' ? 'মন্তব্য বা পর্যবেক্ষণ (যদি থাকে):' : 'Remarks / Comments:'}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={approvalComments}
                                        onChange={(e) => setApprovalComments(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder={lang === 'bn' ? 'অনুমোদনের মন্তব্য লিখুন...' : 'Enter approval notes...'}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    {lang === 'bn' ? 'সংশোধনের কারণ (আবশ্যক):' : 'Reason for Revision (Required):'}
                                </label>
                                <textarea
                                    rows={3}
                                    value={approvalComments}
                                    onChange={(e) => setApprovalComments(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder={lang === 'bn' ? 'স্রষ্টার নিকট ফেরত পাঠানোর সুনির্দিষ্ট কারণ লিখুন...' : 'Specify reasons for return...'}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSubmittingApproval}
                            onClick={() => setSelectedEvaluationForApproval(null)}
                            className="text-xs h-9 border-slate-300"
                        >
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                        </Button>

                        {approvalMode === 'approve' ? (
                            <Button
                                size="sm"
                                disabled={isSubmittingApproval}
                                onClick={() => submitApproval(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-bold shadow-xs"
                            >
                                <Check className="h-4 w-4 mr-1" />
                                {isSubmittingApproval ? (lang === 'bn' ? 'অগ্রবর্তী হচ্ছে...' : 'Processing...') : (lang === 'bn' ? 'অনুমোদন ও স্বাক্ষর' : 'Approve & Sign')}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                disabled={isSubmittingApproval}
                                onClick={submitSendBack}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-4 font-bold shadow-xs"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                {isSubmittingApproval ? (lang === 'bn' ? 'ফেরত হচ্ছে...' : 'Processing...') : (lang === 'bn' ? 'ফেরত পাঠান' : 'Send Back')}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
