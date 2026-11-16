import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import React, { useState } from 'react';

export function commentUpdatedByName(signature?: { comment_updated_by_name?: string | null } | null): string | null {
    const name = signature?.comment_updated_by_name;
    return name && name.trim() !== '' ? name : null;
}

export function UpdatedByLine({ name, className = '' }: { name?: string | null; className?: string }) {
    if (!name) {
        return null;
    }

    return (
        <span className={`block text-[10px] font-normal not-italic text-slate-400 ${className}`}>
            Updated by {name}
        </span>
    );
}

export function WorkflowStepComment({
    signature,
    url,
    canEdit = false,
    compact = false,
    showText = true,
}: {
    signature?: { id?: number; comments?: string | null; comment_updated_by_name?: string | null } | null;
    url?: string | null;
    canEdit?: boolean;
    compact?: boolean;
    showText?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [comments, setComments] = useState(signature?.comments ?? '');
    const [saving, setSaving] = useState(false);
    const updatedBy = commentUpdatedByName(signature);
    const showEdit = canEdit && !!url;

    if (!signature?.id || (!showEdit && !updatedBy && !(showText && signature.comments))) {
        return null;
    }

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!url || saving || comments.trim() === '') {
            return;
        }

        setSaving(true);
        router.put(url, { comments: comments.trim() }, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="mt-0.5 text-left">
            {showText && signature.comments ? (
                <p className={`italic text-slate-500 dark:text-slate-400 ${compact ? 'line-clamp-2 text-[10px]' : 'text-[10px]'}`}>
                    "{signature.comments}"
                </p>
            ) : null}
            <UpdatedByLine name={updatedBy} />
            {canEdit && url ? (
                <>
                    <button
                        type="button"
                        className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:underline"
                        onClick={() => {
                            setComments(signature.comments ?? '');
                            setOpen(true);
                        }}
                    >
                        <Pencil className="h-2.5 w-2.5" />
                        Edit
                    </button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent className="sm:max-w-md">
                            <form onSubmit={save}>
                                <DialogHeader>
                                    <DialogTitle>Edit comment</DialogTitle>
                                    <DialogDescription>
                                        The original signature stays with the person who signed. This only corrects the written comment.
                                    </DialogDescription>
                                </DialogHeader>
                                <Textarea
                                    value={comments}
                                    onChange={(event) => setComments(event.target.value)}
                                    rows={5}
                                    className="mt-3"
                                    required
                                    maxLength={5000}
                                />
                                <DialogFooter className="mt-3">
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={saving || comments.trim() === ''}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}
        </div>
    );
}
