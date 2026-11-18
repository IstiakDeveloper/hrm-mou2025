<?php

use App\Http\Controllers\Payroll\BankAdviceController;
use App\Models\PayrollBankAdvice;
use App\Models\PayrollBankAdviceSetting;
use App\Models\User;
use App\Services\BankAdviceService;
use App\Services\PayrollReportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
    DB::purge('sqlite');
    foreach (['branches', 'projects', 'users'] as $name) {
        Schema::create($name, function (Blueprint $table) use ($name) {
            $table->id();
            if ($name === 'branches') {
                $table->boolean('is_head_office')->default(false);
                $table->softDeletes();
            }
        });
    }
    Schema::create('designations', function (Blueprint $table) {
        $table->id();
        $table->string('name');
    });
    Schema::create('employees', function (Blueprint $table) {
        $table->id();
        $table->string('name_en');
        $table->string('pin');
        $table->string('status');
        $table->unsignedBigInteger('designation_id')->nullable();
    });
    Schema::create('branch_payroll_banks', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->boolean('is_active');
        $table->string('bank_name');
        $table->string('bank_branch_name');
        $table->string('account_no');
    });
    $migration = require database_path('migrations/2026_11_18_100000_create_payroll_bank_advices_tables.php');
    $migration->up();
    $optionsMigration = require database_path('migrations/2026_11_18_110000_add_optional_account_list_to_bank_advices.php');
    $optionsMigration->up();
});

afterEach(function () {
    DB::purge('sqlite');
});

function bankAdviceData(): array
{
    return [
        'year' => 2026, 'month' => 9, 'branch_id' => null, 'project_id' => null,
        'reference_prefix' => 'Mou/HRD/ED/Salary', 'reference_year' => '2026', 'reference_number' => '240',
        'issue_date' => '2026-11-18', 'bank_name' => 'Test Bank Ltd.', 'bank_branch' => 'Naogaon Branch',
        'bank_address' => 'Naogaon.', 'account_no' => '0012345678900', 'account_type' => 'CD', 'account_name' => 'MOUSUMI',
        'signatories' => [
            ['employee_id' => null, 'name' => 'Finance Director', 'designation' => 'Director (Finance & Accounts)', 'organization' => 'Mousumi'],
            ['employee_id' => null, 'name' => 'Executive Director', 'designation' => 'Executive Director', 'organization' => 'Mousumi'],
            ['employee_id' => null, 'name' => 'Third Signer', 'designation' => 'Deputy Director', 'organization' => 'Mousumi'],
        ], 'save_defaults' => false,
    ];
}

function bankAdviceSourceRows(): array
{
    return [
        ['pin' => '0002', 'name' => 'Employee Two', 'bank_name' => 'Test Bank Ltd.', 'bank_branch' => 'Naogaon', 'account_no' => '00010002', 'amount' => 1000.10],
        ['pin' => '0003', 'name' => 'Employee Three', 'bank_name' => 'Test Bank Ltd.', 'bank_branch' => 'Naogaon', 'account_no' => '00010002', 'amount' => 2000.20],
        ['pin' => '0004', 'name' => 'Employee Four', 'bank_name' => 'Another Bank', 'bank_branch' => 'Dhaka', 'account_no' => '00010002', 'amount' => 4000],
    ];
}

function bankAdviceServiceFor(array $rows): BankAdviceService
{
    $reports = Mockery::mock(PayrollReportService::class);
    $reports->shouldReceive('build')->withArgs(function ($slug, $config, $filters) {
        return $slug === 'bank-advice' && $config['status'] === 'posted' && $config['salary_type'] === 'salary'
            && $filters['year'] === 2026 && $filters['month'] === 9;
    })->andReturn(['rows' => $rows]);

    return new BankAdviceService($reports);
}

function bankAdviceRequest(array $data, bool $superadmin = false): Request
{
    $request = Request::create('/payroll/reports/bank-advice', 'POST', $data);
    $user = Mockery::mock(User::class)->makePartial();
    $user->shouldReceive('isBranchAccount')->andReturn(false);
    $user->shouldReceive('hasPermission')->andReturn(true);
    $user->shouldReceive('isSuperAdmin')->andReturn($superadmin);
    $request->setUserResolver(fn () => $user);

    return $request;
}

it('saves a monthly account snapshot and reconciles account and letter totals to the paisa', function () {
    $advice = bankAdviceServiceFor(bankAdviceSourceRows())->generate(bankAdviceData(), null);

    expect(PayrollBankAdvice::count())->toBe(1)
        ->and($advice->salary_month)->toBe('September 2026')
        ->and($advice->toArray()['issue_date'])->toBe('2026-11-18')
        ->and($advice->reference)->toBe('Mou/HRD/ED/Salary/2026/240')
        ->and($advice->entries)->toHaveCount(2)
        ->and($advice->entries[0]['account_no'])->toBe('00010002')
        ->and(array_sum(array_column($advice->entries, 'amount_cents')))->toBe(700030)
        ->and($advice->total)->toBe('7000.30')
        ->and($advice->in_words)->toBe('Seven Thousand Taka and Thirty Paisa Only')
        ->and($advice->signatories)->toHaveCount(3);

    $sameBank = collect($advice->entries)->firstWhere('bank_name', 'Test Bank Ltd.');
    expect($sameBank['pins'])->toBe(['0002', '0003'])
        ->and($sameBank['amount'])->toBe(3000.3);
});

