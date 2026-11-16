export type EvalLang = 'bn' | 'en';
export type AppraisalKind = 'promotion' | 'confirmation' | 'probation' | 'trainee';

export type FieldGap = {
    key: string;
    message: string;
};

const empty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isNaN(value);
    }
    return String(value).trim() === '';
};

const label = (lang: EvalLang, bn: string, en: string) => (lang === 'bn' ? bn : en);

const missing = (lang: EvalLang, name: string): string =>
    lang === 'bn' ? `${name} পূরণ করা হয়নি।` : `${name} is still empty.`;

const overMax = (lang: EvalLang, name: string): string =>
    lang === 'bn' ? `${name} সর্বোচ্চ নম্বরের চেয়ে বেশি।` : `${name} is above its maximum score.`;

export function gapMap(gaps: FieldGap[]): Record<string, string> {
    const map: Record<string, string> = {};
    gaps.forEach((gap) => {
        map[gap.key] = gap.message;
    });
    return map;
}

export function scoreGapKeys(gaps: FieldGap[]): string[] {
    return gaps.filter((gap) => gap.key.startsWith('score:')).map((gap) => gap.key.slice('score:'.length));
}

export function scoreIsEntered(score: any): boolean {
    if (!score) {
        return false;
    }
    if (typeof score.raw_input === 'string') {
        return score.raw_input.trim() !== '';
    }
    if (score.touched === true && score.obtained_score !== null && score.obtained_score !== undefined && score.obtained_score !== '') {
        return true;
    }
    if (score.score !== undefined && score.obtained_score === undefined && score.raw_input === undefined) {
        return !empty(score.score);
    }
    return false;
}

export function withEnteredScores<T extends Record<string, any>>(scores: T[] | undefined): T[] {
    return (scores || []).map((score) => ({
        ...score,
        entered: scoreIsEntered(score),
    }));
}

const push = (gaps: FieldGap[], lang: EvalLang, key: string, name: string, value: unknown) => {
    if (empty(value)) {
        gaps.push({ key, message: missing(lang, name) });
    }
};

const operationalPairs = (accountant: boolean) => {
    const rows: Array<{ key: string; bn: string; en: string; closingOnly?: boolean }> = [
        { key: 'members_count', bn: 'সদস্য (জন)', en: 'Members' },
        { key: 'borrowers_count', bn: 'ঋণী (জন)', en: 'Borrowers' },
        { key: 'loan_balance', bn: 'ঋণ স্থিতি', en: 'Loan balance' },
        { key: 'savings_balance', bn: 'সঞ্চয় স্থিতি', en: 'Savings balance' },
        { key: 'overdue_borrowers', bn: 'বকেয়া (জন)', en: 'Overdue borrowers' },
        { key: 'overdue_amount', bn: 'বকেয়া (টাকা)', en: 'Overdue amount' },
        { key: 'otr_pct', bn: 'OTR (%)', en: 'OTR (%)' },
        { key: 'par_pct', bn: 'PAR (%)', en: 'PAR (%)' },
    ];

    const fields: Array<{ key: string; bn: string; en: string }> = [];
    rows.forEach((row) => {
        if (!accountant) {
            fields.push({
                key: `joining_${row.key}`,
                bn: `যোগদানের সময় — ${row.bn}`,
                en: `At joining — ${row.en}`,
            });
        }
        fields.push({
            key: `closing_${row.key}`,
            bn: accountant ? row.bn : `ক্লোজিং — ${row.bn}`,
            en: accountant ? row.en : `At closing — ${row.en}`,
        });
    });
    return fields;
};

const scoreGaps = (gaps: FieldGap[], lang: EvalLang, scores: any[] | undefined, valueKey: 'obtained_score' | 'score') => {
    const rows = scores || [];
    if (rows.length === 0) {
        gaps.push({
            key: 'scores',
            message: missing(lang, label(lang, 'স্কোরকার্ডের নম্বর', 'Scorecard marks')),
        });
        return;
    }

    rows.forEach((score, index) => {
        const name = score?.criteria_name || (lang === 'bn' ? `নম্বর ${index + 1}` : `Score ${index + 1}`);
        const key = `score:${score?.criteria_key || index}`;
        const entered = valueKey === 'score' ? !empty(score?.score) : scoreIsEntered(score);
        if (!entered) {
            gaps.push({ key, message: missing(lang, name) });
            return;
        }
        const value = Number(score?.[valueKey] ?? 0);
        const max = Number(score?.max_score ?? 0);
        if (max > 0 && value > max) {
            gaps.push({ key, message: overMax(lang, name) });
        }
    });
};

