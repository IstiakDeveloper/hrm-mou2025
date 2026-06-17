<?php

namespace App\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ActiveSessionService
{
    public function activityCutoff(): int
    {
        return now()->getTimestamp() - (config('session.lifetime') * 60);
    }

    /**
     * @return array{active_sessions: int, active_users: int}
     */
    public function stats(): array
    {
        $cutoff = $this->activityCutoff();

        $base = DB::table('sessions')
            ->where('last_activity', '>=', $cutoff)
            ->whereNotNull('user_id');

        return [
            'active_sessions' => (clone $base)->count(),
            'active_users' => (clone $base)->distinct()->count('user_id'),
        ];
    }

    /**
     * @return list<array{user_name: string, email: string, ip_address: string|null, device_summary: string, last_activity: string}>
     */
    public function listActive(
        int $limit = 100,
        ?string $search = null,
        ?int $roleId = null,
        ?int $branchId = null,
        ?string $accountType = null,
    ): array {
        $cutoff = $this->activityCutoff();

        $query = DB::table('sessions as s')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->where('s.last_activity', '>=', $cutoff)
            ->whereNotNull('s.user_id');

        if ($search !== null && $search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('u.name', 'like', $like)
                    ->orWhere('u.email', 'like', $like)
                    ->orWhere('u.username', 'like', $like)
                    ->orWhere('s.ip_address', 'like', $like)
                    ->orWhere('s.user_agent', 'like', $like);
            });
        }

        if ($branchId) {
            $query->where('u.branch_id', $branchId);
        }

        if ($accountType && in_array($accountType, ['staff', 'branch'], true)) {
            $query->where('u.account_type', $accountType);
        }

        if ($roleId) {
            $query->where(function ($q) use ($roleId) {
                $q->where('u.role_id', $roleId)
                    ->orWhereExists(function ($sub) use ($roleId) {
                        $sub->select(DB::raw(1))
                            ->from('role_user')
                            ->whereColumn('role_user.user_id', 'u.id')
                            ->where('role_user.role_id', $roleId);
                    });
            });
        }

        return $query
            ->orderByDesc('s.last_activity')
            ->limit($limit)
            ->get([
                'u.name as user_name',
                'u.email',
                's.ip_address',
                's.user_agent',
                's.last_activity',
            ])
            ->map(fn ($row) => [
                'user_name' => $row->user_name,
                'email' => $row->email,
                'ip_address' => $row->ip_address,
                'device_summary' => $this->summarizeUserAgent((string) $row->user_agent),
                'last_activity' => now()->createFromTimestamp((int) $row->last_activity)->format('Y-m-d H:i'),
            ])
            ->all();
    }

    /** @return list<int> */
    public function activeUserIds(): array
    {
        $cutoff = $this->activityCutoff();

        return DB::table('sessions')
            ->where('last_activity', '>=', $cutoff)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function paginate(?string $search, int $perPage, string $currentSessionId): LengthAwarePaginator
    {
        $cutoff = $this->activityCutoff();

        $query = DB::table('sessions as s')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('branches as b', 'b.id', '=', 'u.branch_id')
            ->where('s.last_activity', '>=', $cutoff)
            ->whereNotNull('s.user_id')
            ->select([
                's.id as session_id',
                's.user_id',
                's.ip_address',
                's.user_agent',
                's.last_activity',
                'u.name as user_name',
                'u.email',
                'u.username',
                'u.account_type',
                'b.name as branch_name',
            ])
            ->orderByDesc('s.last_activity');

        if ($search !== null && $search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('u.name', 'like', $like)
                    ->orWhere('u.email', 'like', $like)
                    ->orWhere('u.username', 'like', $like)
                    ->orWhere('s.ip_address', 'like', $like);
            });
        }

        $paginator = $query->paginate($perPage)->withQueryString();

        $paginator->getCollection()->transform(function ($row) use ($currentSessionId) {
            return [
                'session_id' => $row->session_id,
                'user_id' => (int) $row->user_id,
                'user_name' => $row->user_name,
                'email' => $row->email,
                'username' => $row->username,
                'account_type' => $row->account_type,
                'branch_name' => $row->branch_name,
                'ip_address' => $row->ip_address,
                'user_agent' => $row->user_agent,
                'device_summary' => $this->summarizeUserAgent((string) $row->user_agent),
                'last_activity' => date('c', (int) $row->last_activity),
                'last_activity_human' => $this->humanLastActivity((int) $row->last_activity),
                'is_current' => $row->session_id === $currentSessionId,
            ];
        });

        return $paginator;
    }

    public function revoke(string $sessionId): bool
    {
        return DB::table('sessions')->where('id', $sessionId)->delete() > 0;
    }

    public function revokeAllForUser(int $userId): int
    {
        return DB::table('sessions')->where('user_id', $userId)->delete();
    }

    public function userHasSession(int $userId, string $sessionId): bool
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', $sessionId)
            ->exists();
    }

    private function humanLastActivity(int $timestamp): string
    {
        return now()->createFromTimestamp($timestamp)->diffForHumans();
    }

    private function summarizeUserAgent(string $userAgent): string
    {
        $ua = trim($userAgent);
        if ($ua === '') {
            return 'Unknown device';
        }

        $browser = 'Browser';
        if (preg_match('/Edg\//i', $ua)) {
            $browser = 'Edge';
        } elseif (preg_match('/Chrome\//i', $ua) && ! preg_match('/Edg\//i', $ua)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox\//i', $ua)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari\//i', $ua) && ! preg_match('/Chrome\//i', $ua)) {
            $browser = 'Safari';
        }

        $os = 'Unknown OS';
        if (preg_match('/Windows/i', $ua)) {
            $os = 'Windows';
        } elseif (preg_match('/Android/i', $ua)) {
            $os = 'Android';
        } elseif (preg_match('/iPhone|iPad|iOS/i', $ua)) {
            $os = 'iOS';
        } elseif (preg_match('/Mac OS X|Macintosh/i', $ua)) {
            $os = 'macOS';
        } elseif (preg_match('/Linux/i', $ua)) {
            $os = 'Linux';
        }

        return $browser.' on '.$os;
    }
}
