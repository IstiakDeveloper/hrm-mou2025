import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, RotateCcw, Send, XCircle, Calendar } from 'lucide-react';

interface ResignationApprovalDialogProps {
    application: any;
    open: boolean;
    onClose: () => void;
    isEd: boolean;
    userHasSignature: boolean;
}

export default function ResignationApprovalDialog({
    application,
    open,
    onClose,
    isEd,
    userHasSignature,
}: ResignationApprovalDialogProps) {
    const [actionType, setActionType] = useState<'forward' | 'send_back' | 'ed_approve' | 'ed_reject'>(
        isEd ? 'ed_approve' : 'forward'
    );
    const [comments, setComments] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(
        application?.effective_date ? String(application.effective_date).substring(0, 10) : ''
    );
    const [submitting, setSubmitting] = useState(false);

    if (!application) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userHasSignature) {
            router.visit('/settings/profile');
            return;
        }

        if (!comments.trim()) {
            alert('অনুগ্রহ করে আপনার মন্তব্য বা সুপারিশ লিখুন।');
            return;
        }

        setSubmitting(true);

        if (isEd) {
            router.post(
                `/resignation-applications/${application.id}/ed-approve`,
                {
                    is_approved: actionType === 'ed_approve',
                    comments: comments.trim(),
                    effective_date: effectiveDate || null,
                },
                {
                    onSuccess: () => {
                        setSubmitting(false);
                        onClose();
                    },
                    onError: () => setSubmitting(false),
                }
            );
        } else if (actionType === 'send_back') {
            router.post(
                `/resignation-applications/${application.id}/send-back`,
                {
                    comments: comments.trim(),
                },
                {
                    onSuccess: () => {
                        setSubmitting(false);
                        onClose();
                    },
                    onError: () => setSubmitting(false),
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
                    onSuccess: () => {
                        setSubmitting(false);
                        onClose();
                    },
                    onError: () => setSubmitting(false),
                }
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {isEd ? 'নির্বাহী পরিচালকের চূড়ান্ত সিদ্ধান্ত ও অনুমোদন' : 'অব্যাহতির আবেদন পর্যালোচনা ও সুপারিশ'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        কর্মী: {application.employee?.name_bn || application.employee?.name_en} ({application.employee?.pin}) - {application.application_no}
                    </DialogDescription>
                </DialogHeader>

                {!userHasSignature && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <span className="font-bold">ডিজিটাল স্বাক্ষর অনুপস্থিত:</span> আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করা নেই। সুপারিশ বা অনুমোদন সম্পন্ন করতে প্রোফাইল সেটিংসে স্বাক্ষর যুক্ত করুন।
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {/* Action Selector */}
                    {isEd ? (
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={actionType === 'ed_approve' ? 'default' : 'outline'}
                                className={`text-xs h-9 justify-center gap-1.5 ${
                                    actionType === 'ed_approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                                }`}
                                onClick={() => setActionType('ed_approve')}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>অনুমোদন করুন (Approve)</span>
                            </Button>
                            <Button
                                type="button"
                                variant={actionType === 'ed_reject' ? 'default' : 'outline'}
                                className={`text-xs h-9 justify-center gap-1.5 ${
                                    actionType === 'ed_reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                                }`}
                                onClick={() => setActionType('ed_reject')}
                            >
                                <XCircle className="h-4 w-4" />
                                <span>বাতিল করুন (Reject)</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={actionType === 'forward' ? 'default' : 'outline'}
                                className={`text-xs h-9 justify-center gap-1.5 ${
                                    actionType === 'forward' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
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

                    {/* Effective Date (only if forwarding or approving) */}
                    {actionType !== 'send_back' && actionType !== 'ed_reject' && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{isEd ? 'চূড়ান্ত কার্যকর করার তারিখ:' : 'সুপারিশকৃত অব্যাহতির কার্যকরের তারিখ:'}</span>
                            </Label>
                            <Input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                className="text-xs h-9 bg-slate-50"
                            />
                        </div>
                    )}

                    {/* Comments */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                            {actionType === 'send_back'
                                ? 'ফেরত পাঠানোর কারণ বা প্রয়োজনীয় সংশোধনের বিবরণ (বাধ্যতামূলক):'
                                : 'মন্তব্য বা সুপারিশ (বাধ্যতামূলক):'}
                        </Label>
                        <Textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder={
                                actionType === 'send_back'
                                    ? 'কী কী সংশোধন করতে হবে তা স্পষ্টভাবে উল্লেখ করুন...'
                                    : 'আবেদনটি বিবেচনা করে সুপারিশ করা হলো / মন্তব্য লিখুন...'
                            }
                            rows={3}
                            className="text-xs resize-none"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting} className="text-xs">
                            বাতিল
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={submitting || !userHasSignature}
                            className={`text-xs px-4 ${
                                actionType === 'ed_reject'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : actionType === 'send_back'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {submitting ? 'প্রসেসিং...' : 'স্বাক্ষর ও নিশ্চিত করুন'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

