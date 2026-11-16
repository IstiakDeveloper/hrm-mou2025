import React, { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    PenTool, 
    Upload, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Info 
} from 'lucide-react';

interface SignatureCardProps {
    currentSignature?: string | null;
    actionRoute?: string;
    destroyRoute?: string;
}

export default function SignatureCard({
    currentSignature,
    actionRoute = 'settings.profile.signature',
    destroyRoute = 'settings.profile.signature.destroy',
}: SignatureCardProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const effectiveSignature = currentSignature ? `/storage/${currentSignature}` : null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(selected.type)) {
            setErrorMsg('অনুগ্রহ করে শুধুমাত্র JPG, PNG বা WEBP ফরম্যাটের ছবি নির্বাচন করুন।');
            return;
        }

        // Validate max size (2MB)
        if (selected.size > 2 * 1024 * 1024) {
            setErrorMsg('ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট (2MB) হতে পারবে।');
            return;
        }

        setErrorMsg(null);
        setFile(selected);

        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreviewUrl((ev.target?.result as string) ?? null);
        };
        reader.readAsDataURL(selected);
    };

    const handleUpload = () => {
        if (!file) return;

        setUploading(true);
        setErrorMsg(null);

        const formData = new FormData();
        formData.append('signature', file);

        router.post(route(actionRoute), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: (errors) => {
                const firstErr = Object.values(errors)[0];
                setErrorMsg(firstErr || 'স্বাক্ষর আপলোড করতে সমস্যা হয়েছে।');
            },
            onFinish: () => {
                setUploading(false);
            },
        });
    };

    const handleDelete = () => {
        if (!confirm('আপনি কি নিশ্চিত যে আপনার সংরক্ষিত স্বাক্ষরটি মুছে ফেলতে চান?')) return;

        setDeleting(true);
        setErrorMsg(null);

        router.delete(route(destroyRoute), {
            preserveScroll: true,
            onSuccess: () => {
                setFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: (errors) => {
                const firstErr = Object.values(errors)[0];
                setErrorMsg(firstErr || 'স্বাক্ষর মুছে ফেলতে সমস্যা হয়েছে।');
            },
            onFinish: () => {
                setDeleting(false);
            },
        });
    };

    const handleCancelPreview = () => {
        setFile(null);
        setPreviewUrl(null);
        setErrorMsg(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <PenTool className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            ডিজিটাল স্বাক্ষর (Official Digital Signature)
                        </h3>
                        <p className="text-xs text-neutral-500">
                            পদোন্নতি মূল্যায়ন ও অফিশিয়াল অনুমোদন প্রক্রিয়ায় আপনার এই স্বাক্ষরটি ব্যবহৃত হবে।
                        </p>
                    </div>
                </div>

                {effectiveSignature ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> সক্রিয় স্বাক্ষর
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" /> স্বাক্ষর নেই
                    </span>
                )}
            </div>

            {errorMsg && (
                <Alert className="mb-4 border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            )}

            {!effectiveSignature && !previewUrl && (
                <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <Info className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <AlertDescription className="text-xs">
                        <strong>গুরুত্বপূর্ণ:</strong> পদোন্নতি মূল্যায়ন ফরম তৈরি করা (Create) বা অনুমোদন (Approve/Forward) করার জন্য আপনার ডিজিটাল স্বাক্ষর থাকা বাধ্যতামূলক।
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Signature Display Box */}
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/70 p-4 min-h-[140px] text-center dark:border-neutral-700 dark:bg-neutral-800/40">
                    {previewUrl ? (
                        <div className="space-y-2 w-full">
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                নতুন আপলোড প্রিভিউ:
                            </span>
                            <div className="h-20 w-full flex items-center justify-center bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700 p-2 shadow-2xs">
                                <img
                                    src={previewUrl}
                                    alt="New Signature Preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        </div>
                    ) : effectiveSignature ? (
                        <div className="space-y-2 w-full">
                            <span className="text-[11px] font-medium text-neutral-500">
                                বর্তমান সংরক্ষিত স্বাক্ষর:
                            </span>
                            <div className="h-20 w-full flex items-center justify-center bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700 p-2 shadow-2xs">
                                <img
                                    src={effectiveSignature}
                                    alt="Current Digital Signature"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-neutral-400">
                            <PenTool className="mx-auto h-8 w-8 stroke-1" />
                            <p className="text-xs font-medium">এখনও কোনো স্বাক্ষর আপলোড করা হয়নি</p>
                            <p className="text-[10px]">সাদা ব্যাকগ্রাউন্ডে পরিষ্কার স্বাক্ষরের ছবি তুলুন</p>
                        </div>
                    )}
                </div>

                {/* Controls and upload options */}
                <div className="space-y-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                    />

                    <div>
                        <Label className="text-xs text-neutral-600 dark:text-neutral-400">
                            স্বাক্ষরের ফাইল নির্বাচন করুন (JPG / PNG / WEBP, Max 2MB)
                        </Label>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                            টিপস: সাদা কাগজে কালো বা নীল কালির স্পষ্ট স্বাক্ষর স্ক্যান বা ছবি তুলে আপলোড করুন।
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || deleting}
                            className="gap-1.5 text-xs"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            {effectiveSignature ? 'নতুন স্বাক্ষর নির্বাচন' : 'স্বাক্ষর নির্বাচন করুন'}
                        </Button>

                        {previewUrl && (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> আপলোড হচ্ছে...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5" /> স্বাক্ষর সংরক্ষণ করুন
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelPreview}
                                    disabled={uploading}
                                    className="text-xs text-neutral-500"
                                >
                                    বাতিল
                                </Button>
                            </>
                        )}

                        {effectiveSignature && !previewUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleting || uploading}
                                className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
                            >
                                {deleting ? (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> মুছে ফেলা হচ্ছে...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-3.5 w-3.5" /> স্বাক্ষর মুছুন
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
