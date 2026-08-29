<?php

use App\Models\MovementLogBookPayment;
use App\Services\LogBookPaymentWorkflowService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movement_log_book_payments', function (Blueprint $table) {
            $table->decimal('km_limit', 10, 2)->nullable()->after('total_official_km');
            $table->decimal('billed_official_km', 12, 2)->default(0)->after('km_limit');
        });

        $workflow = app(LogBookPaymentWorkflowService::class);

        MovementLogBookPayment::query()
            ->with(['employee.designation', 'employee.branch.regionalOffice'])
            ->each(function (MovementLogBookPayment $payment) use ($workflow) {
                if (! $payment->employee) {
                    return;
                }

                $limitInfo = $workflow->resolveKmLimit($payment->employee);
                $kmLimit = $limitInfo['km_limit'];
                $totalKm = (float) $payment->total_official_km;
                $billedKm = $workflow->calculateBilledKm($totalKm, $kmLimit);
                $rate = (float) $payment->rate_per_km;
                $totalAmount = round($billedKm * $rate, 2);

                $payment->update([
                    'km_limit' => $kmLimit,
                    'billed_official_km' => $billedKm,
                    'total_amount' => $totalAmount,
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('movement_log_book_payments', function (Blueprint $table) {
            $table->dropColumn(['km_limit', 'billed_official_km']);
        });
    }
};
