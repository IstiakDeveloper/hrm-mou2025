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
        'adms_clear_attlog',
        'adms_attlog_keep_days',
        'agent_sync_enabled',
        'last_sync_at',
        'last_sync_status',
        'adms_attlog_stamp',
        'adms_pending_cmd',
        'adms_pending_cmd_id',
        'adms_cmd_sent_at',
        'adms_last_clear_at',
        'last_adms_at',
    ];

    protected $casts = [
        'last_sync_at' => 'datetime',
        'last_adms_at' => 'datetime',
        'adms_cmd_sent_at' => 'datetime',
        'adms_last_clear_at' => 'datetime',
        'adms_enabled' => 'boolean',
        'adms_clear_attlog' => 'boolean',
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

    public function attlogKeepDays(): int
    {
        $days = (int) ($this->adms_attlog_keep_days ?? 7);

        return in_array($days, [3, 7], true) ? $days : 7;
    }

    /**
     * Queue CLEAR LOG for the next getrequest. Does not delete users or faces.
     */
    public function queueClearAttLog(): void
    {
        if (! Schema::hasColumn('attendance_devices', 'adms_pending_cmd')) {
            return;
        }

        if (filled($this->adms_pending_cmd)) {
            return;
        }

        $this->adms_pending_cmd = 'CLEAR LOG';
        $this->adms_pending_cmd_id = (((int) $this->adms_pending_cmd_id) % 90000) + 1;
        $this->adms_cmd_sent_at = null;
        $this->save();
    }

    /**
     * ADMS getrequest payload, or null to send OK.
     */
    public function pullPendingAdmsCommand(): ?string
    {
        if (! Schema::hasColumn('attendance_devices', 'adms_pending_cmd')) {
            return null;
        }

        $cmd = trim((string) $this->adms_pending_cmd);
        if ($cmd === '') {
            return null;
        }

        $sentAt = $this->adms_cmd_sent_at;
        if ($sentAt && $sentAt->gt(now()->subMinutes(5))) {
            return null;
        }

        $id = (int) ($this->adms_pending_cmd_id ?: 1);
        $this->adms_cmd_sent_at = now();
        $this->save();

        return 'C:'.$id.':'.$cmd;
    }

    public function ackAdmsCommand(?string $commandId, ?string $returnCode): void
    {
        if (! Schema::hasColumn('attendance_devices', 'adms_pending_cmd')) {
            return;
        }

        if ($commandId !== null && (string) $this->adms_pending_cmd_id !== (string) $commandId) {
            return;
        }

        $ok = $returnCode === null || $returnCode === '' || $returnCode === '0';

        if ($ok) {
            $this->adms_pending_cmd = null;
            $this->adms_cmd_sent_at = null;
            if (Schema::hasColumn('attendance_devices', 'adms_last_clear_at')) {
                $this->adms_last_clear_at = now();
            }
            $this->save();
        }
    }
}
