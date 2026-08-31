<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ZktecoSyncSetting extends Model
{
    protected $fillable = [
        'agent_sync_enabled',
    ];

    protected $casts = [
        'agent_sync_enabled' => 'boolean',
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
}
