<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Models\Activity;

/**
 * Turns raw activity rows into a short audit: who, which record, which fields.
 */
class ActivityLogPresenter
{
    /**
     * Business records worth an audit line. Technical and high-volume models stay off this list.
     *
     * @var list<class-string<Model>>
     */
    private const MODELS = [
        \App\Models\Employee::class,
        \App\Models\User::class,
        \App\Models\Role::class,
        \App\Models\Branch::class,
        \App\Models\Department::class,
        \App\Models\Designation::class,
        \App\Models\EmployeeType::class,
        \App\Models\RegionalOffice::class,
        \App\Models\Zone::class,
        \App\Models\Program::class,
        \App\Models\Project::class,
        \App\Models\Document::class,
        \App\Models\DocumentCategory::class,
        \App\Models\AdminNotice::class,
        \App\Models\Holiday::class,
        \App\Models\LeaveType::class,
        \App\Models\LeaveApplication::class,
        \App\Models\LeaveApproval::class,
        \App\Models\LeaveBalance::class,
        \App\Models\LeaveApprovalTier::class,
        \App\Models\SalaryHead::class,
        \App\Models\SalaryGrade::class,
        \App\Models\SalaryStep::class,
        \App\Models\SalaryStructure::class,
        \App\Models\Payscale::class,
        \App\Models\SalaryIncrement::class,
        \App\Models\SalaryWithheld::class,
        \App\Models\SalaryHeadModification::class,
        \App\Models\PayrollRun::class,
        \App\Models\Payslip::class,
        \App\Models\BonusType::class,
        \App\Models\BonusConfiguration::class,
        \App\Models\TaxSlab::class,
        \App\Models\ProbationSalaryRule::class,
        \App\Models\BranchPayrollBank::class,
        \App\Models\EmployeeLoan::class,
        \App\Models\EmployeeLoanTransaction::class,
        \App\Models\LoanApplication::class,
        \App\Models\LoanPolicy::class,
        \App\Models\LoanCommittee::class,
        \App\Models\LoanTransfer::class,
        \App\Models\LoanCollectionBatch::class,
        \App\Models\LoanMigration::class,
        \App\Models\EmployeePfTransaction::class,
        \App\Models\PfInterestRun::class,
        \App\Models\EmployeeGratuityPayment::class,
        \App\Models\Separation::class,
        \App\Models\SeparationHistory::class,
        \App\Models\SeparationFinalPayment::class,
        \App\Models\FinalClearance::class,
        \App\Models\FinalClearanceSignature::class,
        \App\Models\Transfer::class,
        \App\Models\TransferHistory::class,
        \App\Models\Promotion::class,
        \App\Models\PromotionHistory::class,
        \App\Models\PromotionEvaluation::class,
        \App\Models\Demotion::class,
        \App\Models\DemotionHistory::class,
        \App\Models\Confirmation::class,
        \App\Models\ConfirmationHistory::class,
        \App\Models\ConfirmationEvaluation::class,
        \App\Models\TraineeEvaluation::class,
        \App\Models\ProbationIncrementEvaluation::class,
        \App\Models\EmployeeEducation::class,
        \App\Models\EmployeeDocument::class,
        \App\Models\EmployeeJobHistory::class,
        \App\Models\EmployeeAssignmentHistory::class,
        \App\Models\EmployeeDisciplinaryAction::class,
    ];

    /** @var list<string> */
    private const HIDDEN_FIELDS = [
        'id',
        'password',
        'remember_token',
        'signature',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'login_pin',
        'created_at',
        'updated_at',
        'deleted_at',
        'email_verified_at',
        'download_count',
    ];

    /** @var array<string, string> */
    private const FIELD_LABELS = [
        'name_en' => 'Name',
        'name_bn' => 'Name (Bangla)',
        'employee_id' => 'Employee ID',
        'basic_salary' => 'Basic salary',
        'gross_salary' => 'Gross salary',
        'net_salary' => 'Net salary',
        'designation_id' => 'Designation',
        'department_id' => 'Department',
        'branch_id' => 'Branch',
        'role_id' => 'Role',
        'active_status' => 'Active',
        'account_type' => 'Account type',
        'email' => 'Email',
        'username' => 'Username',
        'mobile' => 'Mobile',
        'phone' => 'Phone',
        'status' => 'Status',
        'title' => 'Title',
        'description' => 'Description',
        'joining_date' => 'Joining date',
        'confirmation_date' => 'Confirmation date',
        'resignation_date' => 'Resignation date',
        'dropout_date' => 'Separation date',
        'date_of_birth' => 'Date of birth',
        'nid' => 'NID',
        'permissions' => 'Permissions',
        'blocked_sections' => 'Blocked sections',
        'is_active' => 'Active',
        'amount' => 'Amount',
        'remarks' => 'Remarks',
        'address' => 'Address',
        'contact_number' => 'Contact number',
        'branch_code' => 'Branch code',
        'file_name' => 'File',
        'is_pinned' => 'Pinned',
    ];

