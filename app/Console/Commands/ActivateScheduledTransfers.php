<?php

namespace App\Console\Commands;

use App\Services\TransferCompletionService;
use Illuminate\Console\Command;

class ActivateScheduledTransfers extends Command
{
    protected $signature = 'transfers:activate-scheduled';

    protected $description = 'Complete approved transfers whose effective date has arrived (use hr:activate-scheduled for all HR actions)';

    public function handle(TransferCompletionService $transferCompletionService): int
    {
        $activated = $transferCompletionService->activateDueTransfers();

        $this->info("Activated {$activated} scheduled transfer(s).");
        $this->warn('Prefer running hr:activate-scheduled to process transfers, promotions, confirmations, and separations together.');

        return self::SUCCESS;
    }
}
