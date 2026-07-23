<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            if (! Schema::hasColumn('payslips', 'employee_name')) {
                $table->string('employee_name', 200)->nullable()->after('employee_id');
            }
            if (! Schema::hasColumn('payslips', 'designation_id')) {
                $table->foreignId('designation_id')->nullable()->after('employee_name')
                    ->constrained('designations')->nullOnDelete();
            }
            if (! Schema::hasColumn('payslips', 'designation_name')) {
                $table->string('designation_name', 200)->nullable()->after('designation_id');
            }
            if (! Schema::hasColumn('payslips', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('designation_name')
                    ->constrained('branches')->nullOnDelete();
            }
            if (! Schema::hasColumn('payslips', 'branch_name')) {
                $table->string('branch_name', 200)->nullable()->after('branch_id');
            }
            if (! Schema::hasColumn('payslips', 'branch_code')) {
                $table->string('branch_code', 50)->nullable()->after('branch_name');
            }
        });

        // Best-effort backfill so existing payslips freeze master values as of migration time.
        if (Schema::hasColumn('payslips', 'employee_name')) {
            DB::statement('
                UPDATE payslips p
                INNER JOIN employees e ON e.id = p.employee_id
                INNER JOIN payroll_runs pr ON pr.id = p.payroll_run_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN branches b ON b.id = COALESCE(e.current_branch_id, pr.branch_id)
                SET
                    p.employee_name = COALESCE(p.employee_name, e.name_en),
                    p.designation_id = COALESCE(p.designation_id, e.designation_id),
                    p.designation_name = COALESCE(p.designation_name, d.name),
                    p.branch_id = COALESCE(p.branch_id, b.id),
                    p.branch_name = COALESCE(p.branch_name, b.name),
                    p.branch_code = COALESCE(p.branch_code, b.branch_code)
            ');
        }
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            if (Schema::hasColumn('payslips', 'branch_id')) {
                $table->dropConstrainedForeignId('branch_id');
            }
            if (Schema::hasColumn('payslips', 'designation_id')) {
                $table->dropConstrainedForeignId('designation_id');
            }
            foreach (['employee_name', 'designation_name', 'branch_name', 'branch_code'] as $column) {
                if (Schema::hasColumn('payslips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
