<?php

namespace App\Console\Commands;

use App\Services\TransferCompletionService;
use Illuminate\Console\Command;

class ActivateScheduledTransfers extends Command
{
    protected $signature = 'transfers:activate-scheduled';

    protected $description = 'Complete approved transfers whose effective date has arrived';

    public function handle(TransferCompletionService $transferCompletionService): int
    {
        $activated = $transferCompletionService->activateDueTransfers();

        $this->info("Activated {$activated} scheduled transfer(s).");

        return self::SUCCESS;
    }
}
