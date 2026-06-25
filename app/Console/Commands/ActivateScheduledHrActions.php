<?php

namespace App\Console\Commands;

use App\Services\ScheduledHrActivationService;
use Illuminate\Console\Command;

class ActivateScheduledHrActions extends Command
{
    protected $signature = 'hr:activate-scheduled';

    protected $description = 'Complete approved transfers, promotions, demotions, confirmations, and separations whose effective date has started (Bangladesh time)';

    public function handle(ScheduledHrActivationService $scheduledHrActivationService): int
    {
        $counts = $scheduledHrActivationService->run();

        $this->info(
            "Activated {$counts['transfers']} transfer(s), {$counts['promotions']} promotion(s), "
            ."{$counts['demotions']} demotion(s), {$counts['confirmations']} confirmation(s), "
            ."{$counts['separations']} separation(s)."
        );

        return self::SUCCESS;
    }
}
