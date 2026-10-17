import { useEffect } from 'react';
import { AlertCircle, Edit3 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import type { FieldGap } from '@/lib/appraisal-required';

type Props = {
    gaps: FieldGap[];
    lang: 'bn' | 'en';
    editUrl?: string;
};

export function MissingFieldsAlert({ gaps, lang, editUrl }: Props) {
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
        <div id="missing-required-fields" className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-red-900 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-red-950">
                        {lang === 'bn' ? 'নিম্নোক্ত প্রয়োজনীয় তথ্য অসম্পূর্ণ থাকায় দাখিল করা সম্ভব হচ্ছে না:' : 'Cannot submit because the following required fields are incomplete:'}
                    </h4>
                    <ul className="list-disc space-y-1 pl-4 text-xs font-medium text-red-800">
                        {gaps.map((gap) => (
                            <li key={gap.key}>{gap.message}</li>
                        ))}
                    </ul>
                    <p className="text-[11px] text-red-700 italic mt-1 font-medium">
                        {lang === 'bn' ? 'অনুগ্রহ করে উপরের বা পাশের "সম্পাদনা" বাটনে ক্লিক করে ঘরগুলো পূরণ করে পুনরায় দাখিল করুন।' : 'Please click the "Edit" button to complete the missing fields and submit again.'}
                    </p>
                </div>
            </div>
            {editUrl && (
                <Link href={editUrl} className="shrink-0 self-end sm:self-center">
                    <Button size="sm" className="h-8 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'এখনই সম্পাদন করুন' : 'Edit Now'}</span>
                    </Button>
                </Link>
            )}
        </div>
    );
}

export function scrollToMissingFields() {
    window.setTimeout(() => {
        const el = document.getElementById('missing-required-fields');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-red-400/50');
            setTimeout(() => {
                el.classList.remove('ring-4', 'ring-red-400/50');
            }, 1800);
        }
    }, 40);
}
