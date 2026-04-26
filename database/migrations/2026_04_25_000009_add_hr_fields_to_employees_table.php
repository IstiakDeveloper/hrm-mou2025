<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'pin')) {
                $table->string('pin', 20)->nullable()->after('employee_id');
                $table->unique('pin');
            }

            if (! Schema::hasColumn('employees', 'name_en')) {
                $table->string('name_en')->nullable()->after('last_name');
            }

            if (! Schema::hasColumn('employees', 'name_bn')) {
                $table->string('name_bn')->nullable()->after('name_en');
            }

            if (! Schema::hasColumn('employees', 'confirmation_date')) {
                $table->date('confirmation_date')->nullable()->after('joining_date');
            }

            if (! Schema::hasColumn('employees', 'joining_designation_id')) {
                $table->foreignId('joining_designation_id')
                    ->nullable()
                    ->constrained('designations')
                    ->nullOnDelete()
                    ->after('designation_id');
            }

            if (! Schema::hasColumn('employees', 'last_designation_id')) {
                $table->foreignId('last_designation_id')
                    ->nullable()
                    ->constrained('designations')
                    ->nullOnDelete()
                    ->after('joining_designation_id');
            }

            if (! Schema::hasColumn('employees', 'last_promotion_date')) {
                $table->date('last_promotion_date')->nullable()->after('confirmation_date');
            }

            if (! Schema::hasColumn('employees', 'probation_period_days')) {
                $table->unsignedSmallInteger('probation_period_days')->nullable()->after('last_promotion_date');
            }

            if (! Schema::hasColumn('employees', 'resignation_date')) {
                $table->date('resignation_date')->nullable()->after('status');
            }

            if (! Schema::hasColumn('employees', 'dropout_date')) {
                $table->date('dropout_date')->nullable()->after('resignation_date');
            }

            if (! Schema::hasColumn('employees', 'dropout_reason')) {
                $table->text('dropout_reason')->nullable()->after('dropout_date');
            }

            if (! Schema::hasColumn('employees', 'final_payment_date')) {
                $table->date('final_payment_date')->nullable()->after('dropout_reason');
            }

            if (! Schema::hasColumn('employees', 'last_branch_id')) {
                $table->foreignId('last_branch_id')
                    ->nullable()
                    ->constrained('branches')
                    ->nullOnDelete()
                    ->after('current_branch_id');
            }

            if (! Schema::hasColumn('employees', 'fathers_name')) {
                $table->string('fathers_name')->nullable()->after('emergency_contact');
            }
            if (! Schema::hasColumn('employees', 'fathers_mobile')) {
                $table->string('fathers_mobile', 20)->nullable()->after('fathers_name');
            }
            if (! Schema::hasColumn('employees', 'mothers_name')) {
                $table->string('mothers_name')->nullable()->after('fathers_mobile');
            }
            if (! Schema::hasColumn('employees', 'mothers_mobile')) {
                $table->string('mothers_mobile', 20)->nullable()->after('mothers_name');
            }

            if (! Schema::hasColumn('employees', 'marital_status')) {
                $table->string('marital_status', 30)->nullable()->after('mothers_mobile');
            }
            if (! Schema::hasColumn('employees', 'spouse_name')) {
                $table->string('spouse_name')->nullable()->after('marital_status');
            }
            if (! Schema::hasColumn('employees', 'spouse_mobile')) {
                $table->string('spouse_mobile', 20)->nullable()->after('spouse_name');
            }

            if (! Schema::hasColumn('employees', 'nid_number')) {
                $table->string('nid_number', 50)->nullable()->after('nid');
            }
            if (! Schema::hasColumn('employees', 'smart_card_number')) {
                $table->string('smart_card_number', 50)->nullable()->after('nid_number');
            }
            if (! Schema::hasColumn('employees', 'birth_registration_number')) {
                $table->string('birth_registration_number', 50)->nullable()->after('smart_card_number');
            }

            if (! Schema::hasColumn('employees', 'email_id')) {
                $table->string('email_id')->nullable()->after('email');
            }

            if (! Schema::hasColumn('employees', 'village')) {
                $table->string('village')->nullable()->after('address');
            }
            if (! Schema::hasColumn('employees', 'post_office')) {
                $table->string('post_office')->nullable()->after('village');
            }
            if (! Schema::hasColumn('employees', 'union_pouroshova')) {
                $table->string('union_pouroshova')->nullable()->after('post_office');
            }
            if (! Schema::hasColumn('employees', 'ward_no')) {
                $table->string('ward_no', 20)->nullable()->after('union_pouroshova');
            }
            if (! Schema::hasColumn('employees', 'upazila')) {
                $table->string('upazila')->nullable()->after('ward_no');
            }
            if (! Schema::hasColumn('employees', 'district')) {
                $table->string('district')->nullable()->after('upazila');
            }

            if (! Schema::hasColumn('employees', 'educational_qualification')) {
                $table->text('educational_qualification')->nullable()->after('district');
            }
        });

        // Backfill new fields from old ones (safe, idempotent)
        DB::statement("UPDATE employees SET pin = employee_id WHERE pin IS NULL");
        DB::statement("UPDATE employees SET name_en = TRIM(CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,''))) WHERE name_en IS NULL");
        DB::statement("UPDATE employees SET joining_designation_id = designation_id WHERE joining_designation_id IS NULL");
        DB::statement("UPDATE employees SET last_designation_id = designation_id WHERE last_designation_id IS NULL");
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'pin')) {
                $table->dropUnique(['pin']);
                $table->dropColumn('pin');
            }
            foreach ([
                'name_en',
                'name_bn',
                'confirmation_date',
                'last_promotion_date',
                'probation_period_days',
                'resignation_date',
                'dropout_date',
                'dropout_reason',
                'final_payment_date',
                'fathers_name',
                'fathers_mobile',
                'mothers_name',
                'mothers_mobile',
                'marital_status',
                'spouse_name',
                'spouse_mobile',
                'nid_number',
                'smart_card_number',
                'birth_registration_number',
                'email_id',
                'village',
                'post_office',
                'union_pouroshova',
                'ward_no',
                'upazila',
                'district',
                'educational_qualification',
            ] as $col) {
                if (Schema::hasColumn('employees', $col)) {
                    $table->dropColumn($col);
                }
            }

            foreach (['joining_designation_id', 'last_designation_id', 'last_branch_id'] as $fkCol) {
                if (Schema::hasColumn('employees', $fkCol)) {
                    $table->dropConstrainedForeignId($fkCol);
                }
            }
        });
    }
};

