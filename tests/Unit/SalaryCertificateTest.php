<?php

use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\SalaryHead;
use App\Services\PayrollReportService;
use App\Support\AmountInWords;
use App\Support\ProjectPdf;
use Illuminate\Support\Collection;

function salaryCertificateFixture(array $employeeOverrides = [], array $filters = [], bool $withheld = false): array
{
    $employee = new Employee(array_merge([
        'pin' => '0851', 'name_en' => 'Md. Rashed Uzzaman', 'gender' => 'male', 'status' => 'active',
        'fathers_name' => 'Md. Khorshed Alo', 'mothers_name' => 'Mst. Rokaya Begum',
        'village' => 'Palashbari', 'post_office' => 'Kashab', 'upazila' => 'Manda', 'district' => 'Naogaon',
        'joining_date' => '2024-03-04', 'confirmation_date' => '2024-07-01',
    ], $employeeOverrides));
    foreach (['designation', 'department', 'branch', 'payscale'] as $relation) {
        $employee->setRelation($relation, null);
    }
    $payslip = new Payslip([
        'employee_id' => 1, 'employee_name' => 'Md. Rashed Uzzaman', 'designation_name' => 'Officer-2',
        'branch_name' => 'Test Branch', 'basic_salary' => 14552, 'gross_salary' => 36831,
        'total_deduction' => 1555, 'net_payable' => 35276, 'is_withheld' => $withheld,
    ]);
    $pf = new PayslipLine(['head_name' => 'PF', 'type' => 'deduction', 'amount_type' => 'percentage', 'input_value' => 10, 'computed_amount' => 1455]);
    $pf->setRelation('head', new SalaryHead(['is_pf_head' => true]));
    $welfare = new PayslipLine(['head_name' => 'Welfare', 'type' => 'deduction', 'computed_amount' => 100]);
    $welfare->setRelation('head', new SalaryHead(['is_welfare' => true]));
    $payslip->setRelation('employee', $employee);
    $payslip->setRelation('payrollRun', new PayrollRun(['year' => 2026, 'month' => 8]));
    $payslip->setRelation('lines', collect([$pf, $welfare]));

    $service = new class($employee, $payslip) extends PayrollReportService
    {
        public function __construct(private Employee $fixtureEmployee, private Payslip $fixturePayslip) {}

        protected function findCertificateEmployee(int $id): ?Employee
        {
            return $this->fixtureEmployee;
        }

        protected function fetchPayslips(array $config, array $filters): Collection
        {
            expect($filters['project_id'])->toBeNull();

            return collect([$this->fixturePayslip]);
        }

        public function salaryCertificateDefaults(): array
        {
            return ['certificate_signatory_name' => 'Md. Erfan Ali', 'certificate_signatory_designation' => 'Executive Director'];
        }
    };

    return $service->build('salary-certificate', config('payroll_reports.reports.salary-certificate'), array_merge([
        'employee_id' => 1, 'year' => 2026, 'month' => 8, 'project_id' => 999,
        'certificate_issue_date' => '2026-09-15', 'certificate_reference_year' => '2026', 'certificate_reference_number' => '123',
    ], $filters));
}

it('fills the selected employee profile and calculates exact service lengths on the issue date', function () {
    $payload = salaryCertificateFixture();
    expect($payload['employee']['pin'])->toBe('0851')
        ->and($payload['employee']['fathers_name'])->toBe('Md. Khorshed Alo')
        ->and($payload['employee']['upazila'])->toBe('Manda')
        ->and($payload['employee']['joining_date'])->toBe('04-03-2024')
        ->and($payload['employee']['confirmation_date'])->toBe('01-07-2024')
        ->and($payload['employee']['service_from_joining'])->toBe('2Y,6M,11D')
        ->and($payload['employee']['service_from_confirmation'])->toBe('2Y,2M,14D')
        ->and($payload['reference'])->toBe('Mou/HRD/LoI/2026/123')
        ->and($payload['signatory']['name'])->toBe('Md. Erfan Ali');
});

