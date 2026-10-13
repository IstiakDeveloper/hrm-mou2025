<?php

namespace App\Traits;

use App\Support\ActivityLogPresenter;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\Traits\LogsActivity;

trait TracksActivity
{
    use LogsActivity;

    /** @var list<string> */
    protected static array $recordEvents = ['updated', 'deleted'];

    public function getActivitylogOptions(): LogOptions
    {
        if (! ActivityLogPresenter::allows(static::class)) {
            return LogOptions::defaults()
                ->logOnly([])
                ->dontSubmitEmptyLogs();
        }

        return LogOptions::defaults()
            ->logFillable()
            ->logExcept([
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
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->dontLogIfAttributesChangedOnly(['updated_at', 'created_at', 'download_count'])
            ->setDescriptionForEvent(fn (string $eventName): string => $eventName === 'deleted' ? 'Deleted' : 'Updated');
    }

    public function tapActivity(Activity $activity, string $eventName): void
    {
        $properties = ActivityLogPresenter::enrich($this, $activity->properties?->toArray() ?? [], $eventName);
        $activity->properties = collect($properties);
        $activity->description = ActivityLogPresenter::description($eventName, $properties);
    }
}
