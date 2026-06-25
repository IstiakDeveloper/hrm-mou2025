import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

export function ReportHelpPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full border-slate-200 text-slate-500 hover:text-slate-800"
                    title="How to read this report"
                >
                    <Info className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,22rem)] p-4 text-xs text-slate-700" align="end">
                <p className="font-bold text-slate-900 text-sm mb-2">How to read this report</p>
                <ul className="space-y-1.5 text-slate-600 leading-relaxed">
                    <li><strong className="text-emerald-700">Present</strong> — checked in at branch</li>
                    <li><strong className="text-amber-700">Movement</strong> — official duty outside branch</li>
                    <li><strong className="text-rose-700">Absent</strong> — no punch and not on approved leave</li>
                    <li><strong className="text-blue-700">Leave</strong> — approved leave for this date</li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                    All staff are listed below by status. Use search to find a name or employee ID quickly.
                </p>
            </PopoverContent>
        </Popover>
    );
}
export default ReportHelpPopover;
