<?php

use App\Services\SecurityFundInterestCalculator;

function securityPrincipal(string $date, string $amount, bool $debit = false): array
{
    return ['transaction_date' => $date, $debit ? 'principal_debit' : 'principal_credit' => $amount];
}

test('one-year eligibility uses the deposit anniversary and only full months earn interest', function (string $cutoff, string $expected) {
    $result = app(SecurityFundInterestCalculator::class)->calculate([securityPrincipal('2026-05-20', '20000')], $cutoff);
    expect($result['interest'])->toBe($expected)->and($result['principal'])->toBe('20000.00');
})->with([
    ['2026-06-30', '0.00'], ['2026-07-01', '0.00'], ['2026-12-31', '0.00'],
    ['2027-05-19', '0.00'], ['2027-05-20', '1000.00'], ['2027-05-31', '1100.00'],
    ['2027-06-30', '1200.00'], ['2028-06-30', '2400.00'],
]);

test('December 30 departure excludes December but December 31 includes it', function (string $date, string $expected, string $through) {
    $result = app(SecurityFundInterestCalculator::class)->calculate([securityPrincipal('2025-05-20', '20000')], $date);
    expect($result['interest'])->toBe($expected)->and($result['interest_as_of'])->toBe($through);
})->with([
    ['2026-12-30', '500.00', '2026-11-30'], ['2026-12-31', '600.00', '2026-12-31'],
    ['2027-02-27', '700.00', '2027-01-31'], ['2027-02-28', '800.00', '2027-02-28'],
]);

test('the day before the first anniversary is ineligible even at a financial year end', function () {
    $calculator = app(SecurityFundInterestCalculator::class);
    $transactions = [securityPrincipal('2026-07-01', '20000')];
    expect($calculator->calculate($transactions, '2027-06-30')['interest'])->toBe('0.00');
    expect($calculator->calculate($transactions, '2027-07-01')['interest'])->toBe('1200.00');
});

test('partial deposit months are excluded and top ups mature independently', function () {
    $calculator = app(SecurityFundInterestCalculator::class);
    expect($calculator->calculate([securityPrincipal('2026-07-15', '20000')], '2027-07-15')['interest'])->toBe('1100.00');
    expect($calculator->calculate([securityPrincipal('2026-07-15', '20000')], '2027-07-31')['interest'])->toBe('1200.00');
    $rows = [securityPrincipal('2026-05-20', '20000'), securityPrincipal('2027-01-01', '10000')];
    $result = $calculator->calculate($rows, '2027-06-30');
    expect($result['interest'])->toBe('1200.00')->and($result['pending_principal'])->toBe('10000.00')
        ->and($result['next_eligibility_date'])->toBe('2028-01-01');
    expect($calculator->calculate($rows, '2028-01-01')['interest'])->toBe('2400.00');
});

test('returned portions held under a year forfeit interest but remaining principal can mature', function () {
    $result = app(SecurityFundInterestCalculator::class)->calculate([
        securityPrincipal('2026-05-20', '20000'), securityPrincipal('2027-01-01', '10000', true),
    ], '2027-06-30');
    expect($result['principal'])->toBe('10000.00')->and($result['interest'])->toBe('600.00');
});

test('matured refunds consume oldest deposits first and stop at the last full month', function () {
    $calculator = app(SecurityFundInterestCalculator::class);
    $rows = [securityPrincipal('2025-05-20', '20000'), securityPrincipal('2027-01-01', '10000', true)];
    expect($calculator->calculate($rows, '2027-06-30')['interest'])->toBe('900.00');
    $rows = [securityPrincipal('2025-05-20', '20000'), securityPrincipal('2026-11-01', '10000'), securityPrincipal('2026-12-30', '20000', true)];
    $result = $calculator->calculate($rows, '2027-06-30');
    expect($result['principal'])->toBe('10000.00')->and($result['interest'])->toBe('500.00');
});

