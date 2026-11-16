import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    Printer, 
    Edit, 
    Trash2, 
    CheckCircle2, 
    Send, 
    Clock, 
    FileText, 
    AlertCircle,
    UserCheck,
    Calendar,
    Link2
} from 'lucide-react';
import WorkflowTimelineStepper from './components/WorkflowTimelineStepper';
import OfficialResignationDocument from './components/OfficialResignationDocument';
import ResignationApprovalDialog from './components/ResignationApprovalDialog';

interface ShowProps {
    application: any;
    canReview: boolean;
    canApprove: boolean;
    canEdit: boolean;
    canDelete: boolean;
    hasUserSigned: boolean;
    userHasSignature: boolean;
    currentStageLabel: string;
    reasonCategoryLabels: Record<string, string>;
    currentUserId: number;
    isSuperAdmin: boolean;
}

export default function ResignationApplicationShow({
    application,
    canReview,
    canApprove,
    canEdit,
    canDelete,
    hasUserSigned,
    userHasSignature,
    currentStageLabel,
    reasonCategoryLabels,
    isSuperAdmin,
}: ShowProps) {
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const employee = application.employee || {};

    const handleDelete = () => {
        if (confirm('আপনি কি নিশ্চিত যে এই অব্যাহতির আবেদনটি মুছে ফেলতে চান?')) {
            router.delete(`/resignation-applications/${application.id}`);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> অনুমোদিত</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="gap-1 text-xs">বাতিল</Badge>;
            case 'sent_back':
                return <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs">সংশোধনে প্রেরিত</Badge>;
            case 'draft':
                return <Badge variant="secondary" className="gap-1 text-xs">খসড়া</Badge>;
            default:
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"><Clock className="h-3.5 w-3.5" /> পর্যালোচনায়</Badge>;
        }
    };

    const isEdStage = application.status === 'submitted_to_ed';

    return (
        <AdminLayout>
            <Head title={`অব্যাহতির আবেদন - ${application.application_no}`} />

            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                {/* Header Action Bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/resignation-applications">
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                                <ArrowLeft className="h-4 w-4" />
                                তালিকায় ফিরে যান
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900">
                                    আবেদন নং: {application.application_no}
                                </h1>
                                {getStatusBadge(application.status)}
                            </div>
                            <p className="text-xs text-slate-500">
                                বর্তমান পর্যায়: <span className="font-semibold text-slate-700">{currentStageLabel}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Print / PDF Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/resignation-applications/${application.id}/print`, '_blank')}
                            className="h-9 gap-1.5 text-xs text-slate-700"
                        >
                            <Printer className="h-4 w-4" />
                            প্রিন্ট / PDF ভিউ
                        </Button>

                        {/* Edit Button */}
                        {canEdit && (
                            <Link href={`/resignation-applications/${application.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <Edit className="h-4 w-4" />
                                    সংশোধন করুন
                                </Button>
                            </Link>
                        )}

                        {/* Delete Button */}
                        {canDelete && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                className="h-9 gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                মুছে ফেলুন
                            </Button>
                        )}

                        {/* Review / Approve Action Button */}
                        {canReview && (
                            <Button
                                size="sm"
                                onClick={() => setApprovalModalOpen(true)}
                                className={`h-9 gap-1.5 text-xs shadow-sm ${
                                    isEdStage 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                <UserCheck className="h-4 w-4" />
                                {isEdStage ? 'চূড়ান্ত সিদ্ধান্ত গ্রহণ (ED)' : 'সুপারিশ ও স্বাক্ষর করুন'}
                            </Button>
                        )}

                        {hasUserSigned && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-1 px-2.5">
                                ✓ আপনি ইতিমধ্যে স্বাক্ষর ও অগ্রায়ন করেছেন
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Separation Notice Banner if Approved */}
                {application.status === 'approved' && application.separation_id && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                                <p className="font-bold">অব্যাহতি চূড়ান্তভাবে অনুমোদিত ও সেপারেশন সিস্টেমে যুক্ত হয়েছে</p>
                                <p className="text-emerald-700">
                                    কার্যকরের তারিখ: {application.approved_effective_date || application.effective_date}
                                </p>
                            </div>
                        </div>
                        <Link href={`/separations`}>
                            <Button size="sm" variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs h-8 gap-1">
                                <Link2 className="h-3.5 w-3.5" />
                                সেপারেশন রেকর্ডে যান
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Workflow Stepper */}
                <WorkflowTimelineStepper
                    application={application}
                    canCorrectComment={isSuperAdmin}
                />

                {/* Official Letter Preview */}
                <div className="bg-slate-100/60 p-4 sm:p-8 rounded-2xl border border-slate-200">
                    <div className="text-center mb-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                            অফিসিয়াল অব্যাহতি আবেদনপত্র প্রিভিউ (সংযুক্ত PDF অনুসারে)
                        </span>
                    </div>
                    <OfficialResignationDocument application={application} lang="bn" />
                </div>
            </div>

            {/* Approval Dialog Modal */}
            <ResignationApprovalDialog
                application={application}
                open={approvalModalOpen}
                onClose={() => setApprovalModalOpen(false)}
                isEd={isEdStage}
                userHasSignature={userHasSignature}
            />
        </AdminLayout>
    );
}