export function initiatorGaps(kind: AppraisalKind, data: any, lang: EvalLang, formType?: string | null): FieldGap[] {
    const gaps: FieldGap[] = [];
    const type = formType || data?.form_type || null;
    const accountant = type === 'accountant';

    if (kind === 'trainee') {
        push(gaps, lang, 'candidate_name', label(lang, 'প্রার্থীর নাম', 'Candidate name'), data.candidate_name);
        push(gaps, lang, 'designation_name', label(lang, 'পদবী', 'Designation'), data.designation_name);
        push(gaps, lang, 'pin', label(lang, 'পিন', 'PIN'), data.pin);
        push(gaps, lang, 'branch_name', label(lang, 'শাখা', 'Branch'), data.branch_name);
        push(gaps, lang, 'regional_office_name', label(lang, 'আঞ্চলিক কার্যালয়', 'Regional office'), data.regional_office_name);
        push(gaps, lang, 'zone_name', label(lang, 'জোন', 'Zone'), data.zone_name);
        push(gaps, lang, 'evaluation_month', label(lang, 'মূল্যায়ন মাস', 'Evaluation month'), data.evaluation_month);
        push(gaps, lang, 'training_joining_date', label(lang, 'প্রশিক্ষণে যোগদানের তারিখ', 'Training joining date'), data.training_joining_date);
        push(gaps, lang, 'training_completion_date', label(lang, 'প্রশিক্ষণ সমাপ্তির তারিখ', 'Training completion date'), data.training_completion_date);
        scoreGaps(gaps, lang, data.scores, 'score');
        (data.ratings || []).forEach((rating: any, index: number) => {
            if (empty(rating?.rating)) {
                const name = rating?.indicator_name || (lang === 'bn' ? `গুণগত সূচক ${index + 1}` : `Qualitative indicator ${index + 1}`);
                gaps.push({ key: `rating:${rating?.indicator_key || index}`, message: missing(lang, name) });
            }
        });
        push(gaps, lang, 'other_remarks', label(lang, 'অন্যান্য মন্তব্য', 'Other remarks'), data.other_remarks);
        push(gaps, lang, 'recommendation_type', label(lang, 'সুপারিশ', 'Recommendation'), data.recommendation_type);
        push(gaps, lang, 'supervisor_remarks', label(lang, 'তত্ত্বাবধায়কের মন্তব্য', 'Supervisor remarks'), data.supervisor_remarks);
        if (data.recommendation_type === 'extend_probation' && (empty(data.extension_days) || Number(data.extension_days) < 1)) {
            gaps.push({
                key: 'extension_days',
                message: missing(lang, label(lang, 'বর্ধিত দিন সংখ্যা', 'Extension days')),
            });
        }
        return gaps;
    }

    if (kind !== 'promotion') {
        push(gaps, lang, 'employee_id', label(lang, 'কর্মী', 'Employee'), data.employee_id);
    } else {
        push(gaps, lang, 'employee_id', label(lang, 'কর্মী', 'Employee'), data.employee_id);
    }

    if (kind === 'promotion') {
        push(gaps, lang, 'education_at_joining', label(lang, 'যোগদানের সময়ের শিক্ষাগত যোগ্যতা', 'Education at joining'), data.education_at_joining);
        push(gaps, lang, 'education_current', label(lang, 'বর্তমান শিক্ষাগত যোগ্যতা', 'Current education'), data.education_current);
        push(gaps, lang, 'current_station_joining_date', label(lang, 'বর্তমান কর্মস্থলে যোগদানের তারিখ', 'Current station joining date'), data.current_station_joining_date);
        push(gaps, lang, 'service_length_current_post', label(lang, 'বর্তমান পদে চাকরির মেয়াদ', 'Service length in current post'), data.service_length_current_post);
        push(gaps, lang, 'closing_month', label(lang, 'ক্লোজিং মাস', 'Closing month'), data.closing_month);
        [
            ['members_count', 'সদস্য (জন)', 'Members'],
            ['borrowers_count', 'ঋণী (জন)', 'Borrowers'],
            ['loan_balance', 'ঋণ স্থিতি', 'Loan balance'],
            ['savings_balance', 'সঞ্চয় স্থিতি', 'Savings balance'],
            ['overdue_borrowers', 'বকেয়া (জন)', 'Overdue borrowers'],
            ['overdue_amount', 'বকেয়া (টাকা)', 'Overdue amount'],
            ['otr_pct', 'OTR (%)', 'OTR (%)'],
            ['par_pct', 'PAR (%)', 'PAR (%)'],
        ].forEach(([key, bn, en]) => push(gaps, lang, key, label(lang, bn, en), data[key]));
        scoreGaps(gaps, lang, data.scores, 'obtained_score');
        push(gaps, lang, 'strengths', label(lang, 'শক্তি / দক্ষতা', 'Strengths'), data.strengths);
        push(gaps, lang, 'weaknesses', label(lang, 'দুর্বলতা', 'Weaknesses'), data.weaknesses);
        push(gaps, lang, 'training_need', label(lang, 'প্রশিক্ষণের প্রয়োজন', 'Training need'), data.training_need);
        push(gaps, lang, 'recommendation_status', label(lang, 'সুপারিশ', 'Recommendation'), data.recommendation_status);
        if (data.recommendation_status === 'consider_later' && (empty(data.consider_after_months) || Number(data.consider_after_months) < 1)) {
            gaps.push({
                key: 'consider_after_months',
                message: missing(lang, label(lang, 'কত মাস পর বিবেচনা', 'Consider after (months)')),
            });
        }
        return gaps;
    }

    push(gaps, lang, 'joining_date', label(lang, 'যোগদানের তারিখ', 'Joining date'), data.joining_date);
    if (kind === 'confirmation') {
        push(gaps, lang, 'probation_end_date', label(lang, 'শিক্ষানবিশকাল সমাপ্তির তারিখ', 'Probation end date'), data.probation_end_date);
    } else {
        push(gaps, lang, 'probation_3m_completion_date', label(lang, '৩ মাস শিক্ষানবিশ সমাপ্তির তারিখ', '3-month probation completion date'), data.probation_3m_completion_date);
    }
    push(gaps, lang, 'education_at_joining', label(lang, 'যোগদানের সময়ের শিক্ষাগত যোগ্যতা', 'Education at joining'), data.education_at_joining);
    push(gaps, lang, 'education_current', label(lang, 'বর্তমান শিক্ষাগত যোগ্যতা', 'Current education'), data.education_current);
    push(gaps, lang, 'closing_month', label(lang, 'ক্লোজিং মাস', 'Closing month'), data.closing_month);
    operationalPairs(accountant).forEach((field) => push(gaps, lang, field.key, label(lang, field.bn, field.en), data[field.key]));
    scoreGaps(gaps, lang, data.scores, 'obtained_score');
    push(gaps, lang, 'strengths', label(lang, 'শক্তি / আগ্রহ ও দায়িত্ববোধ', 'Strengths'), data.strengths);
    push(gaps, lang, 'weaknesses', label(lang, 'দুর্বলতা / শৃঙ্খলা', 'Weaknesses'), data.weaknesses);
    push(gaps, lang, 'training_need', label(lang, 'প্রশিক্ষণ / উচ্চতর দায়িত্ব', 'Training need'), data.training_need);
    push(gaps, lang, 'other_remarks', label(lang, 'অন্যান্য মন্তব্য', 'Other remarks'), data.other_remarks);

    if (kind === 'confirmation') {
        push(gaps, lang, 'recommendation_status', label(lang, 'সুপারিশ', 'Recommendation'), data.recommendation_status);
        if (data.recommendation_status === 'extend_probation') {
            const months = data.extend_probation_months ?? data.extend_months;
            if (empty(months) || Number(months) < 1) {
                gaps.push({
                    key: 'extend_probation_months',
                    message: missing(lang, label(lang, 'বর্ধিত মাস', 'Extension months')),
                });
            }
        }
    } else {
        push(
            gaps,
            lang,
            'supervisor_recommendation',
            label(lang, 'সুপারিশ', 'Recommendation'),
            data.supervisor_recommendation || data.recommendation_status,
        );
    }

    return gaps;
}

