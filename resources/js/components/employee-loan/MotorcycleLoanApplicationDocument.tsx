import React, { useLayoutEffect, useRef } from 'react';

export type MotorcycleRecommendation = {
    comments?: string;
    name?: string;
    date?: string;
    signature?: string | null;
};

export type MotorcycleLoanFormFields = {
    form?: string;
    date: string;
    name: string;
    designation: string;
    pin: string;
    workplace: string;
    program?: string;
    mobile: string;
    joining_date: string;
    employment: string;
    previous_count: string;
    amount: string;
    amount_in_words: string;
    purpose: string;
    signature: string | null;
    accounts_amount?: string;
    accounts_amount_words?: string;
    accounts_date?: string;
    accounts_signature?: string | null;
    office?: 'branch' | 'head_office';
    recommendations?: Record<string, MotorcycleRecommendation>;
};

type Props = {
    fields: MotorcycleLoanFormFields;
    editing?: boolean;
    onChange?: (key: 'date' | 'amount' | 'amount_in_words' | 'purpose', value: string) => void;
};

const font = '"Nirmala UI", "Vrinda", "Noto Sans Bengali", sans-serif';

function signatureUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `/storage/${path}`;
}

function Line({
    value,
    editing,
    onChange,
    placeholder = 'লিখুন',
}: {
    value: string;
    editing?: boolean;
    onChange?: (value: string) => void;
    placeholder?: string;
}) {
    if (!editing) {
        return <span className="font-semibold">{value || '\u00a0'}</span>;
    }

    return (
        <input
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange?.(event.target.value)}
            className="w-full rounded border border-amber-400 bg-amber-100 px-1 py-0.5 text-[12px] font-semibold text-amber-950 outline-none print:rounded-none print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-black print:placeholder:text-transparent"
        />
    );
}

function Seat({ title, seat }: { title: string; seat?: MotorcycleRecommendation }) {
    const sign = signatureUrl(seat?.signature);

    return (
        <div className="min-h-[5.5rem]">
            <p className="font-semibold">{title}</p>
            {seat?.comments ? <p className="mt-1 text-[11px] leading-4">{seat.comments}</p> : null}
            <p className="mt-2">সিল ও স্বাক্ষর: {sign ? <img src={sign} alt="" className="inline-block h-8 max-w-[7rem] object-contain align-middle" /> : '........................'}</p>
            <p>নাম: {seat?.name || '........................'}</p>
            <p>তারিখ: {seat?.date || '........................'}</p>
        </div>
    );
}

