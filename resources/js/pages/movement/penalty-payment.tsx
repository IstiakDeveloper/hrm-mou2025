import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, Lock, Smartphone, Send, ShieldAlert, LogOut, CheckCircle2, Copy, Check, ArrowRight, ArrowLeft, MessageCircle, Gauge, HelpCircle } from 'lucide-react';

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
            start_meter_reading?: number | null;
            actual_return_datetime?: string | null;
            work_result?: string | null;
            logBook?: {
                end_meter_reading?: number | null;
                personal_km?: number | null;
            } | null;
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
    lastEndMeterReading?: number | null;
}

export default function PenaltyPayment({ penalty, merchantNumbers, lastEndMeterReading = null }: MovementPenaltyProps) {
    const numberToCopy = '01717893432';
    const [copied, setCopied] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [hasPaid, setHasPaid] = useState<boolean>(!!penalty?.sender_number);
    const [timeError, setTimeError] = useState<string | null>(null);

    const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>(
        (penalty?.payment_method as 'bkash' | 'nagad') || 'bkash'
    );

    const getDefaultReturnTime = () => {
        if (penalty?.movement?.actual_return_datetime) {
            return penalty.movement.actual_return_datetime.replace(' ', 'T').slice(0, 16);
        }
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const hasPresetStartMeter = lastEndMeterReading !== null && lastEndMeterReading !== undefined;
    const initialStartReading = hasPresetStartMeter
        ? String(lastEndMeterReading)
        : (penalty?.movement?.start_meter_reading != null ? String(penalty.movement.start_meter_reading) : '');

    const { data, setData, post, processing, errors, transform } = useForm({
        penalty_id: penalty?.id || '',
        payment_method: selectedMethod,
        sender_number: penalty?.sender_number || '',
        transaction_id: penalty?.transaction_id || '',
        actual_return_datetime: getDefaultReturnTime(),
        work_result: penalty?.movement?.work_result || '',
        start_meter_reading: initialStartReading,
        end_meter_reading: penalty?.movement?.logBook?.end_meter_reading ? String(penalty.movement.logBook.end_meter_reading) : '',
        personal_km: penalty?.movement?.logBook?.personal_km ? String(penalty.movement.logBook.personal_km) : '',
    });

    const isPersonalMovement = (penalty?.movement?.movement_type || '').toLowerCase() === 'personal';

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(numberToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMethodSelect = (method: 'bkash' | 'nagad') => {
        setSelectedMethod(method);
        setData('payment_method', method);
    };

    const isStep1Valid = () => {
        return data.sender_number.trim().length >= 11;
    };

    const handleNextToStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isStep1Valid()) return;
        setStep(2);
    };

    const handleSubmitFinal = (e: React.FormEvent) => {
        e.preventDefault();
        setTimeError(null);

        if (penalty?.movement?.from_datetime) {
            const startTime = new Date(penalty.movement.from_datetime.replace(' ', 'T'));
            const returnTime = new Date(data.actual_return_datetime);

            if (returnTime < startTime) {
                setTimeError(`রিটার্ন সময় মুভমেন্ট শুরুর সময়ের (${penalty.movement.from_datetime}) আগের হতে পারবে না।`);
                return;
            }
        }

        if (data.end_meter_reading && data.start_meter_reading) {
            const startReading = Number(data.start_meter_reading);
            const endReading = Number(data.end_meter_reading);

            if (endReading < startReading) {
                setTimeError(`মিটার শেষের রিডিং (${endReading}) শুরুর রিডিং (${startReading}) এর চেয়ে কম হতে পারবে না।`);
                return;
            }
        }

        transform((form) => {
            const startReading = Number(form.start_meter_reading) || 0;
            const endReading = Number(form.end_meter_reading) || 0;
            const tripKm = Math.max(0, Math.round((endReading - startReading) * 100) / 100);
            return {
                ...form,
                personal_km: isPersonalMovement ? String(tripKm) : form.personal_km,
            };
        });

        post(route('movement.penalty.submit'));
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const formatDateTime = (dtStr?: string) => {
        if (!dtStr) return 'N/A';
        try {
            const d = new Date(dtStr.replace(' ', 'T'));
            return d.toLocaleString('bn-BD', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (e) {
            return dtStr;
        }
    };

    // Calculations for Log Book
    const startKm = parseFloat(data.start_meter_reading) || 0;
    const endKm = parseFloat(data.end_meter_reading) || 0;
    const totalKm = endKm > startKm ? round(endKm - startKm, 2) : 0;
    const personalKm = isPersonalMovement ? totalKm : (parseFloat(data.personal_km) || 0);
    const officialKm = isPersonalMovement ? 0 : round(Math.max(0, totalKm - personalKm), 2);

    function round(num: number, decimalPlaces: number) {
        const p = Math.pow(10, decimalPlaces);
        return Math.round(num * p) / p;
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
                                পেমেন্ট তথ্য ও মুভমেন্ট ক্লোজ হিসেব জমা নেওয়া হয়েছে। এডমিন ভেরিফাই সম্পন্ন করলেই একাউন্ট সক্রিয় করা হবে।
                            </p>
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

                {/* FORM PROCESS: STEP 1 OR STEP 2 */}
                {penalty.status !== 'pending_verification' && (
                    <Card className="bg-white border-zinc-200 shadow-sm text-zinc-900 overflow-hidden">
                        {/* Step Progress Bar */}
                        <div className="bg-zinc-100 border-b border-zinc-200 px-5 py-2.5 flex items-center justify-between text-xs font-semibold">
                            <span className={step === 1 ? 'text-emerald-700 font-bold' : 'text-zinc-400'}>১. পেমেন্ট তথ্য</span>
                            <span className="text-zinc-300">→</span>
                            <span className={step === 2 ? 'text-emerald-700 font-bold' : 'text-zinc-400'}>২. মুভমেন্ট ও লগ বই ক্লোজ</span>
                        </div>

                        <CardContent className="p-5">
                            {/* STEP 1: TOP NUMBER & SEND MONEY INFO -> THEN INTERACTIVE PAYMENT QUESTION */}
                            {step === 1 && (
                                <form onSubmit={handleNextToStep2} className="space-y-4">
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

                                            {/* SENDER MOBILE NUMBER ONLY (NO TRXID NEEDED) */}
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
                                            </div>

                                            <Button
                                                type="submit"
                                                disabled={!isStep1Valid()}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-semibold transition-all disabled:opacity-50"
                                            >
                                                পরবর্তী ধাপ: মুভমেন্ট ও লগ বই ক্লোজ <ArrowRight className="w-4 h-4 ml-1.5" />
                                            </Button>
                                        </div>
                                    )}
                                </form>
                            )}

                            {/* STEP 2: PROFESSIONAL MOVEMENT & LOG BOOK CLOSE */}
                            {step === 2 && (
                                <form onSubmit={handleSubmitFinal} className="space-y-5">
                                    {/* Header Summary */}
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                                        <span className="font-mono font-bold text-emerald-950">
                                            {data.payment_method.toUpperCase()} | প্রেরকের নম্বর: {data.sender_number}
                                        </span>
                                        <button type="button" onClick={() => setStep(1)} className="text-emerald-700 underline text-[11px]">
                                            এডিট
                                        </button>
                                    </div>

                                    {/* Movement Start Info */}
                                    <div className="text-xs bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg space-y-0.5 text-zinc-700">
                                        <p><strong>উদ্দেশ্য:</strong> {penalty.movement?.purpose || 'N/A'}</p>
                                        <p><strong>শুরুর সময়:</strong> <span className="text-emerald-700 font-bold">{formatDateTime(penalty.movement?.from_datetime)}</span></p>
                                    </div>

                                    {timeError && (
                                        <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{timeError}</p>
                                    )}

                                    {/* Return Time */}
                                    <div className="space-y-1">
                                        <Label htmlFor="actual_return_datetime" className="text-xs font-bold text-zinc-800">
                                            মুভমেন্ট সমাপ্তির সময় (Actual Return Time) <span className="text-rose-500">*</span>
                                        </Label>
                                        <Input
                                            id="actual_return_datetime"
                                            type="datetime-local"
                                            value={data.actual_return_datetime}
                                            onChange={(e) => {
                                                setData('actual_return_datetime', e.target.value);
                                                setTimeError(null);
                                            }}
                                            className="bg-white border-zinc-300 text-zinc-900 text-xs h-9"
                                            required
                                        />
                                    </div>

                                    {/* PROFESSIONAL VEHICLE LOG BOOK REGISTER CARD */}
                                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                                            <div className="flex items-center space-x-2 text-zinc-900">
                                                <Gauge className="w-4 h-4 text-emerald-600" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider">যানবাহন লগ বই রেজিস্টার (Log Book Entry)</h3>
                                            </div>
                                            <Badge variant="outline" className="bg-zinc-50 text-zinc-600 text-[10px]">
                                                রেজিস্টার হিসেব
                                            </Badge>
                                        </div>

                                        {/* Meter Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="start_meter_reading" className="text-[11px] font-semibold text-zinc-700">
                                                    শুরুর মিটার রিডিং
                                                    {hasPresetStartMeter && (
                                                        <span className="ml-1 font-normal text-emerald-600">(সর্বশেষ close)</span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="start_meter_reading"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="যেমন: 1250.0"
                                                    value={data.start_meter_reading}
                                                    onChange={(e) => setData('start_meter_reading', e.target.value)}
                                                    readOnly={hasPresetStartMeter}
                                                    className="bg-zinc-50/50 border-zinc-300 text-zinc-900 text-xs h-9 font-mono font-bold"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="end_meter_reading" className="text-[11px] font-semibold text-zinc-700">
                                                    শেষের মিটার রিডিং
                                                </Label>
                                                <Input
                                                    id="end_meter_reading"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="যেমন: 1285.5"
                                                    value={data.end_meter_reading}
                                                    onChange={(e) => setData('end_meter_reading', e.target.value)}
                                                    className="bg-white border-zinc-300 text-zinc-900 text-xs h-9 font-mono font-bold"
                                                />
                                            </div>

                                            {!isPersonalMovement && (
                                                <div className="space-y-1">
                                                    <Label htmlFor="personal_km" className="text-[11px] font-semibold text-zinc-700">
                                                        ব্যক্তিগত ব্যবহার (কিমি)
                                                    </Label>
                                                    <Input
                                                        id="personal_km"
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="যেমন: 5.0"
                                                        value={data.personal_km}
                                                        onChange={(e) => setData('personal_km', e.target.value)}
                                                        className="bg-white border-zinc-300 text-zinc-900 text-xs h-9 font-mono font-bold"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {isPersonalMovement && (
                                            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                                                Personal movement — পুরো দূরত্ব Personal km হিসেবে গণনা হবে।
                                            </p>
                                        )}

                                        {/* PROFESSIONAL DYNAMIC CALCULATION BREAKDOWN GRID */}
                                        <div className="bg-gradient-to-r from-zinc-50 to-emerald-50/30 border border-zinc-200 rounded-xl p-3.5 space-y-2">
                                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">দূরত্ব হিসেব বিবরণী (Distance Breakdown)</p>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                                <div className="p-2 bg-white rounded-lg border border-zinc-200">
                                                    <p className="text-[10px] text-zinc-500">শুরুর রিডিং</p>
                                                    <p className="text-sm font-mono font-bold text-zinc-900">{startKm.toLocaleString()} KM</p>
                                                </div>

                                                <div className="p-2 bg-white rounded-lg border border-zinc-200">
                                                    <p className="text-[10px] text-zinc-500">শেষের রিডিং</p>
                                                    <p className="text-sm font-mono font-bold text-zinc-900">{endKm.toLocaleString()} KM</p>
                                                </div>

                                                <div className="p-2 bg-white rounded-lg border border-zinc-200">
                                                    <p className="text-[10px] text-zinc-500">মোট দূরত্ব (Total)</p>
                                                    <p className="text-sm font-mono font-extrabold text-indigo-700">{totalKm} KM</p>
                                                </div>

                                                <div className="p-2 bg-white rounded-lg border border-emerald-300">
                                                    <p className="text-[10px] text-emerald-700 font-bold">
                                                        {isPersonalMovement ? 'পার্সোনাল দূরত্ব' : 'অফিসিয়াল দূরত্ব'}
                                                    </p>
                                                    <p className="text-sm font-mono font-extrabold text-emerald-700">
                                                        {isPersonalMovement ? personalKm : officialKm} KM
                                                    </p>
                                                </div>
                                            </div>

                                            {!isPersonalMovement && personalKm > 0 && (
                                                <p className="text-[11px] text-zinc-600 font-medium text-right pt-0.5">
                                                    ব্যক্তিগত ব্যবহায়ের জন্য কর্তন: <span className="font-mono font-bold text-amber-700">{personalKm} KM</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Work Result */}
                                    <div className="space-y-1">
                                        <Label htmlFor="work_result" className="text-xs font-bold text-zinc-800">
                                            কাজের ফলাফল / বিবরণ <span className="text-rose-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="work_result"
                                            placeholder="কাজের সংক্ষিপ্ত বিবরণ লিখুন..."
                                            value={data.work_result}
                                            onChange={(e) => setData('work_result', e.target.value)}
                                            className="bg-white border-zinc-300 text-zinc-900 text-xs"
                                            rows={2}
                                            required
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-2 pt-1">
                                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3 text-xs h-9 border-zinc-300">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> পিছনে
                                        </Button>

                                        <Button type="submit" disabled={processing} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold">
                                            {processing ? 'জমা হচ্ছে...' : 'জমা দিন & আনলক করুন'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
