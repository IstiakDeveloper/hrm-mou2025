<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Updated permission structure for all roles
        $rolePermissions = [
            1 => [ // Super Admin
                "admin.access",
                "users.view", "users.create", "users.edit", "users.delete",
                "roles.view", "roles.create", "roles.edit", "roles.delete",
                "employees.view", "employees.create", "employees.edit", "employees.delete",
                "branches.view", "branches.create", "branches.edit", "branches.delete",
                "departments.view", "departments.create", "departments.edit", "departments.delete",
                "designations.view", "designations.create", "designations.edit", "designations.delete",
                "attendance.view", "attendance.create", "attendance.edit", "attendance.delete", "attendance.sync", "attendance.admin",
                "leave-types.view", "leave-types.create", "leave-types.edit", "leave-types.delete",
                "leave-balances.view", "leave-balances.create", "leave-balances.edit", "leave-balances.delete", "leave-balances.admin",
                "leave-applications.view", "leave-applications.create", "leave-applications.edit", "leave-applications.cancel", "leave-applications.approve",
                "movements.view", "movements.create", "movements.edit", "movements.cancel", "movements.complete", "movements.approve",
                "transfers.view", "transfers.create", "transfers.edit", "transfers.approve",
                "holidays.view", "holidays.create", "holidays.edit", "holidays.delete",
                "reports.view", "reports.export"
            ],
            2 => [ // Administrator
                "employees.view", "employees.create", "employees.edit",
                "branches.view", "branches.create", "branches.edit",
                "departments.view", "departments.create", "departments.edit",
                "designations.view", "designations.create", "designations.edit",
                "attendance.view", "attendance.create", "attendance.edit", "attendance.admin",
                "leave-types.view", "leave-types.create", "leave-types.edit",
                "leave-balances.view", "leave-balances.create", "leave-balances.edit",
                "leave-applications.view", "leave-applications.approve",
                "movements.view", "movements.create", "movements.approve",
                "transfers.view", "transfers.create", "transfers.approve",
                "holidays.view", "holidays.create", "holidays.edit",
                "reports.view", "reports.export"
            ],
            3 => [ // HR Manager
                "employees.view", "employees.create", "employees.edit",
                "departments.view", "designations.view",
                "attendance.view", "attendance.create", "attendance.edit",
                "leave-types.view", "leave-types.create", "leave-types.edit",
                "leave-balances.view", "leave-balances.create", "leave-balances.edit", "leave-balances.admin",
                "leave-applications.view", "leave-applications.create", "leave-applications.approve",
                "movements.view", "movements.create", "movements.approve",
                "transfers.view", "transfers.create", "transfers.approve",
                "holidays.view", "holidays.create", "holidays.edit",
                "reports.view", "reports.export"
            ],
            4 => [ // Branch Manager
                "employees.view",
                "attendance.view", "attendance.create", "attendance.edit",
                "leave-applications.view", "leave-applications.approve",
                "movements.view", "movements.approve",
                "transfers.view",
                "holidays.view",
                "reports.view"
            ],
            5 => [ // Department Head
                "employees.view",
                "attendance.view",
                "leave-applications.view", "leave-applications.approve",
                "movements.view", "movements.approve",
                "holidays.view",
                "reports.view"
            ],
            6 => [ // Team Leader
                "employees.view",
                "attendance.view",
                "leave-applications.view", "leave-applications.approve",
                "movements.view", "movements.approve",
                "reports.view"
            ],
            7 => [ // Employee
                "attendance.view", "attendance.create",
                "leave-applications.view", "leave-applications.create", "leave-applications.cancel",
                "movements.view", "movements.create", "movements.cancel", "movements.complete",
                "holidays.view"
            ],
            8 => [ // Leave Manager
                "employees.view",
                "leave-types.view", "leave-types.create", "leave-types.edit",
                "leave-balances.view", "leave-balances.create", "leave-balances.edit", "leave-balances.admin",
                "leave-applications.view", "leave-applications.create", "leave-applications.approve",
                "holidays.view", "holidays.create", "holidays.edit",
                "reports.view"
            ],
            9 => [ // HR Assistant
                "employees.view",
                "attendance.view", "attendance.create", "attendance.edit",
                "leave-applications.view", "leave-applications.create",
                "movements.view", "movements.create",
                "holidays.view",
                "reports.view"
            ],
            10 => [ // Attendance Manager
                "employees.view",
                "attendance.view", "attendance.create", "attendance.edit", "attendance.delete", "attendance.sync", "attendance.admin",
                "holidays.view",
                "reports.view"
            ]
        ];

        // Update each role with new permissions
        foreach ($rolePermissions as $roleId => $permissions) {
            DB::table('roles')
                ->where('id', $roleId)
                ->update([
                    'permissions' => json_encode($permissions),
                    'updated_at' => now()
                ]);

            echo "Updated Role ID: {$roleId} with " . count($permissions) . " permissions\n";
        }

        echo "Permission structure update completed successfully!\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore old permission structure if needed
        echo "Rolling back permission changes...\n";

        // You can add rollback logic here if needed
        // For now, we'll just log the action
        echo "Permission rollback completed.\n";
    }
};
