<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_migrations', function (Blueprint $table) {
            $table->id();
            $table->string('migration_number', 40)->unique();
            $table->date('closing_date');
            $table->foreignId('loan_committee_id')->nullable()->constrained('loan_committees')->nullOnDelete();
            $table->unsignedSmallInteger('item_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('closing_date');
        });

        Schema::create('loan_migration_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_migration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('loan_policy_id')->constrained('loan_policies')->restrictOnDelete();
            $table->date('disbursement_date');
            $table->decimal('disburse_amount', 14, 2);
            $table->decimal('installment_amount', 14, 2);
            $table->unsignedSmallInteger('passed_months')->default(0);
            $table->decimal('outstanding_principal', 14, 2);
            $table->decimal('outstanding_service_charge', 14, 2)->default(0);
            $table->decimal('outstanding_total', 14, 2);
            $table->foreignId('employee_loan_id')->nullable()->constrained('employee_loans')->nullOnDelete();
            $table->timestamps();

            $table->index(['loan_migration_id', 'employee_id']);
        });

        Schema::table('employee_loans', function (Blueprint $table) {
            $table->foreignId('loan_migration_id')->nullable()->after('loan_application_id')->constrained('loan_migrations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_migration_id');
        });

        Schema::dropIfExists('loan_migration_items');
        Schema::dropIfExists('loan_migrations');
    }
};
