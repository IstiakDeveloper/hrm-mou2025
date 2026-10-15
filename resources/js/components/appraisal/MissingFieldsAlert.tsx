import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import type { FieldGap } from '@/lib/appraisal-required';

type Props = {
    gaps: FieldGap[];
    lang: 'bn' | 'en';
};

export function MissingFieldsAlert({ gaps, lang }: Props) {
    useEffect(() => {
        const keys = new Set(gaps.map((gap) => gap.key));
        document.querySelectorAll<HTMLElement>('[data-req]').forEach((node) => {
            const on = keys.has(node.dataset.req || '');
            node.classList.toggle('!border-red-500', on);
            node.classList.toggle('!ring-1', on);
            node.classList.toggle('!ring-red-400', on);
        });
    }, [gaps]);

    if (gaps.length === 0) {
        return null;
    }

    return (
        <div id="missing-required-fields" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-900">
                    {lang === 'bn' ? 'এই ঘরগুলো পূরণ করা হয়নি:' : 'These required fields are still empty:'}
                </h4>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-700">
                    {gaps.map((gap) => (
                        <li key={gap.key}>{gap.message}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export function scrollToMissingFields() {
    window.setTimeout(() => {
        document.getElementById('missing-required-fields')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
}
