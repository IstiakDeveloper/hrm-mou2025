import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMemo } from 'react';
import { formAStructure } from '../evaluation-config';

export { formAStructure };

export default function FormA({ scores = [], setScores, onChange, lang = 'bn' }: any) {
    const scoreMap = useMemo(() => {
        const map: Record<string, any> = {};
        scores.forEach((s: any) => {
            map[s.criteria_key] = s;
        });
        return map;
    }, [scores]);

    const handleScoreChange = (criteriaKey: string, sectionKey: string, sectionName: string, criteriaName: string, maxScore: number, inputVal: string) => {
        let val: number = 0;
        const isBlank = inputVal === '' || inputVal === null || inputVal === undefined;
        let cleanInput = inputVal;
        if (!isBlank) {
            val = parseFloat(inputVal);
            if (isNaN(val)) {
                val = 0;
                cleanInput = '';
            } else if (val > maxScore) {
                val = maxScore;
                cleanInput = String(maxScore);
            } else if (val < 0) {
                val = 0;
                cleanInput = '0';
            }
        }

        let found = false;
        const updated = scores.map((s: any) => {
            if (s.criteria_key === criteriaKey) {
                found = true;
                return { 
                    ...s, 
                    section_name: sectionName,
                    criteria_name: criteriaName,
                    obtained_score: isBlank ? 0 : val,
                    raw_input: isBlank ? '' : cleanInput,
                    touched: !isBlank
                };
            }
            return s;
        });

        if (!found) {
            updated.push({
                section_key: sectionKey,
                section_name: sectionName,
                criteria_key: criteriaKey,
                criteria_name: criteriaName,
                max_score: maxScore,
                obtained_score: isBlank ? 0 : val,
                raw_input: isBlank ? '' : cleanInput,
                touched: !isBlank
            });
        }

        const updateFn = onChange || setScores;
        if (typeof updateFn === 'function') {
            updateFn(updated);
        }
    };

    return (
        <div className="space-y-6">
            {formAStructure.map((section, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                    <h3 className="font-bold text-base mb-4 text-emerald-800 border-b pb-2">
                        {lang === 'bn' ? section.section_name_bn : section.section_name_en}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.items.map(item => {
                            const currentEntry = scoreMap[item.key];
                            const itemName = lang === 'bn' ? item.name_bn : item.name_en;
                            const secName = lang === 'bn' ? section.section_name_bn : section.section_name_en;
                            return (
                                <div key={item.key} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <Label className="flex-1 pr-4 text-xs font-medium text-slate-700 leading-normal">{itemName}</Label>
                                    <div className="flex items-center space-x-2 shrink-0">
                                        <Input 
                                            type="number" 
                                            className="w-24 text-right h-9 text-sm font-semibold bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            min="0" 
                                            max={item.max} 
                                            step="any"
                                            placeholder="0"
                                            value={
                                                currentEntry?.raw_input !== undefined 
                                                    ? currentEntry.raw_input 
                                                    : (currentEntry?.touched
                                                        ? (currentEntry.obtained_score !== undefined ? String(Number(currentEntry.obtained_score)) : '')
                                                        : (currentEntry?.obtained_score !== undefined && Number(currentEntry?.obtained_score) !== 0 ? String(Number(currentEntry.obtained_score)) : ''))
                                            }
                                            onChange={(e) => {
                                                handleScoreChange(item.key, section.section_key, secName, itemName, item.max, e.target.value);
                                            }} 
                                        />
                                        <span className="text-xs font-semibold text-slate-500 w-12 text-left">/ {Number(item.max)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
