<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ZktecoSyncSetting extends Model
{
    protected $fillable = [
        'agent_sync_enabled',
        'attlog_keep_days',
    ];

    protected $casts = [
        'agent_sync_enabled' => 'boolean',
        'attlog_keep_days' => 'integer',
    ];

    public static function current(): self
    {
        $row = static::query()->orderBy('id')->first();

        if ($row) {
            return $row;
        }

        return static::query()->create([
            'agent_sync_enabled' => true,
        ]);
    }

    public static function agentSyncEnabled(): bool
    {
        return static::current()->agent_sync_enabled;
    }

    /**
     * Days of punch logs the device keeps. Older logs drop on the machine.
     * Users, fingerprints, and faces are not part of this setting.
     */
    public static function attlogKeepDays(): int
    {
        if (! Schema::hasTable('zkteco_sync_settings') || ! Schema::hasColumn('zkteco_sync_settings', 'attlog_keep_days')) {
            return 15;
        }

        $days = (int) (static::current()->attlog_keep_days ?? 15);

        return ($days >= 1 && $days <= 90) ? $days : 15;
    }
}