test('interest postings and refunded interest never become interest bearing principal', function () {
    $result = app(SecurityFundInterestCalculator::class)->calculate([
        securityPrincipal('2025-05-20', '20000'),
        ['transaction_date' => '2026-12-31', 'interest_credit' => '600', 'accrual_amount' => '600'],
        ['transaction_date' => '2027-01-01', 'interest_debit' => '200'],
    ], '2027-06-30');
    expect($result['posted_interest'])->toBe('400.00')->and($result['unposted_interest'])->toBe('600.00')
        ->and($result['interest'])->toBe('1000.00')->and($result['total'])->toBe('21000.00');
});

test('whole taka rounding happens once across deposits and posting periods', function () {
    $calculator = app(SecurityFundInterestCalculator::class);
    expect($calculator->calculate([securityPrincipal('2025-05-20', '12345.67')], '2026-07-31')['interest'])->toBe('62.00');
    expect($calculator->calculate([securityPrincipal('2025-05-20', '100'), securityPrincipal('2025-06-20', '100')], '2026-07-31')['interest'])->toBe('1.00');
    $rows = [securityPrincipal('2025-05-20', '100'), ['transaction_date' => '2026-07-31', 'interest_credit' => '1', 'accrual_amount' => '1']];
    expect($calculator->calculate($rows, '2026-08-31')['unposted_interest'])->toBe('0.00');
    expect($calculator->calculate($rows, '2026-09-30')['unposted_interest'])->toBe('1.00');
});

test('late payment cannot make a deposit mature after an early departure', function () {
    $rows = [securityPrincipal('2026-05-20', '20000'), securityPrincipal('2027-05-25', '20000', true)];
    $result = app(SecurityFundInterestCalculator::class)->calculate($rows, '2027-05-25', '2027-05-19');
    expect($result['interest'])->toBe('0.00')->and($result['principal'])->toBe('0.00');
});

test('future deposits are excluded and exact anniversary eligibility is separate from month cutoff', function () {
    $result = app(SecurityFundInterestCalculator::class)->calculate([
        securityPrincipal('2026-05-20', '20000'), securityPrincipal('2027-06-01', '50000'),
    ], '2027-05-20');
    expect($result['interest'])->toBe('1000.00')->and($result['interest_as_of'])->toBe('2027-04-30')
        ->and($result['eligibility_as_of'])->toBe('2027-05-20')->and($result['principal'])->toBe('20000.00');
});

test('leap years use calendar anniversaries and the same monthly rate', function () {
    $calculator = app(SecurityFundInterestCalculator::class);
    $rows = [securityPrincipal('2028-02-29', '20000')];
    expect($calculator->calculate($rows, '2029-02-27')['interest'])->toBe('0.00');
    expect($calculator->calculate($rows, '2029-02-28')['interest'])->toBe('1200.00');
    expect($calculator->calculate([securityPrincipal('2027-07-01', '20000')], '2028-07-01')['interest'])->toBe('1200.00');
});

test('reversing a deposit does not reset the maturity date of other deposits', function () {
    $result = app(SecurityFundInterestCalculator::class)->calculate([
        ['id' => 1] + securityPrincipal('2025-05-20', '20000'),
        ['id' => 2] + securityPrincipal('2026-11-01', '10000'),
        ['id' => 3, 'reversal_of_id' => 2] + securityPrincipal('2026-11-01', '10000', true),
    ], '2026-12-30');
    expect($result['principal'])->toBe('20000.00')->and($result['interest'])->toBe('500.00');
});

test('negative or overposted history requires reconciliation', function () {
    app(SecurityFundInterestCalculator::class)->calculate([
        securityPrincipal('2026-07-01', '100'), securityPrincipal('2026-07-02', '200', true),
    ], '2026-07-10');
})->throws(InvalidArgumentException::class);

test('fractional posted interest from a different policy is not silently rounded or overwritten', function () {
    app(SecurityFundInterestCalculator::class)->calculate([
        securityPrincipal('2025-07-01', '20000'),
        ['transaction_date' => '2026-12-31', 'interest_credit' => '604.93', 'accrual_amount' => '604.93'],
    ], '2026-12-31');
})->throws(InvalidArgumentException::class);
