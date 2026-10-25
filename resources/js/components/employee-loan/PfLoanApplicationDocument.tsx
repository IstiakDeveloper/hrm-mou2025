import React, { useLayoutEffect, useRef } from 'react';

export type PfLoanFormFields = {
    day: string;
    month: string;
    year: string;
    amount: string;
    amount_in_words: string;
    reason: string;
    pf_balance: string;
    salary_grade: string;
    basic_salary: string;
    installments: string;
    installment_amount: string;
    previous_details: string;
    previous_settled: string;
    previous_last_paid_on: string;
    previous_remaining: string;
    name: string;
    designation: string;
    pin: string;
    address: string;
    signature: string | null;
};

type Props = {
    fields: PfLoanFormFields;
    editing?: boolean;
    onChange?: (key: keyof PfLoanFormFields, value: string) => void;
};

const font = '"Nirmala UI", "Vrinda", "Noto Sans Bengali", sans-serif';

function signatureUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `/storage/${path}`;
}

function Fill({
    value,
    editing,
    onChange,
    align = 'center',
}: {
    value: string;
    editing?: boolean;
    onChange?: (value: string) => void;
    align?: 'center' | 'left';
}) {
    if (!editing) {
        return <span className={align === 'left' ? 'block px-1 text-left' : 'block px-1 text-center'}>{value || '\u00a0'}</span>;
    }

    return (
        <input
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder="লিখুন"
            className={`w-full rounded border border-amber-400 bg-amber-100 px-1 py-0.5 text-[12px] font-semibold text-amber-950 outline-none placeholder:text-amber-400 focus:bg-amber-50 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-black print:placeholder:text-transparent ${align === 'left' ? 'text-left' : 'text-center'}`}
        />
    );
}

function Dotted({ children, suffix = '|' }: { children: React.ReactNode; suffix?: string }) {
    return (
        <div className="flex items-end gap-1">
            <div className="min-w-0 flex-1 border-b border-dotted border-black leading-5">{children}</div>
            {suffix ? <span className="shrink-0">{suffix}</span> : null}
        </div>
    );
}

