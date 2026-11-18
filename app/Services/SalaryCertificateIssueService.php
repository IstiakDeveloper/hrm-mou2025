<?php

namespace App\Services;

use App\Models\SalaryCertificateIssue;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class SalaryCertificateIssueService
{
    public function nextReferenceNumber(int $year): string
    {
        $last = SalaryCertificateIssue::query()->where('reference_year', $year)->orderByDesc('reference_number')->first();
        $number = (int) ($last?->reference_number ?? 0) + 1;

        return str_pad((string) $number, strlen($last?->reference_label ?? ''), '0', STR_PAD_LEFT);
    }

    public function issue(array $payload, array $filters, bool $automatic, ?int $userId): SalaryCertificateIssue
    {
        $year = (int) $filters['certificate_reference_year'];
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $label = $automatic ? $this->nextReferenceNumber($year) : (string) $filters['certificate_reference_number'];
            if (! preg_match('/^\d{1,9}$/', $label) || (int) $label < 1) {
                throw ValidationException::withMessages(['certificate_reference_number' => 'Enter a reference number between 1 and 999999999.']);
            }
            $savedFilters = array_intersect_key($filters, array_flip([
                'year', 'month', 'employee_id', 'certificate_reference_year', 'certificate_reference_number',
                'certificate_issue_date', 'certificate_signatory_name', 'certificate_signatory_designation',
            ]));
            $savedFilters['certificate_reference_number'] = $label;
            $payload['reference'] = config('payroll_reports.reports.salary-certificate.reference_prefix', 'Mou/HRD/LoI').'/'.$year.'/'.$label;
            try {
                return SalaryCertificateIssue::create([
                    'reference_year' => $year, 'reference_number' => (int) $label, 'reference_label' => $label,
                    'employee_id' => $filters['employee_id'], 'filters' => $savedFilters, 'payload' => $payload,
                    'created_by' => $userId,
                ]);
            } catch (UniqueConstraintViolationException) {
                if (! $automatic) {
                    throw ValidationException::withMessages(['certificate_reference_number' => 'This reference number has already been used for this year. Enter another number.']);
                }
            }
        }

        throw ValidationException::withMessages(['certificate_reference_number' => 'Another certificate was generated at the same time. Please generate again.']);
    }
}
