<?php

namespace App\Support;

final class HrDesignationBucket
{
    public const BUCKET_OFFICER = 'Officer';
    public const BUCKET_ACCOUNTANT = 'Accountant';
    public const BUCKET_BRANCH_MANAGER = 'Branch Manager';
    public const BUCKET_REGIONAL_MANAGER = 'Regional Manager';
    public const BUCKET_ZONAL_MANAGER = 'Zonal Manager';
    public const BUCKET_OTHER = 'Other';

    /**
     * The 5 standard field buckets plus Other.
     *
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::BUCKET_OFFICER,
            self::BUCKET_ACCOUNTANT,
            self::BUCKET_BRANCH_MANAGER,
            self::BUCKET_REGIONAL_MANAGER,
            self::BUCKET_ZONAL_MANAGER,
            self::BUCKET_OTHER,
        ];
    }

    /**
     * Resolve designation name into one of the 5 buckets or Other.
     */
    public static function resolve(?string $designationName): string
    {
        $normalized = self::normalize($designationName);
        if ($normalized === '') {
            return self::BUCKET_OTHER;
        }

        // 1. Zonal Manager
        if (
            (str_contains($normalized, 'zonal manager') || self::matchesAcronym($normalized, 'zm'))
            && ! str_contains($normalized, 'trainee')
        ) {
            return self::BUCKET_ZONAL_MANAGER;
        }

        // 2. Regional Manager
        if (
            (str_contains($normalized, 'regional manager') || self::matchesAcronym($normalized, 'rm'))
            && ! str_contains($normalized, 'trainee')
            && ! str_contains($normalized, 'zonal')
        ) {
            return self::BUCKET_REGIONAL_MANAGER;
        }

        // 3. Branch Manager
        if (
            (str_contains($normalized, 'branch manager') || self::matchesAcronym($normalized, 'bm'))
            && ! str_contains($normalized, 'assistant branch manager')
            && ! self::matchesAcronym($normalized, 'abm')
            && ! str_contains($normalized, 'probationary')
            && ! str_contains($normalized, 'trainee')
            && ! str_contains($normalized, 'zonal')
            && ! str_contains($normalized, 'regional')
        ) {
            return self::BUCKET_BRANCH_MANAGER;
        }

        // 4. Accountant (includes Accountant I/II/III, Jr/Branch Accountant, and Probationary Accountant; excludes Accounts Officer)
        if (
            str_contains($normalized, 'accountant')
            && ! str_contains($normalized, 'accounts officer')
        ) {
            return self::BUCKET_ACCOUNTANT;
        }

        // 5. Officer (includes Field Officer, Program Officer, Senior Officer, Assistant Branch Manager, Officer-N, and non-accountant probation/trainees)
        if (self::isOfficer($normalized)) {
            return self::BUCKET_OFFICER;
        }

        return self::BUCKET_OTHER;
    }

    private static function isOfficer(string $normalized): bool
    {
        if (str_contains($normalized, 'accountant')) {
            return false;
        }

        if (str_contains($normalized, 'assistant branch manager') || self::matchesAcronym($normalized, 'abm')) {
            return true;
        }

        if (str_contains($normalized, 'field officer') || str_contains($normalized, 'program officer')) {
            return true;
        }

        if (str_contains($normalized, 'senior officer')) {
            return true;
        }

        // Standalone Officer or Officer-N
        if (preg_match('/(^|\s)officer([ -]*\d+)?($|\s)/u', $normalized) === 1) {
            // Keep Accounts Officer out of Officer if specified, or if standalone officer
            if (! str_contains($normalized, 'accounts officer')) {
                return true;
            }
        }

        // Non-accountant probation or trainee staff in field
        if (str_contains($normalized, 'probationary') || str_contains($normalized, 'trainee')) {
            return true;
        }

        return false;
    }

    private static function normalize(?string $name): string
    {
        $name = mb_strtolower(trim((string) $name));
        $name = str_replace(['.', '(', ')', '-'], [' ', ' ', ' ', ' '], $name);
        $name = preg_replace('/\s*(অব্যাহতি|obbahoti|relieved)\s*/ui', ' ', $name) ?? $name;
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;

        return trim($name);
    }

    private static function matchesAcronym(string $normalized, string $acronym): bool
    {
        return preg_match('/(^|\s)'.preg_quote($acronym, '/').'([ -]*\d+)?($|\s)/u', $normalized) === 1;
    }
}