export function MotorcycleLoanApplicationDocument({ fields, editing = false, onChange }: Props) {
    const pageRef = useRef<HTMLElement>(null);
    const seats = fields.recommendations || {};
    const accountsSign = signatureUrl(fields.accounts_signature);

    useLayoutEffect(() => {
        const page = pageRef.current;
        const fit = () => {
            if (!page) return;
            page.style.zoom = '1';
            const available = Math.floor((273 * 96) / 25.4);
            if (page.scrollHeight > available) {
                page.style.zoom = Math.max(0.55, (available * 0.98) / page.scrollHeight).toFixed(3);
            }
        };
        const reset = () => {
            if (page) page.style.zoom = '';
        };
        window.addEventListener('beforeprint', fit);
        window.addEventListener('afterprint', reset);
        return () => {
            window.removeEventListener('beforeprint', fit);
            window.removeEventListener('afterprint', reset);
            reset();
        };
    }, [fields]);

    return (
        <article
            ref={pageRef}
            className="mc-loan-print-page mx-auto box-border w-full min-w-[720px] max-w-[210mm] bg-white px-6 py-4 text-[12px] leading-5 text-black shadow-sm print:min-w-0 print:max-w-none print:bg-white print:px-0 print:py-0 print:shadow-none"
            style={{ fontFamily: font }}
        >
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm 14mm; }
                    html, body, #app, main, main > div, .mc-loan-print-page {
                        background: #fff !important;
                        border: 0 !important;
                        outline: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    .mc-loan-print-page { width: 100% !important; max-width: none !important; min-width: 0 !important; }
                    .mc-loan-print-page input { background: transparent !important; border: 0 !important; box-shadow: none !important; color: #000 !important; }
                }
            `}</style>

            <div className="relative mb-2 min-h-[3rem] text-center">
                <img src="/logo.png" alt="মৌসুমী" className="absolute top-0 left-0 h-11 w-auto object-contain" />
                <p className="text-[18px] font-bold leading-none">মৌসুমী</p>
                <p className="text-[12px]">উকিলপাড়া, নওগাঁ</p>
                <h1 className="mt-1 text-[15px] font-bold underline underline-offset-2">মোটরসাইকেল ঋণ এর জন্য আবেদন</h1>
            </div>

            <div className="mb-2 leading-4">
                <p>বরাবর</p>
                <p>নির্বাহী পরিচালক</p>
                <p>মৌসুমী, উকিলপাড়া, নওগাঁ।</p>
            </div>
            <p className="mb-2 font-semibold">বিষয়: মোটরসাইকেল ঋণের আবেদন।</p>

            <div className="space-y-1">
                <p className="flex gap-1"><span className="shrink-0">১। ঋণ আবেদনের তারিখ:</span><span className="min-w-0 flex-1 border-b border-dotted border-black"><Line value={fields.date} editing={editing} onChange={(value) => onChange?.('date', value)} /></span></p>
                <div className="grid grid-cols-2 gap-x-4">
                    <p className="flex gap-1"><span className="shrink-0">২। কর্মীর নাম:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.name}</span></p>
                    <p className="flex gap-1"><span className="shrink-0">৩। পদবী:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.designation}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                    <p className="flex gap-1"><span className="shrink-0">৪। পিন নং:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.pin}</span></p>
                    <p className="flex gap-1"><span className="shrink-0">৫। কর্ম এলাকা:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.workplace}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                    <p className="flex gap-1"><span className="shrink-0">৬। কর্মসূচি প্রকল্প:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.program || '—'}</span></p>
                    <p className="flex gap-1"><span className="shrink-0">৭। মোবাইল নম্বর:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.mobile}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                    <p className="flex gap-1"><span className="shrink-0">৮। মৌসুমীতে যোগদানের তারিখ:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.joining_date}</span></p>
                    <p className="flex gap-1"><span className="shrink-0">৯। কর্মীর ধরন:</span><span className="font-semibold">{fields.employment === 'অনিয়মিত' ? 'নিয়মিত / অনিয়মিত ✓' : 'নিয়মিত ✓ / অনিয়মিত'}</span></p>
                </div>
                <p className="flex gap-1"><span className="shrink-0">১০। এ পর্যন্ত ঋণ গ্রহণের সংখ্যা:</span><span className="min-w-0 flex-1 border-b border-dotted border-black font-semibold">{fields.previous_count}</span></p>
                <p className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="shrink-0">১১। আবেদনকৃত ঋণের পরিমাণ:</span>
                    <span className="min-w-[8rem] flex-1 border-b border-dotted border-black"><Line value={fields.amount} editing={editing} onChange={(value) => onChange?.('amount', value)} placeholder="টাকা" /></span>
                    <span className="shrink-0">(কথায়)</span>
                    <span className="min-w-[12rem] flex-[2] border-b border-dotted border-black"><Line value={fields.amount_in_words} editing={editing} onChange={(value) => onChange?.('amount_in_words', value)} placeholder="কথায়" /></span>
                </p>
                <p className="flex gap-1"><span className="shrink-0">১২। ঋণ গ্রহণের উদ্দেশ্য:</span><span className="min-w-0 flex-1 border-b border-dotted border-black"><Line value={fields.purpose} editing={editing} onChange={(value) => onChange?.('purpose', value)} placeholder="উদ্দেশ্য" /></span></p>
            </div>

            <p className="mt-2">উপরে বর্ণিত তথ্যের ভিত্তিতে ঋণ মঞ্জুর করার আবেদন করিতেছি।</p>

            <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                    <p>আবেদনকারীর স্বাক্ষর:</p>
                    <div className="flex h-10 items-end">{fields.signature ? <img src={signatureUrl(fields.signature) || ''} alt="" className="max-h-10 max-w-[9rem] object-contain" /> : null}</div>
                    <p>নাম: <span className="font-semibold">{fields.name}</span></p>
                    <p>পদবী: <span className="font-semibold">{fields.designation}</span></p>
                    <p>তারিখ: <span className="font-semibold">{fields.date}</span></p>
                </div>
                <div className="border border-black p-2 text-[11px] leading-5 print:border-black">
                    <p className="mb-1 text-center font-bold">প্রধান কার্যালয়ের হিসাব বিভাগ কর্তৃক পূরণীয়</p>
                    <p>অনুমোদনকৃত লোনের পরিমাণ: {fields.accounts_amount || '....................'} টাকা</p>
                    <p>কথায় ({fields.accounts_amount_words || '................................'})</p>
                    <p>প্রদান করা হলো: {fields.accounts_date || '....................'}</p>
                    <p>সিল ও স্বাক্ষর: {accountsSign ? <img src={accountsSign} alt="" className="inline-block h-7 max-w-[6rem] object-contain align-middle" /> : '............'}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                {fields.office === 'head_office' ? (
                    <Seat title="বিভাগীয় প্রধানের সুপারিশ:" seat={seats.department_head} />
                ) : (
                    <>
                        <Seat title="শাখা ব্যবস্থাপকের সুপারিশ:" seat={seats.bm} />
                        <Seat title="আঞ্চলিক ব্যবস্থাপকের সুপারিশ:" seat={seats.rm} />
                        <Seat title="জোনাল ম্যানেজারের সুপারিশ:" seat={seats.zm} />
                        {seats.director ? <Seat title="পরিচালক (এমএন্ডই) সুপারিশ:" seat={seats.director} /> : null}
                    </>
                )}
                <Seat title="নির্বাহী পরিচালকের অনুমোদন:" seat={seats.ed} />
            </div>
        </article>
    );
}
