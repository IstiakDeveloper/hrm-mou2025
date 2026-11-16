<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'employee_type_id')) {
                $table->foreignId('employee_type_id')->nullable()->constrained('employee_types')->nullOnDelete()->after('current_branch_id');
            }

            if (! Schema::hasColumn('employees', 'program_id')) {
                $table->foreignId('program_id')->nullable()->constrained('programs')->nullOnDelete()->after('employee_type_id');
            }

            if (! Schema::hasColumn('employees', 'project_id')) {
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete()->after('program_id');
            }

            if (! Schema::hasColumn('employees', 'religion')) {
                $table->string('religion', 50)->nullable()->after('gender');
            }

            if (! Schema::hasColumn('employees', 'marital_status')) {
                $table->string('marital_status', 30)->nullable()->after('religion');
            }

            if (! Schema::hasColumn('employees', 'birth_date_certificate')) {
                $table->date('birth_date_certificate')->nullable()->after('date_of_birth');
            }

            if (! Schema::hasColumn('employees', 'birth_date_original')) {
                $table->date('birth_date_original')->nullable()->after('birth_date_certificate');
            }

            if (! Schema::hasColumn('employees', 'mobile_personal')) {
                $table->string('mobile_personal', 20)->nullable()->after('phone');
            }

            if (! Schema::hasColumn('employees', 'mobile_official')) {
                $table->string('mobile_official', 20)->nullable()->after('mobile_personal');
            }

            if (! Schema::hasColumn('employees', 'tin_certificate_no')) {
                $table->string('tin_certificate_no', 50)->nullable()->after('birth_registration_number');
            }

            if (! Schema::hasColumn('employees', 'driving_license_no')) {
                $table->string('driving_license_no', 50)->nullable()->after('tin_certificate_no');
            }

            if (! Schema::hasColumn('employees', 'passport_no')) {
                $table->string('passport_no', 50)->nullable()->after('driving_license_no');
            }

            if (! Schema::hasColumn('employees', 'is_project_employee')) {
                $table->boolean('is_project_employee')->default(false)->after('passport_no');
            }

            if (! Schema::hasColumn('employees', 'is_custodian')) {
                $table->boolean('is_custodian')->default(false)->after('is_project_employee');
            }

            if (! Schema::hasColumn('employees', 'identification_mark')) {
                $table->string('identification_mark', 255)->nullable()->after('is_custodian');
            }

            if (! Schema::hasColumn('employees', 'signature')) {
                $table->string('signature')->nullable()->after('photo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            foreach ([
                'religion',
                'birth_date_certificate',
                'birth_date_original',
                'mobile_personal',
                'mobile_official',
                'tin_certificate_no',
                'driving_license_no',
                'passport_no',
                'is_project_employee',
                'is_custodian',
                'identification_mark',
                'signature',
            ] as $col) {
                if (Schema::hasColumn('employees', $col)) {
                    $table->dropColumn($col);
                }
            }

            foreach (['employee_type_id', 'program_id', 'project_id'] as $fkCol) {
                if (Schema::hasColumn('employees', $fkCol)) {
                    $table->dropConstrainedForeignId($fkCol);
                }
            }
        });
    }
};
