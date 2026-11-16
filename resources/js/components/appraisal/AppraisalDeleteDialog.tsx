import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

export function AppraisalDeleteDialog({
    open,
    onOpenChange,
    url,
    lang = 'bn',
    description,
    preserveScroll = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
    lang?: 'bn' | 'en';
    description?: string;
    preserveScroll?: boolean;
}) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const bn = lang === 'bn';

    useEffect(() => {
        if (!open) {
            setPassword('');
            setError('');
            setProcessing(false);
        }
    }, [open]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!url || processing) return;

        setProcessing(true);
        setError('');
        router.delete(url, {
            data: { password },
            preserveScroll,
            preserveState: true,
            onError: (errors) => {
                setError(errors.password || (bn ? 'মুছে ফেলা যায়নি।' : 'Could not delete.'));
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
                        <DialogTitle>{bn ? 'মুছে ফেলুন' : 'Delete'}</DialogTitle>
                        <DialogDescription>
                            {description || (bn
                                ? 'মুছে ফেলতে আপনার পাসওয়ার্ড দিন। এটি আর ফিরিয়ে আনা যাবে না।'
                                : 'Enter your password to delete. This cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="appraisal-delete-password" className="text-xs font-semibold text-slate-700">
                            {bn ? 'আপনার পাসওয়ার্ড' : 'Your password'}
                        </Label>
                        <Input
                            id="appraisal-delete-password"
                            type="password"
                            autoComplete="current-password"
                            className="mt-1.5"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={processing} onClick={() => onOpenChange(false)}>
                            {bn ? 'বাতিল' : 'Cancel'}
                        </Button>
                        <Button type="submit" className="w-full sm:w-auto bg-rose-600 text-white hover:bg-rose-700" disabled={processing || password.trim() === ''}>
                            {processing ? (bn ? 'মুছে ফেলা হচ্ছে…' : 'Deleting…') : (bn ? 'মুছুন' : 'Delete')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
