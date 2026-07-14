<?php

namespace App\Support;

use Illuminate\Support\Facades\Schema;

class SectionRegistry
{
    /**
     * @return array<string, array{label: string, description: string}>
     */
    public static function sections(): array
    {
        return [
            'human-resources' => [
                'label' => 'Human Resources',
                'description' => 'Employee, organization and transfer tools.',
            ],
            'attendance-movement' => [
                'label' => 'Attendance & Movement',
                'description' => 'Attendance operations and field movement workflows.',
            ],
            'leave' => [
                'label' => 'Leave',
                'description' => 'Leave applications, balances and approvals.',
            ],
            'employee-loan' => [
                'label' => 'Employee Loan',
                'description' => 'Loan setup, processing and employee loan self-service.',
            ],
            'staff-fund' => [
                'label' => 'Staff Fund',
                'description' => 'Provident fund, gratuity and settlement access.',
            ],
            'payroll' => [
                'label' => 'Payroll',
                'description' => 'Salary setup, processing and payslip access.',
            ],
            'fixed-asset' => [
                'label' => 'Fixed Asset',
                'description' => 'Asset lifecycle and reporting tools.',
            ],
            'inventory' => [
                'label' => 'Inventory',
                'description' => 'Stock, items and inventory operations.',
            ],
            'store' => [
                'label' => 'Store',
                'description' => 'Store-facing inventory area.',
            ],
            'recruitment' => [
                'label' => 'Recruitment',
                'description' => 'Hiring pipeline and recruitment workflows.',
            ],
            'training' => [
                'label' => 'Training',
                'description' => 'Programs, training records and attendance.',
            ],
            'administration' => [
                'label' => 'Administration',
                'description' => 'System administration and access control.',
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        return array_keys(self::sections());
    }

    public static function supportsRoleSectionLocks(): bool
    {
        try {
            return Schema::hasTable('roles') && Schema::hasColumn('roles', 'blocked_sections');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  list<string>  $sectionIds
     * @return list<string>
     */
    public static function filterValid(array $sectionIds): array
    {
        $valid = array_flip(self::ids());

        return array_values(array_unique(array_filter(
            $sectionIds,
            static fn ($id) => is_string($id) && $id !== '' && isset($valid[$id])
        )));
    }
}
