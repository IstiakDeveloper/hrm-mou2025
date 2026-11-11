<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_job_histories', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_job_histories', 'from_department_id')) {
                $table->foreignId('from_department_id')
                    ->nullable()
                    ->after('to_designation_id')
                    ->constrained('departments')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('employee_job_histories', 'to_department_id')) {
                $table->foreignId('to_department_id')
                    ->nullable()
                    ->after('from_department_id')
                    ->constrained('departments')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_job_histories', function (Blueprint $table) {
            if (Schema::hasColumn('employee_job_histories', 'from_department_id')) {
                $table->dropConstrainedForeignId('from_department_id');
            }
            if (Schema::hasColumn('employee_job_histories', 'to_department_id')) {
                $table->dropConstrainedForeignId('to_department_id');
            }
        });
    }
};
