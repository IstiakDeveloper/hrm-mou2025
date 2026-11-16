<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->json('blocked_sections')->nullable()->after('permissions');
        });

        $allSections = [
            'human-resources',
            'attendance-movement',
            'leave',
            'employee-loan',
            'staff-fund',
            'payroll',
            'fixed-asset',
            'inventory',
            'store',
            'recruitment',
            'training',
            'administration',
        ];

        $accountantAllowed = [
            'employee-loan',
            'staff-fund',
            'fixed-asset',
            'inventory',
        ];

        $defaultBlockedByRole = [
            'Super Admin' => [],
            'Accountant' => array_values(array_diff($allSections, $accountantAllowed)),
            'Department Head' => ['employee-loan', 'staff-fund', 'payroll'],
        ];

        foreach ($defaultBlockedByRole as $roleName => $blockedSections) {
            DB::table('roles')
                ->where('name', $roleName)
                ->update([
                    'blocked_sections' => json_encode($blockedSections),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('blocked_sections');
        });
    }
};
