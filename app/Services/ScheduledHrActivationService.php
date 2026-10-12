<?php

namespace App\Services;

class ScheduledHrActivationService
{
    public function __construct(
        private readonly TransferCompletionService $transferCompletionService,
        private readonly PromotionCompletionService $promotionCompletionService,
        private readonly DemotionCompletionService $demotionCompletionService,
        private readonly ConfirmationCompletionService $confirmationCompletionService,
        private readonly SeparationCompletionService $separationCompletionService,
        private readonly SalaryIncrementService $salaryIncrementService,
    ) {}

    /**
     * @return array{transfers: int, promotions: int, demotions: int, confirmations: int, separations: int, increments: int}
     */
    public function run(): array
    {
        return [
            'transfers' => $this->transferCompletionService->activateDueTransfers(),
            'promotions' => $this->promotionCompletionService->activateDuePromotions(),
            'demotions' => $this->demotionCompletionService->activateDueDemotions(),
            'confirmations' => $this->confirmationCompletionService->activateDueConfirmations(),
            'separations' => $this->separationCompletionService->activateDueSeparations(),
            'increments' => $this->salaryIncrementService->activateDue(),
        ];
    }
}
