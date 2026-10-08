import { useMemo } from 'react';
import { formCStructure } from '../probation-increment-config';
import ResponsiveScoreSection from './ResponsiveScoreSection';

export { formCStructure };

export default function FormCIncrement({ scores = [], setScores, onChange, lang = 'bn', structure }: any) {
    const activeStructure = structure || formCStructure;
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
        <div className="space-y-4 sm:space-y-6">
            {activeStructure.map((section: any, idx: number) => (
                <ResponsiveScoreSection
                    key={idx}
                    section={section}
                    scoreMap={scoreMap}
                    onScoreChange={handleScoreChange}
                    lang={lang}
                />
            ))}
        </div>
    );
}
