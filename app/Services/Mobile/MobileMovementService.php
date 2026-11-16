<?php

namespace App\Services\Mobile;

use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Movement;
use App\Models\MovementPenalty;
use App\Models\User;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileMovementService
{
    /**
     * @return array<string, mixed>
     */
    public function listMine(User $user, ?string $status = null): array
    {
        $employee = $this->requireEmployee($user);
        $query = Movement::query()
            ->with('employee:id,name_en,name_bn,pin')
            ->where('employee_id', $employee->id)
            ->orderByDesc('id')
            ->limit(100);

        if ($status) {
            $query->where('status', $status);
        }

        return [
            'data' => $query->get()->map(fn (Movement $m) => $this->serialize($m, $user))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function listTeam(User $user, ?string $status = 'active'): array
    {
        if (! $user->hasPermission('movements.view') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'You do not have permission to view team movements.');
        }

        $branchIds = \App\Services\OrganogramAccessService::accessibleBranchIdList($user);
        $query = Movement::query()
            ->with(['employee:id,name_en,name_bn,pin,current_branch_id,branch_id'])
            ->orderByDesc('id')
            ->limit(100);

        if ($status) {
            $query->where('status', $status);
        }

        if (is_array($branchIds) && ! $user->isSuperAdmin()) {
            $query->whereHas('employee', function ($q) use ($branchIds) {
                $q->whereIn('current_branch_id', $branchIds)
                    ->orWhereIn('branch_id', $branchIds);
            });
        }

        if ($user->employee_id) {
            $query->where('employee_id', '!=', $user->employee_id);
        }

        return [
            'data' => $query->get()->map(fn (Movement $m) => $this->serialize($m, $user))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(User $user, Movement $movement): array
    {
        $movement->loadMissing('employee:id,name_en,name_bn,pin');
        if (! $this->canView($user, $movement)) {
            throw new HttpException(403, 'You do not have permission to view this movement.');
        }

        return $this->serialize($movement, $user, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function create(User $user, Request $request): array
    {
        if ($user->isBranchAccount()) {
            throw new HttpException(403, 'Branch accounts cannot create personal movements.');
        }

        $employee = $this->requireEmployee($user);
        $validated = $request->validate([
            'movement_type' => 'required|in:official,personal',
            'is_multi_day' => 'sometimes|boolean',
            'from_datetime' => 'required|date',
            'to_datetime' => 'required|date|after:from_datetime',
            'purpose' => 'required|string|max:500',
            'destination' => 'required|string|max:255',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $isMultiDay = (bool) ($validated['is_multi_day'] ?? false);
        if ($isMultiDay) {
            $branchId = $employee->current_branch_id ?? $employee->branch_id;
            if (! AttendanceSetting::isMultiDayAllowedForBranch($branchId ? (int) $branchId : null)) {
                throw ValidationException::withMessages([
                    'is_multi_day' => ['Multiple-day movement is not enabled for this branch.'],
                ]);
            }
        }

        $from = Carbon::parse($validated['from_datetime'], config('app.timezone'));
        $to = Carbon::parse($validated['to_datetime'], config('app.timezone'));
        $now = Carbon::now(config('app.timezone'));

        if ($from->lt($now) && $from->isSameDay($now)) {
            $from = $now->copy();
            if ($to->lte($from)) {
                $to = $from->copy()->addHours(8);
            }
        }

        if (! $isMultiDay && ! $to->isSameDay($from)) {
            $to = $from->copy()->endOfDay()->seconds(0);
        }

        if ($to->lte($from)) {
            throw ValidationException::withMessages([
                'to_datetime' => ['Expected return must be after start time.'],
            ]);
        }

        if ($from->lt($now->copy()->subMinutes(5))) {
            throw ValidationException::withMessages([
                'from_datetime' => ['Movement start cannot be more than 5 minutes in the past.'],
            ]);
        }

        $active = Movement::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'active')
            ->first();
        if ($active) {
            throw new HttpException(409, 'You already have an active movement (#'.$active->id.'). Complete it first.');
        }

        $movement = Movement::query()->create([
            'employee_id' => $employee->id,
            'movement_type' => $validated['movement_type'],
            'is_multi_day' => $isMultiDay,
            'from_datetime' => $from->format('Y-m-d H:i:s'),
            'to_datetime' => $to->format('Y-m-d H:i:s'),
            'purpose' => $validated['purpose'],
            'destination' => $validated['destination'],
            'remarks' => $validated['remarks'] ?? null,
            'status' => 'active',
        ]);

        return [
            'message' => 'Movement created successfully.',
            'movement' => $this->serialize($movement->fresh('employee'), $user, true),
        ];
    }

    /**
     * Simplified complete for mobile: marks returned/completed with work result.
     * Full log-book meter workflow remains available on web until P08.03 deep parity.
     *
     * @return array<string, mixed>
     */
    public function complete(User $user, Movement $movement, Request $request): array
    {
        $employee = $this->requireEmployee($user);
        if ((int) $employee->id !== (int) $movement->employee_id) {
            throw new HttpException(403, 'You can only complete your own movement.');
        }
        if ($movement->status !== 'active') {
            throw new HttpException(409, 'This movement has already been closed.');
        }

        $validated = $request->validate([
            'work_result' => 'required|string|min:5|max:2000',
            'actual_return_datetime' => 'nullable|date',
        ]);

        $returnAt = isset($validated['actual_return_datetime'])
            ? Carbon::parse($validated['actual_return_datetime'], config('app.timezone'))
            : Carbon::now(config('app.timezone'));

        $movement->work_result = $validated['work_result'];
        $movement->actual_return_datetime = $returnAt->format('Y-m-d H:i:s');
        $movement->is_returned = true;
        $movement->status = 'completed';
        $movement->save();

        return [
            'message' => 'Movement completed successfully.',
            'movement' => $this->serialize($movement->fresh('employee'), $user, true),
            'note' => 'Log-book voucher details can still be finalized on web if required.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(User $user, Movement $movement): array
    {
        $own = $user->employee_id && (int) $user->employee_id === (int) $movement->employee_id;
        if (! $user->hasPermission('movements.edit') && ! ($own && in_array($movement->status, ['pending', 'active'], true))) {
            throw new HttpException(403, 'You do not have permission to cancel this movement.');
        }

        DB::transaction(function () use ($movement) {
            $movement->status = 'cancelled';
            $movement->save();
        });

        return [
            'message' => 'Movement cancelled successfully.',
            'movement' => $this->serialize($movement->fresh('employee'), $user, true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function penaltyStatus(User $user): array
    {
        $penalty = MovementPenalty::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->whereIn('status', ['unpaid', 'pending_verification', 'rejected'])
            ->latest()
            ->first();

        if (! $penalty) {
            return [
                'locked' => false,
                'penalty' => null,
                'allowed_actions' => ['logout'],
            ];
        }

        return [
            'locked' => true,
            'penalty' => [
                'id' => $penalty->id,
                'status' => $penalty->status,
                'amount' => Money::toString($penalty->amount),
                'movement_id' => $penalty->movement_id,
                'payment_method' => $penalty->payment_method,
                'sender_number' => $penalty->sender_number,
                'transaction_id' => $penalty->transaction_id,
                'rejection_reason' => $penalty->rejection_reason ?? null,
            ],
            'merchant_hint' => [
                'bkash_number' => config('services.payment.bkash_number'),
            ],
            'allowed_actions' => ['submit_reference', 'logout'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function submitPenalty(User $user, Request $request): array
    {
        $senderNumber = preg_replace('/\D/', '', (string) $request->input('sender_number', ''));
        $merchantNumber = preg_replace('/\D/', '', (string) config('services.payment.bkash_number', '01334766432'));
        $request->merge(['clean_sender_number' => $senderNumber]);

        $validated = $request->validate([
            'penalty_id' => 'required|exists:movement_penalties,id',
            'payment_method' => 'required|in:bkash,nagad',
            'clean_sender_number' => ['required', 'string', 'regex:/^01[3-9]\d{8}$/'],
            'transaction_id' => 'nullable|string|max:30',
        ]);

        if (! empty($merchantNumber) && substr($senderNumber, -11) === substr($merchantNumber, -11)) {
            throw ValidationException::withMessages([
                'sender_number' => ['Merchant number cannot be used as sender number.'],
            ]);
        }

        $penalty = MovementPenalty::query()
            ->where('id', $validated['penalty_id'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->firstOrFail();

        $penalty->update([
            'payment_method' => $validated['payment_method'],
            'sender_number' => $senderNumber,
            'transaction_id' => strtoupper(trim($validated['transaction_id'] ?? '')),
            'payment_submitted_at' => now(),
            'status' => 'pending_verification',
        ]);

        if (config('services.payment.auto_approve', false)) {
            $minSec = max(5, (int) config('services.payment.auto_approve_min_seconds', 8));
            $maxSec = max($minSec + 2, (int) config('services.payment.auto_approve_max_seconds', 28));
            Cache::put(
                "movement_penalty:auto_approve_at:{$penalty->id}",
                now()->addSeconds(rand($minSec, $maxSec))->timestamp,
                now()->addMinutes(15)
            );
        }

        return [
            'message' => 'Penalty payment reference submitted for verification.',
            'status' => $this->penaltyStatus($user),
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

    private function canView(User $user, Movement $movement): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('movements.view')) {
            return true;
        }

        return $user->employee_id && (int) $user->employee_id === (int) $movement->employee_id;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Movement $movement, User $user, bool $detailed = false): array
    {
        $own = $user->employee_id && (int) $user->employee_id === (int) $movement->employee_id;
        $payload = [
            'id' => $movement->id,
            'employee_id' => $movement->employee_id,
            'employee_name' => $movement->employee?->name_en ?? $movement->employee?->name_bn,
            'movement_type' => $movement->movement_type,
            'is_multi_day' => (bool) $movement->is_multi_day,
            'from_datetime' => optional($movement->from_datetime)?->toIso8601String(),
            'to_datetime' => optional($movement->to_datetime)?->toIso8601String(),
            'purpose' => $movement->purpose,
            'destination' => $movement->destination,
            'status' => $movement->status,
            'is_returned' => (bool) $movement->is_returned,
            'allowed_actions' => array_values(array_filter([
                $own && $movement->status === 'active' ? 'complete' : null,
                ($own || $user->hasPermission('movements.edit')) && in_array($movement->status, ['pending', 'active'], true) ? 'cancel' : null,
            ])),
        ];

        if ($detailed) {
            $payload['remarks'] = $movement->remarks;
            $payload['work_result'] = $movement->work_result;
            $payload['actual_return_datetime'] = optional($movement->actual_return_datetime)?->toIso8601String();
        }

        return $payload;
    }
}
