import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

export function AppraisalWorkflowResetDialog({
    open,
    onOpenChange,
    url,
    lang = 'bn',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
    lang?: 'bn' | 'en';
}) {
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const bn = lang === 'bn';

    useEffect(() => {
        if (!open) {
            setPassword('');
            setReason('');
            setError('');
            setProcessing(false);
        }
    }, [open]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (processing) return;

        setProcessing(true);
        setError('');
        router.post(url, { password, reason }, {
            preserveScroll: true,
            preserveState: true,
            onError: (errors) => {
                const message = errors.password || errors.reason;
                setError(Array.isArray(message) ? message.join(' ') : (message || (bn ? 'রিসেট করা যায়নি।' : 'Could not reset.')));
            },
            onSuccess: () => onOpenChange(false),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md rounded-2xl sm:rounded-xl p-5 sm:p-6">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{bn ? 'ওয়ার্কফ্লো রিসেট' : 'Reset workflow'}</DialogTitle>
                        <DialogDescription>
                            {bn
                                ? 'সব স্বাক্ষর মুছে ফাইল দাখিলকারীর খসড়ায় ফিরে যাবে। স্কোর ও লেখা থাকবে। দাখিলকারী আবার জমা দেবেন।'
                                : 'Every signature is removed and the file returns to the submitter as a draft. Scores and remarks stay. They submit again.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <div>
                            <Label htmlFor="appraisal-reset-reason" className="text-xs font-semibold text-slate-700">
                                {bn ? 'রিসেটের কারণ' : 'Reason'}
                            </Label>
                            <Textarea
                                id="appraisal-reset-reason"
                                className="mt-1.5"
                                rows={3}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="appraisal-reset-password" className="text-xs font-semibold text-slate-700">
                                {bn ? 'আপনার পাসওয়ার্ড' : 'Your password'}
                            </Label>
                            <Input
                                id="appraisal-reset-password"
                                type="password"
                                autoComplete="current-password"
                                className="mt-1.5"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={processing} onClick={() => onOpenChange(false)}>
                            {bn ? 'বাতিল' : 'Cancel'}
                        </Button>
                        <Button type="submit" className="w-full sm:w-auto bg-amber-600 text-white hover:bg-amber-700" disabled={processing || password.trim() === '' || reason.trim() === ''}>
                            {processing ? (bn ? 'রিসেট হচ্ছে…' : 'Resetting…') : (bn ? 'রিসেট করুন' : 'Reset')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
