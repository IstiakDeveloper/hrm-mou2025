<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AppraisalRequiredFields
{
    public static function assertInitiator(Request $request, string $kind, ?string $formType = null): void
    {
        self::throw(self::initiatorGaps($request->all(), $kind, $formType));
    }

    public static function assertStored(string $kind, Model $evaluation): void
    {
        if (method_exists($evaluation, 'scores') && ! $evaluation->relationLoaded('scores')) {
            $evaluation->load('scores');
        }
        if ($kind === 'trainee' && method_exists($evaluation, 'ratings') && ! $evaluation->relationLoaded('ratings')) {
            $evaluation->load('ratings');
        }

        $payload = $evaluation->toArray();
        $payload['extend_probation_months'] = $evaluation->getAttribute('extend_months');
        $payload['supervisor_recommendation'] = $evaluation->getAttribute('supervisor_recommendation')
            ?: $evaluation->getAttribute('recommendation_status');

        $scores = [];
        foreach ($evaluation->getRelation('scores') ?? [] as $score) {
            $row = $score->toArray();
            if ($kind === 'trainee') {
                $row['entered'] = ! self::blank($row['score'] ?? null);
            } else {
                $obtained = $row['obtained_score'] ?? null;
                $row['entered'] = ! self::blank($obtained) || $obtained === 0 || $obtained === '0' || $obtained === 0.0;
                $row['raw_input'] = self::blank($obtained) && $obtained !== 0 && $obtained !== '0' ? '' : (string) $obtained;
            }
            $scores[] = $row;
        }
        $payload['scores'] = $scores;

        self::throw(self::initiatorGaps($payload, $kind, $evaluation->getAttribute('form_type')));
    }

    public static function assertActor(Request $request, string $kind, string $actor): void
    {
        $gaps = match ($actor) {
            'hr' => self::hrGaps($request, $kind),
            'ed' => self::edGaps($request),
            default => self::reviewerGaps($request, $kind),
        };

        self::throw($gaps);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private static function initiatorGaps(array $data, string $kind, ?string $formType): array
    {
        $gaps = [];
        $accountant = $formType === 'accountant';

        if ($kind === 'trainee') {
            self::need($gaps, $data, 'candidate_name', 'প্রার্থীর নাম');
            self::need($gaps, $data, 'designation_name', 'পদবী');
            self::need($gaps, $data, 'pin', 'পিন');
            self::need($gaps, $data, 'branch_name', 'শাখা');
            self::need($gaps, $data, 'regional_office_name', 'আঞ্চলিক কার্যালয়');
            self::need($gaps, $data, 'zone_name', 'জোন');
            self::need($gaps, $data, 'evaluation_month', 'মূল্যায়ন মাস');
            self::need($gaps, $data, 'training_joining_date', 'প্রশিক্ষণে যোগদানের তারিখ');
            self::need($gaps, $data, 'training_completion_date', 'প্রশিক্ষণ সমাপ্তির তারিখ');
            self::scoreNeeds($gaps, $data['scores'] ?? [], 'score');
            foreach ($data['ratings'] ?? [] as $index => $rating) {
                if (! is_array($rating) || self::blank($rating['rating'] ?? null)) {
                    $name = $rating['indicator_name'] ?? ('গুণগত সূচক '.($index + 1));
                    $gaps['rating:'.($rating['indicator_key'] ?? $index)] = $name.' পূরণ করা হয়নি।';
                }
            }
            self::need($gaps, $data, 'other_remarks', 'অন্যান্য মন্তব্য');
            self::need($gaps, $data, 'recommendation_type', 'সুপারিশ');
            self::need($gaps, $data, 'supervisor_remarks', 'তত্ত্বাবধায়কের মন্তব্য');
            if (($data['recommendation_type'] ?? null) === 'extend_probation') {
                $days = $data['extension_days'] ?? null;
                if (self::blank($days) || (float) $days < 1) {
                    $gaps['extension_days'] = 'বর্ধিত দিন সংখ্যা পূরণ করা হয়নি।';
                }
            }

            return $gaps;
        }

        self::need($gaps, $data, 'employee_id', 'কর্মী');

        if ($kind === 'promotion') {
            self::need($gaps, $data, 'education_at_joining', 'যোগদানের সময়ের শিক্ষাগত যোগ্যতা');
            self::need($gaps, $data, 'education_current', 'বর্তমান শিক্ষাগত যোগ্যতা');
            self::need($gaps, $data, 'current_station_joining_date', 'বর্তমান কর্মস্থলে যোগদানের তারিখ');
            self::need($gaps, $data, 'service_length_current_post', 'বর্তমান পদে চাকরির মেয়াদ');
            self::need($gaps, $data, 'closing_month', 'ক্লোজিং মাস');
            foreach ([
                'members_count' => 'সদস্য (জন)',
                'borrowers_count' => 'ঋণী (জন)',
                'loan_balance' => 'ঋণ স্থিতি',
                'savings_balance' => 'সঞ্চয় স্থিতি',
                'overdue_borrowers' => 'বকেয়া (জন)',
                'overdue_amount' => 'বকেয়া (টাকা)',
                'otr_pct' => 'OTR (%)',
                'par_pct' => 'PAR (%)',
            ] as $key => $name) {
                self::need($gaps, $data, $key, $name);
            }
            self::scoreNeeds($gaps, $data['scores'] ?? [], 'obtained_score');
            self::need($gaps, $data, 'strengths', 'শক্তি / দক্ষতা');
            self::need($gaps, $data, 'weaknesses', 'দুর্বলতা');
            self::need($gaps, $data, 'training_need', 'প্রশিক্ষণের প্রয়োজন');
            self::need($gaps, $data, 'recommendation_status', 'সুপারিশ');
            if (($data['recommendation_status'] ?? null) === 'consider_later') {
                $months = $data['consider_after_months'] ?? null;
                if (self::blank($months) || (float) $months < 1) {
                    $gaps['consider_after_months'] = 'কত মাস পর বিবেচনা পূরণ করা হয়নি।';
                }
            }

            return $gaps;
        }

        self::need($gaps, $data, 'joining_date', 'যোগদানের তারিখ');
        if ($kind === 'confirmation') {
            self::need($gaps, $data, 'probation_end_date', 'শিক্ষানবিশকাল সমাপ্তির তারিখ');
        } else {
            self::need($gaps, $data, 'probation_3m_completion_date', '৩ মাস শিক্ষানবিশ সমাপ্তির তারিখ');
        }
        self::need($gaps, $data, 'education_at_joining', 'যোগদানের সময়ের শিক্ষাগত যোগ্যতা');
        self::need($gaps, $data, 'education_current', 'বর্তমান শিক্ষাগত যোগ্যতা');
        self::need($gaps, $data, 'closing_month', 'ক্লোজিং মাস');

        foreach ([
            'members_count' => 'সদস্য (জন)',
            'borrowers_count' => 'ঋণী (জন)',
            'loan_balance' => 'ঋণ স্থিতি',
            'savings_balance' => 'সঞ্চয় স্থিতি',
            'overdue_borrowers' => 'বকেয়া (জন)',
            'overdue_amount' => 'বকেয়া (টাকা)',
            'otr_pct' => 'OTR (%)',
            'par_pct' => 'PAR (%)',
        ] as $key => $name) {
            if (! $accountant) {
                self::need($gaps, $data, 'joining_'.$key, 'যোগদানের সময় — '.$name);
            }
            self::need($gaps, $data, 'closing_'.$key, ($accountant ? '' : 'ক্লোজিং — ').$name);
        }

        self::scoreNeeds($gaps, $data['scores'] ?? [], 'obtained_score');
        self::need($gaps, $data, 'strengths', 'শক্তি / আগ্রহ ও দায়িত্ববোধ');
        self::need($gaps, $data, 'weaknesses', 'দুর্বলতা / শৃঙ্খলা');
        self::need($gaps, $data, 'training_need', 'প্রশিক্ষণ / উচ্চতর দায়িত্ব');
        self::need($gaps, $data, 'other_remarks', 'অন্যান্য মন্তব্য');

        if ($kind === 'confirmation') {
            self::need($gaps, $data, 'recommendation_status', 'সুপারিশ');
            if (($data['recommendation_status'] ?? null) === 'extend_probation') {
                $months = $data['extend_months'] ?? $data['extend_probation_months'] ?? null;
                if (self::blank($months) || (float) $months < 1) {
                    $gaps['extend_probation_months'] = 'বর্ধিত মাস পূরণ করা হয়নি।';
                }
            }
        } else {
            $recommendation = $data['supervisor_recommendation'] ?? $data['recommendation_status'] ?? null;
            if (self::blank($recommendation)) {
                $gaps['supervisor_recommendation'] = 'সুপারিশ পূরণ করা হয়নি।';
            }
        }

        return $gaps;
    }

    /**
     * @return array<string, string>
     */
    private static function reviewerGaps(Request $request, string $kind): array
    {
        $gaps = [];
        if (self::blank($request->input('comments'))) {
            $gaps['comments'] = 'মন্তব্য পূরণ করা হয়নি।';
        }

        $recommendation = $request->input('recommendation_status')
            ?? $request->input('supervisor_recommendation')
            ?? $request->input('recommendation_type');

        if (self::blank($recommendation)) {
            $gaps['recommendation'] = 'সুপারিশ পূরণ করা হয়নি।';
        }

        if ($kind === 'promotion' && $recommendation === 'consider_later' && (self::blank($request->input('consider_after_months')) || (float) $request->input('consider_after_months') < 1)) {
            $gaps['consider_after_months'] = 'কত মাস পর বিবেচনা পূরণ করা হয়নি।';
        }
        if ($kind === 'confirmation' && $recommendation === 'extend_probation' && (self::blank($request->input('extend_months')) || (float) $request->input('extend_months') < 1)) {
            $gaps['extend_months'] = 'বর্ধিত মাস পূরণ করা হয়নি।';
        }
        if ($kind === 'trainee' && $recommendation === 'extend_probation' && (self::blank($request->input('extension_days')) || (float) $request->input('extension_days') < 1)) {
            $gaps['extension_days'] = 'বর্ধিত দিন সংখ্যা পূরণ করা হয়নি।';
        }

        return $gaps;
    }

    /**
     * @return array<string, string>
     */
    private static function hrGaps(Request $request, string $kind): array
    {
        $gaps = [];
        if (self::blank($request->input('comments'))) {
            $gaps['comments'] = 'মন্তব্য পূরণ করা হয়নি।';
        }

        if ($kind === 'trainee') {
            return $gaps;
        }

        $fields = [
            'hr_financial_irregularity' => 'আর্থিক অনিয়ম',
            'hr_disciplinary_action' => 'শৃঙ্খলামূলক ব্যবস্থা',
            'hr_audit_objection' => 'নিরীক্ষা আপত্তি',
            'hr_leave_without_pay' => 'বিনা বেতনে ছুটি',
        ];
        if ($kind === 'promotion') {
            $fields['hr_acr_satisfactory'] = 'এসিআর সন্তোষজনক';
        }

        foreach ($fields as $key => $name) {
            if (! self::answeredBool($request, $key)) {
                $gaps[$key] = $name.' পূরণ করা হয়নি।';
            }
        }

        return $gaps;
    }

    /**
     * @return array<string, string>
     */
    private static function edGaps(Request $request): array
    {
        $gaps = [];
        if (self::blank($request->input('comments'))) {
            $gaps['comments'] = 'মন্তব্য পূরণ করা হয়নি।';
        }
        if (! self::answeredBool($request, 'is_approved')) {
            $gaps['is_approved'] = 'অনুমোদন বা নামঞ্জুর নির্বাচন করা হয়নি।';
        }

        return $gaps;
    }

    /**
     * @param  array<int, mixed>  $scores
     * @param  array<string, string>  $gaps
     */
    private static function scoreNeeds(array &$gaps, array $scores, string $valueKey): void
    {
        if ($scores === []) {
            $gaps['scores'] = 'স্কোরকার্ডের নম্বর পূরণ করা হয়নি।';

            return;
        }

        foreach ($scores as $index => $score) {
            if (! is_array($score)) {
                $gaps['scores.'.$index] = 'নম্বর পূরণ করা হয়নি।';
                continue;
            }
            $name = $score['criteria_name'] ?? ('নম্বর '.($index + 1));
            $key = 'score:'.($score['criteria_key'] ?? $index);
            $entered = self::scoreEntered($score, $valueKey);
            if (! $entered) {
                $gaps[$key] = $name.' পূরণ করা হয়নি।';
                continue;
            }
            $value = (float) ($score[$valueKey] ?? 0);
            $max = (float) ($score['max_score'] ?? 0);
            if ($max > 0 && $value > $max) {
                $gaps[$key] = $name.' সর্বোচ্চ নম্বরের চেয়ে বেশি।';
            }
        }
    }

    /**
     * @param  array<string, mixed>  $score
     */
    private static function scoreEntered(array $score, string $valueKey): bool
    {
        if ($valueKey === 'score') {
            $value = $score['score'] ?? null;

            return ! self::blank($value) || $value === 0 || $value === '0' || $value === 0.0;
        }

        $entered = $score['entered'] ?? null;
        if ($entered === true || $entered === 1 || $entered === '1' || $entered === 'true') {
            return true;
        }
        $raw = $score['raw_input'] ?? null;
        if (is_string($raw) && trim($raw) !== '') {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, string>  $gaps
     * @param  array<string, mixed>  $data
     */
    private static function need(array &$gaps, array $data, string $key, string $name): void
    {
        if (! array_key_exists($key, $data) || self::blank($data[$key])) {
            $gaps[$key] = $name.' পূরণ করা হয়নি।';
        }
    }

    private static function blank(mixed $value): bool
    {
        if ($value === null) {
            return true;
        }
        if (is_string($value)) {
            return trim($value) === '';
        }
        if (is_bool($value)) {
            return false;
        }

        return false;
    }

    private static function answeredBool(Request $request, string $key): bool
    {
        if (! $request->exists($key)) {
            return false;
        }
        $value = $request->input($key);

        return in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true);
    }

    /**
     * @param  array<string, string>  $gaps
     */
    private static function throw(array $gaps): void
    {
        if ($gaps === []) {
            return;
        }

        throw ValidationException::withMessages($gaps);
    }
}
