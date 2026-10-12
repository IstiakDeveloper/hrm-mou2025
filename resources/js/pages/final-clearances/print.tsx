import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import React from 'react';
import ClearanceFormDocument, { type ClearanceRecord } from './components/ClearanceFormDocument';

export default function FinalClearancePrint({ clearance }: { clearance: ClearanceRecord & { employee_name?: string | null } }) {
    return (
        <div className="min-h-screen bg-slate-100/50 py-4 print:bg-white print:py-0">
            <Head title={`Final Payment & Clearance - ${clearance.employee_name || ''}`} />
            <div className="mx-auto mb-6 max-w-4xl px-4 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="h-9 border-slate-300 bg-white text-xs">
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            Back
                        </Button>
                        <span className="text-xs font-semibold text-slate-700">Official Final Payment & Clearance form</span>
                    </div>
                    <Button size="sm" className="h-9 bg-emerald-600 text-xs font-bold hover:bg-emerald-700" onClick={() => window.print()}>
                        <Printer className="mr-1.5 h-4 w-4" />
                        Print / PDF
                    </Button>
                </div>
            </div>
            <div className="mx-auto max-w-4xl px-4 print:max-w-none print:px-0">
                <ClearanceFormDocument clearance={clearance} />
            </div>
        </div>
    );
}