export function PfLoanApplicationDocument({ fields, editing = false, onChange }: Props) {
    const set = (key: keyof PfLoanFormFields) => (value: string) => onChange?.(key, value);
    const sign = signatureUrl(fields.signature);
    const pageRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const page = pageRef.current;
        const fit = () => {
            if (!page) return;
            page.style.zoom = '1';
            const available = Math.floor((277 * 96) / 25.4);
            const contentHeight = page.scrollHeight;
            if (contentHeight > available) {
                page.style.zoom = Math.max(0.55, (available * 0.98) / contentHeight).toFixed(3);
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
            className="pf-loan-print-page mx-auto box-border w-full min-w-[720px] max-w-[210mm] bg-white px-8 py-4 text-[12px] leading-5 text-black shadow-sm print:min-w-0 print:max-w-none print:px-0 print:py-0 print:shadow-none"
            style={{ fontFamily: font }}
        >
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm 14mm; }
                    html, body, #app, main, main > div {
                        background: #fff !important;
                        border: 0 !important;
                        outline: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    .pf-loan-print-page {
                        width: 100% !important;
                        max-width: none !important;
                        min-width: 0 !important;
                        margin: 0 !important;
                        border: 0 !important;
                        outline: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .pf-loan-print-page input {
                        background: transparent !important;
                        border: 0 !important;
                        outline: none !important;
                        box-shadow: none !important;
                        color: #000 !important;
                    }
                }
            `}</style>
            <div className="relative mb-3 min-h-[3.2rem]">
                <img src="/logo.png" alt="মৌসুমী" className="absolute top-0 left-0 h-12 w-auto object-contain" />
                <h1 className="px-16 pt-3 text-center text-[17px] font-bold leading-snug underline decoration-1 underline-offset-[5px]">
                    প্রভিডেন্ট ফান্ড হতে ঋণ গ্রহণের আবেদনপত্র
                </h1>
            </div>

            <div className="mb-3 leading-5">
                <p>বরাবর,</p>
                <p>আহ্বায়ক</p>
                <p>পিএফ ট্রাস্টি বোর্ড</p>
                <p>মৌসুমী</p>
                <p>উকিলপাড়া, নওগাঁ।</p>
            </div>

            <p className="mb-2">জনাব,</p>
            <p className="mb-3 text-justify">
                আমার প্রভিডেন্ট ফান্ড হিসাবে জমাকৃত টাকা হতে{' '}
                <span className="inline-block min-w-[7.5rem] border-b border-dotted border-black align-bottom">
                    <Fill value={fields.amount} editing={editing} onChange={set('amount')} />
                </span>
                , (কথায়:{' '}
                <span className="inline-block min-w-[14rem] border-b border-dotted border-black align-bottom">
                    <Fill value={fields.amount_in_words} editing={editing} onChange={set('amount_in_words')} align="left" />
                </span>
                ) টাকা ঋণ গ্রহণের জন্য আবেদন করছি। এতদ্দূদেশ্যে প্রয়োজনীয় তথ্যাদি আপনার বিবেচনার জন্য নিয়ে উপস্থাপন করা হলো।
            </p>

            <p className="mb-1 font-bold">তথ্যাদি:</p>
            <div className="space-y-1">
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">১. প্রভিডেন্ট হিসাবে জমাকৃত টাকার পরিমাণ:</span>
                    <div className="min-w-0 flex-1"><Dotted><Fill value={fields.pf_balance} /></Dotted></div>
                </div>
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">২. ঋণ গ্রহণের কারণ:</span>
                    <div className="min-w-0 flex-1">
                        <Dotted>
                            <Fill value={fields.reason} editing={editing} onChange={set('reason')} align="left" />
                        </Dotted>
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">৩. বর্তমান বেতন-ক্রম:</span>
                    <div className="min-w-[7rem] flex-1"><Dotted suffix=""><Fill value={fields.salary_grade} /></Dotted></div>
                    <span className="shrink-0">এবং মাসিক মূল বেতন:</span>
                    <div className="min-w-[6rem] flex-1"><Dotted><Fill value={fields.basic_salary} /></Dotted></div>
                </div>
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">৪. প্রভিডেন্ট ফান্ড হতে গৃহীত ঋণ কতটি কিস্তিতে পরিশোধ হবে:</span>
                    <div className="min-w-0 flex-1"><Dotted suffix="টি।"><Fill value={fields.installments} /></Dotted></div>
                </div>
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">৫. প্রভিডেন্ট ফান্ড হতে গৃহীত ঋণের কিস্তির পরিমাণ (মাসিক):</span>
                    <div className="min-w-0 flex-1"><Dotted suffix="টাকা।"><Fill value={fields.installment_amount} /></Dotted></div>
                </div>
                <div className="flex flex-wrap items-end gap-x-1">
                    <span className="shrink-0">৬. (ক) পূর্বে কোনো ঋণ গ্রহণ করলে তার বিবরণ:</span>
                    <div className="min-w-0 flex-1">
                        <Dotted>
                            <Fill value={fields.previous_details} editing={editing} onChange={set('previous_details')} align="left" />
                        </Dotted>
                    </div>
                </div>
                <div className="flex items-end gap-1 pl-4">
                    <span className="shrink-0">(খ) পূর্বে গৃহীত ঋণ সম্পূর্ণ পরিশোধিত হয়েছে কিনা:</span>
                    <div className="min-w-0 flex-1">
                        <Dotted>
                            <Fill value={fields.previous_settled} editing={editing} onChange={set('previous_settled')} />
                        </Dotted>
                    </div>
                </div>
                <div className="flex items-end gap-1 pl-8">
                    <span className="shrink-0">এবং পরিশোধিত হলে তার সর্বশেষ কিস্তি পরিশোধের তারিখ:</span>
                    <div className="min-w-0 flex-1">
                        <Dotted>
                            <Fill value={fields.previous_last_paid_on} editing={editing} onChange={set('previous_last_paid_on')} />
                        </Dotted>
                    </div>
                </div>
                <div className="flex items-end gap-1 pl-4">
                    <span className="shrink-0">(গ) পূর্বে গৃহীত ঋণ সম্পূর্ণরূপে পরিশোধিত না হলে তার কতটি কিস্তি পরিশোধে বাকি রয়েছে?</span>
                    <div className="min-w-[4rem] flex-1">
                        <Dotted suffix="টি।">
                            <Fill value={fields.previous_remaining} editing={editing} onChange={set('previous_remaining')} />
                        </Dotted>
                    </div>
                </div>
            </div>

            <p className="mt-3 text-justify">
                উপরোক্ত তথ্যাদি আমার জানা মতে সঠিক। অতএব পিএফ ঋণটি অনুমোদনের জন্য বিনীত অনুরোধ করছি।
            </p>

            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <p className="pt-6">
                    তারিখ: <span className="inline-block min-w-[2.2rem] border-b border-dotted border-black text-center">{fields.day}</span>
                    {' / '}
                    <span className="inline-block min-w-[2.2rem] border-b border-dotted border-black text-center">{fields.month}</span>
                    {' / '}
                    <span className="inline-block min-w-[3.2rem] border-b border-dotted border-black text-center">{fields.year}</span>
                    {' '}খ্রি.
                </p>
                <div>
                    <p>আবেদনকারীর স্বাক্ষর:</p>
                    <div className="flex h-12 items-end">
                        {sign ? <img src={sign} alt="আবেদনকারীর স্বাক্ষর" className="max-h-12 max-w-[11rem] object-contain object-left" /> : null}
                    </div>
                    <div className="mt-1 space-y-1">
                        <div className="flex flex-wrap items-end gap-x-1"><span className="shrink-0">নাম:</span><div className="min-w-0 flex-1 border-b border-dotted border-black"><Fill value={fields.name} align="left" /></div></div>
                        <div className="flex flex-wrap items-end gap-x-1"><span className="shrink-0">পদবী:</span><div className="min-w-0 flex-1 border-b border-dotted border-black"><Fill value={fields.designation} align="left" /></div></div>
                        <div className="flex flex-wrap items-end gap-x-1"><span className="shrink-0">পিন নম্বর:</span><div className="min-w-0 flex-1 border-b border-dotted border-black"><Fill value={fields.pin} align="left" /></div></div>
                        <div className="flex flex-wrap items-end gap-x-1">
                            <span className="shrink-0">ঠিকানা:</span>
                            <div className="min-w-0 flex-1 border-b border-dotted border-black">
                                <Fill value={fields.address} editing={editing} onChange={set('address')} align="left" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <p className="font-semibold underline underline-offset-2">ট্রাস্টি বোর্ডের সদস্যদের সুপারিশ ও স্বাক্ষর:</p>
                    <div className="mt-4 space-y-4">
                        <p>১.</p>
                        <p>২.</p>
                        <p>৩.</p>
                    </div>
                </div>
                <div className="sm:pt-8 sm:text-right">
                    <p>ঋণ অনুমোদন/ বাতিল করা হলো।</p>
                    <p className="mt-8">ঋণ অনুমোদনকারী ট্রাস্টি বোর্ডের আহ্বায়কের স্বাক্ষর</p>
                </div>
            </div>
        </article>
    );
}
