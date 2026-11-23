import React, { useState, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, RotateCcw, Send, XCircle, Calendar, ExternalLink } from 'lucide-react';

interface ResignationApprovalDialogProps {
    application: any;
    open: boolean;
    onClose: () => void;
    isEd: boolean;
    canDirectApprove?: boolean;
    userHasSignature: boolean;
}

export default function ResignationApprovalDialog({
    application,
    open,
    onClose,
    isEd,
    canDirectApprove = false,
    userHasSignature,
}: ResignationApprovalDialogProps) {
    const { flash } = usePage().props as any;

    const allowEdActions = isEd || canDirectApprove;

    const [actionType, setActionType] = useState<'forward' | 'send_back' | 'ed_approve' | 'ed_reject'>(
        allowEdActions ? 'ed_approve' : 'forward'
    );
    const [comments, setComments] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Reset and initialize state whenever dialog opens
    useEffect(() => {
        if (open) {
            setActionType(allowEdActions ? 'ed_approve' : 'forward');
            setComments('');
            setEffectiveDate(
                application?.approved_effective_date
                    ? String(application.approved_effective_date).substring(0, 10)
                    : (application?.effective_date ? String(application.effective_date).substring(0, 10) : '')
            );
            setSubmitting(false);
            setErrorMessage(null);
            setFieldErrors({});
        }
    }, [open, allowEdActions, application]);

    if (!application) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setFieldErrors({});

        if (!userHasSignature) {
            setErrorMessage('অনুমোদন বা সুপারিশ প্রক্রিয়া সম্পন্ন করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।');
            return;
        }

        if (!comments.trim()) {
            setErrorMessage('অনুগ্রহ করে আপনার মন্তব্য বা সুপারিশ লিখুন।');
            return;
        }

        setSubmitting(true);

        const handleSuccess = (page: any) => {
            setSubmitting(false);
            const serverFlashError = page?.props?.flash?.error;
            if (serverFlashError) {
                setErrorMessage(serverFlashError);
                return;
            }
            onClose();
        };

        const handleError = (errors: any) => {
            setSubmitting(false);
            setFieldErrors(errors || {});
            const firstErr = Object.values(errors || {})[0];
            if (firstErr) {
                setErrorMessage(String(firstErr));
            } else {
                setErrorMessage('অনুরোধ প্রক্রিয়া করতে ব্যর্থ হয়েছে। অনুগ্রহ করে তথ্য পুনরায় পরীক্ষা করুন।');
            }
        };

        if (actionType === 'ed_approve' || actionType === 'ed_reject') {
            router.post(
                `/resignation-applications/${application.id}/ed-approve`,
                {
                    is_approved: actionType === 'ed_approve',
                    comments: comments.trim(),
                    effective_date: effectiveDate || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: handleSuccess,
                    onError: handleError,
                }
            );
        } else if (actionType === 'send_back') {
            router.post(
                `/resignation-applications/${application.id}/send-back`,
                {
                    comments: comments.trim(),
                },
                {
                    preserveScroll: true,
                    onSuccess: handleSuccess,
                    onError: handleError,
                }
            );
        } else {
            router.post(
                `/resignation-applications/${application.id}/forward`,
                {
                    comments: comments.trim(),
                    recommended_date: effectiveDate || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: handleSuccess,
                    onError: handleError,
                }
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {allowEdActions ? 'নির্বাহী পরিচালকের সিদ্ধান্ত ও অনুমোদন' : 'অব্যাহতির আবেদন পর্যালোচনা ও সুপারিশ'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        কর্মী: {application.employee?.name_bn || application.employee?.name_en} ({application.employee?.pin}) — আবেদন নং: {application.application_no}
                    </DialogDescription>
                </DialogHeader>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 shadow-2xs">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <span className="font-bold">ত্রুটি: </span>
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {!userHasSignature && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                            <span className="font-bold">ডিজিটাল স্বাক্ষর অনুপস্থিত:</span> আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করা নেই। সুপারিশ বা অনুমোদন সম্পন্ন করতে প্রোফাইল সেটিংসে স্বাক্ষর যুক্ত করুন।
                            <div className="mt-1.5">
                                <Link
                                    href="/settings/profile"
                                    className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-700"
                                >
                                    <span>প্রোফাইল সেটিংসে যান</span>
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {/* Action Selector */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                            কার্যক্রম নির্বাচন করুন:
                        </Label>
                        {allowEdActions ? (
                            <div className={`grid ${canDirectApprove && !isEd ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2`}>
                                <Button
                                    type="button"
                                    variant={actionType === 'ed_approve' ? 'default' : 'outline'}
                                    className={`text-xs h-9 justify-center gap-1 ${
                                        actionType === 'ed_approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                                    }`}
                                    onClick={() => setActionType('ed_approve')}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>অনুমোদন (Approve)</span>
                                </Button>
                                {canDirectApprove && !isEd && (
                                    <Button
                                        type="button"
                                        variant={actionType === 'forward' ? 'default' : 'outline'}
                                        className={`text-xs h-9 justify-center gap-1 ${
                                            actionType === 'forward' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                                        }`}
                                        onClick={() => setActionType('forward')}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>অগ্রায়ন (Forward)</span>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant={actionType === 'send_back' ? 'default' : 'outline'}
                                    className={`text-xs h-9 justify-center gap-1 ${
                                        actionType === 'send_back' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                                    }`}
                                    onClick={() => setActionType('send_back')}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>সংশোধনে ফেরত</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={actionType === 'ed_reject' ? 'default' : 'outline'}
                                    className={`text-xs h-9 justify-center gap-1 ${
                                        actionType === 'ed_reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                                    }`}
                                    onClick={() => setActionType('ed_reject')}
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>বাতিল (Reject)</span>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={actionType === 'forward' ? 'default' : 'outline'}
                                    className={`text-xs h-9 justify-center gap-1.5 ${
                                        actionType === 'forward' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                                    }`}
                                    onClick={() => setActionType('forward')}
                                >
                                    <Send className="h-4 w-4" />
                                    <span>সুপারিশ ও অগ্রায়ন</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={actionType === 'send_back' ? 'default' : 'outline'}
                                    className={`text-xs h-9 justify-center gap-1.5 ${
                                        actionType === 'send_back' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                                    }`}
                                    onClick={() => setActionType('send_back')}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    <span>সংশোধনে ফেরত (Send Back)</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Effective Date (only if forwarding or approving) */}
                    {actionType !== 'send_back' && actionType !== 'ed_reject' && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{actionType === 'ed_approve' ? 'চূড়ান্ত কার্যকর করার তারিখ:' : 'সুপারিশকৃত অব্যাহতির কার্যকরের তারিখ:'}</span>
                            </Label>
                            <Input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                className={`text-xs h-9 bg-slate-50 ${fieldErrors.effective_date ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {fieldErrors.effective_date && (
                                <p className="text-[11px] text-red-600">{fieldErrors.effective_date}</p>
                            )}
                        </div>
                    )}

                    {/* Comments */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                            {actionType === 'send_back'
                                ? 'ফেরত পাঠানোর কারণ বা প্রয়োজনীয় সংশোধনের বিবরণ (বাধ্যতামূলক):'
                                : actionType === 'ed_reject'
                                ? 'বাতিল করার কারণ বা সিদ্ধান্ত (বাধ্যতামূলক):'
                                : 'মন্তব্য বা সুপারিশ (বাধ্যতামূলক):'}
                        </Label>
                        <Textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder={
                                actionType === 'send_back'
                                    ? 'কী কী সংশোধন করতে হবে তা স্পষ্টভাবে উল্লেখ করুন...'
                                    : actionType === 'ed_reject'
                                    ? 'আবেদনটি বাতিল করার সুনির্দিষ্ট কারণ লিখুন...'
                                    : actionType === 'ed_approve'
                                    ? 'আবেদনটি বিবেচনাপূর্বক অনুমোদন করা হলো / মন্তব্য লিখুন...'
                                    : 'আবেদনটি বিবেচনা করে সুপারিশ করা হলো / মন্তব্য লিখুন...'
                            }
                            rows={3}
                            className={`text-xs resize-none ${fieldErrors.comments ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            required
                        />
                        {fieldErrors.comments && (
                            <p className="text-[11px] text-red-600">{fieldErrors.comments}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting} className="text-xs">
                            বাতিল
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={submitting}
                            className={`text-xs px-4 font-semibold ${
                                actionType === 'ed_reject'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : actionType === 'send_back'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : actionType === 'ed_approve'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {submitting
                                ? 'প্রসেসিং...'
                                : actionType === 'ed_approve'
                                ? '✓ চূড়ান্ত অনুমোদন নিশ্চিত করুন'
                                : actionType === 'ed_reject'
                                ? '✕ বাতিলকরণ নিশ্চিত করুন'
                                : actionType === 'send_back'
                                ? '↺ সংশোধনের জন্য ফেরত পাঠান'
                                : '➜ পরবর্তী ডেস্কে অগ্রায়ন করুন'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
