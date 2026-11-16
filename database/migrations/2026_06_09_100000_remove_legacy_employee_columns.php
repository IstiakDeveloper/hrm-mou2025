<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const EMPLOYED = "('active')";

    /** @var list<string> */
    private const LEGACY_COLUMNS = [
        'first_name',
        'last_name',
        'email_id',
        'phone',
        'birth_date_certificate',
        'birth_date_original',
        'nid',
        'birth_registration_number',
        'basic_salary',
        'bank_account_details',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        $this->backfillCanonicalData();
        $this->rebuildNidScopeIndexForNidNumber();
        $this->dropLegacyColumns();
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'first_name')) {
                $table->string('first_name')->nullable()->after('device_user_id');
            }
            if (! Schema::hasColumn('employees', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('employees', 'email_id')) {
                $table->string('email_id')->nullable()->after('email');
            }
            if (! Schema::hasColumn('employees', 'phone')) {
                $table->string('phone')->nullable()->after('email_id');
            }
            if (! Schema::hasColumn('employees', 'birth_date_certificate')) {
                $table->date('birth_date_certificate')->nullable()->after('date_of_birth');
            }
            if (! Schema::hasColumn('employees', 'birth_date_original')) {
                $table->date('birth_date_original')->nullable()->after('birth_date_certificate');
            }
            if (! Schema::hasColumn('employees', 'nid')) {
                $table->string('nid')->nullable()->after('signature');
            }
            if (! Schema::hasColumn('employees', 'birth_registration_number')) {
                $table->string('birth_registration_number', 50)->nullable()->after('smart_card_number');
            }
            if (! Schema::hasColumn('employees', 'basic_salary')) {
                $table->decimal('basic_salary', 15, 2)->default(0)->after('final_payment_date');
            }
            if (! Schema::hasColumn('employees', 'bank_account_details')) {
                $table->json('bank_account_details')->nullable()->after('salary_step_id');
            }
        });

        DB::statement("
            UPDATE employees
            SET first_name = name_en
            WHERE first_name IS NULL
              AND name_en IS NOT NULL
              AND TRIM(name_en) <> ''
        ");

        DB::statement("
            UPDATE employees
            SET phone = mobile_personal
            WHERE (phone IS NULL OR TRIM(phone) = '')
              AND mobile_personal IS NOT NULL
              AND TRIM(mobile_personal) <> ''
        ");

        DB::statement("
            UPDATE employees
            SET nid = nid_number
            WHERE (nid IS NULL OR TRIM(nid) = '')
              AND nid_number IS NOT NULL
              AND TRIM(nid_number) <> ''
        ");

        $this->rebuildNidScopeIndexForNid();
    }

    private function backfillCanonicalData(): void
    {
        if (Schema::hasColumn('employees', 'name_en') && Schema::hasColumn('employees', 'first_name')) {
            DB::statement("
                UPDATE employees
                SET name_en = TRIM(first_name)
                WHERE (name_en IS NULL OR TRIM(name_en) = '')
                  AND first_name IS NOT NULL
                  AND TRIM(first_name) <> ''
            ");
        }

        if (Schema::hasColumn('employees', 'mobile_personal') && Schema::hasColumn('employees', 'phone')) {
            DB::statement("
                UPDATE employees
                SET mobile_personal = TRIM(phone)
                WHERE (mobile_personal IS NULL OR TRIM(mobile_personal) = '')
                  AND phone IS NOT NULL
                  AND TRIM(phone) <> ''
            ");
        }

        if (Schema::hasColumn('employees', 'nid_number') && Schema::hasColumn('employees', 'nid')) {
            DB::statement("
                UPDATE employees
                SET nid_number = TRIM(nid)
                WHERE (nid_number IS NULL OR TRIM(nid_number) = '')
                  AND nid IS NOT NULL
                  AND TRIM(nid) <> ''
            ");
        }

        if (Schema::hasColumn('employees', 'email') && Schema::hasColumn('employees', 'email_id')) {
            DB::statement("
                UPDATE employees
                SET email = TRIM(email_id)
                WHERE (email IS NULL OR TRIM(email) = '')
                  AND email_id IS NOT NULL
                  AND TRIM(email_id) <> ''
            ");
        }

        if (Schema::hasColumn('employees', 'date_of_birth')) {
            if (Schema::hasColumn('employees', 'birth_date_original')) {
                DB::statement("
                    UPDATE employees
                    SET date_of_birth = birth_date_original
                    WHERE date_of_birth IS NULL
                      AND birth_date_original IS NOT NULL
                ");
            }

            if (Schema::hasColumn('employees', 'birth_date_certificate')) {
                DB::statement("
                    UPDATE employees
                    SET date_of_birth = birth_date_certificate
                    WHERE date_of_birth IS NULL
                      AND birth_date_certificate IS NOT NULL
                ");
            }
        }
    }

    private function rebuildNidScopeIndexForNidNumber(): void
    {
        if (! Schema::hasColumn('employees', 'nid_number')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS employees_nid_employed_unique');
            DB::statement("CREATE UNIQUE INDEX employees_nid_employed_unique ON employees (nid_number) WHERE status = 'active' AND nid_number IS NOT NULL AND nid_number != ''");

            return;
        }

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        try {
            DB::statement('DROP INDEX `employees_nid_employed_unique` ON `employees`');
        } catch (\Throwable) {
        }

        if (Schema::hasColumn('employees', 'uq_scope_nid')) {
            try {
                Schema::table('employees', function (Blueprint $table) {
                    $table->dropColumn('uq_scope_nid');
                });
            } catch (\Throwable) {
            }
        }

        $exprNid = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `nid_number` IS NOT NULL AND `nid_number` <> '' THEN `nid_number` END";

        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS ('.$exprNid.') VIRTUAL NULL');
        DB::statement('CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`)');
    }

    private function rebuildNidScopeIndexForNid(): void
    {
        if (! Schema::hasColumn('employees', 'nid')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS employees_nid_employed_unique');
            DB::statement("CREATE UNIQUE INDEX employees_nid_employed_unique ON employees (nid) WHERE status = 'active' AND nid IS NOT NULL AND nid != ''");

            return;
        }

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        try {
            DB::statement('DROP INDEX `employees_nid_employed_unique` ON `employees`');
        } catch (\Throwable) {
        }

        if (Schema::hasColumn('employees', 'uq_scope_nid')) {
            try {
                Schema::table('employees', function (Blueprint $table) {
                    $table->dropColumn('uq_scope_nid');
                });
            } catch (\Throwable) {
            }
        }

        $exprNid = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `nid` IS NOT NULL AND `nid` <> '' THEN `nid` END";

        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS ('.$exprNid.') VIRTUAL NULL');
        DB::statement('CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`)');
    }

    private function dropLegacyColumns(): void
    {
        $columns = array_values(array_filter(
            self::LEGACY_COLUMNS,
            fn (string $col) => Schema::hasColumn('employees', $col)
        ));

        if ($columns === []) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) use ($columns) {
            $table->dropColumn($columns);
        });
    }
};
