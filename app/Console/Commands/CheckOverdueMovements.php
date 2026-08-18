<?php

namespace App\Console\Commands;

use App\Services\MovementPenaltySyncService;
use Illuminate\Console\Command;

class CheckOverdueMovements extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'movements:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check active movements that were not closed by midnight and assign daily penalty';

    /**
     * Execute the console command.
     */
    public function handle(MovementPenaltySyncService $syncService): int
    {
        $count = $syncService->sync();

        $this->info("Successfully processed {$count} overdue movements for fine calculation.");

        return Command::SUCCESS;
    }
}
