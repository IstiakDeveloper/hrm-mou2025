<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_collection_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_number', 40)->unique();
            $table->enum('collection_type', ['single', 'batch', 'advance', 'waive', 'rebate'])->default('single');
            $table->date('collection_date');
            $table->string('reference_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('item_count')->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rolled_back_at')->nullable();
            $table->foreignId('rolled_back_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['collection_type', 'collection_date']);
        });

        Schema::create('loan_collection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_collection_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_loan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('installment_count')->default(1);
            $table->decimal('amount', 14, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['loan_collection_batch_id', 'employee_loan_id'], 'lc_items_batch_loan_idx');
        });

        Schema::table('employee_loan_transactions', function (Blueprint $table) {
            $table->foreignId('loan_collection_batch_id')
                ->nullable()
                ->after('employee_loan_installment_id')
                ->constrained('loan_collection_batches')
                ->nullOnDelete();
        });

        DB::statement("ALTER TABLE employee_loan_transactions MODIFY transaction_type ENUM(
            'disbursement',
            'installment',
            'manual_payment',
            'legacy_payment',
            'collection',
            'advance_collection',
            'rebate',
            'waive',
            'adjustment',
            'reversal'
        ) NOT NULL");
    }

    public function down(): void
    {
        Schema::table('employee_loan_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_collection_batch_id');
        });

        Schema::dropIfExists('loan_collection_items');
        Schema::dropIfExists('loan_collection_batches');

        DB::statement("ALTER TABLE employee_loan_transactions MODIFY transaction_type ENUM(
            'disbursement',
            'installment',
            'manual_payment',
            'legacy_payment',
            'adjustment',
            'reversal'
        ) NOT NULL");
    }
};
