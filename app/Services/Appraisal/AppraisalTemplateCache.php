<?php

namespace App\Services\Appraisal;

use App\Models\EvaluationTemplate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AppraisalTemplateCache
{
    public static function load(string $appraisalType, bool $activeOnly = false, bool $activeCriteriaOnly = false): Collection
    {
        $key = self::key($appraisalType, $activeOnly, $activeCriteriaOnly);

        return Cache::remember($key, now()->addHour(), function () use ($appraisalType, $activeOnly, $activeCriteriaOnly) {
            $query = EvaluationTemplate::query()
                ->select(['id', 'appraisal_type', 'code', 'title_en', 'title_bn', 'description', 'total_marks', 'is_active', 'version'])
                ->where('appraisal_type', $appraisalType);

            if ($activeOnly) {
                $query->where('is_active', true);
            }

            $query->with([
                'sections' => function ($section) {
                    $section->select(['id', 'template_id', 'section_key', 'name_en', 'name_bn', 'max_marks', 'order'])
                        ->orderBy('order');
                },
                'sections.criteria' => function ($criteria) use ($activeCriteriaOnly) {
                    $criteria->select(['id', 'section_id', 'criteria_key', 'name_en', 'name_bn', 'max_score', 'order', 'is_active']);
                    if ($activeCriteriaOnly) {
                        $criteria->where('is_active', true);
                    }
                    $criteria->orderBy('order');
                },
            ]);

            return $query->orderBy('id')->get();
        });
    }

    public static function flush(): void
    {
        foreach (['promotion', 'confirmation', 'probation_increment', 'trainee'] as $type) {
            foreach ([false, true] as $activeOnly) {
                foreach ([false, true] as $activeCriteriaOnly) {
                    Cache::forget(self::key($type, $activeOnly, $activeCriteriaOnly));
                }
            }
        }
    }

    private static function key(string $appraisalType, bool $activeOnly, bool $activeCriteriaOnly): string
    {
        return 'appraisal.templates.'.$appraisalType.'.'.($activeOnly ? '1' : '0').'.'.($activeCriteriaOnly ? '1' : '0');
    }
}
