<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\ProbationIncrementEvaluation;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Notifications\ProbationIncrementEvaluationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    config([
        'database.default' => 'mysql',
        'database.connections.mysql' => [
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => '3306',
            'database' => 'hrm_mou',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
        ],
    ]);

    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::beginTransaction();
});

afterEach(function () {
    DB::rollBack();
});

function workflowRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['permissions' => ['probation-increment-evaluations.view']],
    );
}

function workflowToken(): string
{
    return strtoupper(substr(str_replace('.', '', uniqid('', true)), -8));
}

function workflowUser(Role $role, Employee $employee): User
{
    $user = User::factory()->create([
        'name' => $employee->name_en,
        'employee_id' => $employee->id,
        'branch_id' => $employee->current_branch_id,
        'role_id' => $role->id,
        'signature' => 'signatures/test.png',
    ]);
    $user->roles()->attach($role->id);

    return $user;
}

function workflowEmployee(Designation $designation, Branch $branch, string $pin, string $name): Employee
{
    $pin = workflowToken();

    return Employee::query()->create([
        'employee_id' => $pin,
        'pin' => $pin,
        'name_en' => $name,
        'email' => $pin.'-'.workflowToken().'@example.test',
        'joining_date' => '2026-01-01',
        'department_id' => $designation->department_id,
        'designation_id' => $designation->id,
        'current_branch_id' => $branch->id,
        'status' => 'active',
    ]);
}

function workflowOffice(): array
{
    $token = workflowToken();
    $department = Department::query()->create(['name' => 'Microfinance '.$token]);
    $zone = Zone::query()->create(['name' => 'Zone '.$token, 'code' => $token]);
    $office = RegionalOffice::query()->create([
        'zone_id' => $zone->id,
        'name' => 'Atrai '.$token,
        'code' => substr($token, 0, 20),
    ]);
    $branch = Branch::query()->create([
        'name' => 'Khajura '.$token,
        'branch_code' => substr($token, 0, 20),
        'regional_office_id' => $office->id,
    ]);
    $bmDesignation = Designation::query()->create(['name' => 'Branch Manager '.$token]);
    $rmDesignation = Designation::query()->create(['name' => 'Regional Manager '.$token]);
    $officerDesignation = Designation::query()->create(['name' => 'Probationary Officer '.$token]);
    $bmDesignation->setAttribute('department_id', $department->id);
    $rmDesignation->setAttribute('department_id', $department->id);
    $officerDesignation->setAttribute('department_id', $department->id);

    return compact('office', 'branch', 'bmDesignation', 'rmDesignation', 'officerDesignation');
}

function workflowEvaluation(Employee $subject, User $initiator, RegionalOffice $office, Branch $branch, string $formType = 'officer_abm'): ProbationIncrementEvaluation
{
    $evaluation = ProbationIncrementEvaluation::query()->create([
        'employee_id' => $subject->id,
        'initiator_id' => $initiator->id,
        'branch_id' => $branch->id,
        'regional_office_id' => $office->id,
        'form_type' => $formType,
        'status' => 'submitted_to_rm',
        'joining_date' => '2026-06-22',
        'probation_3m_completion_date' => '2026-09-22',
        'education_at_joining' => 'HSC',
        'education_current' => 'HSC',
        'closing_month' => '2026-09',
        'joining_members_count' => 10,
        'closing_members_count' => 12,
        'joining_borrowers_count' => 5,
        'closing_borrowers_count' => 6,
        'joining_loan_balance' => 100,
        'closing_loan_balance' => 120,
        'joining_savings_balance' => 50,
        'closing_savings_balance' => 60,
        'joining_overdue_borrowers' => 0,
        'closing_overdue_borrowers' => 0,
        'joining_overdue_amount' => 0,
        'closing_overdue_amount' => 0,
        'joining_otr_pct' => 100,
        'closing_otr_pct' => 100,
        'joining_par_pct' => 0,
        'closing_par_pct' => 0,
        'total_score' => 66,
        'strengths' => 'কাজ করে',
        'weaknesses' => 'অভিজ্ঞতা কম',
        'training_need' => 'নেই',
        'other_remarks' => 'সুপারিশ',
        'recommendation_status' => 'recommend_increment',
        'hr_financial_irregularity' => true,
    ]);

    $evaluation->scores()->create([
        'section_key' => 'work',
        'section_name' => 'কাজ',
        'criteria_key' => 'discipline',
        'criteria_name' => 'শৃঙ্খলা',
        'max_score' => 10,
        'obtained_score' => 8,
    ]);

    $evaluation->signatures()->create([
        'user_id' => $initiator->id,
        'stage' => 'initiator',
        'action' => 'submitted',
        'comments' => 'শাখা থেকে দাখিল',
        'signed_at' => now(),
    ]);

    return $evaluation;
}

it('stops a branch manager from signing the regional manager stage', function () {
    $setup = workflowOffice();
    $bm = workflowUser(
        workflowRole('Branch Manager'),
        workflowEmployee($setup['bmDesignation'], $setup['branch'], '0356', 'Md. Kaharul Islam'),
    );
    $subject = workflowEmployee($setup['officerDesignation'], $setup['branch'], '1128', 'Md. Ruhul Amin');
    $evaluation = workflowEvaluation($subject, $bm, $setup['office'], $setup['branch']);

    $this->actingAs($bm)
        ->post(route('probation-increment-evaluations.forward', $evaluation), [
            'comments' => 'আরএম হিসেবে সুপারিশ',
            'recommendation_status' => 'recommend_increment',
        ])
        ->assertForbidden();

    expect($evaluation->fresh()->status)->toBe('submitted_to_rm')
        ->and($evaluation->signatures()->where('stage', 'rm')->exists())->toBeFalse();
});

