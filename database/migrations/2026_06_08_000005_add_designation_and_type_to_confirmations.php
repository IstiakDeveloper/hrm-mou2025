<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('confirmations', function (Blueprint $table) {
            $table->foreignId('from_designation_id')->nullable()->after('employee_id')->constrained('designations')->nullOnDelete();
            $table->foreignId('to_designation_id')->nullable()->after('from_designation_id')->constrained('designations')->restrictOnDelete();
            $table->foreignId('from_employee_type_id')->nullable()->after('to_designation_id')->constrained('employee_types')->nullOnDelete();
            $table->foreignId('to_employee_type_id')->nullable()->after('from_employee_type_id')->constrained('employee_types')->nullOnDelete();
        });

        Schema::table('confirmation_histories', function (Blueprint $table) {
            $table->foreignId('from_designation_id')->nullable()->after('employee_id')->constrained('designations')->nullOnDelete();
            $table->foreignId('to_designation_id')->nullable()->after('from_designation_id')->constrained('designations')->nullOnDelete();
            $table->foreignId('from_employee_type_id')->nullable()->after('to_designation_id')->constrained('employee_types')->nullOnDelete();
            $table->foreignId('to_employee_type_id')->nullable()->after('from_employee_type_id')->constrained('employee_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('confirmation_histories', function (Blueprint $table) {
            foreach (['from_designation_id', 'to_designation_id', 'from_employee_type_id', 'to_employee_type_id'] as $col) {
                if (Schema::hasColumn('confirmation_histories', $col)) {
                    $table->dropConstrainedForeignId($col);
                }
            }
        });

        Schema::table('confirmations', function (Blueprint $table) {
            foreach (['from_designation_id', 'to_designation_id', 'from_employee_type_id', 'to_employee_type_id'] as $col) {
                if (Schema::hasColumn('confirmations', $col)) {
                    $table->dropConstrainedForeignId($col);
                }
            }
        });
    }
};
