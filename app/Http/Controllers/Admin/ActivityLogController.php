<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);
        if (! $hasPermission($user, 'admin.access') && ! $hasPermission($user, 'users.view')) {
            abort(403, 'Unauthorized access to Activity Logs.');
        }

        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'causer_id' => 'nullable|integer',
            'event' => 'nullable|string|max:50',
            'subject_type' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:10|max:100',
        ]);

        // Default to last 30 days
        $fromDate = $validated['from_date'] ?? Carbon::now()->subDays(30)->toDateString();
        $toDate = $validated['to_date'] ?? Carbon::now()->toDateString();
        $perPage = (int) ($validated['per_page'] ?? 25);

        $query = Activity::query()
            ->with(['causer' => function ($q) {
                $q->select('id', 'name', 'email', 'username');
            }])
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->latest('id');

        if (! empty($validated['causer_id'])) {
            $query->where('causer_id', $validated['causer_id']);
        }

        if (! empty($validated['event'])) {
            $query->where('event', $validated['event']);
        }

        if (! empty($validated['subject_type'])) {
            $subjectClass = $validated['subject_type'];
            if (! str_contains($subjectClass, '\\')) {
                $subjectClass = 'App\\Models\\' . $subjectClass;
            }
            $query->where('subject_type', $subjectClass);
        }

        if (! empty($validated['search'])) {
            $term = trim($validated['search']);
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")
                    ->orWhere('properties', 'like', "%{$term}%")
                    ->orWhereHasMorph('causer', [User::class], function ($uq) use ($term) {
                        $uq->where('name', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%");
                    });
            });
        }

        $activities = $query->paginate($perPage)->withQueryString();

        $activities->through(function (Activity $act) {
            $subjectName = $act->subject_type ? class_basename($act->subject_type) : null;
            return [
                'id' => $act->id,
                'log_name' => $act->log_name,
                'description' => $act->description,
                'subject_type' => $act->subject_type,
                'subject_name' => $subjectName,
                'subject_id' => $act->subject_id,
                'causer_id' => $act->causer_id,
                'causer' => $act->causer ? [
                    'id' => $act->causer->id,
                    'name' => $act->causer->name,
                    'email' => $act->causer->email,
                    'username' => $act->causer->username ?? null,
                ] : null,
                'event' => $act->event,
                'properties' => $act->properties,
                'created_at' => $act->created_at?->toIso8601String(),
                'created_at_human' => $act->created_at?->diffForHumans(),
                'created_at_formatted' => $act->created_at?->format('d M, Y h:i A'),
            ];
        });

        // Filter options for dropdowns
        $causers = User::query()
            ->whereIn('id', Activity::query()->whereNotNull('causer_id')->distinct()->pluck('causer_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $modules = Activity::query()
            ->whereNotNull('subject_type')
            ->distinct()
            ->pluck('subject_type')
            ->map(fn ($type) => [
                'value' => class_basename($type),
                'label' => class_basename($type),
            ])
            ->unique('value')
            ->values();

        $events = Activity::query()
            ->whereNotNull('event')
            ->distinct()
            ->pluck('event')
            ->values();

        $stats = [
            'total_in_range' => $activities->total(),
            'total_all_time' => Activity::count(),
            'today_count' => Activity::whereDate('created_at', Carbon::today())->count(),
        ];

        return Inertia::render('admin/activity-logs/index', [
            'activities' => $activities,
            'causers' => $causers,
            'modules' => $modules,
            'events' => $events,
            'stats' => $stats,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'causer_id' => $validated['causer_id'] ?? '',
                'event' => $validated['event'] ?? '',
                'subject_type' => $validated['subject_type'] ?? '',
                'search' => $validated['search'] ?? '',
                'per_page' => (string) $perPage,
            ],
        ]);
    }
}
