<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotice;
use App\Models\Department;
use App\Models\User;
use App\Notifications\AdminNoticeNotification;
use App\Services\WebPushService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminNoticeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $type = $request->query('type');
        $audience = $request->query('audience');

        $query = AdminNotice::query()
            ->with('sender:id,name,email')
            ->latest('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        if (is_string($type) && $type !== '' && in_array($type, ['info', 'success', 'warning', 'error'], true)) {
            $query->where('type', $type);
        }

        if (is_string($audience) && $audience !== '' && in_array($audience, ['all', 'departments', 'users'], true)) {
            $query->where('audience', $audience);
        }

        $notices = $query->paginate(15)->withQueryString();

        return Inertia::render('admin/notices/index', [
            'notices' => $notices,
            'filters' => [
                'search' => $search,
                'type' => is_string($type) ? $type : '',
                'audience' => is_string($audience) ? $audience : '',
            ],
        ]);
    }

    public function show(AdminNotice $notice): Response
    {
        $notice->load('sender:id,name,email');

        $departments = [];
        if (! empty($notice->department_ids)) {
            $departments = Department::query()
                ->whereIn('id', $notice->department_ids)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        $users = [];
        if (! empty($notice->user_ids)) {
            $users = User::query()
                ->whereIn('id', $notice->user_ids)
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        }

        return Inertia::render('admin/notices/show', [
            'notice' => $notice,
            'departments' => $departments,
            'users' => $users,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/notices/create', [
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'users' => User::query()
                ->where('active_status', true)
                ->orderBy('name')
                ->limit(1500)
                ->get(['id', 'name', 'email', 'username']),
        ]);
    }

    public function store(Request $request, WebPushService $webPush): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
            'type' => ['nullable', 'string', 'in:info,success,warning,error'],
            'link' => ['nullable', 'string', 'max:2048'],
            'audience' => ['required', 'string', 'in:all,departments,users'],
            'department_ids' => ['nullable', 'array'],
            'department_ids.*' => ['integer', 'exists:departments,id'],
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'attachment' => ['nullable', 'file', 'max:15360'],
        ]);

        if ($validated['audience'] === 'departments' && empty($validated['department_ids'])) {
            return back()->withErrors(['department_ids' => 'Select at least one department.'])->withInput();
        }

        if ($validated['audience'] === 'users' && empty($validated['user_ids'])) {
            return back()->withErrors(['user_ids' => 'Select at least one user.'])->withInput();
        }

        $type = $validated['type'] ?? 'info';
        $link = $this->normalizeLink($validated['link'] ?? null);

        $users = $this->resolveRecipients(
            $validated['audience'],
            $validated['department_ids'] ?? [],
            $validated['user_ids'] ?? [],
        );

        if ($users->isEmpty()) {
            return back()->with('warning', 'No recipients matched your selection.');
        }

        $attachmentPath = null;
        $attachmentOriginalName = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('admin-notice-attachments', 'public');
            $attachmentOriginalName = $file->getClientOriginalName();
        }

        $notice = AdminNotice::create([
            'sender_id' => $request->user()?->id,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $type,
            'link' => $link,
            'attachment_path' => $attachmentPath,
            'attachment_original_name' => $attachmentOriginalName,
            'audience' => $validated['audience'],
            'department_ids' => $validated['audience'] === 'departments' ? array_values($validated['department_ids'] ?? []) : null,
            'user_ids' => $validated['audience'] === 'users' ? array_values($validated['user_ids'] ?? []) : null,
            'recipient_count' => $users->count(),
            'push_sent' => false,
        ]);

        Notification::send($users, new AdminNoticeNotification($notice));

        $pushSent = false;
        if (WebPushService::isConfigured()) {
            $pushBody = Str::limit(strip_tags($validated['message']), 140);
            $pushUrl = $link ?? url('/notifications');
            foreach ($users as $user) {
                $webPush->sendToUser($user, $validated['title'], $pushBody, $pushUrl);
            }
            $pushSent = true;
        }

        $notice->update(['push_sent' => $pushSent]);

        return redirect()
            ->route('admin.notices.index')
            ->with('success', 'Notice sent to '.$users->count().' user(s) (in-app, email where available, and push if configured).');
    }

    public function destroy(AdminNotice $notice): RedirectResponse
    {
        if ($notice->attachment_path) {
            Storage::disk('public')->delete($notice->attachment_path);
        }
        $notice->delete();

        return back()->with('success', 'Notice deleted from the log.');
    }

    /**
     * @param  list<int>  $departmentIds
     * @param  list<int>  $userIds
     */
    private function resolveRecipients(string $audience, array $departmentIds, array $userIds): Collection
    {
        return (match ($audience) {
            'all' => User::query()
                ->where('active_status', true)
                ->get(),
            'departments' => User::query()
                ->where('active_status', true)
                ->whereHas('employee', static function ($q) use ($departmentIds): void {
                    $q->whereIn('department_id', $departmentIds);
                })
                ->get(),
            'users' => User::query()
                ->whereIn('id', $userIds)
                ->get(),
            default => collect(),
        })->unique('id')->values();
    }

    private function normalizeLink(?string $link): ?string
    {
        if ($link === null || $link === '') {
            return null;
        }

        $trim = trim($link);

        if (Str::startsWith($trim, ['http://', 'https://'])) {
            return $trim;
        }

        return Str::startsWith($trim, '/') ? url($trim) : url('/'.$trim);
    }
}
