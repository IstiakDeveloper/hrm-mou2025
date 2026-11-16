<?php

use App\Support\HrDesignationBucket;
use App\Support\HrReportGrade;
use App\Support\ServiceDuration;

it('formats service duration correctly including same-day and multi-year spans', function () {
    // Same day tenure
    expect(ServiceDuration::format('2026-11-15', '2026-11-15'))->toBe('0Y, 0M, 0D');

    // Multi-year tenure
    expect(ServiceDuration::format('2016-11-15', '2027-06-13'))->toBe('10Y, 6M, 29D')
        ->and(ServiceDuration::format('2016-11-15', '2027-06-14'))->toBe('10Y, 6M, 30D');

    // Null start date
    expect(ServiceDuration::format(null, '2026-11-15'))->toBeNull()
        ->and(ServiceDuration::format(null, '2026-11-15', true))->toBe('');

    // Benchmark formatting
    expect(ServiceDuration::formatBenchmark(0, 3, 0))->toBe('0Y, 3M, 00D')
        ->and(ServiceDuration::formatBenchmark(0, 6, 0))->toBe('0Y, 6M, 00D');
});

it('resolves field designation buckets correctly', function () {
    expect(HrDesignationBucket::resolve('Field Officer'))->toBe(HrDesignationBucket::BUCKET_OFFICER)
        ->and(HrDesignationBucket::resolve('ABM'))->toBe(HrDesignationBucket::BUCKET_OFFICER)
        ->and(HrDesignationBucket::resolve('Assistant Branch Manager'))->toBe(HrDesignationBucket::BUCKET_OFFICER)
        ->and(HrDesignationBucket::resolve('Program Officer'))->toBe(HrDesignationBucket::BUCKET_OFFICER)
        ->and(HrDesignationBucket::resolve('Senior Officer'))->toBe(HrDesignationBucket::BUCKET_OFFICER)
        ->and(HrDesignationBucket::resolve('Accountant-II'))->toBe(HrDesignationBucket::BUCKET_ACCOUNTANT)
        ->and(HrDesignationBucket::resolve('Probationary Accountant'))->toBe(HrDesignationBucket::BUCKET_ACCOUNTANT)
        ->and(HrDesignationBucket::resolve('BM-1'))->toBe(HrDesignationBucket::BUCKET_BRANCH_MANAGER)
        ->and(HrDesignationBucket::resolve('Branch Manager'))->toBe(HrDesignationBucket::BUCKET_BRANCH_MANAGER)
        ->and(HrDesignationBucket::resolve('RM'))->toBe(HrDesignationBucket::BUCKET_REGIONAL_MANAGER)
        ->and(HrDesignationBucket::resolve('Regional Manager'))->toBe(HrDesignationBucket::BUCKET_REGIONAL_MANAGER)
        ->and(HrDesignationBucket::resolve('ZM'))->toBe(HrDesignationBucket::BUCKET_ZONAL_MANAGER)
        ->and(HrDesignationBucket::resolve('Zonal Manager'))->toBe(HrDesignationBucket::BUCKET_ZONAL_MANAGER)
        ->and(HrDesignationBucket::resolve('Driver'))->toBe(HrDesignationBucket::BUCKET_OTHER)
        ->and(HrDesignationBucket::resolve('Cook'))->toBe(HrDesignationBucket::BUCKET_OTHER)
        ->and(HrDesignationBucket::resolve('Accounts Officer'))->toBe(HrDesignationBucket::BUCKET_OTHER);
});

it('parses and checks salary grades I to XIV correctly', function () {
    // Roman numerals
    expect(HrReportGrade::isGradeOneToFourteen('I'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen('XIV'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen('iv'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen('grade_i'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen('Grade vii'))->toBeTrue();

    // Digits
    expect(HrReportGrade::isGradeOneToFourteen('14'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen('1'))->toBeTrue()
        ->and(HrReportGrade::isGradeOneToFourteen(10))->toBeTrue();

    // Out of range (Grade XV / 15) or invalid
    expect(HrReportGrade::isGradeOneToFourteen('XV'))->toBeFalse()
        ->and(HrReportGrade::isGradeOneToFourteen('15'))->toBeFalse()
        ->and(HrReportGrade::isGradeOneToFourteen(16))->toBeFalse()
        ->and(HrReportGrade::isGradeOneToFourteen(null))->toBeFalse()
        ->and(HrReportGrade::isGradeOneToFourteen(''))->toBeFalse();
});
