import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

export default function ClearanceDeleteDialog({
    open,
    onOpenChange,
    clearanceId,
    employeeName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clearanceId: number | null;
    employeeName?: string | null;
}) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) {
            setPassword('');
            setError('');
            setProcessing(false);
        }
    }, [open]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!clearanceId || processing) return;

        setProcessing(true);
        setError('');
        router.delete(`/final-clearances/${clearanceId}`, {
            data: { password },
            preserveScroll: true,
            preserveState: true,
            onError: (errors) => {
                setError(errors.password || 'Could not delete this clearance.');
            },
            onSuccess: () => onOpenChange(false),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Delete clearance</DialogTitle>
                        <DialogDescription>
                            {employeeName ? `${employeeName} will be removed.` : 'This clearance will be removed.'} Enter your password to confirm. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="clearance-delete-password" className="text-xs font-semibold text-slate-700">Your password</Label>
                        <Input
                            id="clearance-delete-password"
                            type="password"
                            autoComplete="current-password"
                            className="mt-1.5"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={processing} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="w-full sm:w-auto bg-rose-600 text-white hover:bg-rose-700" disabled={processing || password.trim() === ''}>
                            {processing ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