it('uses posted salary figures with actual deductions and take home salary in words', function () {
    $payload = salaryCertificateFixture();
    expect($payload['gross'])->toBe(36831.0)
        ->and($payload['basic'])->toBe(14552.0)
        ->and(array_sum(array_column($payload['certificate_deductions'], 'amount')))->toBe(1555.0)
        ->and($payload['certificate_deductions'][0])->toBe(['name' => 'PF (10% on Basic)', 'amount' => 1455.0])
        ->and($payload['certificate_deductions'][1])->toBe(['name' => 'PF Loan', 'amount' => 0.0])
        ->and($payload['gross'] - $payload['deduction'])->toBe($payload['net'])
        ->and($payload['in_words'])->toBe('Thirty Five Thousand Two Hundred Seventy Six Taka Only')
        ->and(AmountInWords::takaWithPaisa(35276.30))->toBe('Thirty Five Thousand Two Hundred Seventy Six Taka and Thirty Paisa Only');
});

it('supports female and probationary staff without claiming they are permanent', function () {
    $payload = salaryCertificateFixture(['gender' => 'female', 'confirmation_date' => null]);
    expect($payload['employee']['pronoun'])->toBe('She')
        ->and($payload['employee']['employment_type'])->toBe('probationary')
        ->and($payload['employee']['service_from_confirmation'])->toBe('-');
});

it('stops service length at departure and blocks withheld salary and invalid issue dates', function () {
    $payload = salaryCertificateFixture(['status' => 'inactive', 'resignation_date' => '2026-09-01']);
    expect($payload['employee']['is_current'])->toBeFalse()
        ->and($payload['employee']['service_from_joining'])->toBe('2Y,5M,28D')
        ->and(salaryCertificateFixture(withheld: true)['meta']['message'])->toContain('withheld')
        ->and(salaryCertificateFixture(filters: ['certificate_issue_date' => '2024-01-01'])['meta']['message'])->toContain('before');
});

it('renders the requested letter with pad margins and editable signatory details', function () {
    $payload = salaryCertificateFixture(filters: ['certificate_signatory_name' => 'Authorized Person', 'certificate_signatory_designation' => 'Director']);
    $html = view('payroll.reports.document', [
        'payload' => $payload, 'title' => 'Salary Certificate', 'companyName' => 'MOUSUMI', 'companyAddress' => 'Ukilpara, Naogaon',
    ])->render();
    expect($html)->toContain('LETTER OF INTRODUCTION', 'Staff Information:', '0851', 'Md. Khorshed Alo',
        'PF Loan', 'Motorcycle Loan', 'Laptop Loan', 'Staff Welfare Fund', 'Income Tax',
        '35,276.00', 'Mou/HRD/LoI/2026/123', 'Authorized Person', 'margin: 1.9in 1in 0.5in', 'A4 portrait')
        ->not->toContain('payroll-report-header', 'logo.png');

    $pdf = ProjectPdf::loadHTML($html)->setOption('defaultMediaType', 'print')->setPaper('a4', 'portrait');
    expect($pdf->output())->toStartWith('%PDF')
        ->and($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
});

it('groups loan deductions by type while preserving other deductions', function () {
    $lines = collect();
    foreach ([['PF loan one', 'pf_loan', 100], ['PF loan two', 'pf_loan', 200], ['Motorcycle installment', 'motorcycle_loan', 500], ['Laptop installment', 'laptop_loan', 300], ['Fine', null, 50]] as [$name, $type, $amount]) {
        $line = new PayslipLine(['head_name' => $name, 'type' => 'deduction', 'computed_amount' => $amount]);
        $line->setRelation('head', new SalaryHead(['is_loan_head' => $type !== null, 'loan_head_type' => $type]));
        $lines->push($line);
    }
    $payslip = new Payslip(['total_deduction' => 1150]);
    $payslip->setRelation('lines', $lines);
    $method = new ReflectionMethod(PayrollReportService::class, 'salaryCertificateDeductions');
    $rows = collect($method->invoke(app(PayrollReportService::class), $payslip))->keyBy('name');
    expect($rows['PF Loan']['amount'])->toBe(300.0)
        ->and($rows['Motorcycle Loan']['amount'])->toBe(500.0)
        ->and($rows['Laptop Loan']['amount'])->toBe(300.0)
        ->and($rows['Fine']['amount'])->toBe(50.0)
        ->and($rows->sum('amount'))->toBe(1150.0);
});
