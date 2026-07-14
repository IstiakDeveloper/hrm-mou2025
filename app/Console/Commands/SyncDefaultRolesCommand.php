<?php

namespace App\Console\Commands;

use App\Support\PermissionRegistry;
use Illuminate\Console\Command;

class SyncDefaultRolesCommand extends Command
{
    protected $signature = 'permissions:sync-default-roles';

    protected $description = 'Upsert default system roles and permissions from config/default_roles.php';

    public function handle(): int
    {
        $roles = PermissionRegistry::syncDefaultRoles();

        $this->info('Synced '.count($roles).' default role(s) from config/default_roles.php.');

        foreach ($roles as $name => $role) {
            $count = count(PermissionRegistry::permissionsFromStorage($role->permissions));
            $this->line("  • {$name}: {$count} permission(s)");
        }

        return self::SUCCESS;
    }
}
