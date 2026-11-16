<?php

namespace App\Services\Mobile;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveApproval;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileLeaveService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function types(): array
    {
        return LeaveType::query()
            ->orderBy('name')
            ->get()
            ->map(fn (LeaveType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'days_allowed' => $type->days_allowed,
                'is_paid' => (bool) $type->is_paid,
                'description' => $type->description,
                'requires_document' => $this->isMedicalType($type),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function balances(User $user, ?int $year = null): array
    {
        $employee = $this->requireEmployee($user);
        $year ??= (int) Carbon::now('Asia/Dhaka')->year;

        return LeaveBalance::query()
            ->with('leaveType')
            ->where('employee_id', $employee->id)
            ->where('year', $year)
            ->get()
            ->map(fn (LeaveBalance $balance) => [
                'id' => $balance->id,
                'year' => $balance->year,
                'leave_type_id' => $balance->leave_type_id,
                'leave_type_name' => $balance->leaveType?->name,
                'allocated_days' => (float) $balance->allocated_days,
                'used_days' => (float) $balance->used_days,
                'remaining_days' => (float) $balance->remaining_days,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function listMine(User $user, ?string $status = null): array
    {
        $employee = $this->requireEmployee($user);
        $query = LeaveApplication::query()
            ->with(['leaveType', 'approver'])
            ->where('employee_id', $employee->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        $rows = $query->limit(100)->get();

        return [
            'data' => $rows->map(fn (LeaveApplication $app) => $this->serialize($app, $user))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function listPendingForReview(User $user): array
    {
        if (! $user->hasPermission('leave-applications.approve') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'You do not have permission to review leave applications.');
        }

        $query = LeaveApplication::query()
            ->with(['leaveType', 'employee.currentBranch', 'employee.branch', 'approver'])
            ->where('status', 'pending')
            ->orderByDesc('id');

        OrganogramAccessService::constrainLeaveApplications($query, $user);

        if ($user->employee_id) {
            $query->where('employee_id', '!=', $user->employee_id);
        }

        $rows = $query->limit(100)->get();

        return [
            'data' => $rows->map(fn (LeaveApplication $app) => $this->serialize($app, $user))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(User $user, LeaveApplication $application): array
    {
        $application->loadMissing(['leaveType', 'employee.currentBranch', 'employee.branch', 'approver', 'approvals.approver']);
        if (! $this->canView($user, $application)) {
            throw new HttpException(403, 'You do not have permission to view this leave application.');
        }

        return $this->serialize($application, $user, detailed: true);
    }

    /**
     * @return array<string, mixed>
     */
    public function create(User $user, Request $request): array
    {
        $employee = $this->requireEmployee($user);

        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:5000',
            'contact' => 'nullable|string|max:120',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:jpeg,png,jpg,pdf,doc,docx|max:2048',
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate = Carbon::parse($validated['end_date'])->startOfDay();
        $days = $startDate->diffInDays($endDate) + 1;

        $overlapping = LeaveApplication::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) use ($startDate, $endDate) {
                $query->where('start_date', '<=', $endDate->toDateString())
                    ->where('end_date', '>=', $startDate->toDateString());
            })
            ->with('leaveType')
            ->first();

        if ($overlapping) {
            throw ValidationException::withMessages([
                'start_date' => [
                    sprintf(
                        'An overlapping %s leave application already exists (%s: %s to %s).',
                        ucfirst($overlapping->status),
                        $overlapping->leaveType->name ?? 'Leave',
                        Carbon::parse($overlapping->start_date)->format('d-m-Y'),
                        Carbon::parse($overlapping->end_date)->format('d-m-Y'),
                    ),
                ],
            ]);
        }

        $leaveType = LeaveType::query()->findOrFail((int) $validated['leave_type_id']);
        if ($this->isMedicalType($leaveType) && ! $request->hasFile('documents')) {
            throw ValidationException::withMessages([
                'documents' => ['Medical certificate or supporting document is mandatory for Medical Leave application.'],
            ]);
        }

        $isUnpaid = ! $leaveType->is_paid;
        if (! $isUnpaid) {
            $balance = LeaveBalance::query()
                ->where('employee_id', $employee->id)
                ->where('leave_type_id', $leaveType->id)
                ->where('year', (int) Carbon::now('Asia/Dhaka')->year)
                ->first();

            if (! $balance) {
                throw ValidationException::withMessages([
                    'leave_type_id' => ['You do not have a leave balance for this leave type.'],
                ]);
            }

            if ((float) $balance->remaining_days < $days) {
                throw ValidationException::withMessages([
                    'leave_type_id' => [
                        'Not enough leave balance. Available: '.$balance->remaining_days.' days, Requested: '.$days.' days.',
                    ],
                ]);
            }
        }

        $documents = [];
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('leave_documents', 'public');
                $documents[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getClientMimeType(),
                ];
            }
        }

        $reason = $validated['reason'];
        if (! empty($validated['contact'])) {
            $reason .= "\nContact: ".$validated['contact'];
        }

        $application = LeaveApplication::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'days' => $days,
            'reason' => $reason,
            'status' => 'pending',
            'approved_by' => null,
            'applied_at' => now(),
            'documents' => $documents ?: null,
        ]);

        $application->load(['leaveType', 'approver']);

        return [
            'message' => 'Leave application submitted successfully for '.$days.' day(s).',
            'application' => $this->serialize($application, $user, detailed: true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(User $user, LeaveApplication $application): array
    {
        if (! $this->canCancel($user, $application)) {
            throw new HttpException(403, 'You do not have permission to cancel this leave application.');
        }

        if ($application->status !== 'pending') {
            throw new HttpException(422, 'You can only cancel pending leave applications.');
        }

        $application->status = 'cancelled';
        $application->save();

        return [
            'message' => 'Leave application cancelled successfully.',
            'application' => $this->serialize($application->fresh(['leaveType', 'approver']), $user, detailed: true),
        ];
    }

    /**
     * Scope-gated approve for mobile. Full designation-tier actor matching remains authoritative on web
     * until dedicated characterization tests land; mobile still blocks self-approve and out-of-scope rows.
     *
     * @return array<string, mixed>
     */
    public function approve(User $user, LeaveApplication $application, ?string $comments = null): array
    {
        $application->loadMissing(['employee.currentBranch', 'employee.branch', 'leaveType']);
        if (! $this->canReview($user, $application)) {
            throw new HttpException(403, 'You do not have permission to approve this leave application.');
        }
        if ($application->status !== 'pending') {
            throw new HttpException(409, 'This leave application is not pending approval.');
        }

        DB::transaction(function () use ($user, $application, $comments) {
            $application->status = 'approved';
            $application->approved_by = $user->id;
            $application->save();

            LeaveApproval::query()->create([
                'leave_application_id' => $application->id,
                'approved_by' => $user->id,
                'level' => 1,
                'status' => 'approved',
                'comments' => $comments,
                'approved_at' => now(),
            ]);

            $this->updateLeaveBalance(
                (int) $application->employee_id,
                (int) $application->leave_type_id,
                (float) $application->days,
            );
            $this->syncAttendanceForApprovedLeave($application);
        });

        return [
            'message' => 'Leave application approved successfully.',
            'application' => $this->serialize($application->fresh(['leaveType', 'approver', 'employee']), $user, detailed: true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function reject(User $user, LeaveApplication $application, string $reason): array
    {
        $application->loadMissing(['employee.currentBranch', 'employee.branch', 'leaveType']);
        if (! $this->canReview($user, $application)) {
            throw new HttpException(403, 'You do not have permission to reject this leave application.');
        }
        if ($application->status !== 'pending') {
            throw new HttpException(409, 'This leave application is not pending approval.');
        }

        $application->status = 'rejected';
        $application->approved_by = $user->id;
        $application->rejection_reason = $reason;
        $application->save();

        LeaveApproval::query()->create([
            'leave_application_id' => $application->id,
            'approved_by' => $user->id,
            'level' => 1,
            'status' => 'rejected',
            'comments' => $reason,
            'approved_at' => now(),
        ]);

        return [
            'message' => 'Leave application rejected successfully.',
            'application' => $this->serialize($application->fresh(['leaveType', 'approver', 'employee']), $user, detailed: true),
        ];
    }

    private function requireEmployee(User $user): Employee
    {
        $user->loadMissing('employee');
        if (! $user->employee) {
            throw new HttpException(403, 'Employee profile not found.');
        }

        return $user->employee;
    }

    private function isMedicalType(LeaveType $type): bool
    {
        $name = strtolower((string) $type->name);

        return str_contains($name, 'medical')
            || str_contains($name, 'sick')
            || str_contains($name, 'চিকিৎসা');
    }

    private function canView(User $user, LeaveApplication $application): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->employee_id && (int) $user->employee_id === (int) $application->employee_id) {
            return true;
        }

        if (! $user->hasPermission('leave-applications.view') && ! $user->hasPermission('leave-applications.approve')) {
            return false;
        }

        $query = LeaveApplication::query()->whereKey($application->id);
        OrganogramAccessService::constrainLeaveApplications($query, $user);

        return $query->exists();
    }

    private function canCancel(User $user, LeaveApplication $application): bool
    {
        if ($user->hasPermission('leave-applications.edit')) {
            return true;
        }

        return $user->employee_id
            && (int) $user->employee_id === (int) $application->employee_id
            && $application->status === 'pending';
    }

    private function canReview(User $user, LeaveApplication $application): bool
    {
        if ($user->employee_id && (int) $user->employee_id === (int) $application->employee_id) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $user->hasPermission('leave-applications.approve')) {
            return false;
        }

        $query = LeaveApplication::query()->whereKey($application->id)->where('status', 'pending');
        OrganogramAccessService::constrainLeaveApplications($query, $user);

        return $query->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(LeaveApplication $application, User $user, bool $detailed = false): array
    {
        $payload = [
            'id' => $application->id,
            'employee_id' => $application->employee_id,
            'employee_name' => $application->employee?->name_en
                ?? $application->employee?->name_bn
                ?? null,
            'leave_type_id' => $application->leave_type_id,
            'leave_type_name' => $application->leaveType?->name,
            'start_date' => Carbon::parse($application->start_date)->toDateString(),
            'end_date' => Carbon::parse($application->end_date)->toDateString(),
            'days' => (float) $application->days,
            'status' => $application->status,
            'reason' => $application->reason,
            'rejection_reason' => $application->rejection_reason,
            'applied_at' => optional($application->applied_at)?->toIso8601String(),
            'allowed_actions' => array_values(array_filter([
                $this->canCancel($user, $application) ? 'cancel' : null,
                $this->canReview($user, $application) ? 'approve' : null,
                $this->canReview($user, $application) ? 'reject' : null,
            ])),
        ];

        if ($detailed) {
            $payload['documents'] = $application->documents;
            $payload['approvals'] = $application->relationLoaded('approvals')
                ? $application->approvals->map(fn (LeaveApproval $row) => [
                    'id' => $row->id,
                    'status' => $row->status,
                    'comments' => $row->comments,
                    'approved_at' => optional($row->approved_at)?->toIso8601String(),
                    'approver_name' => $row->approver?->name,
                ])->values()->all()
                : [];
        }

        return $payload;
    }

    private function updateLeaveBalance(int $employeeId, int $leaveTypeId, float $days): void
    {
        $leaveType = LeaveType::query()->find($leaveTypeId);
        $currentYear = (int) Carbon::now('Asia/Dhaka')->year;
        $balance = LeaveBalance::query()
            ->where('employee_id', $employeeId)
            ->where('leave_type_id', $leaveTypeId)
            ->where('year', $currentYear)
            ->first();

        if ($balance) {
            $balance->applyUsage($days, ! ($leaveType && ! $leaveType->is_paid));
            $balance->save();
        } elseif ($leaveType && ! $leaveType->is_paid) {
            LeaveBalance::query()->create([
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'year' => $currentYear,
                'allocated_days' => 0,
                'used_days' => $days,
                'remaining_days' => 0,
            ]);
        }
    }

    private function syncAttendanceForApprovedLeave(LeaveApplication $application): void
    {
        $start = Carbon::parse($application->start_date)->startOfDay();
        $end = $application->inclusiveEndDate();
        if ($end->lt($start)) {
            return;
        }

        $employeeId = (int) $application->employee_id;
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $dateStr = $cursor->toDateString();
            $attendance = Attendance::query()
                ->where('employee_id', $employeeId)
                ->whereDate('date', $dateStr)
                ->first();

            if (! $attendance) {
                Attendance::query()->create([
                    'employee_id' => $employeeId,
                    'date' => $dateStr,
                    'check_in' => null,
                    'check_out' => null,
                    'status' => 'leave',
                ]);
            } elseif (empty($attendance->check_in) && empty($attendance->check_out) && in_array($attendance->status, ['absent', 'holiday'], true)) {
                $attendance->status = 'leave';
                $attendance->save();
            }

            $cursor->addDay();
        }
    }
}
