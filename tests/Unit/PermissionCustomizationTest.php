<?php

use App\Models\Role;
use App\Models\User;
use App\Support\PermissionRegistry;
use Illuminate\Support\Facades\Artisan;

function permissionUser(string $roleName, array $permissions, bool $blockPayroll = false): User
{
    $role = new Role([
        'name' => $roleName,
        'permissions' => $permissions,
        'block_payroll_module' => $blockPayroll,
    ]);
    $user = new User;
    $user->setRelation('role', $role);
    $user->setRelation('roles', collect([$role]));

    return $user;
}

test('default role lists are explicit catalog keys with the planned grants', function () {
    $catalog = PermissionRegistry::keys();
    $definitions = config('default_roles.roles');

    expect($definitions['Super Admin']['permissions'])->toBe($catalog);

    foreach ($definitions as $definition) {
        $permissions = $definition['permissions'];
        expect($permissions)->not->toContain('*')
            ->and($permissions)->not->toContain('*-no-delete-no-admin');

        foreach ($permissions as $key) {
            expect(str_starts_with($key, 'sections:'))->toBeFalse()
                ->and($catalog)->toContain($key);
        }
    }

    $accountant = $definitions['Accountant']['permissions'];
    foreach (['fixed-assets.view', 'fixed-assets.create', 'fixed-assets.edit', 'fixed-assets.delete'] as $key) {
        expect($accountant)->toContain($key);
    }

    $branchAccount = $definitions['Branch Account']['permissions'];
    expect($branchAccount)->not->toContain('employee-loan.view')
        ->and($branchAccount)->not->toContain('staff-fund.view')
        ->and($branchAccount)->not->toContain('employees.view')
        ->and($branchAccount)->toContain('profile.view')
        ->and($branchAccount)->toContain('documents.view');

    expect($definitions['Branch Manager']['block_payroll_module'])->toBeTrue()
        ->and($definitions['Department Head']['block_payroll_module'])->toBeTrue()
        ->and($definitions['HR Admin']['block_payroll_module'])->toBeFalse()
        ->and($definitions['Super Admin']['permissions'])->toContain('documents.delete')
        ->and($definitions['Employee']['permissions'])->not->toContain('promotion-evaluations.view')
        ->and($definitions['Employee']['permissions'])->not->toContain('documents.manage')
        ->and($definitions['HR Admin']['permissions'])->not->toContain('documents.delete');
});

test('payroll block, aliases, and the evaluation shortcut keep today access', function () {
    $branchManager = permissionUser('Branch Manager', ['payroll.view', 'movements.approve'], true);
    expect($branchManager->hasPermission('payroll.view'))->toBeFalse()
        ->and($branchManager->hasPermission('employee-loan.view'))->toBeFalse()
        ->and($branchManager->hasPermission('promotion-evaluations.approve'))->toBeTrue();

    $branchAccount = permissionUser('Branch Account', ['payroll.view'], false);
    expect($branchAccount->hasPermission('employee-loan.view'))->toBeTrue()
        ->and($branchAccount->hasDirectPermission('employee-loan.view'))->toBeFalse()
        ->and($branchAccount->payrollModuleIsBlocked())->toBeFalse();

    $superAdmin = permissionUser('Super Admin', [], true);
    expect($superAdmin->hasPermission('payroll.view'))->toBeTrue()
        ->and($superAdmin->payrollModuleIsBlocked())->toBeFalse();
});

test('role editor places every catalog key once inside an erp section group', function () {
    $catalog = PermissionRegistry::keys();
    $sections = PermissionRegistry::editorSections();
    $seen = [];

    expect(array_keys($sections))->each->toBeIn(array_keys(\App\Support\SectionRegistry::sections()));

    foreach ($sections as $section) {
        foreach ($section['groups'] as $group) {
            expect($group['label'])->not->toBe('Other');
            foreach (array_keys($group['permissions']) as $key) {
                $seen[] = $key;
            }
        }
    }

    expect($seen)->toEqualCanonicalizing($catalog)
        ->and(array_unique($seen))->toHaveCount(count($catalog));

    expect(array_column($sections['human-resources']['groups'], 'label')[0])->toBe('Employees');
});

test('permissions audit accepts every route key', function () {
    expect(Artisan::call('permissions:audit'))->toBe(0);
});
