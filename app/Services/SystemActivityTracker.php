<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\Traits\LogsActivity;

class SystemActivityTracker
{
    private static array $pendingChanges = [];

    private static array $sensitiveAttributes = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    private static array $ignoredModels = [
        'Activity',
        'Notification',
        'PushSubscription',
        'DatabaseNotification',
    ];

    public static function onUpdating(Model $model): void
    {
        if (self::shouldIgnore($model)) {
            return;
        }

        $dirty = $model->getDirty();
        unset($dirty['updated_at'], $dirty['created_at']);

        if (empty($dirty)) {
            return;
        }

        $dirtyClean = array_diff_key($dirty, array_flip(self::$sensitiveAttributes));
        $oldClean = array_diff_key(array_intersect_key($model->getOriginal(), $dirty), array_flip(self::$sensitiveAttributes));

        self::$pendingChanges[spl_object_id($model)] = [
            'attributes' => $dirtyClean,
            'old' => $oldClean,
        ];
    }

    public static function log(string $event, ?Model $model): void
    {
        if (! $model instanceof Model || self::shouldIgnore($model)) {
            return;
        }

        $properties = [
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ];

        if ($event === 'updated') {
            $objId = spl_object_id($model);
            $cached = self::$pendingChanges[$objId] ?? [];
            unset(self::$pendingChanges[$objId]);

            $attributes = $cached['attributes'] ?? [];
            $old = $cached['old'] ?? [];

            // If nothing meaningful changed, do not submit empty log
            if (empty($attributes) && empty($old)) {
                return;
            }

            $properties['attributes'] = $attributes;
            $properties['old'] = $old;
        } elseif ($event === 'created') {
            $attributes = array_diff_key($model->getAttributes(), array_flip(self::$sensitiveAttributes));
            unset($attributes['created_at'], $attributes['updated_at']);
            $properties['attributes'] = $attributes;
        } elseif ($event === 'deleted') {
            $old = array_diff_key($model->getAttributes(), array_flip(self::$sensitiveAttributes));
            unset($old['created_at'], $old['updated_at']);
            $properties['old'] = $old;
        }

        $modelName = class_basename($model);
        $key = $model->getKey();
        $description = "{$modelName}" . ($key ? " #{$key}" : '') . " has been {$event}";

        try {
            $act = activity()
                ->performedOn($model)
                ->event($event)
                ->withProperties($properties);

            $causer = auth()->user();
            if ($causer) {
                $act->causedBy($causer);
            }

            $act->log($description);
        } catch (\Throwable $e) {
            // Never break user action if logging encounters any error
            Log::warning("SystemActivityTracker error: " . $e->getMessage());
        }
    }

    public static function shouldIgnore(Model $model): bool
    {
        if ($model instanceof Activity) {
            return true;
        }

        $className = class_basename($model);
        if (in_array($className, self::$ignoredModels)) {
            return true;
        }

        // If model already uses Spatie's LogsActivity trait, let Spatie handle it
        if (in_array(LogsActivity::class, class_uses_recursive($model))) {
            return true;
        }

        return false;
    }
}