it('lets the regional manager of that office forward the evaluation', function () {
    $setup = workflowOffice();
    $bmEmployee = workflowEmployee($setup['bmDesignation'], $setup['branch'], '0356', 'Md. Kaharul Islam');
    $bm = workflowUser(workflowRole('Branch Manager'), $bmEmployee);
    $rmEmployee = workflowEmployee($setup['rmDesignation'], $setup['branch'], '0298', 'Md. Abul Hasan Mondal');
    $rm = workflowUser(workflowRole('Regional Manager'), $rmEmployee);
    $setup['office']->update(['regional_manager_employee_id' => $rmEmployee->id]);
    $subject = workflowEmployee($setup['officerDesignation'], $setup['branch'], '1128', 'Md. Ruhul Amin');
    $evaluation = workflowEvaluation($subject, $bm, $setup['office'], $setup['branch']);

    $this->actingAs($rm)
        ->from(route('probation-increment-evaluations.show', $evaluation))
        ->post(route('probation-increment-evaluations.forward', $evaluation), [
            'comments' => 'আঞ্চলিক সুপারিশ',
            'recommendation_status' => 'recommend_increment',
        ])
        ->assertRedirect();

    $evaluation->refresh();
    expect($evaluation->status)->toBe('submitted_to_zm')
        ->and($evaluation->signatures()->where('stage', 'rm')->where('user_id', $rm->id)->exists())->toBeTrue();
});

it('resubmits a file stuck at regional manager without recording an rm signature', function () {
    $setup = workflowOffice();
    $bm = workflowUser(
        workflowRole('Branch Manager'),
        workflowEmployee($setup['bmDesignation'], $setup['branch'], '0356', 'Md. Kaharul Islam'),
    );
    $subject = workflowEmployee($setup['bmDesignation'], $setup['branch'], '0400', 'Senior Manager');
    $evaluation = workflowEvaluation($subject, $bm, $setup['office'], $setup['branch'], 'bm_and_above');

    $this->actingAs($bm)
        ->from(route('probation-increment-evaluations.show', $evaluation))
        ->post(route('probation-increment-evaluations.forward', $evaluation), [
            'comments' => 'জেডএম বরাবর পুনরায় দাখিল',
        ])
        ->assertRedirect();

    $evaluation->refresh();
    expect($evaluation->status)->toBe('submitted_to_zm')
        ->and($evaluation->signatures()->where('stage', 'rm')->exists())->toBeFalse()
        ->and($evaluation->signatures()->where('stage', 'initiator')->where('action', 'submitted')->count())->toBe(2);
});

it('lets a super admin reset the workflow back to the submitter draft', function () {
    Notification::fake();

    $setup = workflowOffice();
    $bm = workflowUser(
        workflowRole('Branch Manager'),
        workflowEmployee($setup['bmDesignation'], $setup['branch'], '0356', 'Md. Kaharul Islam'),
    );
    $admin = workflowUser(
        workflowRole('Super Admin'),
        workflowEmployee($setup['officerDesignation'], $setup['branch'], '0001', 'Super Admin'),
    );
    $subject = workflowEmployee($setup['officerDesignation'], $setup['branch'], '1128', 'Md. Ruhul Amin');
    $evaluation = workflowEvaluation($subject, $bm, $setup['office'], $setup['branch']);
    $evaluation->signatures()->create([
        'user_id' => $bm->id,
        'stage' => 'rm',
        'action' => 'forwarded',
        'comments' => 'ভুল স্বাক্ষর',
        'signed_at' => now(),
    ]);
    $evaluation->update(['status' => 'submitted_to_zm']);

    $this->actingAs($admin)
        ->from(route('probation-increment-evaluations.show', $evaluation))
        ->post(route('probation-increment-evaluations.reset-workflow', $evaluation), [
            'password' => 'password',
            'reason' => 'শাখা ব্যবস্থাপক আরএম ধাপে সই করেছেন',
        ])
        ->assertRedirect();

    $evaluation->refresh();
    expect($evaluation->status)->toBe('draft')
        ->and($evaluation->signatures()->count())->toBe(0)
        ->and($evaluation->scores()->count())->toBe(1)
        ->and($evaluation->hr_financial_irregularity)->toBeNull()
        ->and($evaluation->total_score)->toEqual(66);

    Notification::assertSentTo($bm, ProbationIncrementEvaluationNotification::class);
});

it('forbids a branch manager and a regional manager from resetting the workflow', function (string $roleName, string $pin, string $designationKey) {
    $setup = workflowOffice();
    $actorRole = workflowRole($roleName);
    $employee = workflowEmployee($setup[$designationKey], $setup['branch'], $pin, $roleName);
    $user = workflowUser($actorRole, $employee);
    $initiatorRole = $roleName === 'Branch Manager' ? $actorRole : workflowRole('Branch Manager');
    $initiator = workflowUser(
        $initiatorRole,
        workflowEmployee($setup['bmDesignation'], $setup['branch'], '0999', 'Other Manager'),
    );
    $subject = workflowEmployee($setup['officerDesignation'], $setup['branch'], '1128', 'Md. Ruhul Amin');
    $evaluation = workflowEvaluation($subject, $initiator, $setup['office'], $setup['branch']);

    $this->actingAs($user)
        ->post(route('probation-increment-evaluations.reset-workflow', $evaluation), [
            'password' => 'password',
            'reason' => 'চেষ্টা',
        ])
        ->assertForbidden();

    expect($evaluation->fresh()->status)->toBe('submitted_to_rm')
        ->and($evaluation->signatures()->count())->toBe(1);
})->with([
    'branch manager' => ['Branch Manager', '0356', 'bmDesignation'],
    'regional manager' => ['Regional Manager', '0298', 'rmDesignation'],
]);