it('blocks missing bank accounts and empty payroll without saving a partial advice', function () {
    $rows = bankAdviceSourceRows();
    $rows[0]['account_no'] = ' ';
    expect(fn () => bankAdviceServiceFor($rows)->generate(bankAdviceData(), null))->toThrow(ValidationException::class)
        ->and(fn () => bankAdviceServiceFor([])->generate(bankAdviceData(), null))->toThrow(ValidationException::class)
        ->and(PayrollBankAdvice::count())->toBe(0);
});

it('edits references and signers without changing saved salaries or the salary month', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $advice = $service->generate(bankAdviceData(), null);
    $originalEntries = $advice->entries;
    $data = bankAdviceData();
    $data['reference_year'] = '2027';
    $data['reference_number'] = '001';
    $data['month'] = 10;
    $data['total'] = 1;
    $data['entries'] = [];
    $data['signatories'][0]['name'] = 'Changed Signer';
    $service->update($advice, $data);

    expect($advice->fresh()->reference)->toBe('Mou/HRD/ED/Salary/2027/001')
        ->and($advice->fresh()->entries)->toBe($originalEntries)
        ->and($advice->fresh()->total)->toBe('7000.30')
        ->and($advice->fresh()->month)->toBe(9)
        ->and($advice->fresh()->signatories[0]['name'])->toBe('Changed Signer');
});

it('saves reusable bank and three signatory defaults without generating payroll', function () {
    $service = bankAdviceServiceFor([]);
    $controller = new BankAdviceController($service);
    $data = bankAdviceData();
    unset($data['year'], $data['month'], $data['reference_number'], $data['reference_year'], $data['issue_date']);
    $controller->saveDefaults(bankAdviceRequest($data));

    expect(PayrollBankAdvice::count())->toBe(0)
        ->and(PayrollBankAdviceSetting::count())->toBe(1)
        ->and($service->defaults()['account_no'])->toBe('0012345678900')
        ->and($service->defaults()['signatories'])->toHaveCount(3);
});

it('finds initial signatory names from active employee designations and the head office bank', function () {
    DB::table('branches')->insert(['id' => 1, 'is_head_office' => true]);
    DB::table('branch_payroll_banks')->insert(['branch_id' => 1, 'is_active' => true, 'bank_name' => 'Office Bank', 'bank_branch_name' => 'Office Branch', 'account_no' => '000123']);
    DB::table('designations')->insert([['id' => 1, 'name' => 'Director (Finance & Accounts)'], ['id' => 2, 'name' => 'Executive Director']]);
    DB::table('employees')->insert([
        ['id' => 1, 'name_en' => 'Finance Name', 'pin' => '0001', 'status' => 'active', 'designation_id' => 1],
        ['id' => 2, 'name_en' => 'Director Name', 'pin' => '0002', 'status' => 'active', 'designation_id' => 2],
    ]);
    $defaults = bankAdviceServiceFor([])->defaults();
    expect($defaults['bank_name'])->toBe('Office Bank')
        ->and($defaults['account_no'])->toBe('000123')
        ->and($defaults['signatories'][0]['name'])->toBe('Finance Name')
        ->and($defaults['signatories'][1]['name'])->toBe('Director Name')
        ->and($defaults['signatories'][2]['name'])->toBe('');
});

it('validates duplicate references and suggests the next reference number', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $service->generate(bankAdviceData(), null);
    $controller = new BankAdviceController($service);

    expect($service->nextReferenceNumber('2026', 'Mou/HRD/ED/Salary'))->toBe('241')
        ->and($service->nextReferenceNumber('2027', 'Mou/HRD/ED/Salary'))->toBe('1')
        ->and(fn () => $controller->store(bankAdviceRequest(bankAdviceData())))->toThrow(ValidationException::class);
});

it('creates a saved advice through validated form input and requires named signatories', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $controller = new BankAdviceController($service);
    $data = bankAdviceData();
    $data['reference_prefix'] .= '/';
    $response = $controller->store(bankAdviceRequest($data));
    expect($response->getTargetUrl())->toBe(route('payroll.bank-advice.show', 1))
        ->and(PayrollBankAdvice::first()->reference)->toBe('Mou/HRD/ED/Salary/2026/240');
    $data['reference_number'] = '241';
    $data['signatories'] = [['employee_id' => null, 'name' => '', 'designation' => '', 'organization' => '']];
    expect(fn () => $controller->store(bankAdviceRequest($data)))->toThrow(ValidationException::class)
        ->and(PayrollBankAdvice::count())->toBe(1);
});

