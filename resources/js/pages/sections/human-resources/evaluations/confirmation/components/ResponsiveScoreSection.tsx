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
}

export default function ResponsiveScoreSection({
    section,
    scoreMap,
    onScoreChange,
    lang = 'bn',
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
        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800 transition-all">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm sm:text-base text-blue-900 dark:text-blue-300">
                    {secName}
                </h3>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge 
                        variant="outline" 
                        className={`text-xs font-semibold px-2.5 py-1 ${
                            pct >= 80 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200' 
                                : pct >= 60 
                                ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        <span>
                            {lang === 'bn' ? 'অর্জিত নম্বর: ' : 'Obtained: '}
                            <span className="font-bold text-blue-700 dark:text-blue-400">{sectionTotal}</span> / {sectionMax}
                        </span>
                        <span className="ml-1 text-[11px] opacity-80">({pct}%)</span>
                    </Badge>
                </div>
            </div>

            {/* Criteria Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
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

                    const handleStep = (stepDelta: number) => {
                        const cur = parseFloat(scoreValue) || 0;
                        const next = Math.min(maxScore, Math.max(0, Number((cur + stepDelta).toFixed(2))));
                        onScoreChange(item.key, section.section_key, secName, itemName, maxScore, String(next));
                    };

                    return (
                        <div 
                            key={item.key} 
                            className={`p-3 rounded-xl border transition-all ${
                                isExceeding
                                    ? 'border-rose-400 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'
                                    : numScore > 0
                                    ? 'border-blue-200/80 bg-blue-50/20 dark:border-blue-900/50 dark:bg-blue-950/10'
                                    : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 dark:border-slate-800/80 dark:bg-slate-900/40'
                            }`}
                        >
                            {/* Desktop & Mobile Adaptive Layout */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <Label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug flex-1">
                                    {itemName}
                                </Label>

                                {/* Input Controls */}
                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-500 sm:hidden">
                                        {lang === 'bn' ? 'নম্বর লিখুন:' : 'Score:'}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        {/* Stepper Minus Button (Touch-Friendly) */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleStep(-0.5)}
                                            disabled={numScore <= 0}
                                            className="h-8 w-8 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
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
                                                className={`w-20 sm:w-22 h-8 text-center text-xs sm:text-sm font-bold rounded-lg shadow-2xs transition-all ${
                                                    isExceeding
                                                        ? 'border-rose-500 text-rose-700 bg-rose-50 focus:ring-rose-500'
                                                        : numScore > 0
                                                        ? 'border-blue-500 text-blue-900 bg-white font-black dark:bg-slate-900 dark:text-blue-300'
                                                        : 'border-slate-300 bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700'
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
                                            className="h-8 w-8 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>

                                        {/* Maximum Score Label */}
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[36px] text-left">
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
