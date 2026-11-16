<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 191)->nullable()->unique()->after('name');
        });

        $rows = DB::table('users')->select('id', 'email', 'employee_id')->orderBy('id')->get();

        foreach ($rows as $row) {
            $base = $this->baseUsernameForUserRow($row);
            $username = $base;
            $n = 0;
            while (DB::table('users')->where('username', $username)->where('id', '!=', $row->id)->exists()) {
                $n++;
                $suffix = '_'.$n;
                $maxBase = 191 - strlen($suffix);
                $username = Str::limit($base, $maxBase, '').$suffix;
            }
            DB::table('users')->where('id', $row->id)->update(['username' => $username]);
        }

        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $connection = Schema::getConnection();
            $prefix = $connection->getTablePrefix();
            $connection->statement("ALTER TABLE `{$prefix}users` MODIFY `username` VARCHAR(191) NOT NULL");
        }
    }

    /**
     * Prefer linked employee's employee_id (then biometric_id); else email local-part (same rules as app).
     */
    private function baseUsernameForUserRow(object $row): string
    {
        if (! empty($row->employee_id)) {
            $select = ['id', 'employee_id'];
            if (Schema::hasColumn('employees', 'biometric_id')) {
                $select[] = 'biometric_id';
            }
            $emp = DB::table('employees')->where('id', $row->employee_id)->select($select)->first();
            if ($emp) {
                $primary = $emp->employee_id;
                if ($primary !== null && trim((string) $primary) !== '') {
                    return Str::limit(trim((string) $primary), 191, '');
                }
                if (Schema::hasColumn('employees', 'biometric_id')) {
                    $bio = $emp->biometric_id ?? null;
                    if ($bio !== null && trim((string) $bio) !== '') {
                        return Str::limit(trim((string) $bio), 191, '');
                    }
                }

                return 'emp_'.$emp->id;
            }
        }

        $local = Str::lower(Str::before($row->email, '@'));
        $local = preg_replace('/[^a-z0-9_]/', '_', (string) $local) ?? '';
        $local = preg_replace('/_+/', '_', $local);
        $local = trim($local, '_') ?: 'user';

        return Str::limit($local, 191, '');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