it('exports the frozen account list to Excel with exact amounts and account numbers', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $advice = $service->generate(array_merge(bankAdviceData(), ['include_account_list' => true]), null);
    $response = (new BankAdviceController($service))->excel(bankAdviceRequest([]), $advice);
    $path = tempnam(sys_get_temp_dir(), 'bank-advice-test-');
    try {
        file_put_contents($path, $response->getContent());
        $zip = new ZipArchive;
        $zip->open($path);
        $strings = $zip->getFromName('xl/sharedStrings.xml');
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        expect($strings)->toContain('00010002', 'Mou/HRD/ED/Salary/2026/240', 'September 2026', 'Seven Thousand Taka and Thirty Paisa Only')
            ->and($xml)->toContain('<v>7000.30</v>', '<v>3000.30</v>');
    } finally {
        @unlink($path);
    }
});

it('renders the saved reference, month, debit account, three signatories and reconciled attachment', function () {
    $advice = bankAdviceServiceFor(bankAdviceSourceRows())->generate(array_merge(bankAdviceData(), ['include_account_list' => true]), null);
    $html = view('payroll.bank-advice.document', ['advice' => $advice])->render();
    expect($html)->toContain('Advice on salary transfer for September 2026.', 'Mou/HRD/ED/Salary/2026/240',
        '0012345678900', '00010002', 'Finance Director', 'Executive Director', 'Third Signer',
        '7,000.30', 'Seven Thousand Taka and Thirty Paisa Only', 'Salary Transfer Account List', 'A4 portrait', 'margin: 1.9in 1in 0.5in');
});

it('omits the account list by default and retains the selected option when editing', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $advice = $service->generate(bankAdviceData(), null);
    $originalEntries = $advice->entries;
    expect($advice->fresh()->include_account_list)->toBeFalse();
    $html = view('payroll.bank-advice.document', ['advice' => $advice])->render();
    expect($html)->not->toContain('Salary Transfer Account List', '00010002', 'mentioned in the attached sheet')
        ->toContain('7,000.30');
    expect(fn () => (new BankAdviceController($service))->excel(bankAdviceRequest([]), $advice))->toThrow(HttpException::class);

    $service->update($advice, array_merge(bankAdviceData(), ['include_account_list' => true]));
    expect($advice->fresh()->include_account_list)->toBeTrue()
        ->and($advice->fresh()->entries)->toBe($originalEntries);
    expect(view('payroll.bank-advice.document', ['advice' => $advice->fresh()])->render())
        ->toContain('Salary Transfer Account List', '00010002');

    $service->update($advice, array_merge(bankAdviceData(), ['include_account_list' => false]));
    expect($advice->fresh()->include_account_list)->toBeFalse()
        ->and($advice->fresh()->total)->toBe('7000.30');
});

it('allows only superadmins to delete an advice even if another user has payroll permissions', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $advice = $service->generate(bankAdviceData(), null);
    $controller = new BankAdviceController($service);
    expect(fn () => $controller->destroy(bankAdviceRequest([]), $advice))->toThrow(HttpException::class)
        ->and(PayrollBankAdvice::count())->toBe(1);

    $response = $controller->destroy(bankAdviceRequest([], superadmin: true), $advice);
    expect($response->getTargetUrl())->toBe(route('payroll.bank-advice.index'))
        ->and(PayrollBankAdvice::count())->toBe(0);
    expect(Route::getRoutes()->getByName('payroll.bank-advice.destroy')->methods())->toBe(['DELETE']);
});

it('keeps the saved month visible in the list and enforces office and route permissions', function () {
    $service = bankAdviceServiceFor(bankAdviceSourceRows());
    $service->generate(bankAdviceData(), null);
    $controller = new BankAdviceController($service);
    $request = bankAdviceRequest(['year' => 2026, 'month' => 9]);
    $request->headers->set('X-Inertia', 'true');
    $response = $controller->index($request)->toResponse($request);
    expect($response->getData(true)['props']['records']['data'][0]['salary_month'])->toBe('September 2026');

    $branchRequest = Request::create('/');
    $branchRequest->setUserResolver(fn () => new User(['account_type' => 'branch']));
    expect(fn () => $controller->index($branchRequest))->toThrow(HttpException::class);

    expect(Route::getRoutes()->getByName('payroll.bank-advice.store')->gatherMiddleware())->toContain('permission:payroll.edit')
        ->and(Route::getRoutes()->getByName('payroll.bank-advice.update')->gatherMiddleware())->toContain('permission:payroll.edit')
        ->and(Route::getRoutes()->getByName('payroll.bank-advice.pdf')->gatherMiddleware())->toContain('permission:reports.export');
});
