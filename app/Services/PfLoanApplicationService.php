<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Support\BanglaTaka;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PfLoanApplicationService
{
    public function __construct(
        protected LoanApplicationService $applications,
        protected LoanCalculationService $calculator,
    ) {}

    public function minimumServiceYears(): int
    {
        return max(0, (int) config('employee_loans.pf_self_service.min_years_from_confirmation', 2));
    }

    public function balancePercent(): float
    {
        $percent = (float) config('employee_loans.pf_self_service.max_balance_percent', 90);

        return max(0, min(100, $percent));
    }

    public function maxAmount(float $pfBalance): float
    {
        if ($pfBalance <= 0 || $this->balancePercent() <= 0) {
            return 0.0;
        }

        $raw = round($pfBalance * $this->balancePercent() / 100, 2);

        return (float) floor($raw);
    }

    public function eligibleFrom(mixed $confirmation): ?Carbon
    {
        if (! $confirmation) {
            return null;
        }

        return Carbon::parse($confirmation)->startOfDay()->addYears($this->minimumServiceYears());
    }

    public function hasRequiredService(mixed $confirmation, ?CarbonInterface $on = null): bool
    {
        $from = $this->eligibleFrom($confirmation);
        if (! $from) {
            return false;
        }

        $on = Carbon::parse($on ?? Carbon::today())->startOfDay();

        return $on->greaterThanOrEqualTo($from);
    }

    /**
     * @return array<string, mixed>
     */
    public function assess(Employee $employee): array
    {
        $employee->loadMissing(['designation:id,name', 'salaryGrade:id,code,name', 'user:id,employee_id,signature']);

        $years = $this->minimumServiceYears();
        $percent = $this->balancePercent();
        $balance = (float) $employee->pf_balance;
        $max = $this->maxAmount($balance);
        $eligibleFrom = $this->eligibleFrom($employee->confirmation_date);
        $previous = $this->previousLoanLines($employee);
        $signature = $employee->user?->signature ?: $employee->signature;

        $policies = LoanPolicy::query()
            ->where('loan_type', 'pf_loan')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $usable = $policies->filter(function (LoanPolicy $policy) use ($max) {
            return $max >= (float) $policy->min_amount && (float) $policy->max_amount >= (float) $policy->min_amount;
        })->values();

        $active = EmployeeLoan::activeOfType((int) $employee->id, 'pf_loan');
        $open = LoanApplication::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereHas('policy', fn ($q) => $q->where('loan_type', 'pf_loan'))
            ->latest('id')
            ->first();

        $blockers = [];
        if ($employee->status && $employee->status !== 'active') {
            $blockers[] = 'শুধু সক্রিয় কর্মী পিএফ ঋণের আবেদন করতে পারবেন।';
        }
        if (! $this->hasRequiredService($employee->confirmation_date)) {
            $blockers[] = $employee->confirmation_date
                ? "কনফার্মেশন থেকে {$years} বছর চাকরি হয়নি। আবেদন করা যাবে ".$eligibleFrom?->format('d-M-Y').' থেকে।'
                : "কনফার্মেশন তারিখ নেই। কনফার্মেশন থেকে {$years} বছর পূর্ণ না হলে পিএফ ঋণের আবেদন করা যায় না।";
        }
        if ($max < 1) {
            $blockers[] = "পিএফ ব্যালেন্স নেই, তাই ব্যালেন্সের {$percent}% পর্যন্ত আবেদন করা যাচ্ছে না।";
        }
        if ($active) {
            $blockers[] = 'একটি চালু পিএফ ঋণ আছে ('.$active->loan_number.')। সেটি সম্পূর্ণ শোধ হওয়ার পর নতুন আবেদন করা যাবে।';
        }
        if ($open) {
            $blockers[] = 'একটি পিএফ আবেদন ইতিমধ্যে '.$open->status.' আছে ('.$open->application_number.')।';
        }
        if ($policies->isEmpty()) {
            $blockers[] = 'কোনো সক্রিয় পিএফ লোন পলিসি নেই।';
        } elseif ($usable->isEmpty()) {
            $blockers[] = "পিএফ ব্যালেন্সের {$percent}% কোনো পিএফ পলিসির সর্বনিম্ন ঋণসীমায় পৌঁছায় না।";
        }

        $savedDraft = $this->currentDraft($employee);
        $savedForm = is_array($savedDraft?->form_snapshot) ? $savedDraft->form_snapshot : [];
        $permanentAddress = $this->permanentAddress($employee);
        $today = Carbon::today();
        $name = trim((string) ($employee->name_bn ?: $employee->name_en));
        $grade = $employee->salaryGrade?->displayLabel() ?: '—';

        return [
            'can_apply' => $blockers === [],
            'can_submit' => $blockers === [] && (bool) $signature,
            'blockers' => $blockers,
            'service_years_required' => $years,
            'max_percent' => $percent,
            'pf_balance' => $balance,
            'max_amount' => $max,
            'confirmation_date' => $employee->confirmation_date?->format('d-M-Y'),
            'eligible_from' => $eligibleFrom?->format('d-M-Y'),
            'needs_signature' => ! $signature,
            'active_loan' => $active ? [
                'id' => $active->id,
                'loan_number' => $active->loan_number,
            ] : null,
            'open_application' => $open ? [
                'id' => $open->id,
                'application_number' => $open->application_number,
                'status' => $open->status,
            ] : null,
            'policies' => $usable->map(fn (LoanPolicy $policy) => [
                'id' => $policy->id,
                'code' => $policy->code,
                'name' => $policy->name,
                'total_installments' => (int) $policy->total_installments,
                'min_amount' => (float) $policy->min_amount,
                'max_amount' => (float) $policy->max_amount,
                'interest_rate' => (float) $policy->default_interest_rate,
            ])->all(),
            'saved_draft' => $savedDraft ? [
                'id' => $savedDraft->id,
                'application_number' => $savedDraft->application_number,
                'loan_policy_id' => $savedDraft->loan_policy_id,
                'applied_amount' => (float) $savedDraft->applied_amount > 0 ? (string) (int) round((float) $savedDraft->applied_amount) : '',
                'amount_in_words' => (string) ($savedForm['amount_in_words'] ?? ''),
                'reason' => (string) ($savedForm['reason'] ?? ''),
                'address' => (string) (($savedForm['address'] ?? '') !== '' ? $savedForm['address'] : $permanentAddress),
                'previous_details' => (string) ($savedForm['previous_details'] ?? $previous['details']),
                'previous_settled' => (string) ($savedForm['previous_settled'] ?? $previous['settled']),
                'previous_last_paid_on' => (string) ($savedForm['previous_last_paid_on'] ?? $previous['last_paid_on']),
                'previous_remaining' => (string) ($savedForm['previous_remaining'] ?? $previous['remaining']),
            ] : null,
            'draft' => [
                'day' => $today->format('d'),
                'month' => $today->format('m'),
                'year' => $today->format('Y'),
                'amount' => '',
                'amount_in_words' => '',
                'reason' => '',
                'pf_balance' => taka_fmt($balance),
                'salary_grade' => $grade,
                'basic_salary' => taka_fmt($employee->resolveBasicSalary()),
                'installments' => '',
                'installment_amount' => '',
                'previous_details' => $previous['details'],
                'previous_settled' => $previous['settled'],
                'previous_last_paid_on' => $previous['last_paid_on'],
                'previous_remaining' => $previous['remaining'],
                'name' => $name !== '' ? $name : '—',
                'designation' => $employee->designation?->name ?: '—',
                'pin' => $employee->pin ?: '—',
                'address' => $permanentAddress,
                'signature' => $signature,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Employee $employee, int $policyId, float $appliedAmount): array
    {
        $assessment = $this->assess($employee);
        $policy = $this->usablePolicy($policyId, (float) $assessment['max_amount']);
        $amount = SalaryStructureCalculator::roundTaka($appliedAmount);
        $ceiling = (float) $assessment['max_amount'];
        $calc = $this->calculator->calculate($policy, max(1, $amount));

        $message = null;
        $within = true;
        if ($amount < (float) $policy->min_amount) {
            $within = false;
            $message = 'এই মেয়াদে সর্বনিম্ন '.taka_fmt($policy->min_amount).' টাকা আবেদন করা যায়।';
        } elseif ($amount > $ceiling) {
            $within = false;
            $message = 'আবেদনের অঙ্ক মোট পিএফ ব্যালেন্সের (নিজ অংশ + প্রতিষ্ঠান) '.$assessment['max_percent'].'% এর বেশি হতে পারবে না। সর্বোচ্চ '.taka_fmt($ceiling).' টাকা।';
        }

        return [
            'within_limit' => $within && $assessment['can_apply'],
            'message' => $message,
            'amount_in_words' => BanglaTaka::taka($amount),
            'installments' => (string) $calc['total_installments'],
            'installment_amount' => taka_fmt($calc['installment_amount_monthly']),
            'service_charge' => taka_fmt($calc['service_charge_amount']),
            'total_payable' => taka_fmt($calc['total_payable']),
            'max_amount' => (float) $assessment['max_amount'],
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function submit(Employee $employee, array $input, int $userId): LoanApplication
    {
        if (! empty($input['save_draft'])) {
            return $this->saveDraft($employee, $input, $userId);
        }

        $assessment = $this->assess($employee);
        if (! $assessment['can_apply']) {
            throw new InvalidArgumentException($assessment['blockers'][0] ?? 'পিএফ ঋণের আবেদন করা যাচ্ছে না।');
        }
        if (! $assessment['can_submit']) {
            throw new InvalidArgumentException('প্রোফাইলে ডিজিটাল স্বাক্ষর নেই। আবেদনের আগে Profile থেকে স্বাক্ষর আপলোড করুন।');
        }

        $policy = $this->usablePolicy((int) $input['loan_policy_id'], (float) $assessment['max_amount']);
        $amount = SalaryStructureCalculator::roundTaka((float) $input['applied_amount']);
        $ceiling = (float) $assessment['max_amount'];

        if ($amount < (float) $policy->min_amount) {
            throw new InvalidArgumentException('এই মেয়াদে সর্বনিম্ন '.taka_fmt($policy->min_amount).' টাকা আবেদন করা যায়।');
        }
        if ($amount > $ceiling) {
            throw new InvalidArgumentException('আবেদনের অঙ্ক মোট পিএফ ব্যালেন্সের (নিজ অংশ + প্রতিষ্ঠান) '.$assessment['max_percent'].'% এর বেশি হতে পারবে না। সর্বোচ্চ '.taka_fmt($ceiling).' টাকা।');
        }

        $reason = $this->clean($input['reason'] ?? null, 500);
        $words = $this->clean($input['amount_in_words'] ?? null, 300);
        $address = $this->clean($input['address'] ?? null, 500);
        if ($reason === '') {
            throw new InvalidArgumentException('ঋণ গ্রহণের কারণ লিখুন।');
        }
        if ($words === '') {
            $words = BanglaTaka::taka($amount);
        }
        if ($address === '') {
            throw new InvalidArgumentException('ঠিকানা লিখুন।');
        }

        $draft = $assessment['draft'];
        $previousDetails = $this->clean($input['previous_details'] ?? null, 500) ?: $draft['previous_details'];
        $previousSettled = $this->clean($input['previous_settled'] ?? null, 200) ?: $draft['previous_settled'];
        $previousLastPaid = $this->clean($input['previous_last_paid_on'] ?? null, 100) ?: $draft['previous_last_paid_on'];
        $previousRemaining = $this->clean($input['previous_remaining'] ?? null, 50) ?: $draft['previous_remaining'];

        $calc = $this->calculator->calculate($policy, $amount);

        return DB::transaction(function () use (
            $employee,
            $policy,
            $amount,
            $userId,
            $reason,
            $words,
            $address,
            $assessment,
            $ceiling,
            $calc,
            $draft,
            $previousDetails,
            $previousSettled,
            $previousLastPaid,
            $previousRemaining,
        ) {
            $pfPolicyIds = LoanPolicy::query()->where('loan_type', 'pf_loan')->pluck('id');
            $stillOpen = LoanApplication::query()
                ->where('employee_id', $employee->id)
                ->whereIn('status', ['pending', 'approved'])
                ->whereIn('loan_policy_id', $pfPolicyIds)
                ->lockForUpdate()
                ->exists();

            if ($stillOpen || EmployeeLoan::activeOfType((int) $employee->id, 'pf_loan', true)) {
                throw new InvalidArgumentException('একটি পিএফ আবেদন বা চালু ঋণ ইতিমধ্যে আছে।');
            }

            $existingDraft = $this->currentDraft($employee);
            $formSnapshot = [
                'day' => $draft['day'],
                'month' => $draft['month'],
                'year' => $draft['year'],
                'amount' => taka_fmt($amount),
                'amount_in_words' => $words,
                'reason' => $reason,
                'pf_balance' => $draft['pf_balance'],
                'salary_grade' => $draft['salary_grade'],
                'basic_salary' => $draft['basic_salary'],
                'installments' => (string) $calc['total_installments'],
                'installment_amount' => taka_fmt($calc['installment_amount_monthly']),
                'previous_details' => $previousDetails,
                'previous_settled' => $previousSettled,
                'previous_last_paid_on' => $previousLastPaid,
                'previous_remaining' => $previousRemaining,
                'name' => $draft['name'],
                'designation' => $draft['designation'],
                'pin' => $draft['pin'],
                'address' => $address,
                'signature' => $draft['signature'],
            ];

            if ($existingDraft) {
                $existingDraft->update([
                    'loan_policy_id' => $policy->id,
                    'loan_cycle' => EmployeeLoan::nextCycleFor((int) $employee->id, 'pf_loan'),
                    'applied_amount' => $amount,
                    'grace_months' => $calc['grace_months'],
                    'interval_months' => $calc['interval_months'],
                    'principal_amount' => $calc['principal_amount'],
                    'rate_yearly' => $calc['rate_yearly'],
                    'installment_amount_monthly' => $calc['installment_amount_monthly'],
                    'total_installments' => $calc['total_installments'],
                    'service_charge_amount' => $calc['service_charge_amount'],
                    'total_payable' => $calc['total_payable'],
                    'status' => 'pending',
                    'notes' => $reason,
                    'max_loan_limit_amount' => $ceiling,
                    'max_loan_limit_percentage' => $assessment['max_percent'],
                    'form_snapshot' => $formSnapshot,
                ]);

                return $existingDraft->fresh(['policy:id,name,code', 'employee:id,pin,name_en']);
            }

            $application = $this->applications->createApplication([
                'application_number' => $this->applications->nextApplicationNumber(),
                'application_date' => Carbon::today()->toDateString(),
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'loan_committee_id' => null,
                'applied_amount' => $amount,
                'notes' => $reason,
            ], $userId, true, true);

            $application->update([
                'channel' => 'employee',
                'notes' => $reason,
                'max_loan_limit_amount' => $ceiling,
                'max_loan_limit_percentage' => $assessment['max_percent'],
                'form_snapshot' => $formSnapshot,
            ]);

            return $application->fresh(['policy:id,name,code', 'employee:id,pin,name_en']);
        });
    }

    protected function usablePolicy(int $policyId, float $maxAmount): LoanPolicy
    {
        $policy = LoanPolicy::query()
            ->where('id', $policyId)
            ->where('loan_type', 'pf_loan')
            ->where('is_active', true)
            ->first();

        if (! $policy) {
            throw new InvalidArgumentException('পিএফ লোনের মেয়াদ নির্বাচন করুন।');
        }

        if ($maxAmount < (float) $policy->min_amount) {
            throw new InvalidArgumentException('এই মেয়াদ আপনার পিএফ সীমার জন্য প্রযোজ্য নয়।');
        }

        return $policy;
    }

    /**
     * @return array{details: string, settled: string, last_paid_on: string, remaining: string}
     */
    protected function previousLoanLines(Employee $employee): array
    {
        $loans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->where('loan_type', 'pf_loan')
            ->whereIn('status', ['active', 'completed'])
            ->with(['installments' => fn ($q) => $q->orderBy('installment_no')])
            ->orderByDesc('id')
            ->get();

        if ($loans->isEmpty()) {
            return [
                'details' => 'নেই',
                'settled' => '—',
                'last_paid_on' => '—',
                'remaining' => '0',
            ];
        }

        $latest = $loans->first();
        $details = $loans->take(3)->map(function (EmployeeLoan $loan) {
            return 'ঋণ নং '.$loan->loan_number.', আসল '.taka_fmt($loan->principal_amount).' টাকা';
        })->implode('; ');

        if ($loans->count() > 3) {
            $details .= ' (মোট '.$loans->count().'টি)';
        }

        $paid = $latest->installments->where('status', 'paid')->sortByDesc(fn ($row) => $row->paid_at?->timestamp ?? 0)->first();
        $lastPaid = $paid?->paid_at ?? $paid?->due_date;
        $settled = $latest->status === 'completed';
        $remaining = $settled
            ? 0
            : $latest->installments->where('status', '!=', 'paid')->count();

        return [
            'details' => $details,
            'settled' => $settled ? 'হ্যাঁ' : 'না',
            'last_paid_on' => $lastPaid ? Carbon::parse($lastPaid)->format('d/m/Y') : '—',
            'remaining' => (string) $remaining,
        ];
    }

    public function saveDraft(Employee $employee, array $input, int $userId): LoanApplication
    {
        $assessment = $this->assess($employee);
        if (! $assessment['can_apply']) {
            throw new InvalidArgumentException($assessment['blockers'][0] ?? 'পিএফ ঋণের আবেদন সেভ করা যাচ্ছে না।');
        }

        $amount = SalaryStructureCalculator::roundTaka((float) ($input['applied_amount'] ?? 0));
        if ($amount > (float) $assessment['max_amount']) {
            throw new InvalidArgumentException('আবেদনের অঙ্ক মোট পিএফ ব্যালেন্সের (নিজ অংশ + প্রতিষ্ঠান) '.$assessment['max_percent'].'% এর বেশি হতে পারবে না। সর্বোচ্চ '.taka_fmt($assessment['max_amount']).' টাকা।');
        }

        $policyId = ! empty($input['loan_policy_id']) ? (int) $input['loan_policy_id'] : null;
        $policy = $policyId
            ? LoanPolicy::query()->where('id', $policyId)->where('loan_type', 'pf_loan')->where('is_active', true)->first()
            : null;
        $policy ??= LoanPolicy::query()->where('loan_type', 'pf_loan')->where('is_active', true)->orderBy('sort_order')->first();
        if (! $policy) {
            throw new InvalidArgumentException('কোনো সক্রিয় পিএফ লোন পলিসি নেই।');
        }

        $reason = $this->clean($input['reason'] ?? null, 500);
        $words = $this->clean($input['amount_in_words'] ?? null, 300);
        if ($words === '' && $amount > 0) {
            $words = BanglaTaka::taka($amount);
        }
        $address = $this->clean($input['address'] ?? null, 500) ?: $this->permanentAddress($employee);
        $draft = $assessment['draft'];
        $previousDetails = $this->clean($input['previous_details'] ?? null, 500) ?: $draft['previous_details'];
        $previousSettled = $this->clean($input['previous_settled'] ?? null, 200) ?: $draft['previous_settled'];
        $previousLastPaid = $this->clean($input['previous_last_paid_on'] ?? null, 100) ?: $draft['previous_last_paid_on'];
        $previousRemaining = $this->clean($input['previous_remaining'] ?? null, 50) ?: $draft['previous_remaining'];
        $calc = $amount > 0 ? $this->calculator->calculate($policy, $amount) : null;

        return DB::transaction(function () use (
            $employee, $policy, $amount, $userId, $reason, $words, $address, $assessment, $calc, $draft,
            $previousDetails, $previousSettled, $previousLastPaid, $previousRemaining,
        ) {
            $existing = $this->currentDraft($employee);
            $formSnapshot = [
                'day' => $draft['day'],
                'month' => $draft['month'],
                'year' => $draft['year'],
                'amount' => $amount > 0 ? (string) (int) round($amount) : '',
                'amount_in_words' => $words,
                'reason' => $reason,
                'pf_balance' => $draft['pf_balance'],
                'salary_grade' => $draft['salary_grade'],
                'basic_salary' => $draft['basic_salary'],
                'installments' => $calc ? (string) $calc['total_installments'] : (string) $policy->total_installments,
                'installment_amount' => $calc ? taka_fmt($calc['installment_amount_monthly']) : '',
                'previous_details' => $previousDetails,
                'previous_settled' => $previousSettled,
                'previous_last_paid_on' => $previousLastPaid,
                'previous_remaining' => $previousRemaining,
                'name' => $draft['name'],
                'designation' => $draft['designation'],
                'pin' => $draft['pin'],
                'address' => $address,
                'signature' => $draft['signature'],
            ];

            $money = $calc ? [
                'principal_amount' => $calc['principal_amount'],
                'rate_yearly' => $calc['rate_yearly'],
                'installment_amount_monthly' => $calc['installment_amount_monthly'],
                'total_installments' => $calc['total_installments'],
                'service_charge_amount' => $calc['service_charge_amount'],
                'total_payable' => $calc['total_payable'],
            ] : [];

            if ($existing) {
                $existing->update([
                    'loan_policy_id' => $policy->id,
                    'applied_amount' => $amount,
                    'notes' => $reason,
                    'form_snapshot' => $formSnapshot,
                    ...$money,
                ]);

                return $existing->fresh(['policy:id,name,code', 'employee:id,pin,name_en']);
            }

            return LoanApplication::query()->create([
                'application_number' => $this->applications->nextApplicationNumber(),
                'application_date' => Carbon::today()->toDateString(),
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'applied_amount' => $amount,
                'status' => 'draft',
                'channel' => 'employee',
                'notes' => $reason,
                'max_loan_limit_amount' => $assessment['max_amount'],
                'max_loan_limit_percentage' => $assessment['max_percent'],
                'form_snapshot' => $formSnapshot,
                'created_by' => $userId,
                ...$money,
            ]);
        });
    }

    protected function currentDraft(Employee $employee): ?LoanApplication
    {
        return LoanApplication::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'draft')
            ->where('channel', 'employee')
            ->latest('id')
            ->first();
    }

    protected function permanentAddress(Employee $employee): string
    {
        $row = DB::table('employee_addresses')
            ->where('employee_id', $employee->id)
            ->where('type', 'permanent')
            ->first();

        if (! $row) {
            return '';
        }

        $details = trim((string) ($row->address_details ?? ''));
        if ($details !== '') {
            return $details;
        }

        $parts = [];
        foreach (['village', 'union', 'upazila', 'district', 'division'] as $field) {
            $value = trim((string) ($row->{$field} ?? ''));
            if ($value !== '') {
                $parts[] = $value;
            }
        }

        return implode(', ', $parts);
    }

    protected function clean(mixed $value, int $max): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)) ?? '');

        return mb_substr($text, 0, $max);
    }
}
