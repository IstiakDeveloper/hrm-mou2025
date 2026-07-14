<?php

namespace App\Services;

use App\Models\Separation;
use App\Models\SeparationHistory;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SeparationCompletionService
{
    public function __construct(
        private readonly FinalPaymentSettlementService $finalPaymentSettlementService,
    ) {}

    public function shouldApplyImmediately(mixed $separationDate): bool
    {
        return BangladeshDate::isDue($separationDate);
    }

    public function apply(Separation $separation, ?int $actorUserId): void
    {
        $separation->loadMissing('employee');

        if ($separation->status === 'completed') {
            return;
        }

        $employee = $separation->employee;
        $separationDate = $separation->separation_date
            ? Carbon::parse($separation->separation_date)
            : now();

        $employee->status = 'inactive';
        $employee->dropout_date = $separationDate;
        $employee->dropout_reason = $separation->reason;
        if ($separation->final_payment_date) {
            $employee->final_payment_date = Carbon::parse($separation->final_payment_date);
        }
        $employee->save();

        $employee->syncLinkedUserActiveStatus();

        SeparationHistory::create([
            'separation_id' => $separation->id,
            'employee_id' => $employee->id,
            'separation_date' => $separationDate,
            'reason' => $separation->reason,
            'final_payment_date' => $separation->final_payment_date
                ? Carbon::parse($separation->final_payment_date)
                : null,
            'created_by' => $actorUserId,
        ]);

        $separation->status = 'completed';
        $separation->save();

        $this->finalPaymentSettlementService->ensureForSeparation($separation, $actorUserId);
    }

    public function activateDueSeparations(?int $actorUserId = null): int
    {
        $activated = 0;

        Separation::query()
            ->where('status', 'approved')
            ->whereDate('separation_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Separation $separation) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($separation, $actorUserId, &$activated) {
                    $separation->refresh();
                    if ($separation->status !== 'approved') {
                        return;
                    }

                    $this->apply($separation, $actorUserId ?? $separation->approved_by);
                    $activated++;
                });
            });

        return $activated;
    }

    /**
     * Hard-delete a separation and reverse employee / settlement side effects when completed.
     */
    public function deleteAndRestore(Separation $separation, ?int $actorUserId = null): void
    {
        DB::transaction(function () use ($separation, $actorUserId) {
            $separation = Separation::query()
                ->whereKey($separation->id)
                ->lockForUpdate()
                ->firstOrFail();

            $separation->loadMissing(['employee', 'finalPayment', 'histories']);

            if ($separation->finalPayment) {
                if ($separation->status === 'completed') {
                    $this->finalPaymentSettlementService->undoAndDelete(
                        $separation->finalPayment,
                        $actorUserId
                    );
                } else {
                    $separation->finalPayment->delete();
                }
            }

            if ($separation->status === 'completed') {
                $this->restoreEmployeeFromSeparation($separation);
            }

            $separation->histories()->delete();
            $separation->delete();
        });
    }

    private function restoreEmployeeFromSeparation(Separation $separation): void
    {
        $employee = $separation->employee;
        if (! $employee) {
            return;
        }

        $otherCompletedExists = Separation::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->where('id', '!=', $separation->id)
            ->exists();

        if ($otherCompletedExists) {
            return;
        }

        $employee->status = 'active';
        $employee->dropout_date = null;
        $employee->dropout_reason = null;
        $employee->final_payment_date = null;
        $employee->save();

        $employee->syncLinkedUserActiveStatus();
    }
}
