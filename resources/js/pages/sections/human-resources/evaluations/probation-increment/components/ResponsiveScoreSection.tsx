import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, AlertCircle } from 'lucide-react';

interface ResponsiveScoreSectionProps {
    section: {
        section_key: string;
        section_name_en: string;
        section_name_bn: string;
        items: Array<{
            key: string;
            name_en: string;
            name_bn: string;
            max: number;
        }>;
    };
    scoreMap: Record<string, any>;
    onScoreChange: (
        criteriaKey: string,
        sectionKey: string,
        sectionName: string,
        criteriaName: string,
        maxScore: number,
        valStr: string
    ) => void;
    lang?: 'bn' | 'en';
    invalidKeys?: string[];
}

export default function ResponsiveScoreSection({
    section,
    scoreMap,
    onScoreChange,
    lang = 'bn',
    invalidKeys = [],
}: ResponsiveScoreSectionProps) {
    const secName = lang === 'bn' ? section.section_name_bn : section.section_name_en;

    // Calculate section total
    const { sectionTotal, sectionMax } = useMemo(() => {
        let total = 0;
        let max = 0;
        section.items.forEach(item => {
            max += Number(item.max || 0);
            const score = scoreMap[item.key]?.obtained_score;
            if (score !== undefined && score !== null && !isNaN(Number(score))) {
                total += Number(score);
            }
        });
        return { sectionTotal: Number(total.toFixed(2)), sectionMax: Number(max.toFixed(2)) };
    }, [section.items, scoreMap]);

    const pct = sectionMax > 0 ? Math.round((sectionTotal / sectionMax) * 100) : 0;

    return (
        <div className="border border-slate-200/90 rounded-xl p-3 sm:p-4 bg-white shadow-2xs dark:bg-slate-900 dark:border-slate-800 transition-all">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-300">
                    {secName}
                </h3>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge 
                        variant="outline" 
                        className={`text-[11px] font-semibold px-2 py-0.5 ${
                            pct >= 80 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200' 
                                : pct >= 60 
                                ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        <span>
                            {lang === 'bn' ? 'অর্জিত নম্বর: ' : 'Obtained: '}
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{sectionTotal}</span> / {sectionMax}
                        </span>
                        <span className="ml-1 text-[10px] opacity-80">({pct}%)</span>
                    </Badge>
                </div>
            </div>

            {/* Criteria Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
                {section.items.map((item) => {
                    const currentEntry = scoreMap[item.key];
                    const itemName = lang === 'bn' ? item.name_bn : item.name_en;
                    const maxScore = Number(item.max);
                    
                    const scoreValue = currentEntry?.raw_input !== undefined 
                        ? currentEntry.raw_input 
                        : (currentEntry?.touched
                            ? (currentEntry.obtained_score !== undefined ? String(Number(currentEntry.obtained_score)) : '')
                            : (currentEntry?.obtained_score !== undefined && Number(currentEntry?.obtained_score) !== 0 ? String(Number(currentEntry.obtained_score)) : ''));

                    const numScore = parseFloat(scoreValue) || 0;
                    const isExceeding = parseFloat(scoreValue) > maxScore;
                    const isMissing = invalidKeys.includes(item.key);

                    const handleStep = (stepDelta: number) => {
                        const cur = parseFloat(scoreValue) || 0;
                        const next = Math.min(maxScore, Math.max(0, Number((cur + stepDelta).toFixed(2))));
                        onScoreChange(item.key, section.section_key, secName, itemName, maxScore, String(next));
                    };

                    return (
                        <div 
                            key={item.key} 
                            data-req={`score:${item.key}`}
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                                isMissing
                                    ? 'border-red-500 bg-red-50/70 ring-1 ring-red-400'
                                    : isExceeding
                                    ? 'border-rose-400 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'
                                    : numScore > 0
                                    ? 'border-emerald-300 bg-emerald-50/25 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                                    : 'border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40'
                            }`}
                        >
                            {/* Desktop & Mobile Adaptive Layout */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <Label className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug flex-1">
                                    {itemName}
                                </Label>

                                {/* Input Controls */}
                                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1">
                                        {/* Stepper Minus Button */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleStep(-0.5)}
                                            disabled={numScore <= 0}
                                            className="h-7 w-7 rounded-md border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shrink-0 shadow-2xs"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>

                                        {/* Number Input */}
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={maxScore}
                                                step="any"
                                                placeholder="0"
                                                value={scoreValue}
                                                onChange={(e) => {
                                                    onScoreChange(
                                                        item.key,
                                                        section.section_key,
                                                        secName,
                                                        itemName,
                                                        maxScore,
                                                        e.target.value
                                                    );
                                                }}
                                                className={`w-18 sm:w-20 h-7 text-center text-xs font-bold rounded-md shadow-2xs transition-all ${
                                                    isExceeding
                                                        ? 'border-rose-500 text-rose-700 bg-rose-50 focus:ring-rose-500'
                                                        : numScore > 0
                                                        ? 'border-emerald-600 text-emerald-900 bg-white font-extrabold'
                                                        : 'border-slate-300 bg-white text-slate-800'
                                                }`}
                                            />
                                        </div>

                                        {/* Stepper Plus Button */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleStep(0.5)}
                                            disabled={numScore >= maxScore}
                                            className="h-7 w-7 rounded-md border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shrink-0 shadow-2xs"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>

                                        {/* Maximum Score Label */}
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 min-w-[32px] text-left">
                                            / {maxScore}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning if exceeded */}
                            {isExceeding && (
                                <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {lang === 'bn' 
                                        ? `সর্বোচ্চ নম্বর ${maxScore} এর বেশি দেওয়া যাবে না!` 
                                        : `Score cannot exceed max score of ${maxScore}!`}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
