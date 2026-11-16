<?php

namespace App\Support;

final class EmployeeExport
{
    /**
     * All persisted fields represented on the employee create/edit form.
     *
     * @return list<array{key: string, label: string, label_bn: string, group: string, required: bool, width: int, hint: string}>
     */
    public static function columns(): array
    {
        return [
            ...EmployeeImportCsv::columns(),
            ...self::extraColumns(),
        ];
    }

    /** @return list<string> */
    public static function headers(): array
    {
        return array_column(self::columns(), 'key');
    }

    /** @return array<string, string> */
    public static function groupTitles(): array
    {
        return [
            ...EmployeeImportCsv::groupTitles(),
            'organization' => 'Organization & Project',
            'salary' => 'Salary Details',
            'media' => 'Photo & Signature',
            'education' => 'Education',
            'nominee' => 'Nominees',
            'guarantor' => 'Guarantors',
            'guarantor_cheque' => 'Guarantor Cheques',
            'collateral' => 'Collateral',
            'collateral_cheque' => "Staff's Cheque Information",
            'asset' => 'Assets',
            'experience' => 'Experience',
            'training' => 'Training',
            'document' => 'Documents',
        ];
    }

    /** @return array<string, string> */
    public static function groupColors(): array
    {
        return [
            ...EmployeeImportCsv::groupColors(),
            'organization' => '8064A2',
            'salary' => 'C0504D',
            'media' => '7F8C8D',
            'education' => '4F81BD',
            'nominee' => '9BBB59',
            'guarantor' => 'F79646',
            'guarantor_cheque' => 'B65708',
            'collateral' => '948A54',
            'collateral_cheque' => '76933C',
            'asset' => '31859B',
            'experience' => '60497A',
            'training' => '1F497D',
            'document' => '595959',
        ];
    }

    /**
     * @return list<array{key: string, label: string, label_bn: string, group: string, required: bool, width: int, hint: string}>
     */
    private static function extraColumns(): array
    {
        $column = static fn (string $key, string $label, string $group, int $width = 20): array => [
            'key' => $key,
            'label' => $label,
            'label_bn' => '',
            'group' => $group,
            'required' => false,
            'width' => $width,
            'hint' => '',
        ];

        return [
            $column('program', 'Program', 'organization'),
            $column('project', 'Project', 'organization'),
            $column('is_project_employee', 'Project Employee', 'organization', 16),
            $column('is_custodian', 'Custodian', 'organization', 12),
            $column('probation_period', 'Probation Period', 'employment', 18),
            $column('age', 'Age', 'personal', 12),
            $column('payscale', 'Payscale', 'salary'),
            $column('salary_grade', 'Salary Grade', 'salary'),
            $column('salary_step', 'Salary Step', 'salary'),
            $column('basic_salary', 'Basic Salary', 'salary', 15),
            $column('salary_details', 'Salary Addition / Deduction Details', 'salary', 34),
            $column('photo', 'Photo Path', 'media', 30),
            $column('signature', 'Signature Path', 'media', 30),
            $column('bank_address', 'Bank Address', 'bank', 28),
            $column('bank_remark', 'Bank Remark', 'bank', 28),
            $column('present_address_details', 'Present Address Details', 'present', 32),
            $column('permanent_address_details', 'Permanent Address Details', 'permanent', 32),
            $column('education_degree', 'Degree', 'education'),
            $column('education_institute', 'Institute', 'education', 28),
            $column('education_board', 'Board', 'education'),
            $column('education_group', 'Group', 'education'),
            $column('education_subject', 'Subject', 'education'),
            $column('education_result_type', 'Result Type', 'education', 14),
            $column('education_result_value', 'Result', 'education', 14),
            $column('nominee_name', 'Nominee Name', 'nominee'),
            $column('nominee_relation', 'Nominee Relation', 'nominee'),
            $column('nominee_mobile', 'Nominee Mobile', 'nominee'),
            $column('nominee_date_of_birth', 'Nominee Date of Birth', 'nominee'),
            $column('nominee_share', 'Nominee Share %', 'nominee', 16),
            $column('guarantor_name', 'Guarantor Name', 'guarantor'),
            $column('guarantor_relation', 'Guarantor Relation', 'guarantor'),
            $column('guarantor_mobile', 'Guarantor Mobile', 'guarantor'),
            $column('guarantor_address', 'Guarantor Address', 'guarantor', 28),
            $column('guarantor_cheque_bank', 'Cheque Bank', 'guarantor_cheque'),
            $column('guarantor_cheque_number', 'Cheque Number', 'guarantor_cheque'),
            $column('guarantor_cheque_qty', 'Cheque Qty', 'guarantor_cheque', 14),
            $column('collateral_has_certificate', 'Has Certificate', 'collateral', 16),
            $column('collateral_certificate_levels', 'Certificate Levels', 'collateral'),
            $column('collateral_security_amount', 'Security Amount', 'collateral'),
            $column('collateral_interest', 'Collateral Interest', 'collateral'),
            $column('collateral_date', 'Collateral Date', 'collateral'),
            $column('collateral_notes', 'Collateral Notes', 'collateral', 28),
            $column('collateral_cheque_bank', 'Cheque Bank', 'collateral_cheque'),
            $column('collateral_cheque_number', 'Cheque Number', 'collateral_cheque'),
            $column('collateral_cheque_qty', 'Cheque Qty', 'collateral_cheque', 16),
            $column('asset_serial', 'Asset Serial', 'asset', 14),
            $column('asset_number', 'Asset Number', 'asset'),
            $column('asset_name', 'Asset Name', 'asset'),
            $column('asset_quantity', 'Provided Quantity', 'asset', 18),
            $column('asset_price', 'Asset Price', 'asset', 15),
            $column('asset_details', 'Asset Details', 'asset', 28),
            $column('experience_organization', 'Organization', 'experience', 26),
            $column('experience_from_date', 'From Date', 'experience', 14),
            $column('experience_to_date', 'To Date', 'experience', 14),
            $column('experience_designation', 'Experience Designation', 'experience'),
            $column('experience_department', 'Experience Department', 'experience'),
            $column('experience_responsibility', 'Job Responsibilities', 'experience', 30),
            $column('training_title', 'Training Title', 'training', 26),
            $column('training_institute', 'Training Institute', 'training', 26),
            $column('training_duration', 'Training Duration', 'training'),
            $column('training_address', 'Training Address', 'training', 28),
            $column('training_remarks', 'Training Remarks', 'training', 28),
            $column('document_type', 'Document Type', 'document'),
            $column('document_title', 'Document Title', 'document', 26),
            $column('document_description', 'Document Description', 'document', 30),
            $column('document_expiry_date', 'Document Expiry Date', 'document', 18),
            $column('document_file', 'Document File Path', 'document', 32),
        ];
    }
}
