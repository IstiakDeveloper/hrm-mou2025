<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class AttendanceDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'name',
        'ip_address',
        'port',
        'serial_number',
        'branch_id',
        'status',
        'adms_enabled',
        'agent_sync_enabled',
        'last_sync_at',
        'last_sync_status',
        'adms_attlog_stamp',
        'last_adms_at',
    ];

    protected $casts = [
        'last_sync_at' => 'datetime',
        'last_adms_at' => 'datetime',
        'adms_enabled' => 'boolean',
        'agent_sync_enabled' => 'boolean',
    ];

    protected $appends = [
        'adms_link',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * connected = machine called /iclock within 3 minutes
     * stale = called before, but not recently
     * waiting = never reached this VPS
     */
    public function getAdmsLinkAttribute(): string
    {
        if (! $this->last_adms_at) {
            return 'waiting';
        }

        if ($this->last_adms_at->gte(now()->subMinutes(3))) {
            return 'connected';
        }

        return 'stale';
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'device_id');
    }

    public function acceptsAgentSync(): bool
    {
        if (! Schema::hasColumn('attendance_devices', 'agent_sync_enabled')) {
            return true;
        }

        $raw = $this->getAttributes()['agent_sync_enabled'] ?? 1;

        return filter_var($raw, FILTER_VALIDATE_BOOLEAN) || $raw === 1 || $raw === '1';
    }

    public function acceptsAdms(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if (! Schema::hasColumn('attendance_devices', 'adms_enabled')) {
            return false;
        }

        return (bool) $this->adms_enabled;
    }
}
