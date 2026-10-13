<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLogPresenter;
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
            'event' => 'nullable|in:updated,deleted',
            'subject_type' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:10|max:100',
        ]);

        $fromDate = $validated['from_date'] ?? Carbon::now()->subDays(30)->toDateString();
        $toDate = $validated['to_date'] ?? Carbon::now()->toDateString();
        $perPage = (int) ($validated['per_page'] ?? 25);

        $query = Activity::query()
            ->with([
                'causer' => function ($q) {
                    $q->with('employee:id,name_en,name_bn,employee_id');
                },
                'subject',
            ])
            ->whereIn('event', ['updated', 'deleted'])
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
                $subjectClass = 'App\\Models\\'.$subjectClass;
            }
            $query->where('subject_type', $subjectClass);
        }

        if (! empty($validated['search'])) {
            $term = trim($validated['search']);
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")
                    ->orWhere('properties->actor_name', 'like', "%{$term}%")
                    ->orWhere('properties->subject_label', 'like', "%{$term}%")
                    ->orWhereHasMorph('causer', [User::class], function ($uq) use ($term) {
                        $uq->where('name', 'like', "%{$term}%")
                            ->orWhereHas('employee', function ($eq) use ($term) {
                                $eq->where('name_en', 'like', "%{$term}%")
                                    ->orWhere('name_bn', 'like', "%{$term}%")
                                    ->orWhere('employee_id', 'like', "%{$term}%");
                            });
                    });
            });
        }

        $activities = $query->paginate($perPage)->withQueryString();
        $activities->through(fn (Activity $act) => ActivityLogPresenter::present($act));

        $audited = Activity::query()->whereIn('event', ['updated', 'deleted']);

        $causers = User::query()
            ->with('employee:id,name_en,name_bn,employee_id')
            ->whereIn('id', (clone $audited)->whereNotNull('causer_id')->distinct()->pluck('causer_id'))
            ->orderBy('name')
            ->get()
            ->map(fn (User $causer) => [
                'id' => $causer->id,
                'name' => ActivityLogPresenter::actorName($causer),
            ])
            ->values();

        $modules = (clone $audited)
            ->whereNotNull('subject_type')
            ->distinct()
            ->pluck('subject_type')
            ->map(fn ($type) => [
                'value' => class_basename($type),
                'label' => ActivityLogPresenter::typeLabel((string) $type),
            ])
            ->unique('value')
            ->sortBy('label')
            ->values();

        $range = Activity::query()
            ->whereIn('event', ['updated', 'deleted'])
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate);

        $stats = [
            'updates' => (clone $range)->where('event', 'updated')->count(),
            'deletes' => (clone $range)->where('event', 'deleted')->count(),
        ];

        return Inertia::render('admin/activity-logs/index', [
            'activities' => $activities,
            'causers' => $causers,
            'modules' => $modules,
            'stats' => $stats,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'causer_id' => isset($validated['causer_id']) ? (string) $validated['causer_id'] : '',
                'event' => $validated['event'] ?? '',
                'subject_type' => $validated['subject_type'] ?? '',
                'search' => $validated['search'] ?? '',
                'per_page' => (string) $perPage,
            ],
        ]);
    }
}
