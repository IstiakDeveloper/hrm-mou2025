<?php

use App\Models\MovementLogBookPayment;
use App\Services\LogBookPaymentWorkflowService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movement_log_book_payments', function (Blueprint $table) {
            $table->string('submitter_tier', 32)->nullable()->after('approval_scope');
            $table->boolean('needs_recommendation')->default(false)->after('submitter_tier');
            $table->foreignId('recommended_by')->nullable()->after('processed_at')->constrained('users')->nullOnDelete();
            $table->timestamp('recommended_at')->nullable()->after('recommended_by');
            $table->text('recommendation_remarks')->nullable()->after('recommended_at');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE movement_log_book_payments MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending'");
        }

        $workflow = app(LogBookPaymentWorkflowService::class);

        MovementLogBookPayment::query()
            ->with(['employee.designation', 'employee.branch.regionalOffice'])
            ->each(function (MovementLogBookPayment $payment) use ($workflow) {
                if (! $payment->employee) {
                    return;
                }

                $tier = $workflow->resolveSubmitterTier($payment->employee);
                $payment->update([
                    'submitter_tier' => $tier,
                    'needs_recommendation' => $workflow->needsRecommendation($tier),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('movement_log_book_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recommended_by');
            $table->dropColumn([
                'recommended_at',
                'recommendation_remarks',
                'needs_recommendation',
                'submitter_tier',
            ]);
        });
    }
};
