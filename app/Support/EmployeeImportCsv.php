<?php

namespace App\Support;

/**
 * Employee bulk-import column definitions and row mapping.
 * Columns align with the employee create/edit form (General + Bank + address).
 */
final class EmployeeImportCsv
{
    /**
     * @return list<array{key: string, label: string, label_bn: string, group: string, required: bool, width: int, hint: string}>
     */
    public static function columns(): array
    {
        return [
            ['key' => 'sl', 'label' => 'SL', 'label_bn' => 'ক্রমিক', 'group' => 'meta', 'required' => false, 'width' => 6, 'hint' => 'Optional row number'],
            ['key' => 'pin', 'label' => 'Employee PIN', 'label_bn' => 'পিন নং', 'group' => 'required', 'required' => true, 'width' => 14, 'hint' => 'Unique employee ID e.g. 01101'],
            ['key' => 'name_en', 'label' => 'Name (English)', 'label_bn' => 'নাম (ইংরেজি)', 'group' => 'required', 'required' => true, 'width' => 22, 'hint' => 'Full name in English'],
            ['key' => 'employee_type', 'label' => 'Employment Type', 'label_bn' => 'চাকরির ধরন', 'group' => 'required', 'required' => true, 'width' => 18, 'hint' => 'Name or ID — see Reference sheet'],
            ['key' => 'mobile_personal', 'label' => 'Mobile (Personal)', 'label_bn' => 'মোবাইল (ব্যক্তিগত)', 'group' => 'required', 'required' => true, 'width' => 16, 'hint' => '11-digit mobile number'],
            ['key' => 'joining_date', 'label' => 'Joining Date', 'label_bn' => 'যোগদানের তারিখ', 'group' => 'required', 'required' => true, 'width' => 14, 'hint' => 'dd/mm/yyyy'],
            ['key' => 'department', 'label' => 'Department', 'label_bn' => 'বিভাগ', 'group' => 'required', 'required' => true, 'width' => 18, 'hint' => 'Department name or ID'],
            ['key' => 'joining_designation', 'label' => 'Opening Designation', 'label_bn' => 'যোগদানকালীন পদবী', 'group' => 'required', 'required' => true, 'width' => 20, 'hint' => 'Designation name or ID'],
            ['key' => 'branch', 'label' => 'Branch', 'label_bn' => 'শাখা', 'group' => 'required', 'required' => true, 'width' => 18, 'hint' => 'Branch name or ID'],
            ['key' => 'status', 'label' => 'Status', 'label_bn' => 'স্ট্যাটাস', 'group' => 'required', 'required' => true, 'width' => 12, 'hint' => 'active / inactive'],
            ['key' => 'name_bn', 'label' => 'Name (Bengali)', 'label_bn' => 'নাম (বাংলা)', 'group' => 'identity', 'required' => false, 'width' => 20, 'hint' => ''],
            ['key' => 'email', 'label' => 'Email', 'label_bn' => 'ইমেইল', 'group' => 'identity', 'required' => false, 'width' => 26, 'hint' => 'Optional — auto-generated if empty'],
            ['key' => 'mobile_official', 'label' => 'Mobile (Official)', 'label_bn' => 'মোবাইল (অফিস)', 'group' => 'identity', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'gender', 'label' => 'Gender', 'label_bn' => 'লিঙ্গ', 'group' => 'personal', 'required' => false, 'width' => 12, 'hint' => 'male / female / other'],
            ['key' => 'religion', 'label' => 'Religion', 'label_bn' => 'ধর্ম', 'group' => 'personal', 'required' => false, 'width' => 14, 'hint' => ''],
            ['key' => 'blood_group', 'label' => 'Blood Group', 'label_bn' => 'রক্তের গ্রুপ', 'group' => 'personal', 'required' => false, 'width' => 12, 'hint' => 'A+, B+, O+ etc.'],
            ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'label_bn' => 'জন্ম তারিখ', 'group' => 'personal', 'required' => false, 'width' => 14, 'hint' => 'yyyy-mm-dd'],
            ['key' => 'marital_status', 'label' => 'Marital Status', 'label_bn' => 'বৈবাহিক অবস্থা', 'group' => 'personal', 'required' => false, 'width' => 14, 'hint' => 'Single, Married, etc.'],
            ['key' => 'spouse_name', 'label' => 'Spouse Name', 'label_bn' => 'স্বামী/স্ত্রীর নাম', 'group' => 'personal', 'required' => false, 'width' => 18, 'hint' => ''],
            ['key' => 'spouse_mobile', 'label' => 'Spouse Mobile', 'label_bn' => 'স্বামী/স্ত্রীর মোবাইল', 'group' => 'personal', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'fathers_name', 'label' => "Father's Name", 'label_bn' => 'পিতার নাম', 'group' => 'family', 'required' => false, 'width' => 18, 'hint' => ''],
            ['key' => 'fathers_mobile', 'label' => "Father's Mobile", 'label_bn' => 'পিতার মোবাইল', 'group' => 'family', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'mothers_name', 'label' => "Mother's Name", 'label_bn' => 'মাতার নাম', 'group' => 'family', 'required' => false, 'width' => 18, 'hint' => ''],
            ['key' => 'mothers_mobile', 'label' => "Mother's Mobile", 'label_bn' => 'মাতার মোবাইল', 'group' => 'family', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'nid_number', 'label' => 'NID Number', 'label_bn' => 'এনআইডি', 'group' => 'ids', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'smart_card_number', 'label' => 'Smart Card No.', 'label_bn' => 'স্মার্ট কার্ড', 'group' => 'ids', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'tin_certificate_no', 'label' => 'TIN', 'label_bn' => 'টিন', 'group' => 'ids', 'required' => false, 'width' => 14, 'hint' => ''],
            ['key' => 'driving_license_no', 'label' => 'Driving License', 'label_bn' => 'ড্রাইভিং লাইসেন্স', 'group' => 'ids', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'passport_no', 'label' => 'Passport No.', 'label_bn' => 'পাসপোর্ট', 'group' => 'ids', 'required' => false, 'width' => 14, 'hint' => ''],
            ['key' => 'identification_mark', 'label' => 'Identification Mark', 'label_bn' => 'সনাক্ত চিহ্ন', 'group' => 'ids', 'required' => false, 'width' => 18, 'hint' => ''],
            ['key' => 'confirmation_date', 'label' => 'Confirmation Date', 'label_bn' => 'নিশ্চিতকরণ তারিখ', 'group' => 'employment', 'required' => false, 'width' => 16, 'hint' => 'yyyy-mm-dd'],
            ['key' => 'last_designation', 'label' => 'Last Designation', 'label_bn' => 'বর্তমান পদবী', 'group' => 'employment', 'required' => false, 'width' => 18, 'hint' => 'Defaults to opening designation'],
            ['key' => 'last_branch', 'label' => 'Last Branch', 'label_bn' => 'বর্তমান শাখা', 'group' => 'employment', 'required' => false, 'width' => 16, 'hint' => 'Defaults to branch'],
            ['key' => 'bank_name', 'label' => 'Bank Name', 'label_bn' => 'ব্যাংকের নাম', 'group' => 'bank', 'required' => false, 'width' => 20, 'hint' => ''],
            ['key' => 'bank_branch_name', 'label' => 'Bank Branch Name', 'label_bn' => 'ব্যাংক শাখার নাম', 'group' => 'bank', 'required' => false, 'width' => 18, 'hint' => 'Text — not org branch'],
            ['key' => 'bank_account_no', 'label' => 'Bank Account No.', 'label_bn' => 'হিসাব নং', 'group' => 'bank', 'required' => false, 'width' => 18, 'hint' => ''],
            ['key' => 'bank_account_type', 'label' => 'Account Type', 'label_bn' => 'হিসাবের ধরন', 'group' => 'bank', 'required' => false, 'width' => 14, 'hint' => 'savings / current'],
            ['key' => 'present_division', 'label' => 'Present Division', 'label_bn' => 'বর্তমান বিভাগ', 'group' => 'present', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'present_district', 'label' => 'Present District', 'label_bn' => 'বর্তমান জেলা', 'group' => 'present', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'present_upazila', 'label' => 'Present Upazila', 'label_bn' => 'বর্তমান উপজেলা', 'group' => 'present', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'present_union', 'label' => 'Present Union', 'label_bn' => 'বর্তমান ইউনিয়ন', 'group' => 'present', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'present_village', 'label' => 'Present Village', 'label_bn' => 'বর্তমান গ্রাম', 'group' => 'present', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'permanent_division', 'label' => 'Permanent Division', 'label_bn' => 'স্থায়ী বিভাগ', 'group' => 'permanent', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'permanent_district', 'label' => 'Permanent District', 'label_bn' => 'স্থায়ী জেলা', 'group' => 'permanent', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'permanent_upazila', 'label' => 'Permanent Upazila', 'label_bn' => 'স্থায়ী উপজেলা', 'group' => 'permanent', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'permanent_union', 'label' => 'Permanent Union', 'label_bn' => 'স্থায়ী ইউনিয়ন', 'group' => 'permanent', 'required' => false, 'width' => 16, 'hint' => ''],
            ['key' => 'permanent_village', 'label' => 'Permanent Village', 'label_bn' => 'স্থায়ী গ্রাম', 'group' => 'permanent', 'required' => false, 'width' => 16, 'hint' => ''],
        ];
    }

    /** @return list<string> */
    public static function headers(): array
    {
        return array_map(fn (array $col) => $col['key'], self::columns());
    }

    /** @return array<string, string> group => title */
    public static function groupTitles(): array
    {
        return [
            'meta' => 'Row #',
            'required' => 'Required — must fill',
            'identity' => 'Identity & Contact',
            'personal' => 'Personal',
            'family' => 'Family',
            'ids' => 'ID Documents',
            'employment' => 'Employment (extra)',
            'bank' => 'Bank Account',
            'present' => 'Present Address',
            'permanent' => 'Permanent Address',
        ];
    }

    /** @return array<string, string> group => hex fill color */
    public static function groupColors(): array
    {
        return [
            'meta' => 'BFBFBF',
            'required' => '1F4E79',
            'identity' => '2E75B6',
            'personal' => '4472C4',
            'family' => '5B9BD5',
            'ids' => '70AD47',
            'employment' => 'FFC000',
            'bank' => 'ED7D31',
            'present' => 'A9D18E',
            'permanent' => '548235',
        ];
    }

    public static function resolveHeaderKey(string $raw): string
    {
        $normalized = strtolower(trim($raw));
        $normalized = preg_replace('/\*+$/', '', $normalized) ?? $normalized;
        $normalized = trim($normalized);
        $normalized = preg_replace('/\s+/', '_', $normalized);
        $normalized = preg_replace('/[^a-z0-9_\x{0980}-\x{09FF}]/u', '', $normalized) ?? $normalized;

        if ($normalized === '') {
            return '';
        }

        foreach (self::columns() as $col) {
            if ($normalized === $col['key']) {
                return $col['key'];
            }

            $fromLabel = strtolower(str_replace([' ', "'", '(', ')', '.', '-'], ['_', '', '', '', '', '_'], $col['label']));
            $fromLabel = preg_replace('/[^a-z0-9_]/', '', $fromLabel) ?? $fromLabel;
            if ($normalized === $fromLabel || str_starts_with($fromLabel, $normalized)) {
                return $col['key'];
            }

            $fromBn = preg_replace('/\s+/', '_', mb_strtolower($col['label_bn']));
            $fromBn = preg_replace('/[^a-z0-9_\x{0980}-\x{09FF}]/u', '', $fromBn) ?? $fromBn;
            if ($fromBn !== '' && $normalized === $fromBn) {
                return $col['key'];
            }
        }

        $legacy = [
            'employee_id' => 'pin',
            'emp_id' => 'pin',
            'name' => 'name_en',
            'full_name' => 'name_en',
            'employee_name' => 'name_en',
            'bengali_name' => 'name_bn',
            'employee_type_id' => 'employee_type',
            'employment_type' => 'employee_type',
            'mail' => 'email',
            'mobile' => 'mobile_personal',
            'phone' => 'mobile_personal',
            'personal_mobile' => 'mobile_personal',
            'official_mobile' => 'mobile_official',
            'dob' => 'date_of_birth',
            'father_name' => 'fathers_name',
            'father_mobile' => 'fathers_mobile',
            'mother_name' => 'mothers_name',
            'mother_mobile' => 'mothers_mobile',
            'nid' => 'nid_number',
            'national_id' => 'nid_number',
            'smart_card' => 'smart_card_number',
            'tin' => 'tin_certificate_no',
            'driving_license' => 'driving_license_no',
            'passport' => 'passport_no',
            'join_date' => 'joining_date',
            'date_of_joining' => 'joining_date',
            'doj' => 'joining_date',
            'department_id' => 'department',
            'dept_id' => 'department',
            'joining_designation_id' => 'joining_designation',
            'opening_designation' => 'joining_designation',
            'last_designation_id' => 'last_designation',
            'designation_id' => 'last_designation',
            'desig_id' => 'last_designation',
            'designation' => 'last_designation',
            'current_branch_id' => 'branch',
            'branch_id' => 'branch',
            'current_branch' => 'branch',
            'last_branch_id' => 'last_branch',
            'previous_branch' => 'last_branch',
            'bank' => 'bank_name',
            'bank_branch' => 'bank_branch_name',
            'branch_name' => 'bank_branch_name',
            'account_no' => 'bank_account_no',
            'bank_account' => 'bank_account_no',
            'account_type' => 'bank_account_type',
            'division' => 'present_division',
            'upazila' => 'present_upazila',
            'thana' => 'present_upazila',
            'union' => 'present_union',
            'village' => 'present_village',
            'ক্রমিক' => 'sl',
            'ক্রমিক_no' => 'sl',
            'ক্রমিকনং' => 'sl',
        ];

        return $legacy[$normalized] ?? $normalized;
    }

    /**
     * @param  array<string, mixed>  $rowAssoc  normalized header => value
     * @return array<string, mixed>
     */
    public static function mapAssocToPreviewRow(int $sourceRow, array $rowAssoc): array
    {
        unset(
            $rowAssoc['sl'],
            $rowAssoc['serial'],
            $rowAssoc['ক্রমিক'],
            $rowAssoc['ক্রমিক_no'],
            $rowAssoc['ক্রমিকনং']
        );

        $get = fn (array $keys): string => self::firstNonEmpty($rowAssoc, $keys) ?? '';

        return [
            'source_row' => $sourceRow,
            'pin' => $get(['pin', 'employee_id', 'emp_id']),
            'name_en' => $get(['name_en', 'name', 'full_name', 'employee_name']),
            'name_bn' => $get(['name_bn', 'bengali_name']),
            'employee_type' => $get(['employee_type', 'employee_type_id', 'employment_type']),
            'email' => $get(['email', 'mail']),
            'mobile_personal' => $get(['mobile_personal', 'mobile', 'phone', 'personal_mobile']),
            'mobile_official' => $get(['mobile_official', 'official_mobile']),
            'gender' => $get(['gender']),
            'religion' => $get(['religion']),
            'blood_group' => $get(['blood_group']),
            'date_of_birth' => self::parseDateField($get(['date_of_birth', 'dob'])),
            'marital_status' => $get(['marital_status']),
            'spouse_name' => $get(['spouse_name']),
            'spouse_mobile' => $get(['spouse_mobile']),
            'fathers_name' => $get(['fathers_name', 'father_name']),
            'fathers_mobile' => $get(['fathers_mobile', 'father_mobile']),
            'mothers_name' => $get(['mothers_name', 'mother_name']),
            'mothers_mobile' => $get(['mothers_mobile', 'mother_mobile']),
            'nid_number' => $get(['nid_number', 'nid', 'national_id']),
            'smart_card_number' => $get(['smart_card_number', 'smart_card']),
            'tin_certificate_no' => $get(['tin_certificate_no', 'tin']),
            'driving_license_no' => $get(['driving_license_no', 'driving_license']),
            'passport_no' => $get(['passport_no', 'passport']),
            'identification_mark' => $get(['identification_mark']),
            'joining_date' => self::parseDateField($get(['joining_date', 'join_date', 'date_of_joining', 'doj'])),
            'confirmation_date' => self::parseDateField($get(['confirmation_date'])),
            'department' => $get(['department_id', 'dept_id', 'department']),
            'joining_designation' => $get(['joining_designation_id', 'joining_designation', 'opening_designation']),
            'last_designation' => $get(['last_designation_id', 'last_designation', 'designation_id', 'desig_id', 'designation']),
            'current_branch' => $get(['current_branch_id', 'branch_id', 'branch', 'current_branch']),
            'last_branch' => $get(['last_branch_id', 'last_branch', 'previous_branch']),
            'status' => strtolower($get(['status']) ?: 'active'),
            'bank_name' => $get(['bank_name', 'bank']),
            'bank_branch_name' => $get(['bank_branch_name', 'bank_branch', 'branch_name']),
            'bank_account_no' => $get(['bank_account_no', 'account_no', 'bank_account']),
            'bank_account_type' => strtolower($get(['bank_account_type', 'account_type'])),
            'present_division' => $get(['present_division', 'division']),
            'present_district' => $get(['present_district']),
            'present_upazila' => $get(['present_upazila', 'upazila', 'thana']),
            'present_union' => $get(['present_union', 'union']),
            'present_village' => $get(['present_village', 'village']),
            'permanent_division' => $get(['permanent_division']),
            'permanent_district' => $get(['permanent_district']),
            'permanent_upazila' => $get(['permanent_upazila']),
            'permanent_union' => $get(['permanent_union']),
            'permanent_village' => $get(['permanent_village']),
        ];
    }

    /**
     * @param  array<string, string>  $samples  header => value
     * @return list<string>
     */
    public static function buildSampleRow(array $samples): array
    {
        $row = [];
        foreach (self::headers() as $header) {
            $row[] = $samples[$header] ?? '';
        }

        return $row;
    }

    /**
     * @param  array<string, mixed>  $rowAssoc
     * @param  list<string>  $keys
     */
    private static function parseDateField(string $raw): string
    {
        if ($raw === '') {
            return '';
        }

        return ImportDateParser::parse($raw) ?? $raw;
    }

    private static function firstNonEmpty(array $rowAssoc, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! array_key_exists($k, $rowAssoc)) {
                continue;
            }
            $v = trim((string) $rowAssoc[$k]);
            if ($v !== '') {
                return $v;
            }
        }

        return null;
    }
}
