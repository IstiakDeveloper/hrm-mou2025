<?php

namespace App\Console\Commands;

use App\Services\FinalPaymentSettlementService;
use Illuminate\Console\Command;

class BackfillSeparationFinalPayments extends Command
{
    protected $signature = 'hr:backfill-final-payments';

    protected $description = 'Create final payment records for completed separations that do not have one yet';

    public function handle(FinalPaymentSettlementService $service): int
    {
        $created = $service->backfillMissingRecords();

        $this->info("Created {$created} final payment record(s).");

        return self::SUCCESS;
    }
}
