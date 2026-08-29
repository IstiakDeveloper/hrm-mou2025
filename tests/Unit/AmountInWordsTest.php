<?php

use App\Support\AmountInWords;

it('converts taka amounts to words', function () {
    expect(AmountInWords::taka(0))->toBe('Zero Taka Only')
        ->and(AmountInWords::taka(1))->toBe('One Taka Only')
        ->and(AmountInWords::taka(125))->toBe('One Hundred Twenty Five Taka Only')
        ->and(AmountInWords::taka(1234))->toBe('One Thousand Two Hundred Thirty Four Taka Only')
        ->and(AmountInWords::taka(100000))->toBe('One Lakh Taka Only')
        ->and(AmountInWords::taka(10000000))->toBe('One Crore Taka Only')
        ->and(AmountInWords::taka(-1829))->toBe('Minus One Thousand Eight Hundred Twenty Nine Taka Only');
});
