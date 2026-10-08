import React, { useMemo } from 'react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BN_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const EN_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const toBengaliNumber = (num: number | string): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const formatMonthLabel = (val?: string | null, lang: 'bn' | 'en' = 'bn'): string => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length < 2) return val;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return val;

    if (lang === 'bn') {
        return `${BN_MONTHS[month - 1]} ${toBengaliNumber(year)}`;
    }
    return `${EN_MONTHS[month - 1]} ${year}`;
};

export interface MonthPickerSelectProps {
    value?: string;
    onChange: (value: string) => void;
    lang?: 'bn' | 'en';
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
}

export const MonthPickerSelect: React.FC<MonthPickerSelectProps> = ({
    value,
    onChange,
    lang = 'bn',
    className,
    placeholder,
    disabled = false,
    id,
}) => {
    const currentYear = new Date().getFullYear();

    const years = useMemo(() => {
        const valYear = value ? parseInt(value.split('-')[0], 10) : null;
        const start = Math.max(currentYear + 1, valYear || currentYear);
        const end = Math.min(currentYear - 3, valYear || currentYear);
        const list: number[] = [];
        for (let y = start; y >= end; y--) {
            list.push(y);
        }
        return list;
    }, [currentYear, value]);

    const months = useMemo(() => {
        // Reverse order (December down to January) so recent months appear first
        const list = [];
        for (let m = 12; m >= 1; m--) {
            list.push({
                num: String(m).padStart(2, '0'),
                bn: BN_MONTHS[m - 1],
                en: EN_MONTHS[m - 1],
            });
        }
        return list;
    }, []);

    const defaultPlaceholder = lang === 'bn' ? 'মাস নির্বাচন করুন' : 'Select month';

    return (
        <Select 
            value={value || ''} 
            onValueChange={onChange} 
            disabled={disabled}
        >
            <SelectTrigger 
                id={id}
                className={cn(
                    "h-8 text-xs font-semibold bg-white border-slate-300 min-w-[140px] focus:ring-1 focus:ring-blue-500",
                    className
                )}
            >
                <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <SelectValue placeholder={placeholder || defaultPlaceholder}>
                        {value ? formatMonthLabel(value, lang) : undefined}
                    </SelectValue>
                </div>
            </SelectTrigger>
            <SelectContent className="max-h-72 w-56">
                {years.map((y) => (
                    <SelectGroup key={y}>
                        <SelectLabel className="text-[11px] font-bold text-slate-500 bg-slate-100/80 py-1 px-2.5 border-y border-slate-200">
                            {lang === 'bn' ? `${toBengaliNumber(y)} সাল` : `Year ${y}`}
                        </SelectLabel>
                        {months.map((m) => {
                            const itemVal = `${y}-${m.num}`;
                            const label = lang === 'bn' 
                                ? `${m.bn} ${toBengaliNumber(y)}` 
                                : `${m.en} ${y}`;
                            return (
                                <SelectItem 
                                    key={itemVal} 
                                    value={itemVal} 
                                    className="text-xs py-1.5 cursor-pointer pl-6"
                                >
                                    <div className="flex items-center justify-between w-full gap-2">
                                        <span className="font-medium text-slate-800">{label}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({itemVal})</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
};

export default MonthPickerSelect;
