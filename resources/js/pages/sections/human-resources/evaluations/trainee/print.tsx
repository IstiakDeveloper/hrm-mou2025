import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import TraineeOfficialFormDocument from './components/TraineeOfficialFormDocument';

export default function TraineePrint({ evaluation }: any) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        return (localStorage.getItem('trainee_eval_lang') as 'bn' | 'en') || 'bn';
    });

    const employee = evaluation.employee || {};
    const candidateName = evaluation.candidate_name || employee?.name_bn || employee?.name_en || '';

    return (
        <div className="bg-slate-100/50 print:bg-white min-h-screen py-4 print:py-0">
            <Head title={`${lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন ফরম প্রিন্ট' : 'Print Trainee Evaluation'} - ${candidateName}`} />
            
            {/* Top Toolbar (Hidden when printing) */}
            <div className="print:hidden max-w-4xl mx-auto mb-6 px-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.history.back()}
                            className="text-xs h-9 bg-white border-slate-300"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1.5" />
                            {lang === 'bn' ? 'ফিরে যান' : 'Back'}
                        </Button>
                        <span className="text-xs font-semibold text-slate-700">
                            {lang === 'bn' ? 'অফিসিয়াল প্রশিক্ষণার্থী মূল্যায়ন ফরম' : 'Official Trainee Evaluation Form'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('bn');
                                    localStorage.setItem('trainee_eval_lang', 'bn');
                                    document.documentElement.lang = 'bn';
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('en');
                                    localStorage.setItem('trainee_eval_lang', 'en');
                                    document.documentElement.lang = 'en';
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                English
                            </button>
                        </div>

                        <Button 
                            size="sm" 
                            onClick={() => window.print()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 flex items-center gap-1.5 shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            <span>{lang === 'bn' ? 'ফরম প্রিন্ট করুন' : 'Print Form (PDF)'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Official Document Area */}
            <div className="max-w-4xl mx-auto px-4 print:p-0 print:max-w-none">
                <TraineeOfficialFormDocument evaluation={evaluation} lang={lang} />
            </div>
        </div>
    );
}
