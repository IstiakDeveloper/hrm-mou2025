import React, { useState, useEffect, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Clock,
    Lock,
    Smartphone,
    Send,
    ShieldAlert,
    LogOut,
    CheckCircle2,
    Copy,
    Check,
    MessageCircle,
    HelpCircle,
    Info,
    RefreshCw,
    Sparkles,
} from 'lucide-react';

interface MovementPenaltyProps {
    penalty: {
        id: number;
        overdue_days: number;
        fine_per_day: number;
        total_fine: number;
        payment_method: string | null;
        sender_number: string | null;
        transaction_id: string | null;
        status: 'unpaid' | 'pending_verification' | 'approved' | 'rejected';
        admin_remarks: string | null;
        movement?: {
            id: number;
            purpose: string;
            destination?: string | null;
            from_datetime: string;
            to_datetime: string;
            movement_type?: 'official' | 'personal' | string;
        };
        employee?: {
            first_name: string;
            last_name: string;
            employee_id: string;
        };
    } | null;
    merchantNumbers: {
        bkash: string;
        nagad: string;
    };
}

export default function PenaltyPayment({ penalty, merchantNumbers }: MovementPenaltyProps) {
    const numberToCopy = merchantNumbers?.bkash || '01717893432';
    const [copied, setCopied] = useState(false);
    const [hasPaid, setHasPaid] = useState<boolean>(!!penalty?.sender_number);
    const [liveApproved, setLiveApproved] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(3);
    const [isChecking, setIsChecking] = useState(false);

    const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>(
        (penalty?.payment_method as 'bkash' | 'nagad') || 'bkash'
    );

    const { data, setData, post, processing, errors } = useForm({
        penalty_id: penalty?.id || '',
        payment_method: selectedMethod,
        sender_number: penalty?.sender_number || '',
        transaction_id: penalty?.transaction_id || '',
    });

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(numberToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMethodSelect = (method: 'bkash' | 'nagad') => {
        setSelectedMethod(method);
        setData('payment_method', method);
    };

    const isFormValid = () => {
        return data.sender_number.trim().length >= 11;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;
        post(route('movement.penalty.submit'));
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    // Check penalty status function for polling
    const checkPenaltyStatus = useCallback(async (isManual = false) => {
        if (!penalty || liveApproved) return;
        if (isManual) setIsChecking(true);

        try {
            const res = await fetch(route('movement.penalty.status'), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) return;

            const json = await res.json();

            // When admin approves or penalty is no longer active
            if (json.status === 'approved' || json.active === false) {
                setLiveApproved(true);
                return;
            }

            // If admin rejected previously submitted transaction
            if (json.status === 'rejected' && penalty.status !== 'rejected') {
                router.reload();
            }
        } catch {
            // Network glitch ignore
        } finally {
            if (isManual) {
                setTimeout(() => setIsChecking(false), 500);
            }
        }
    }, [penalty, liveApproved]);

    // Live background polling (every 4 seconds + tab visibility switch)
    useEffect(() => {
        if (!penalty || liveApproved) return;

        const interval = setInterval(() => {
            checkPenaltyStatus();
        }, 4000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkPenaltyStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [penalty, liveApproved, checkPenaltyStatus]);

    // Countdown and automatic redirect after live approval
    useEffect(() => {
        if (!liveApproved) return;

        const timer = setInterval(() => {
            setRedirectCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.visit(route('dashboard'));
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [liveApproved]);

    // Live Approval Celebratory Screen
    if (liveApproved) {
        return (
            <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col justify-center items-center p-4 sm:p-6">
                <Head title="জরিমানা অনুমোদিত - অ্যাকাউন্ট আনলক" />
                <Card className="w-full max-w-md bg-white border-emerald-300 shadow-xl overflow-hidden rounded-2xl text-center">
                    <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-6 text-white relative">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ring-8 ring-white/10 animate-pulse">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <CardTitle className="text-xl font-black tracking-wide text-white">
                            অনুমোদন সম্পন্ন!
                        </CardTitle>
                        <p className="text-emerald-100 text-xs mt-1 font-medium">
                            আপনার জরিমানা সফলভাবে অনুমোদিত হয়েছে
                        </p>
                    </div>
                    <CardContent className="p-6 space-y-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1">
                            <p className="font-bold flex items-center justify-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                আপনার অ্যাকাউন্ট আনলক করা হয়েছে
                            </p>
                            <p className="text-emerald-700 text-[11px]">
                                আপনি এখন স্বাভাবিকভাবে সিস্টেমের সকল ফিচার ব্যবহার করতে পারবেন।
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-zinc-500 font-medium">
                                <span className="font-bold text-emerald-600">{redirectCountdown}</span> সেকেন্ডের মধ্যে ড্যাশবোর্ডে প্রবেশ করানো হচ্ছে...
                            </p>
                            <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                                    style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-sm transition-all"
                            onClick={() => router.visit(route('dashboard'))}
                        >
                            এখনই ড্যাশবোর্ডে প্রবেশ করুন
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!penalty) {
        return (
            <div className="min-h-screen bg-zinc-100 text-zinc-900 flex items-center justify-center p-4">
                <Head title="অ্যাকাউন্ট স্ট্যাটাস" />
                <Card className="w-full max-w-md bg-white border-zinc-200 shadow-md text-zinc-800">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-2" />
                        <CardTitle className="text-xl font-bold">কোনো জরিমানা বকেয়া নেই</CardTitle>
                        <CardDescription className="text-zinc-500">আপনার অ্যাকাউন্টে কোনো জরিমানা বকেয়া নেই।</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.visit(route('dashboard'))}>
                            ড্যাশবোর্ডে যান
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col justify-center items-center p-4 sm:p-6">
            <Head title="মুভমেন্ট জরিমানা ও আনলক" />

            <div className="w-full max-w-xl space-y-4">
                {/* Header Banner */}
                <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-zinc-900">আইডি সাময়িক নিস্ক্রিয় রয়েছে</h1>
                            <p className="text-xs text-zinc-500">রাত ১২:০০ টার মধ্যে মুভমেন্ট ক্লোজ না করায় জরিমানা (৳২০/দিন)।</p>
                        </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-zinc-900 text-xs px-2">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>

                {/* Rejected Warning Alert */}
                {penalty.status === 'rejected' && (
                    <Alert className="bg-rose-50 border-rose-300 text-rose-900 text-xs">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        <AlertDescription className="font-semibold">
                            পূর্বের আবেদন বাতিল: {penalty.admin_remarks || 'ভুল তথ্য'}। সঠিক তথ্য প্রদান করুন।
                        </AlertDescription>
                    </Alert>
                )}

                {/* PENDING VERIFICATION STATE (SUCCESS WAITING SCREEN) */}
                {penalty.status === 'pending_verification' && (
                    <Card className="bg-white border-amber-300 shadow-sm text-zinc-900 overflow-hidden">
                        <div className="bg-amber-50 p-5 text-center border-b border-amber-200">
                            <Clock className="w-10 h-10 text-amber-600 mx-auto mb-2 animate-spin" />
                            <CardTitle className="text-base font-bold text-amber-950">অনুমোদনের জন্য অপেক্ষা করুন</CardTitle>
                            <p className="text-xs text-amber-800 mt-1">
                                পেমেন্ট তথ্য জমা নেওয়া হয়েছে। এডমিন ভেরিফাই সম্পন্ন করলেই একাউন্ট সক্রিয় করা হবে।
                            </p>

                            {/* Live Status Sync Indicator */}
                            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 bg-white/90 border border-amber-300 rounded-full text-[11px] text-amber-900 shadow-xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>অটো লাইভ সিঙ্ক সক্রিয় (অ্যাডমিন অ্যাপ্রুভ করলে নিজে থেকেই আনলক হবে)</span>
                                <button
                                    type="button"
                                    onClick={() => checkPenaltyStatus(true)}
                                    disabled={isChecking}
                                    title="ম্যানুয়ালি চেক করুন"
                                    className="ml-1 text-amber-700 hover:text-amber-950 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs space-y-1.5 text-zinc-800">
                                {penalty.sender_number && (
                                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                                        <span className="text-zinc-500">প্রেরকের মোবাইল নম্বর:</span>
                                        <span className="font-mono font-bold text-zinc-900">{penalty.sender_number}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">পেমেন্ট মেথড:</span>
                                    <span className="font-bold text-pink-700 uppercase">{penalty.payment_method}</span>
                                </div>
                            </div>

                            <a
                                href="https://wa.me/8801717893432?text=Assalamu%20Alaikum,%20I%20have%20submitted%20my%20movement%20penalty%20TrxID.%20Please%20approve%20and%20unlock%20my%20ID."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all text-xs"
                            >
                                <MessageCircle className="w-4 h-4 text-white" />
                                <span>জরুরী প্রয়োজনে হোয়াটসঅ্যাপে মেসেজ দিন (01717893432)</span>
                            </a>
                        </CardContent>
                    </Card>
                )}

                {/* SINGLE FORM PROCESS: SUBMIT SENDER MOBILE NUMBER */}
                {penalty.status !== 'pending_verification' && (
                    <Card className="bg-white border-zinc-200 shadow-sm text-zinc-900 overflow-hidden">
                        <div className="bg-zinc-100 border-b border-zinc-200 px-5 py-2.5 flex items-center justify-between text-xs font-semibold">
                            <span className="text-emerald-700 font-bold">পেমেন্ট নম্বর জমা ও আনলক আবেদন</span>
                            <span className="text-zinc-500 text-[11px]">জরিমানা: ৳{Number(penalty.total_fine).toFixed(2)}</span>
                        </div>

                        <CardContent className="p-5 space-y-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Fine Summary & Merchant Copy Box */}
                                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 space-y-3">
                                    <div className="flex items-center justify-between text-xs border-b border-zinc-200 pb-2">
                                        <span className="text-zinc-600 font-semibold">মোট জরিমানা (বিলম্ব: {penalty.overdue_days} দিন):</span>
                                        <span className="text-lg font-black text-rose-600">৳ {Number(penalty.total_fine).toFixed(2)}</span>
                                    </div>

                                    {/* Merchant Send Money Box */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-zinc-700 font-bold flex items-center">
                                            <Smartphone className="w-4 h-4 text-emerald-600 mr-1.5" />
                                            bKash / Nagad Send Money করার নম্বর:
                                        </p>
                                        <div className="flex items-center justify-between bg-white border border-zinc-300 rounded-lg p-2.5 shadow-sm">
                                            <span className="text-base font-mono font-extrabold text-zinc-950">{numberToCopy}</span>
                                            <Button type="button" size="sm" onClick={handleCopyNumber} className="h-7 text-xs bg-zinc-800 hover:bg-zinc-900 text-white font-semibold">
                                                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                                {copied ? 'কপি হয়েছে' : 'কপি করুন'}
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 pt-0.5">
                                            * বিকাশ বা নগদ অ্যাপ থেকে <strong className="text-zinc-800">{numberToCopy}</strong> নম্বরে <strong>৳{Number(penalty.total_fine).toFixed(2)}</strong> Send Money করুন।
                                        </p>
                                    </div>
                                </div>

                                {/* INTERACTIVE QUESTION: HAVE YOU PAID? */}
                                {!hasPaid ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-3">
                                        <HelpCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                                        <div>
                                            <h3 className="text-sm font-bold text-emerald-950">আপনি কি জরিমানা সেন্ড মানি করেছেন?</h3>
                                            <p className="text-xs text-emerald-800 mt-0.5">
                                                উপরে বর্ণিত নম্বরে টাকা পাঠালে নিচে ক্লিক করে প্রেরকের মোবাইল নম্বর প্রদান করুন।
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setHasPaid(true)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm"
                                        >
                                            <Check className="w-4 h-4 mr-1.5" /> হ্যাঁ, আমি টাকা পাঠিয়েছি
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                                        {/* Method Select */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-700 font-bold">কোন মাধ্যমে টাকা পাঠিয়েছেন?</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMethodSelect('bkash')}
                                                    className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                                        selectedMethod === 'bkash' ? 'bg-pink-100 border-pink-500 text-pink-900 shadow-sm' : 'bg-white border-zinc-200 text-zinc-600'
                                                    }`}
                                                >
                                                    bKash (বিকাশ)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMethodSelect('nagad')}
                                                    className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                                        selectedMethod === 'nagad' ? 'bg-orange-100 border-orange-500 text-orange-900 shadow-sm' : 'bg-white border-zinc-200 text-zinc-600'
                                                    }`}
                                                >
                                                    Nagad (নগদ)
                                                </button>
                                            </div>
                                        </div>

                                        {/* SENDER MOBILE NUMBER ONLY */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sender_number" className="text-xs font-bold text-zinc-800">
                                                কোন নম্বর থেকে টাকা পাঠিয়েছেন (প্রেরকের মোবাইল নম্বর) <span className="text-rose-500">*</span>
                                            </Label>
                                            <Input
                                                id="sender_number"
                                                type="tel"
                                                placeholder="যেমন: 01712345678"
                                                value={data.sender_number}
                                                onChange={(e) => setData('sender_number', e.target.value)}
                                                className="bg-white border-zinc-300 text-zinc-900 font-mono h-10 text-sm font-bold tracking-wider"
                                                required
                                            />
                                            {errors.sender_number && (
                                                <p className="text-xs text-rose-600">{errors.sender_number}</p>
                                            )}
                                        </div>

                                        {/* INFORMATION NOTICE BOX */}
                                        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-blue-900">
                                            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-blue-950">মুভমেন্ট স্ট্যাটাস নোটিশ:</p>
                                                <p className="text-[11px] leading-relaxed text-blue-800">
                                                    পেমেন্ট তথ্য জমা দিয়ে এডমিন অনুমোদন করলে আপনার আইডি আনলক হয়ে যাবে এবং আপনার রানিং মুভমেন্টটি Open (সক্রিয়) থাকবে। কাজ শেষ করে আপনার সুবিধাজনক সময়ে স্বাভাবিকভাবে মুভমেন্টটি ক্লোজ করে নিবেন। ক্লোজ না করলে পরবর্তী দিন আবার জরিমানা প্রযোজ্য হবে।
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={!isFormValid() || processing}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-bold transition-all disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            {processing ? 'জমা হচ্ছে...' : 'পেমেন্ট নম্বর জমা দিন & আনলক করুন'}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
