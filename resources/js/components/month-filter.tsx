import { Input } from '@/components/ui/input';
import { useId } from 'react';

export function MonthFilter({ value, onChange, lang = 'en' }: { value: string; onChange: (month: string) => void; lang?: 'bn' | 'en' }) {
    const id = useId();

    return (
        <div className="flex min-w-0 items-center gap-2">
            <label htmlFor={id} className="text-xs font-medium text-slate-600">
                {lang === 'bn' ? 'মাস' : 'Month'}
            </label>
            <Input
                id={id}
                type="month"
                value={value}
                onChange={(event) => {
                    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                        onChange(event.target.value);
                    }
                }}
                className="h-9 w-full min-w-0 border-slate-200 bg-slate-50/50 text-xs sm:w-40"
            />
        </div>
    );
}