export function savedInitiatorGaps(kind: AppraisalKind, evaluation: any, lang: EvalLang): FieldGap[] {
    const scores = evaluation?.scores || [];
    const asEntered = scores.map((score: any) => ({
        ...score,
        touched: true,
        raw_input: score?.obtained_score === null || score?.obtained_score === undefined || score?.obtained_score === ''
            ? ''
            : String(score.obtained_score),
        score: score?.score === null || score?.score === undefined ? '' : score.score,
    }));

    const data = {
        ...evaluation,
        employee_id: evaluation?.employee_id,
        scores: asEntered,
        extend_probation_months: evaluation?.extend_probation_months ?? evaluation?.extend_months,
        supervisor_recommendation: evaluation?.supervisor_recommendation || evaluation?.recommendation_status,
        ratings: evaluation?.ratings || [],
    };

    return initiatorGaps(kind, data, lang, evaluation?.form_type);
}

export function reviewerGaps(input: {
    kind: AppraisalKind;
    lang: EvalLang;
    status: string;
    comments: string;
    recommendation: string;
    months: string;
    hr: Record<string, boolean | null>;
}): FieldGap[] {
    const { kind, lang, status, comments, recommendation, months, hr } = input;
    const gaps: FieldGap[] = [];
    const isHr = status === 'submitted_to_hr';
    const isEd = status === 'submitted_to_ed';

    if (empty(comments)) {
        gaps.push({
            key: 'comments',
            message: missing(lang, label(lang, 'মন্তব্য', 'Comments')),
        });
    }

    if (!isHr && !isEd) {
        if (empty(recommendation)) {
            gaps.push({
                key: 'recommendation',
                message: missing(lang, label(lang, 'সুপারিশ', 'Recommendation')),
            });
        }
        if (kind === 'promotion' && recommendation === 'consider_later' && (empty(months) || Number(months) < 1)) {
            gaps.push({ key: 'consider_after_months', message: missing(lang, label(lang, 'কত মাস পর বিবেচনা', 'Consider after (months)')) });
        }
        if (kind === 'confirmation' && recommendation === 'extend_probation' && (empty(months) || Number(months) < 1)) {
            gaps.push({ key: 'extend_months', message: missing(lang, label(lang, 'বর্ধিত মাস', 'Extension months')) });
        }
        if (kind === 'trainee' && recommendation === 'extend_probation' && (empty(months) || Number(months) < 1)) {
            gaps.push({ key: 'extension_days', message: missing(lang, label(lang, 'বর্ধিত দিন সংখ্যা', 'Extension days')) });
        }
    }

    if (isHr && kind !== 'trainee') {
        const items = [
            ['hr_financial_irregularity', 'আর্থিক অনিয়ম', 'Financial irregularity'],
            ['hr_disciplinary_action', 'শৃঙ্খলামূলক ব্যবস্থা', 'Disciplinary action'],
            ['hr_audit_objection', 'নিরীক্ষা আপত্তি', 'Audit objection'],
            ['hr_leave_without_pay', 'বিনা বেতনে ছুটি', 'Leave without pay'],
        ];
        if (kind === 'promotion') {
            items.push(['hr_acr_satisfactory', 'এসিআর সন্তোষজনক', 'ACR satisfactory']);
        }
        items.forEach(([key, bn, en]) => {
            if (hr[key] !== true && hr[key] !== false) {
                gaps.push({ key, message: missing(lang, label(lang, bn, en)) });
            }
        });
    }

    return gaps;
}
