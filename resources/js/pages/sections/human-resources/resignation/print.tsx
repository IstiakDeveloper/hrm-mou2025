import React from 'react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import OfficialResignationDocument from './components/OfficialResignationDocument';

export default function ResignationApplicationPrint({ application }: any) {
    const employee = application.employee || {};

    return (
        <div className="bg-slate-100/60 print:bg-white min-h-screen py-6 print:py-0">
            <Head title={`অব্যাহতি আবেদনপত্র প্রিন্ট - ${employee.name_bn || employee.name_en || ''}`} />

            {/* Top Toolbar (Hidden when printing) */}
            <div className="print:hidden max-w-[800px] mx-auto mb-6 px-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.history.back()}
                            className="text-xs h-9 bg-white border-slate-300"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1.5" />
                            ফিরে যান
                        </Button>
                        <span className="text-xs font-semibold text-slate-700">
                            চাকরি হতে অব্যাহতির আবেদন ফরম ({application.application_no})
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            onClick={() => window.print()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 flex items-center gap-1.5 shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            <span>আবেদনপত্র প্রিন্ট করুন (PDF)</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Official Document Area */}
            <div className="max-w-[800px] mx-auto px-4 print:p-0 print:max-w-none">
                <OfficialResignationDocument application={application} lang="bn" />
            </div>
        </div>
    );
}

