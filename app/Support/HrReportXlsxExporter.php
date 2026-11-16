<?php

namespace App\Support;

use Illuminate\Http\Response;
use Shuchkin\SimpleXLSXGen;

class HrReportXlsxExporter
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    public static function download(string $filename, string $template, array $payload, array $meta): Response
    {
        $xlsx = self::buildWorkbook($template, $payload, $meta);

        $path = tempnam(sys_get_temp_dir(), 'hr-xlsx-');
        if ($path === false) {
            abort(500, 'Could not create export file.');
        }

        $xlsx->saveAs($path);
        $content = file_get_contents($path);
        @unlink($path);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    protected static function buildWorkbook(string $template, array $payload, array $meta): SimpleXLSXGen
    {
        $rows = [];

        // 1. Company Header
        $rows[] = ['<b><center>'.($meta['companyName'] ?? 'MOUSUMI').'</center></b>'];
        if (! empty($meta['companyAddress'])) {
            $rows[] = ['<center>'.$meta['companyAddress'].'</center>'];
        }
        $rows[] = ['<b><center>'.($meta['title'] ?? 'HR Report').'</center></b>'];
        if (! empty($meta['periodLabel'])) {
            $rows[] = ['<center>'.$meta['periodLabel'].'</center>'];
        }
        $rows[] = []; // blank line

        match ($template) {
            'designation-matrix' => self::appendDesignationMatrix($rows, $payload),
            'staff-list' => self::appendStaffList($rows, $payload),
            'staff-list-grouped' => self::appendStaffListGrouped($rows, $payload),
            'staff-pksf' => self::appendStaffPksf($rows, $payload),
            'field-summary' => self::appendFieldSummary($rows, $payload),
            'zone-region-summary' => self::appendZoneRegionSummary($rows, $payload),
            'zone-summary' => self::appendZoneSummary($rows, $payload),
            'location-ratio' => self::appendLocationRatio($rows, $payload),
            'ho-grade-summary' => self::appendHoGradeSummary($rows, $payload),
            'recruitment-separation-payment' => self::appendRecruitmentSeparationPayment($rows, $payload),
            'eligibility-list' => self::appendEligibilityList($rows, $payload),
            default => self::appendGenericRows($rows, $payload),
        };

        return SimpleXLSXGen::fromArray($rows);
    }

    protected static function appendDesignationMatrix(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>Designation</b>',
            '<b>Active Male</b>',
            '<b>Active Female</b>',
            '<b>Active Total</b>',
            '<b>Inactive Male</b>',
            '<b>Inactive Female</b>',
            '<b>Inactive Total</b>',
            '<b>Grand Total</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['designation'],
                $r['active_male'],
                $r['active_female'],
                $r['active_total'],
                $r['inactive_male'],
                $r['inactive_female'],
                $r['inactive_total'],
                $r['grand_total'],
            ];
        }

        $tot = $payload['totals'] ?? [];
        $rows[] = [
            '<b>Grand Total</b>',
            '<b>'.($tot['active_male'] ?? 0).'</b>',
            '<b>'.($tot['active_female'] ?? 0).'</b>',
            '<b>'.($tot['active_total'] ?? 0).'</b>',
            '<b>'.($tot['inactive_male'] ?? 0).'</b>',
            '<b>'.($tot['inactive_female'] ?? 0).'</b>',
            '<b>'.($tot['inactive_total'] ?? 0).'</b>',
            '<b>'.($tot['grand_total'] ?? 0).'</b>',
        ];
    }

    protected static function appendStaffList(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>SL</b>',
            '<b>Present/Joining Branch</b>',
            '<b>PIN</b>',
            '<b>Name (English)</b>',
            '<b>Present/Last Designation</b>',
            '<b>Joining Date</b>',
            '<b>Joining Date at Present Location</b>',
            '<b>Duration at Present Location</b>',
            '<b>Staff Mobile Number</b>',
            '<b>Address Combined</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['branch'],
                $r['pin'],
                $r['name'],
                $r['designation'],
                $r['joining_date'],
                $r['present_location_joining_date'],
                $r['duration_at_present_location'],
                $r['mobile'],
                $r['address_combined'],
            ];
        }

        $rows[] = ['<b>Total Staff: '.count($payload['rows'] ?? []).'</b>'];
    }

    protected static function appendStaffListGrouped(array &$rows, array $payload): void
    {
        $headers = [
            '<b>SL</b>',
            '<b>Present/Joining Branch</b>',
            '<b>PIN</b>',
            '<b>Name (English)</b>',
            '<b>Present/Last Designation</b>',
            '<b>Joining Date</b>',
            '<b>Joining Date at Present Location</b>',
            '<b>Duration at Present Location</b>',
            '<b>Staff Mobile Number</b>',
            '<b>Address Combined</b>',
        ];

        foreach ($payload['sections'] ?? [] as $sec) {
            $rows[] = ['<b>Branch: '.$sec['branch_name'].' (Total: '.$sec['staff_count'].')</b>'];
            $rows[] = $headers;

            foreach ($sec['rows'] ?? [] as $r) {
                $rows[] = [
                    $r['sl'],
                    $r['branch'],
                    $r['pin'],
                    $r['name'],
                    $r['designation'],
                    $r['joining_date'],
                    $r['present_location_joining_date'],
                    $r['duration_at_present_location'],
                    $r['mobile'],
                    $r['address_combined'],
                ];
            }
            $rows[] = [];
        }

        $rows[] = ['<b>Grand Total: '.($payload['grand_total'] ?? 0).'</b>'];
    }

    protected static function appendStaffPksf(array &$rows, array $payload): void
    {
        if (! empty($payload['print_date'])) {
            $rows[] = ['Print Date: '.$payload['print_date']];
        }

        $headers = [
            '<b>SL</b>',
            '<b>Branch</b>',
            '<b>PIN</b>',
            '<b>Name (English)</b>',
            '<b>Father\'s Name</b>',
            '<b>Present/Last Designation</b>',
            '<b>Joining Date</b>',
            '<b>Joining Date at Present Location</b>',
            '<b>Staff Mobile Number</b>',
            '<b>Staff NID/Smart Card Number</b>',
            '<b>Date of Birth</b>',
            '<b>Permanent Address</b>',
        ];

        foreach ($payload['sections'] ?? [] as $sec) {
            $rows[] = ['<b>Branch: '.$sec['branch_name'].' (Total: '.$sec['staff_count'].')</b>'];
            $rows[] = $headers;

            foreach ($sec['rows'] ?? [] as $r) {
                $rows[] = [
                    $r['sl'],
                    $r['branch'],
                    $r['pin'],
                    $r['name'],
                    $r['father_name'] ?? '',
                    $r['designation'],
                    $r['joining_date'],
                    $r['present_location_joining_date'],
                    $r['mobile'],
                    $r['nid_smart_card'] ?? '',
                    $r['date_of_birth'] ?? '',
                    $r['permanent_address'] ?? '',
                ];
            }
            $rows[] = [];
        }

        $rows[] = ['<b>Grand Total: '.($payload['grand_total'] ?? 0).'</b>'];
    }

    protected static function appendFieldSummary(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>SL</b>',
            '<b>Zone</b>',
            '<b>Region</b>',
            '<b>Branch</b>',
            '<b>Officer (M)</b>', '<b>Officer (F)</b>', '<b>Officer (T)</b>',
            '<b>Accountant (M)</b>', '<b>Accountant (F)</b>', '<b>Accountant (T)</b>',
            '<b>BM (M)</b>', '<b>BM (F)</b>', '<b>BM (T)</b>',
            '<b>RM (M)</b>', '<b>RM (F)</b>', '<b>RM (T)</b>',
            '<b>ZM (M)</b>', '<b>ZM (F)</b>', '<b>ZM (T)</b>',
            '<b>Other (M)</b>', '<b>Other (F)</b>', '<b>Other (T)</b>',
            '<b>Total (M)</b>', '<b>Total (F)</b>', '<b>Total Staff</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['zone'],
                $r['region'],
                $r['branch'],
                $r['officer_male'], $r['officer_female'], $r['officer_total'],
                $r['accountant_male'], $r['accountant_female'], $r['accountant_total'],
                $r['bm_male'], $r['bm_female'], $r['bm_total'],
                $r['rm_male'], $r['rm_female'], $r['rm_total'],
                $r['zm_male'], $r['zm_female'], $r['zm_total'],
                $r['other_male'], $r['other_female'], $r['other_total'],
                $r['total_male'], $r['total_female'], $r['row_total'],
            ];
        }

        $tot = $payload['totals'] ?? [];
        $rows[] = [
            '<b>Grand Total</b>', '', '', '',
            '<b>'.($tot['officer_male'] ?? 0).'</b>', '<b>'.($tot['officer_female'] ?? 0).'</b>', '<b>'.($tot['officer_total'] ?? 0).'</b>',
            '<b>'.($tot['accountant_male'] ?? 0).'</b>', '<b>'.($tot['accountant_female'] ?? 0).'</b>', '<b>'.($tot['accountant_total'] ?? 0).'</b>',
            '<b>'.($tot['bm_male'] ?? 0).'</b>', '<b>'.($tot['bm_female'] ?? 0).'</b>', '<b>'.($tot['bm_total'] ?? 0).'</b>',
            '<b>'.($tot['rm_male'] ?? 0).'</b>', '<b>'.($tot['rm_female'] ?? 0).'</b>', '<b>'.($tot['rm_total'] ?? 0).'</b>',
            '<b>'.($tot['zm_male'] ?? 0).'</b>', '<b>'.($tot['zm_female'] ?? 0).'</b>', '<b>'.($tot['zm_total'] ?? 0).'</b>',
            '<b>'.($tot['other_male'] ?? 0).'</b>', '<b>'.($tot['other_female'] ?? 0).'</b>', '<b>'.($tot['other_total'] ?? 0).'</b>',
            '<b>'.($tot['total_male'] ?? 0).'</b>', '<b>'.($tot['total_female'] ?? 0).'</b>', '<b>'.($tot['row_total'] ?? 0).'</b>',
        ];

        if (! empty($payload['head_office_summary'])) {
            $ho = $payload['head_office_summary'];
            $rows[] = [];
            $rows[] = ['<b>Head Office Staff Summary</b>'];
            $rows[] = [
                '<b>SL</b>',
                '<b>Salary Grade</b>',
                '<b>Present / Last Designation</b>',
                '<b>Male</b>',
                '<b>Female</b>',
                '<b>Total</b>',
            ];
            foreach ($ho['rows'] ?? [] as $hr) {
                $rows[] = [
                    $hr['sl'],
                    $hr['salary_grade'],
                    $hr['designation'],
                    $hr['male'],
                    $hr['female'],
                    $hr['total'],
                ];
            }
            $hot = $ho['totals'] ?? [];
            $rows[] = [
                '<b>Head Office Total</b>', '', '',
                '<b>'.($hot['male'] ?? 0).'</b>',
                '<b>'.($hot['female'] ?? 0).'</b>',
                '<b>'.($hot['total'] ?? 0).'</b>',
            ];
            $rows[] = [
                '<b>Combined Grand Total (Field + Head Office)</b>', '', '',
                '<b>'.(($tot['total_male'] ?? 0) + ($hot['male'] ?? 0)).'</b>',
                '<b>'.(($tot['total_female'] ?? 0) + ($hot['female'] ?? 0)).'</b>',
                '<b>'.(($tot['row_total'] ?? 0) + ($hot['total'] ?? 0)).'</b>',
            ];
        }
    }

    protected static function appendZoneRegionSummary(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>SL</b>',
            '<b>Zone</b>',
            '<b>Region</b>',
            '<b>Officer (M)</b>', '<b>Officer (F)</b>', '<b>Officer (T)</b>',
            '<b>Accountant (M)</b>', '<b>Accountant (F)</b>', '<b>Accountant (T)</b>',
            '<b>BM (M)</b>', '<b>BM (F)</b>', '<b>BM (T)</b>',
            '<b>RM (M)</b>', '<b>RM (F)</b>', '<b>RM (T)</b>',
            '<b>ZM (M)</b>', '<b>ZM (F)</b>', '<b>ZM (T)</b>',
            '<b>Other (M)</b>', '<b>Other (F)</b>', '<b>Other (T)</b>',
            '<b>Total (M)</b>', '<b>Total (F)</b>', '<b>Total Staff</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['zone'],
                $r['region'],
                $r['officer_male'], $r['officer_female'], $r['officer_total'],
                $r['accountant_male'], $r['accountant_female'], $r['accountant_total'],
                $r['bm_male'], $r['bm_female'], $r['bm_total'],
                $r['rm_male'], $r['rm_female'], $r['rm_total'],
                $r['zm_male'], $r['zm_female'], $r['zm_total'],
                $r['other_male'], $r['other_female'], $r['other_total'],
                $r['total_male'], $r['total_female'], $r['row_total'],
            ];
        }

        $tot = $payload['totals'] ?? [];
        $rows[] = [
            '<b>Grand Total</b>', '', '',
            '<b>'.($tot['officer_male'] ?? 0).'</b>', '<b>'.($tot['officer_female'] ?? 0).'</b>', '<b>'.($tot['officer_total'] ?? 0).'</b>',
            '<b>'.($tot['accountant_male'] ?? 0).'</b>', '<b>'.($tot['accountant_female'] ?? 0).'</b>', '<b>'.($tot['accountant_total'] ?? 0).'</b>',
            '<b>'.($tot['bm_male'] ?? 0).'</b>', '<b>'.($tot['bm_female'] ?? 0).'</b>', '<b>'.($tot['bm_total'] ?? 0).'</b>',
            '<b>'.($tot['rm_male'] ?? 0).'</b>', '<b>'.($tot['rm_female'] ?? 0).'</b>', '<b>'.($tot['rm_total'] ?? 0).'</b>',
            '<b>'.($tot['zm_male'] ?? 0).'</b>', '<b>'.($tot['zm_female'] ?? 0).'</b>', '<b>'.($tot['zm_total'] ?? 0).'</b>',
            '<b>'.($tot['other_male'] ?? 0).'</b>', '<b>'.($tot['other_female'] ?? 0).'</b>', '<b>'.($tot['other_total'] ?? 0).'</b>',
            '<b>'.($tot['total_male'] ?? 0).'</b>', '<b>'.($tot['total_female'] ?? 0).'</b>', '<b>'.($tot['row_total'] ?? 0).'</b>',
        ];
    }

    protected static function appendZoneSummary(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>SL</b>',
            '<b>Zone</b>',
            '<b>Officer (M)</b>', '<b>Officer (F)</b>', '<b>Officer (T)</b>',
            '<b>Accountant (M)</b>', '<b>Accountant (F)</b>', '<b>Accountant (T)</b>',
            '<b>BM (M)</b>', '<b>BM (F)</b>', '<b>BM (T)</b>',
            '<b>RM (M)</b>', '<b>RM (F)</b>', '<b>RM (T)</b>',
            '<b>ZM (M)</b>', '<b>ZM (F)</b>', '<b>ZM (T)</b>',
            '<b>Other (M)</b>', '<b>Other (F)</b>', '<b>Other (T)</b>',
            '<b>Total (M)</b>', '<b>Total (F)</b>', '<b>Total Staff</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['zone'],
                $r['officer_male'], $r['officer_female'], $r['officer_total'],
                $r['accountant_male'], $r['accountant_female'], $r['accountant_total'],
                $r['bm_male'], $r['bm_female'], $r['bm_total'],
                $r['rm_male'], $r['rm_female'], $r['rm_total'],
                $r['zm_male'], $r['zm_female'], $r['zm_total'],
                $r['other_male'], $r['other_female'], $r['other_total'],
                $r['total_male'], $r['total_female'], $r['row_total'],
            ];
        }

        $tot = $payload['totals'] ?? [];
        $rows[] = [
            '<b>Grand Total</b>', '',
            '<b>'.($tot['officer_male'] ?? 0).'</b>', '<b>'.($tot['officer_female'] ?? 0).'</b>', '<b>'.($tot['officer_total'] ?? 0).'</b>',
            '<b>'.($tot['accountant_male'] ?? 0).'</b>', '<b>'.($tot['accountant_female'] ?? 0).'</b>', '<b>'.($tot['accountant_total'] ?? 0).'</b>',
            '<b>'.($tot['bm_male'] ?? 0).'</b>', '<b>'.($tot['bm_female'] ?? 0).'</b>', '<b>'.($tot['bm_total'] ?? 0).'</b>',
            '<b>'.($tot['rm_male'] ?? 0).'</b>', '<b>'.($tot['rm_female'] ?? 0).'</b>', '<b>'.($tot['rm_total'] ?? 0).'</b>',
            '<b>'.($tot['zm_male'] ?? 0).'</b>', '<b>'.($tot['zm_female'] ?? 0).'</b>', '<b>'.($tot['zm_total'] ?? 0).'</b>',
            '<b>'.($tot['other_male'] ?? 0).'</b>', '<b>'.($tot['other_female'] ?? 0).'</b>', '<b>'.($tot['other_total'] ?? 0).'</b>',
            '<b>'.($tot['total_male'] ?? 0).'</b>', '<b>'.($tot['total_female'] ?? 0).'</b>', '<b>'.($tot['row_total'] ?? 0).'</b>',
        ];
    }

    protected static function appendLocationRatio(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>Location & Ratio</b>',
            '<b>Male</b>',
            '<b>Female</b>',
            '<b>Total</b>',
            '<b>Ratio (Male : Female)</b>',
            '<b>Male %</b>',
            '<b>Female %</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $isGrand = ($r['location'] === 'Grand Total');
            $rows[] = [
                $isGrand ? '<b>'.$r['location'].'</b>' : $r['location'],
                $isGrand ? '<b>'.$r['male'].'</b>' : $r['male'],
                $isGrand ? '<b>'.$r['female'].'</b>' : $r['female'],
                $isGrand ? '<b>'.$r['total'].'</b>' : $r['total'],
                $r['ratio'],
                $r['male_percentage'],
                $r['female_percentage'],
            ];
        }
    }

    protected static function appendHoGradeSummary(array &$rows, array $payload): void
    {
        $rows[] = [
            '<b>SL</b>',
            '<b>Salary Grade</b>',
            '<b>Present / Last Designation</b>',
            '<b>Male</b>',
            '<b>Female</b>',
            '<b>Total</b>',
        ];

        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['salary_grade'],
                $r['designation'],
                $r['male'],
                $r['female'],
                $r['total'],
            ];
        }

        $tot = $payload['totals'] ?? [];
        $rows[] = [
            '<b>Grand Total</b>', '', '',
            '<b>'.($tot['male'] ?? 0).'</b>',
            '<b>'.($tot['female'] ?? 0).'</b>',
            '<b>'.($tot['total'] ?? 0).'</b>',
        ];
    }

    protected static function appendRecruitmentSeparationPayment(array &$rows, array $payload): void
    {
        foreach ($payload['sections'] ?? [] as $secKey => $sec) {
            $rows[] = ['<b>'.$sec['title'].'</b>'];
            $desigs = $sec['designations'] ?? [];

            $header = array_merge(['<b>Month</b>'], array_map(fn ($d) => '<b>'.$d.'</b>', $desigs), ['<b>Total</b>']);
            $rows[] = $header;

            foreach ($sec['rows'] ?? [] as $r) {
                $isSub = ! empty($r['is_subtotal']);
                $line = [$isSub ? '<b>'.$r['label'].'</b>' : $r['label']];
                foreach ($desigs as $d) {
                    $c = $r['counts'][$d] ?? 0;
                    $line[] = $isSub ? '<b>'.$c.'</b>' : ($c ?: '');
                }
                $line[] = $isSub ? '<b>'.$r['total'].'</b>' : $r['total'];
                $rows[] = $line;
            }

            $tot = $sec['totals'] ?? [];
            $totalLine = ['<b>Grand Total</b>'];
            foreach ($desigs as $d) {
                $totalLine[] = '<b>'.($tot['counts'][$d] ?? 0).'</b>';
            }
            $totalLine[] = '<b>'.($tot['total'] ?? 0).'</b>';
            $rows[] = $totalLine;
            $rows[] = [];
        }
    }

    protected static function appendEligibilityList(array &$rows, array $payload): void
    {
        if (! empty($payload['eligibility_banner'])) {
            $rows[] = ['<b>'.$payload['eligibility_banner'].'</b>'];
        }
        if (! empty($payload['generated_date'])) {
            $rows[] = ['Generated on: '.$payload['generated_date']];
        }

        $type = $payload['eligibility_type'] ?? 'probation_increase';

        $headers = match ($type) {
            'promotion' => [
                '<b>SL</b>', '<b>Branch</b>', '<b>PIN</b>', '<b>Name (English)</b>', '<b>Designation</b>',
                '<b>Joining Date</b>', '<b>Confirmation Date</b>', '<b>Service Length</b>',
                '<b>Last Promotion/Grade Change</b>', '<b>Upcoming Promotion Date</b>', '<b>Upcoming Promotion Month</b>',
                '<b>Present Grade</b>', '<b>Step</b>', '<b>Basic Salary</b>', '<b>Gross Salary</b>',
            ],
            'confirmation' => [
                '<b>SL</b>', '<b>Branch</b>', '<b>PIN</b>', '<b>Name (English)</b>', '<b>Designation</b>',
                '<b>Joining Date</b>', '<b>Service Length</b>',
                '<b>Upcoming Confirmation Date</b>', '<b>Upcoming Month</b>',
                '<b>Present Grade</b>', '<b>Step</b>', '<b>Basic Salary</b>', '<b>Gross Salary</b>',
            ],
            default => [
                '<b>SL</b>', '<b>Branch</b>', '<b>PIN</b>', '<b>Name (English)</b>', '<b>Designation</b>',
                '<b>Joining Date</b>', '<b>Service Length</b>',
                '<b>Upcoming Salary Increase Date</b>', '<b>Upcoming Month</b>',
                '<b>Present Grade</b>', '<b>Step</b>', '<b>Basic Salary</b>', '<b>Gross Salary</b>',
            ],
        };

        foreach ($payload['sections'] ?? [] as $sec) {
            $rows[] = ['<b>Branch: '.$sec['branch_name'].' (Staff: '.$sec['staff_count'].')</b>'];
            $rows[] = $headers;

            foreach ($sec['rows'] ?? [] as $r) {
                if ($type === 'promotion') {
                    $rows[] = [
                        $r['sl'],
                        $r['branch'],
                        $r['pin'],
                        $r['name'],
                        $r['designation'],
                        $r['joining_date'],
                        $r['confirmation_date'] ?? '',
                        $r['service_length'],
                        $r['last_promo_date'] ?? '',
                        $r['upcoming_date'] ?? '',
                        $r['upcoming_month'] ?? '',
                        $r['salary_grade'] ?? '',
                        $r['salary_step'] ?? '',
                        $r['basic_salary'] ?? '',
                        $r['gross_salary'] ?? '',
                    ];
                } else {
                    $rows[] = [
                        $r['sl'],
                        $r['branch'],
                        $r['pin'],
                        $r['name'],
                        $r['designation'],
                        $r['joining_date'],
                        $r['service_length'],
                        $r['upcoming_date'] ?? '',
                        $r['upcoming_month'] ?? '',
                        $r['salary_grade'] ?? '',
                        $r['salary_step'] ?? '',
                        $r['basic_salary'] ?? '',
                        $r['gross_salary'] ?? '',
                    ];
                }
            }
            $rows[] = [];
        }

        $rows[] = ['<b>Grand Total: '.($payload['grand_total'] ?? 0).'</b>'];
    }

    protected static function appendGenericRows(array &$rows, array $payload): void
    {
        $rows[] = ['Report completed. No custom format for this payload.'];
    }
}