    public static function allows(Model|string $model): bool
    {
        $class = $model instanceof Model ? $model::class : $model;

        return in_array($class, self::MODELS, true);
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public static function enrich(Model $subject, array $properties, string $event): array
    {
        $snapshot = self::actorSnapshot();
        $base = [
            'actor_name' => $snapshot['actor_name'],
            'actor_employee_id' => $snapshot['actor_employee_id'],
            'subject_label' => self::subjectLabel($subject),
            'record_type' => class_basename($subject),
            'changed_fields' => [],
        ];

        if ($event === 'deleted') {
            return $base;
        }

        $attributes = is_array($properties['attributes'] ?? null) ? $properties['attributes'] : [];
        $old = is_array($properties['old'] ?? null) ? $properties['old'] : [];
        $keys = array_values(array_unique([
            ...array_keys($attributes),
            ...array_keys($old),
        ]));
        $keys = array_values(array_filter(
            $keys,
            static fn ($key) => is_string($key) && ! self::isHiddenField($key),
        ));

        $base['changed_fields'] = $keys;
        $base['attributes'] = self::scalarChanges($attributes);
        $base['old'] = self::scalarChanges($old);

        return $base;
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function description(string $event, array $properties): string
    {
        $type = self::typeLabel((string) ($properties['record_type'] ?? 'Record'));
        $label = trim((string) ($properties['subject_label'] ?? ''));
        $fields = [];
        if ($event === 'updated') {
            foreach (array_slice($properties['changed_fields'] ?? [], 0, 3) as $key) {
                if (is_string($key)) {
                    $fields[] = self::fieldLabel($key);
                }
            }
        }

        return self::sentence($event, $type, $label, $fields, $event === 'updated'
            ? max(0, count($properties['changed_fields'] ?? []) - 3)
            : 0);
    }

    /**
     * @param  list<string>  $changedLabels
     */
    public static function sentence(string $event, string $recordType, string $recordLabel, array $changedLabels = [], int $extraChanges = 0): string
    {
        $verb = match ($event) {
            'created' => 'Created',
            'deleted' => 'Deleted',
            default => 'Updated',
        };

        $type = strtolower(trim($recordType));
        $label = trim($recordLabel);
        $sameAsType = $label === '' || strcasecmp($label, trim($recordType)) === 0;
        $labelAlreadyIncludesType = $label !== '' && str_starts_with(strtolower($label), $type);
        $personRecord = in_array($type, ['employee', 'user'], true);
        $labelLooksLikePerson = (bool) preg_match('/^.+\s\([^)]+\)$/u', $label);

        if ($sameAsType) {
            $target = $type !== '' ? $type : 'record';
        } elseif ($labelAlreadyIncludesType) {
            $target = $label;
        } elseif (! $personRecord && $labelLooksLikePerson) {
            $target = "{$type} for {$label}";
        } else {
            $target = "{$type} {$label}";
        }

        $line = "{$verb} {$target}";

        if ($event === 'updated' && $changedLabels !== []) {
            $line .= '. Changed '.self::joinLabels($changedLabels, $extraChanges);
        }

        return $line.'.';
    }

    /**
     * @param  list<string>  $labels
     */
    private static function joinLabels(array $labels, int $extra): string
    {
        if ($extra > 0) {
            return implode(', ', $labels)." and {$extra} more";
        }

        if (count($labels) < 2) {
            return $labels[0] ?? '';
        }

        $last = array_pop($labels);

        return implode(', ', $labels).' and '.$last;
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(Activity $activity): array
    {
        $properties = $activity->properties?->toArray() ?? [];
        $causer = $activity->causer instanceof User ? $activity->causer : null;

        $actorName = self::nonEmptyString($properties['actor_name'] ?? null);
        if ($actorName === null) {
            $actorName = $causer ? self::actorName($causer) : 'System';
        }

        $employeeCode = self::nonEmptyString($properties['actor_employee_id'] ?? null);
        if ($employeeCode === null && $causer?->employee) {
            $employeeCode = self::nonEmptyString($causer->employee->getAttribute('employee_id'));
        }

        $recordType = self::typeLabel((string) ($properties['record_type'] ?? (
            $activity->subject_type ? class_basename($activity->subject_type) : 'Record'
        )));

        $recordLabel = self::nonEmptyString($properties['subject_label'] ?? null);
        if ($recordLabel === null && $activity->subject instanceof Model) {
            $recordLabel = self::subjectLabel($activity->subject);
        }
        if ($recordLabel === null) {
            $fallback = $activity->subject_type ? class_basename($activity->subject_type) : 'Record';
            $recordLabel = $activity->subject_id ? "{$fallback} #{$activity->subject_id}" : $fallback;
        }

        $changes = self::changes($properties, $activity->event);
        $labels = array_map(static fn (array $row) => $row['label'], $changes);
        $event = in_array($activity->event, ['created', 'updated', 'deleted'], true)
            ? $activity->event
            : 'updated';
        $summaryLabels = $event === 'updated' ? array_slice($labels, 0, 3) : [];

        return [
            'id' => $activity->id,
            'event' => $event,
            'actor_name' => $actorName,
            'actor_employee_id' => $employeeCode,
            'record_type' => $recordType,
            'record_label' => $recordLabel,
            'summary' => self::sentence($event, $recordType, $recordLabel, $summaryLabels, max(0, count($labels) - 3)),
            'changed_fields' => array_slice($labels, 0, 3),
            'changed_extra' => max(0, count($labels) - 3),
            'changes' => $changes,
            'created_at' => $activity->created_at?->toIso8601String(),
            'created_at_human' => $activity->created_at?->diffForHumans(),
            'created_at_formatted' => $activity->created_at?->format('d M, Y h:i A'),
        ];
    }

    public static function actorName(?User $user): string
    {
        if (! $user) {
            return 'System';
        }

        $user->loadMissing('employee:id,name_en,name_bn,employee_id');
        $employeeName = self::employeeName($user->employee);
        if ($employeeName !== '') {
            return $employeeName;
        }

        $name = trim((string) $user->name);

        return $name !== '' ? $name : 'System';
    }

    public static function subjectLabel(Model $model): string
    {
        if ($model instanceof Employee) {
            return self::personLabel(
                self::employeeName($model),
                $model->getAttribute('employee_id'),
                $model->getKey(),
                'Employee',
            );
        }

        if ($model instanceof User) {
            $model->loadMissing('employee:id,name_en,name_bn,employee_id');
            $name = self::employeeName($model->employee);
            if ($name === '') {
                $name = trim((string) $model->name);
            }

            return self::personLabel(
                $name,
                $model->employee?->getAttribute('employee_id'),
                $model->getKey(),
                'User',
            );
        }

        $name = '';
        $code = null;

        if (method_exists($model, 'employee')) {
            $model->loadMissing('employee:id,name_en,name_bn,employee_id');
            $employee = $model->getRelation('employee');
            if ($employee instanceof Employee) {
                $name = self::employeeName($employee);
                $code = $employee->getAttribute('employee_id');
            }
        }

        if ($name === '') {
            foreach (['employee_name', 'title', 'name', 'name_en', 'name_bn'] as $attribute) {
                $value = $model->getAttribute($attribute);
                if (is_string($value) && trim($value) !== '') {
                    $name = trim($value);
                    break;
                }
            }
        }

        if (! is_scalar($code) || trim((string) $code) === '') {
            $storedCode = $model->getAttribute('staff_id');
            $code = is_scalar($storedCode) ? $storedCode : null;
        }

        if ($name !== '') {
            return self::personLabel($name, $code, $model->getKey(), class_basename($model));
        }

        foreach (['loan_number', 'reference_no'] as $attribute) {
            $value = $model->getAttribute($attribute);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        $type = self::typeLabel(class_basename($model));
        $key = $model->getKey();

        return $key ? "{$type} #{$key}" : $type;
    }

    public static function typeLabel(string $name): string
    {
        $base = class_basename($name);
        $spaced = trim((string) preg_replace('/(?<!^)([A-Z])/', ' $1', $base));

        return $spaced !== '' ? $spaced : 'Record';
    }

    public static function fieldLabel(string $key): string
    {
        if (isset(self::FIELD_LABELS[$key])) {
            return self::FIELD_LABELS[$key];
        }

        $label = ucwords(str_replace('_', ' ', $key));

        return str_replace(
            ['Hr ', 'Pf ', 'Nid', ' Id'],
            ['HR ', 'PF ', 'NID', ' ID'],
            $label,
        );
    }

    public static function isHiddenField(string $key): bool
    {
        return in_array($key, self::HIDDEN_FIELDS, true) || str_ends_with($key, '_token');
    }

    /**
     * @return array{actor_name: string, actor_employee_id: ?string}
     */
    private static function actorSnapshot(): array
    {
        $user = Auth::user();
        if (! $user instanceof User) {
            return ['actor_name' => 'System', 'actor_employee_id' => null];
        }

        $user->loadMissing('employee:id,name_en,name_bn,employee_id');
        $code = $user->employee?->getAttribute('employee_id');

        return [
            'actor_name' => self::actorName($user),
            'actor_employee_id' => is_scalar($code) && trim((string) $code) !== '' ? trim((string) $code) : null,
        ];
    }

    private static function employeeName(?Employee $employee): string
    {
        if (! $employee) {
            return '';
        }

        $english = trim((string) ($employee->name_en ?? ''));
        if ($english !== '') {
            return $english;
        }

        return trim((string) ($employee->name_bn ?? ''));
    }

    private static function personLabel(string $name, mixed $code, mixed $key, string $fallback): string
    {
        $name = trim($name);
        $code = is_scalar($code) ? trim((string) $code) : '';

        if ($name !== '' && $code !== '') {
            return "{$name} ({$code})";
        }

        if ($name !== '') {
            return $name;
        }

        if ($code !== '') {
            return $code;
        }

        return $key ? "{$fallback} #{$key}" : $fallback;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private static function scalarChanges(array $values): array
    {
        $clean = [];
        foreach ($values as $key => $value) {
            if (! is_string($key) || self::isHiddenField($key) || self::isRedactedValue($value)) {
                continue;
            }
            $clean[$key] = $value;
        }

        return $clean;
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return list<array{label: string, from: ?string, to: ?string, redacted: bool}>
     */
    private static function changes(array $properties, ?string $event): array
    {
        if ($event === 'deleted') {
            return [];
        }

        $attributes = is_array($properties['attributes'] ?? null) ? $properties['attributes'] : [];
        $old = is_array($properties['old'] ?? null) ? $properties['old'] : [];
        $named = is_array($properties['changed_fields'] ?? null) ? $properties['changed_fields'] : [];
        $keys = array_values(array_unique([
            ...array_filter($named, 'is_string'),
            ...array_keys($attributes),
            ...array_keys($old),
        ]));

        $rows = [];
        foreach ($keys as $key) {
            if (self::isHiddenField($key)) {
                continue;
            }

            $hasNew = array_key_exists($key, $attributes);
            $hasOld = array_key_exists($key, $old);
            $rawNew = $hasNew ? $attributes[$key] : null;
            $rawOld = $hasOld ? $old[$key] : null;
            $redacted = (! $hasNew && ! $hasOld)
                || self::isRedactedValue($rawNew)
                || self::isRedactedValue($rawOld);

            $from = $redacted ? null : self::displayValue($rawOld);
            $to = $redacted ? null : self::displayValue($rawNew);

            if ($event === 'created' && ($redacted || $to === null)) {
                continue;
            }

            if (! $redacted && $from === $to) {
                continue;
            }

            $rows[] = [
                'label' => self::fieldLabel($key),
                'from' => $from,
                'to' => $to,
                'redacted' => $redacted,
            ];
        }

        return $rows;
    }

    private static function isRedactedValue(mixed $value): bool
    {
        if (is_array($value) || is_object($value)) {
            return true;
        }

        if (! is_string($value)) {
            return false;
        }

        $trimmed = ltrim($value);

        return strlen($value) > 180
            || str_starts_with($trimmed, '{')
            || str_starts_with($trimmed, '[');
    }

    private static function displayValue(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        if (! is_scalar($value)) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }

    private static function nonEmptyString(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }
}
