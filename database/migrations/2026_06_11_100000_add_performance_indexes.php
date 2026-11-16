<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->index('status', 'employees_status_index');
            $table->index(['status', 'current_branch_id'], 'employees_status_branch_index');
            $table->index('department_id', 'employees_department_id_index');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['date', 'status'], 'attendances_date_status_index');
        });

        Schema::table('leave_applications', function (Blueprint $table) {
            $table->index('status', 'leave_applications_status_index');
            $table->index(['employee_id', 'status'], 'leave_applications_employee_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_status_index');
            $table->dropIndex('employees_status_branch_index');
            $table->dropIndex('employees_department_id_index');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('attendances_date_status_index');
        });

        Schema::table('leave_applications', function (Blueprint $table) {
            $table->dropIndex('leave_applications_status_index');
            $table->dropIndex('leave_applications_employee_status_index');
        });
    }
};
