<?php

namespace App\Services;

use App\Support\ActivityLogPresenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Spatie\Activitylog\Traits\LogsActivity;

class SystemActivityTracker
{
    /** @var array<int, array{attributes: array<string, mixed>, old: array<string, mixed>}> */
    private static array $pendingChanges = [];

    public static function onUpdating(Model $model): void
    {
        if (! self::shouldTrack($model)) {
            return;
        }

        $dirty = array_diff_key($model->getDirty(), array_flip(self::ignoredAttributeKeys()));
        if ($dirty === []) {
            return;
        }

        $original = $model->getOriginal();
        self::$pendingChanges[spl_object_id($model)] = [
            'attributes' => $dirty,
            'old' => array_intersect_key($original, $dirty),
        ];
    }

    public static function log(string $event, ?Model $model): void
    {
        if (! $model instanceof Model || ! in_array($event, ['updated', 'deleted'], true)) {
            return;
        }

        $objId = spl_object_id($model);
        $cached = self::$pendingChanges[$objId] ?? null;
        unset(self::$pendingChanges[$objId]);

        if (! self::shouldTrack($model)) {
            return;
        }

        $raw = [];
        if ($event === 'updated') {
            $raw = [
                'attributes' => $cached['attributes'] ?? [],
                'old' => $cached['old'] ?? [],
            ];
            if ($raw['attributes'] === [] && $raw['old'] === []) {
                return;
            }
        }

        try {
            $properties = ActivityLogPresenter::enrich($model, $raw, $event);
            if ($event === 'updated' && ($properties['changed_fields'] ?? []) === []) {
                return;
            }

            $logger = activity()
                ->performedOn($model)
                ->event($event)
                ->withProperties($properties);

            $causer = Auth::user();
            if ($causer instanceof Model) {
                $logger->causedBy($causer);
            }

            $logger->log(ActivityLogPresenter::description($event, $properties));
        } catch (\Throwable $e) {
            Log::warning('SystemActivityTracker error: '.$e->getMessage());
        }
    }

    public static function shouldTrack(Model $model): bool
    {
        if (! ActivityLogPresenter::allows($model)) {
            return false;
        }

        return ! in_array(LogsActivity::class, class_uses_recursive($model), true);
    }

    /**
     * @return list<string>
     */
    private static function ignoredAttributeKeys(): array
    {
        return [
            'id',
            'password',
            'remember_token',
            'signature',
            'two_factor_secret',
            'two_factor_recovery_codes',
            'login_pin',
            'created_at',
            'updated_at',
            'deleted_at',
            'email_verified_at',
            'download_count',
        ];
    }
}
