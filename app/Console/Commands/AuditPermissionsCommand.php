<?php

namespace App\Console\Commands;

use App\Support\PermissionRegistry;
use Illuminate\Console\Command;

class AuditPermissionsCommand extends Command
{
    protected $signature = 'permissions:audit';

    protected $description = 'Report route permission keys missing from config/permissions.php';

    public function handle(): int
    {
        $files = [
            base_path('routes/web.php'),
            base_path('routes/api.php'),
        ];

        $routePerms = [];
        foreach ($files as $file) {
            if (! is_file($file)) {
                continue;
            }
            $content = file_get_contents($file);
            if (! is_string($content)) {
                continue;
            }
            preg_match_all("/permission:([a-zA-Z0-9_.-]+)/", $content, $matches);
            foreach ($matches[1] as $key) {
                $routePerms[$key] = true;
            }
        }

        $configKeys = array_flip(PermissionRegistry::keys());
        $missing = array_diff(array_keys($routePerms), array_keys($configKeys));

        if ($missing === []) {
            $this->info('OK: All '.count($routePerms).' route permission key(s) exist in config/permissions.php.');

            return self::SUCCESS;
        }

        $this->error('Missing from config:');
        foreach ($missing as $key) {
            $this->line("  - {$key}");
        }

        return self::FAILURE;
    }
}
