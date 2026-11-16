<?php

namespace App\Console\Commands;

use App\Services\FinalPaymentSettlementService;
use Illuminate\Console\Command;

class ApplyFinalPaymentSettlements extends Command
{
    protected $signature = 'hr:apply-final-payment-settlements';

    protected $description = 'Apply PF, gratuity, and loan settlements for paid final payments missing settlement records';

    public function handle(FinalPaymentSettlementService $service): int
    {
        $applied = $service->applyMissingSettlements();

        $this->info("Applied settlements for {$applied} final payment record(s).");

        return self::SUCCESS;
    }
}
