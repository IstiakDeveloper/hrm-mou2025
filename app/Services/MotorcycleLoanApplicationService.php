<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use App\Support\BanglaTaka;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class MotorcycleLoanApplicationService
{
    public function __construct(
        protected LoanApplicationService $applications,
        protected LoanCalculationService $calculator,
        protected PromotionEvaluationWorkflowService $promotions,
    ) {}

    public function standardMax(): float
    {
        return max(0, (float) config('employee_loans.motorcycle_self_service.standard_max_amount', 150000));
    }

    public function seniorMax(): float
    {
        return max(0, (float) config('employee_loans.motorcycle_self_service.senior_max_amount', 200000));
    }

    public function rank(Employee $employee): string
    {
        $title = mb_strtolower(trim((string) ($employee->designation?->name ?? '')));

        if ($title === '') {
            return 'staff';
        }
        if (str_contains($title, 'executive director') || str_contains($title, 'নির্বাহী পরিচালক')) {
            return 'ed';
        }
        if (str_contains($title, 'director') || str_contains($title, 'পরিচালক')) {
            return 'director';
        }
        if (str_contains($title, 'zonal') || str_contains($title, 'জোনাল')) {
            return 'zm';
        }
        if (str_contains($title, 'regional') || str_contains($title, 'আঞ্চলিক')) {
            return 'rm';
        }
        if (
            (str_contains($title, 'branch manager') || str_contains($title, 'শাখা ব্যবস্থাপক'))
            && ! str_contains($title, 'assistant')
            && ! str_contains($title, 'সহকারী')
        ) {
            return 'bm';
        }
        if (
            str_contains($title, 'assistant branch')
            || str_contains($title, 'সহকারী শাখা')
            || preg_match('/(^|[^a-z])abm([^a-z]|$)/', $title) === 1
        ) {
            return 'abm';
        }

        return 'staff';
    }

    public function maxAmountFor(Employee $employee): float
    {
        return in_array($this->rank($employee), ['abm', 'bm', 'rm', 'zm', 'director', 'ed'], true)
            ? $this->seniorMax()
            : $this->standardMax();
    }

    /**
     * Seats above the applicant. Branch: BM, RM, ZM (own seat and below are skipped).
     * Head office: Department Head, unless the applicant is that head.
     * Both paths then go to Accounts and Executive Director.
     *
     * @return list<string>
     */
    public function stagesFor(Employee $employee): array
    {
        if ($this->isHeadOffice($employee)) {
            return $this->isDepartmentHeadApplicant($employee)
                ? ['accounts', 'ed']
                : ['department_head', 'accounts', 'ed'];
        }

        $skip = match ($this->rank($employee)) {
            'bm' => ['bm'],
            'rm' => ['bm', 'rm'],
            'zm', 'director', 'ed' => ['bm', 'rm', 'zm'],
            default => [],
        };

        return array_values(array_filter(
            ['bm', 'rm', 'zm', 'accounts', 'ed'],
            fn (string $stage) => ! in_array($stage, $skip, true),
        ));
    }

    public function isHeadOffice(Employee $employee): bool
    {
        if ($employee->relationLoaded('branch') && $employee->branch && ! array_key_exists('is_head_office', $employee->branch->getAttributes())) {
            $employee->unsetRelation('branch');
        }
        $employee->loadMissing('branch:id,is_head_office');

        return (bool) $employee->branch?->is_head_office;
    }

    public function isDepartmentHeadApplicant(Employee $employee): bool
    {
        if (! $employee->getKey()) {
            return false;
        }

        return Department::query()->where('head_employee_id', $employee->id)->exists();
    }

    public function stageLabel(string $stage): string
    {
        return match ($stage) {
            'bm' => 'শাখা ব্যবস্থাপক',
            'rm' => 'আঞ্চলিক ব্যবস্থাপক',
            'zm' => 'জোনাল ম্যানেজার',
            'department_head' => 'বিভাগীয় প্রধান',
            'director' => 'পরিচালক (এমএন্ডই)',
            'ed' => 'নির্বাহী পরিচালক',
            'accounts' => 'হিসাব বিভাগ',
            default => $stage,
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function assess(Employee $employee): array
    {
        $employee->loadMissing([
            'designation:id,name',
            'employeeType:id,name',
            'user:id,employee_id,signature',
            'branch:id,name,regional_office_id',
        ]);

        $max = $this->maxAmountFor($employee);
        $stages = $this->stagesFor($employee);
        $policies = LoanPolicy::query()
            ->where('loan_type', 'motorcycle_loan')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();
        $active = EmployeeLoan::activeOfType((int) $employee->id, 'motorcycle_loan');
        $open = LoanApplication::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['in_review', 'pending', 'approved'])
            ->whereHas('policy', fn ($q) => $q->where('loan_type', 'motorcycle_loan'))
            ->latest('id')
            ->first();
        $saved = $this->currentDraft($employee);
        $savedForm = is_array($saved?->form_snapshot) ? $saved->form_snapshot : [];

        $blockers = [];
        if ($employee->status && $employee->status !== 'active') {
            $blockers[] = 'শুধু সক্রিয় কর্মী মোটরসাইকেল ঋণের আবেদন করতে পারবেন।';
        }
        if ($active) {
            $blockers[] = 'একটি চালু মোটরসাইকেল ঋণ আছে ('.$active->loan_number.')।';
        }
        if ($open) {
            $blockers[] = 'একটি মোটরসাইকেল আবেদন ইতিমধ্যে চলছে ('.$open->application_number.')।';
        }
        if ($policies->isEmpty()) {
            $blockers[] = 'কোনো সক্রিয় মোটরসাইকেল লোন পলিসি নেই।';
        }

        $draft = $this->blankForm($employee);
        $signature = $draft['signature'];

        return [
            'can_apply' => $blockers === [],
            'can_submit' => $blockers === [] && (bool) $signature,
            'blockers' => $blockers,
            'rank' => $this->rank($employee),
            'max_amount' => $max,
            'limit_label' => $max >= $this->seniorMax()
                ? 'ABM, BM ও তার উপরের পদের সীমা'
                : 'Officer, Accountant ও অন্যান্য পদের সীমা',
            'first_stage' => $stages[0] ?? 'accounts',
            'first_stage_label' => $this->stageLabel($stages[0] ?? 'accounts'),
            'needs_signature' => ! $signature,
            'policies' => $policies->map(fn (LoanPolicy $policy) => [
                'id' => $policy->id,
                'name' => $policy->name,
                'total_installments' => (int) $policy->total_installments,
                'min_amount' => (float) $policy->min_amount,
                'interest_rate' => (float) $policy->default_interest_rate,
            ])->all(),
            'saved_draft' => $saved ? [
                'loan_policy_id' => $saved->loan_policy_id,
                'applied_amount' => (float) $saved->applied_amount > 0 ? (string) (int) round((float) $saved->applied_amount) : '',
                'amount_in_words' => (string) ($savedForm['amount_in_words'] ?? ''),
                'purpose' => (string) ($savedForm['purpose'] ?? ''),
                'date' => (string) ($savedForm['date'] ?? $draft['date']),
            ] : null,
            'draft' => $draft,
            'active_loan' => $active ? ['id' => $active->id, 'loan_number' => $active->loan_number] : null,
            'open_application' => $open ? [
                'id' => $open->id,
                'application_number' => $open->application_number,
                'status' => $open->status,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Employee $employee, int $policyId, float $appliedAmount): array
    {
        $policy = $this->usablePolicy($policyId);
        $amount = SalaryStructureCalculator::roundTaka($appliedAmount);
        $ceiling = $this->maxAmountFor($employee);
        $calc = $this->calculator->calculate($policy, max(1, $amount));
        $within = true;
        $message = null;
        if ($amount < (float) $policy->min_amount) {
            $within = false;
            $message = 'এই মেয়াদে সর্বনিম্ন '.taka_fmt($policy->min_amount).' টাকা আবেদন করা যায়।';
        } elseif ($amount > $ceiling) {
            $within = false;
            $message = 'আপনার পদের সর্বোচ্চ আবেদন '.taka_fmt($ceiling).' টাকা।';
        }

        return [
            'within_limit' => $within,
            'message' => $message,
            'amount_in_words' => BanglaTaka::taka($amount),
            'installments' => (string) $calc['total_installments'],
            'installment_amount' => taka_fmt($calc['installment_amount_monthly']),
            'max_amount' => $ceiling,
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
            throw new InvalidArgumentException($assessment['blockers'][0] ?? 'মোটরসাইকেল ঋণের আবেদন করা যাচ্ছে না।');
        }
        if (! $assessment['can_submit']) {
            throw new InvalidArgumentException('প্রোফাইলে ডিজিটাল স্বাক্ষর নেই। আবেদনের আগে স্বাক্ষর আপলোড করুন।');
        }

        $policy = $this->usablePolicy((int) $input['loan_policy_id']);
        $amount = SalaryStructureCalculator::roundTaka((float) $input['applied_amount']);
        $ceiling = (float) $assessment['max_amount'];
        if ($amount < (float) $policy->min_amount) {
            throw new InvalidArgumentException('এই মেয়াদে সর্বনিম্ন '.taka_fmt($policy->min_amount).' টাকা আবেদন করা যায়।');
        }
        if ($amount > $ceiling) {
            throw new InvalidArgumentException('আপনার পদের সর্বোচ্চ আবেদন '.taka_fmt($ceiling).' টাকা।');
        }

        $purpose = $this->clean($input['purpose'] ?? null, 500);
        if ($purpose === '') {
            throw new InvalidArgumentException('ঋণ গ্রহণের উদ্দেশ্য লিখুন।');
        }
        $words = $this->clean($input['amount_in_words'] ?? null, 300) ?: BanglaTaka::taka($amount);
        $date = $this->clean($input['date'] ?? null, 20) ?: Carbon::today()->format('d/m/Y');
        $stages = $this->stagesFor($employee);
        $first = $stages[0] ?? 'accounts';

        return DB::transaction(function () use ($employee, $policy, $amount, $userId, $purpose, $words, $date, $ceiling, $first) {
            $form = $this->blankForm($employee);
            $form['date'] = $date;
            $form['amount'] = taka_fmt($amount);
            $form['amount_in_words'] = $words;
            $form['purpose'] = $purpose;

            $existing = $this->currentDraft($employee);
            if ($existing) {
                $existing->update([
                    'loan_policy_id' => $policy->id,
                    'applied_amount' => $amount,
                    'notes' => $purpose,
                    'status' => $first === 'accounts' ? 'pending' : 'in_review',
                    'workflow_stage' => $first,
                    'max_loan_limit_amount' => $ceiling,
                    'form_snapshot' => $form,
                    'channel' => 'employee',
                ]);
                $calc = $this->calculator->calculate($policy, $amount);
                $existing->update([
                    'principal_amount' => $calc['principal_amount'],
                    'rate_yearly' => $calc['rate_yearly'],
                    'installment_amount_monthly' => $calc['installment_amount_monthly'],
                    'total_installments' => $calc['total_installments'],
                    'service_charge_amount' => $calc['service_charge_amount'],
                    'total_payable' => $calc['total_payable'],
                    'grace_months' => $calc['grace_months'],
                    'interval_months' => $calc['interval_months'],
                ]);

                return $existing->fresh(['policy:id,name,code,loan_type']);
            }

            $application = $this->applications->createApplication([
                'application_number' => $this->applications->nextApplicationNumber(),
                'application_date' => Carbon::today()->toDateString(),
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'applied_amount' => $amount,
                'notes' => $purpose,
            ], $userId, false, true);

            $application->update([
                'channel' => 'employee',
                'status' => $first === 'accounts' ? 'pending' : 'in_review',
                'workflow_stage' => $first,
                'max_loan_limit_amount' => $ceiling,
                'form_snapshot' => $form,
            ]);

            return $application->fresh(['policy:id,name,code,loan_type']);
        });
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function saveDraft(Employee $employee, array $input, int $userId): LoanApplication
    {
        $assessment = $this->assess($employee);
        if (! $assessment['can_apply']) {
            throw new InvalidArgumentException($assessment['blockers'][0] ?? 'খসড়া সেভ করা যাচ্ছে না।');
        }

        $amount = SalaryStructureCalculator::roundTaka((float) ($input['applied_amount'] ?? 0));
        if ($amount > (float) $assessment['max_amount']) {
            throw new InvalidArgumentException('আপনার পদের সর্বোচ্চ আবেদন '.taka_fmt($assessment['max_amount']).' টাকা।');
        }

        $policyId = ! empty($input['loan_policy_id']) ? (int) $input['loan_policy_id'] : null;
        $policy = $policyId ? LoanPolicy::query()->where('id', $policyId)->where('loan_type', 'motorcycle_loan')->where('is_active', true)->first() : null;
        $policy ??= LoanPolicy::query()->where('loan_type', 'motorcycle_loan')->where('is_active', true)->orderBy('sort_order')->first();
        if (! $policy) {
            throw new InvalidArgumentException('কোনো সক্রিয় মোটরসাইকেল লোন পলিসি নেই।');
        }

        $purpose = $this->clean($input['purpose'] ?? null, 500);
        $words = $this->clean($input['amount_in_words'] ?? null, 300);
        if ($words === '' && $amount > 0) {
            $words = BanglaTaka::taka($amount);
        }
        $date = $this->clean($input['date'] ?? null, 20) ?: Carbon::today()->format('d/m/Y');
        $form = $this->blankForm($employee);
        $form['date'] = $date;
        $form['amount'] = $amount > 0 ? taka_fmt($amount) : '';
        $form['amount_in_words'] = $words;
        $form['purpose'] = $purpose;
        $calc = $amount > 0 ? $this->calculator->calculate($policy, $amount) : null;

        return DB::transaction(function () use ($employee, $policy, $amount, $userId, $purpose, $form, $calc, $assessment) {
            $existing = $this->currentDraft($employee);
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
                    'notes' => $purpose,
                    'form_snapshot' => $form,
                    ...$money,
                ]);

                return $existing->fresh(['policy:id,name,code,loan_type']);
            }

            return LoanApplication::query()->create([
                'application_number' => $this->applications->nextApplicationNumber(),
                'application_date' => Carbon::today()->toDateString(),
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'applied_amount' => $amount,
                'status' => 'draft',
                'channel' => 'employee',
                'notes' => $purpose,
                'max_loan_limit_amount' => $assessment['max_amount'],
                'form_snapshot' => $form,
                'created_by' => $userId,
                ...$money,
            ]);
        });
    }

    public function forward(LoanApplication $application, User $user, string $comments, ?float $approvedAmount = null, ?string $disbursementDate = null): LoanApplication
    {
        $comments = $this->clean($comments, 1000);
        if ($comments === '') {
            throw new InvalidArgumentException('সুপারিশ লিখুন।');
        }
        if (! $this->canReview($user, $application)) {
            throw new InvalidArgumentException('এই ধাপে আপনি সুপারিশ করতে পারবেন না।');
        }
        $this->assertSealAndSignature($user);

        return DB::transaction(function () use ($application, $user, $comments, $approvedAmount, $disbursementDate) {
            $application->refresh();
            $stage = (string) $application->workflow_stage;
            $this->writeRecommendation($application, $user, $stage, 'recommended', $comments);

            if ($stage === 'ed') {
                $this->approveAndDisburse($application, $user);

                return $application->fresh(['policy:id,name,code,loan_type', 'recommendations.user']);
            }

            if ($stage === 'accounts') {
                $this->completeAccounts($application, $user, $approvedAmount, $disbursementDate);

                return $application->fresh(['policy:id,name,code,loan_type', 'recommendations.user']);
            }

            $employee = $application->employee()->first();
            $stages = $employee ? $this->stagesFor($employee) : ['accounts', 'ed'];
            $index = array_search($stage, $stages, true);
            $next = $index === false ? 'accounts' : ($stages[$index + 1] ?? 'accounts');

            $application->update([
                'status' => $next === 'accounts' ? 'pending' : 'in_review',
                'workflow_stage' => $next,
                'form_snapshot' => $this->snapshotWithRecommendations($application),
            ]);

            return $application->fresh(['policy:id,name,code,loan_type', 'recommendations.user']);
        });
    }

    public function accountsApprove(LoanApplication $application, User $user, ?float $approvedAmount = null, ?string $disbursementDate = null): LoanApplication
    {
        if ($application->workflow_stage !== 'accounts' || ! in_array($application->status, ['pending', 'in_review'], true)) {
            throw new InvalidArgumentException('এই আবেদন এখন হিসাব বিভাগের কাছে নেই।');
        }
        if (! $this->canReview($user, $application)) {
            throw new InvalidArgumentException('হিসাব বিভাগের অনুমোদন দেওয়ার অনুমতি নেই।');
        }
        $this->assertSealAndSignature($user);

        return DB::transaction(function () use ($application, $user, $approvedAmount, $disbursementDate) {
            $this->writeRecommendation($application, $user, 'accounts', 'recommended', 'হিসাব বিভাগ যাচাই করেছে।');
            $this->completeAccounts($application, $user, $approvedAmount, $disbursementDate);

            return $application->fresh();
        });
    }

    public function sendBack(LoanApplication $application, User $user, string $comments): LoanApplication
    {
        $comments = $this->clean($comments, 1000);
        if ($comments === '') {
            throw new InvalidArgumentException('ফেরত পাঠানোর কারণ লিখুন।');
        }
        if (! $this->canReview($user, $application)) {
            throw new InvalidArgumentException('এই আবেদন ফেরত পাঠানো যাবে না।');
        }

        return DB::transaction(function () use ($application, $user, $comments) {
            $stage = (string) $application->workflow_stage;
            $this->writeRecommendation($application, $user, $stage, 'sent_back', $comments);
            $application->update([
                'status' => 'draft',
                'workflow_stage' => null,
                'notes' => $comments,
                'form_snapshot' => $this->snapshotWithRecommendations($application),
            ]);

            return $application->fresh();
        });
    }

    /**
     * Where the application sits, who has it now, and who already signed.
     *
     * @return list<array{key: string, label: string, state: string, holders: list<string>, actor: string|null, at: string|null, note: string|null}>
     */
    public function timeline(LoanApplication $application): array
    {
        $application->loadMissing([
            'employee.designation:id,name',
            'employee.branch.regionalOffice.zone.zoneManager',
            'employee.branch.regionalOffice.regionalManager',
            'employee.department.headEmployee',
            'recommendations.user.employee:id,name_en,name_bn,pin',
            'approver:id,name',
        ]);

        $loanType = LoanPolicy::query()->whereKey($application->loan_policy_id)->value('loan_type');
        $snapshot = is_array($application->form_snapshot) ? $application->form_snapshot : [];
        if ($loanType !== 'motorcycle_loan' && ($snapshot['form'] ?? null) !== 'motorcycle') {
            return $this->plainLoanTimeline($application);
        }

        $employee = $application->employee;
        $stages = $employee ? $this->stagesFor($employee) : ['bm', 'rm', 'zm', 'accounts', 'ed'];
        $path = array_merge(['applicant'], $stages, ['disburse']);
        $current = $this->currentStep($application, $path);
        $latest = $application->recommendations->sortBy('id')->groupBy('stage')->map->last();
        $sentBack = $application->recommendations->sortByDesc('id')->first(fn ($row) => $row->action === 'sent_back');

        $steps = [];
        foreach ($path as $key) {
            $record = $key === 'applicant' ? null : $latest->get($key);
            $doneByRecommendation = $record && $record->action === 'recommended';
            $state = $this->stepState($key, $current, $application->status, $doneByRecommendation);
            if ($key === 'applicant' && $application->status === 'draft' && $sentBack) {
                $state = 'returned';
            }

            $actor = null;
            $at = null;
            $note = null;
            if ($key === 'applicant') {
                $actor = $employee ? $this->personLabel($employee) : null;
                if ($state === 'returned' && $sentBack) {
                    $note = (string) $sentBack->comments;
                    $at = $sentBack->signed_at?->format('d M Y, h:i A');
                }
            } elseif ($doneByRecommendation) {
                $person = $record->user?->employee;
                $actor = $person ? $this->personLabel($person) : ($record->user?->name);
                $at = $record->signed_at?->format('d M Y, h:i A');
                $note = (string) $record->comments;
            } elseif ($key === 'disburse' && $application->status === 'disbursed') {
                $at = $application->disbursed_at?->format('d M Y, h:i A');
            }

            $holders = in_array($state, ['current', 'returned', 'upcoming'], true) && $employee
                ? $this->holdersFor($key, $employee)
                : [];

            $steps[] = [
                'key' => $key,
                'label' => $key === 'applicant' ? 'আবেদনকারী' : ($key === 'disburse' ? 'প্রদান (Disburse)' : $this->stageLabel($key)),
                'state' => $state,
                'holders' => $holders,
                'actor' => $actor,
                'at' => $at,
                'note' => $note !== '' ? $note : null,
            ];
        }

        if ($application->status === 'rejected') {
            $steps[] = [
                'key' => 'rejected',
                'label' => 'বাতিল',
                'state' => 'rejected',
                'holders' => [],
                'actor' => $application->approver?->name,
                'at' => $application->approved_at?->format('d M Y, h:i A'),
                'note' => $application->rejection_reason,
            ];
        }

        return $steps;
    }

    public function hasSealAndSignature(User $user): bool
    {
        $user->loadMissing('employee');
        $path = $user->getSignaturePath();
        if (! is_string($path) || trim($path) === '') {
            return false;
        }

        return Storage::disk('public')->exists($path);
    }

    public function canView(User $user, LoanApplication $application): bool
    {
        if ($application->channel !== 'employee') {
            return false;
        }
        if ($user->employee_id && (int) $user->employee_id === (int) $application->employee_id) {
            return true;
        }
        if ($application->status === 'draft') {
            return false;
        }

        $application->loadMissing('policy:id,loan_type', 'employee.branch.regionalOffice', 'employee.department:id,head_employee_id');
        if ($application->policy?->loan_type !== 'motorcycle_loan') {
            return false;
        }

        return $this->motorcycleInScope($user, $application);
    }

    /**
     * Own applications, plus motorcycle applications inside this user's office.
     *
     * @return Collection<int, LoanApplication>
     */
    public function visibleApplications(User $user): Collection
    {
        return LoanApplication::query()
            ->with([
                'employee:id,pin,name_en,name_bn,designation_id,current_branch_id,department_id',
                'employee.designation:id,name',
                'employee.branch:id,name,regional_office_id',
                'employee.branch.regionalOffice:id,zone_id',
                'employee.department:id,head_employee_id',
                'policy:id,name,loan_type',
            ])
            ->where('channel', 'employee')
            ->where(function ($query) use ($user) {
                if ($user->employee_id) {
                    $query->where('employee_id', $user->employee_id);
                }
                $query->orWhere(function ($query) {
                    $query->where('status', '!=', 'draft')
                        ->whereHas('policy', fn ($policy) => $policy->where('loan_type', 'motorcycle_loan'));
                });
            })
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->filter(fn (LoanApplication $application) => $this->canView($user, $application))
            ->values();
    }

    public function pendingCount(User $user): int
    {
        return $this->inbox($user)->count();
    }

    public function canReview(User $user, LoanApplication $application): bool
    {
        $waiting = $application->status === 'in_review'
            || ($application->status === 'pending' && $application->workflow_stage === 'accounts');
        if (! $waiting || ! $application->workflow_stage) {
            return false;
        }
        if ($user->employee_id && (int) $user->employee_id === (int) $application->employee_id) {
            return false;
        }
        if ($user->isSuperAdmin()) {
            return true;
        }

        $application->loadMissing('employee.branch.regionalOffice');
        $employee = $application->employee;
        if (! $employee) {
            return false;
        }

        return match ($application->workflow_stage) {
            'bm' => $this->isBranchReviewer($user, $employee),
            'rm' => $this->isRegionalReviewer($user, $employee),
            'zm' => $this->isZonalReviewer($user, $employee),
            'department_head' => $this->isDepartmentHeadReviewer($user, $employee),
            'director' => OrganogramAccessService::isMicrofinanceDirector($user)
                || OrganogramAccessService::isMicrofinanceAssistantDirector($user),
            'accounts' => $this->isAccountsReviewer($user),
            'ed' => $this->promotions->isExecutiveDirector($user),
            default => false,
        };
    }

    /**
     * @return Collection<int, LoanApplication>
     */
    public function inbox(User $user): Collection
    {
        return LoanApplication::query()
            ->with([
                'employee.designation:id,name',
                'employee.branch:id,name,regional_office_id',
                'employee.branch.regionalOffice:id,zone_id',
                'policy:id,name,loan_type',
            ])
            ->where(function ($query) {
                $query->where('status', 'in_review')
                    ->orWhere(function ($query) {
                        $query->where('status', 'pending')->where('workflow_stage', 'accounts');
                    });
            })
            ->where('channel', 'employee')
            ->whereHas('policy', fn ($q) => $q->where('loan_type', 'motorcycle_loan'))
            ->orderByDesc('id')
            ->limit(150)
            ->get()
            ->filter(fn (LoanApplication $application) => $this->canReview($user, $application))
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    protected function completeAccounts(LoanApplication $application, User $user, ?float $approvedAmount, ?string $disbursementDate): void
    {
        if ($approvedAmount === null || $disbursementDate === null || trim($disbursementDate) === '') {
            throw new InvalidArgumentException('অনুমোদিত লোনের পরিমাণ ও প্রদানের তারিখ দিন।');
        }

        $amount = $this->applyApprovedAmount($application, $approvedAmount);
        $application->refresh();
        $application->update([
            'status' => 'in_review',
            'workflow_stage' => 'ed',
            'form_snapshot' => $this->stampAccounts($application, $user, $amount, $disbursementDate),
        ]);
    }

    protected function applyApprovedAmount(LoanApplication $application, float $amount): float
    {
        $application->loadMissing('policy');
        $amount = SalaryStructureCalculator::roundTaka($amount);
        $applied = SalaryStructureCalculator::roundTaka((float) $application->applied_amount);
        $limit = (float) ($application->max_loan_limit_amount ?? 0);
        $ceiling = $limit > 0 ? min($applied, SalaryStructureCalculator::roundTaka($limit)) : $applied;
        $policy = $application->policy;

        if ($amount <= 0) {
            throw new InvalidArgumentException('অনুমোদিত লোনের পরিমাণ লিখুন।');
        }
        if ($policy && (float) $policy->min_amount > 0 && $amount < (float) $policy->min_amount) {
            throw new InvalidArgumentException('অনুমোদিত পরিমাণ সর্বনিম্ন '.taka_fmt((float) $policy->min_amount).' টাকা।');
        }
        if ($amount > $ceiling) {
            throw new InvalidArgumentException('অনুমোদিত পরিমাণ '.taka_fmt($ceiling).' টাকার বেশি হতে পারবে না।');
        }

        if ($policy && abs($amount - $applied) >= 1) {
            $calc = $this->calculator->calculate($policy, $amount, max(1, (int) $application->loan_cycle));
            $application->update([
                'applied_amount' => $amount,
                'principal_amount' => $calc['principal_amount'],
                'rate_yearly' => $calc['rate_yearly'],
                'installment_amount_monthly' => $calc['installment_amount_monthly'],
                'total_installments' => $calc['total_installments'],
                'service_charge_amount' => $calc['service_charge_amount'],
                'total_payable' => $calc['total_payable'],
                'grace_months' => $calc['grace_months'],
                'interval_months' => $calc['interval_months'],
            ]);
        }

        return $amount;
    }

    /**
     * @return array<string, mixed>
     */
    protected function stampAccounts(LoanApplication $application, User $user, float $amount, string $disbursementDate): array
    {
        $date = Carbon::parse($disbursementDate);
        $snapshot = $this->snapshotWithRecommendations($application);
        $snapshot['accounts_amount'] = taka_fmt($amount);
        $snapshot['accounts_amount_words'] = BanglaTaka::taka($amount);
        $snapshot['accounts_date'] = $date->format('d/m/Y');
        $snapshot['disbursement_date'] = $date->toDateString();
        $snapshot['accounts_signature'] = $user->getSignaturePath();

        return $snapshot;
    }

    protected function assertSealAndSignature(User $user): void
    {
        if (! $this->hasSealAndSignature($user)) {
            throw new InvalidArgumentException('প্রোফাইলে সিল ও স্বাক্ষর নেই। আপলোড না করা পর্যন্ত সুপারিশ বা অনুমোদন দেওয়া যাবে না।');
        }
    }

    protected function motorcycleInScope(User $user, LoanApplication $application): bool
    {
        if ($user->isSuperAdmin() || $this->promotions->isExecutiveDirector($user) || $this->isAccountsReviewer($user)) {
            return true;
        }

        $employee = $application->employee;
        if (! $employee) {
            return false;
        }

        $user->loadMissing('employee.branch.regionalOffice');
        if ($this->promotions->isBranchManager($user)
            && (int) $user->employee?->current_branch_id > 0
            && (int) $user->employee?->current_branch_id === (int) $employee->current_branch_id) {
            return true;
        }

        if ($user->employee_id && OrganogramAccessService::isRegionalManager($user)) {
            $officeIds = RegionalOffice::query()->where('regional_manager_employee_id', $user->employee_id)->pluck('id');
            if ($employee->branch?->regional_office_id && $officeIds->contains((int) $employee->branch->regional_office_id)) {
                return true;
            }
        }

        if ($user->employee_id && OrganogramAccessService::isZonalManager($user)) {
            $zoneIds = Zone::query()->where('zone_manager_employee_id', $user->employee_id)->pluck('id');
            $zoneId = $employee->branch?->regionalOffice?->zone_id;
            if ($zoneId && $zoneIds->contains((int) $zoneId)) {
                return true;
            }
        }

        return $this->isDepartmentHeadReviewer($user, $employee);
    }

    protected function isAccountsReviewer(User $user): bool
    {
        return $user->hasPermission('employee-loan.edit')
            || OrganogramAccessService::isFinanceAndAccountsDepartmentHead($user);
    }

    protected function approveAndDisburse(LoanApplication $application, User $user): void
    {
        $snapshot = $this->snapshotWithRecommendations($application);
        $disbursementDate = (string) ($snapshot['disbursement_date'] ?? now()->toDateString());
        $application->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'workflow_stage' => 'ed',
            'form_snapshot' => $snapshot,
        ]);

        $loan = app(EmployeeLoanService::class)->disburseFromApplication(
            $application->fresh(),
            $disbursementDate,
            $user->id,
        );
        $this->applications->markDisbursed($application, $loan->id);
        $application->update(['workflow_stage' => 'disbursed']);
    }

    protected function isDepartmentHeadReviewer(User $user, Employee $employee): bool
    {
        if (! $user->employee_id || ! $employee->department_id) {
            return false;
        }
        if (! OrganogramAccessService::isHeadOfficeUser($user)) {
            return false;
        }

        return Department::query()
            ->where('id', $employee->department_id)
            ->where('head_employee_id', $user->employee_id)
            ->exists();
    }

    protected function isBranchReviewer(User $user, Employee $employee): bool
    {
        if (! $this->promotions->isBranchManager($user)) {
            return false;
        }

        $user->loadMissing('employee');
        $userBranch = (int) ($user->employee?->current_branch_id ?: $user->branch_id);

        return $userBranch > 0 && $userBranch === (int) $employee->current_branch_id;
    }

    protected function isRegionalReviewer(User $user, Employee $employee): bool
    {
        if ($this->promotions->isBranchManager($user) || $this->promotions->isExecutiveDirector($user)) {
            return false;
        }
        if (! $user->employee_id || ! OrganogramAccessService::isRegionalManager($user)) {
            return false;
        }

        $user->loadMissing('employee.branch');
        $officeIds = RegionalOffice::query()
            ->where('regional_manager_employee_id', $user->employee_id)
            ->pluck('id');
        $ownOffice = $user->employee?->branch?->regional_office_id;
        if ($ownOffice) {
            $officeIds->push((int) $ownOffice);
        }
        $branchOffice = $this->applicantRegionalOfficeId($employee);

        return $branchOffice && $officeIds->contains((int) $branchOffice);
    }

    protected function isZonalReviewer(User $user, Employee $employee): bool
    {
        if ($this->promotions->isBranchManager($user) || OrganogramAccessService::isRegionalManager($user) || $this->promotions->isExecutiveDirector($user)) {
            return false;
        }
        if (! $user->employee_id || ! OrganogramAccessService::isZonalManager($user)) {
            return false;
        }

        $user->loadMissing('employee.branch.regionalOffice');
        $zoneIds = Zone::query()->where('zone_manager_employee_id', $user->employee_id)->pluck('id');
        $ownZone = $user->employee?->branch?->regionalOffice?->zone_id;
        if ($ownZone) {
            $zoneIds->push((int) $ownZone);
        }
        $zoneId = $this->applicantZoneId($employee);

        return $zoneId && $zoneIds->contains((int) $zoneId);
    }

    protected function applicantRegionalOfficeId(Employee $employee): ?int
    {
        $this->ensureBranchOffice($employee);
        $officeId = $employee->branch?->regional_office_id;

        return $officeId ? (int) $officeId : null;
    }

    protected function applicantZoneId(Employee $employee): ?int
    {
        $this->ensureBranchOffice($employee);
        $zoneId = $employee->branch?->regionalOffice?->zone_id;

        return $zoneId ? (int) $zoneId : null;
    }

    protected function ensureBranchOffice(Employee $employee): void
    {
        $branch = $employee->branch;
        if ($branch && ! array_key_exists('regional_office_id', $branch->getAttributes())) {
            $employee->unsetRelation('branch');
        }
        $employee->loadMissing('branch.regionalOffice');
    }

    protected function writeRecommendation(LoanApplication $application, User $user, string $stage, string $action, string $comments): void
    {
        $application->recommendations()->create([
            'stage' => $stage,
            'user_id' => $user->id,
            'action' => $action,
            'comments' => $comments,
            'signature' => $user->getSignaturePath(),
            'signed_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function snapshotWithRecommendations(LoanApplication $application): array
    {
        $form = is_array($application->form_snapshot) ? $application->form_snapshot : [];
        $form['recommendations'] = [];
        $rows = $application->recommendations()->with('user.employee:id,name_en,name_bn')->orderBy('id')->get();
        foreach ($rows as $row) {
            if ($row->action !== 'recommended') {
                continue;
            }
            $person = $row->user?->employee;
            $form['recommendations'][$row->stage] = [
                'comments' => (string) $row->comments,
                'name' => trim((string) ($person?->name_bn ?: $person?->name_en ?: $row->user?->name)),
                'date' => $row->signed_at?->format('d/m/Y') ?? '',
                'signature' => $row->signature,
            ];
        }

        return $form;
    }

    /**
     * @return array<string, mixed>
     */
    protected function blankForm(Employee $employee): array
    {
        $employee->loadMissing(['designation:id,name', 'employeeType:id,name', 'user:id,employee_id,signature', 'branch:id,name,is_head_office', 'program:id,name', 'project:id,name']);
        $previous = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->where('loan_type', 'motorcycle_loan')
            ->whereNotIn('status', ['cancelled'])
            ->count();
        $typeName = mb_strtolower((string) ($employee->employeeType?->name ?? ''));
        $irregular = $typeName !== '' && (
            str_contains($typeName, 'contract')
            || str_contains($typeName, 'temporary')
            || str_contains($typeName, 'daily')
            || str_contains($typeName, 'irregular')
            || str_contains($typeName, 'অনিয়মিত')
        );

        return [
            'form' => 'motorcycle',
            'office' => $this->isHeadOffice($employee) ? 'head_office' : 'branch',
            'date' => Carbon::today()->format('d/m/Y'),
            'name' => trim((string) ($employee->name_bn ?: $employee->name_en)) ?: '—',
            'designation' => $employee->designation?->name ?: '—',
            'pin' => $employee->pin ?: '—',
            'workplace' => $employee->branch?->name ?: '—',
            'program' => trim(implode(', ', array_filter([$employee->program?->name, $employee->project?->name]))) ?: '—',
            'mobile' => $employee->mobile_official ?: $employee->mobile_personal ?: '—',
            'joining_date' => $employee->joining_date?->format('d/m/Y') ?: '—',
            'employment' => $irregular ? 'অনিয়মিত' : 'নিয়মিত',
            'previous_count' => (string) $previous,
            'amount' => '',
            'amount_in_words' => '',
            'purpose' => '',
            'signature' => $employee->user?->signature ?: $employee->signature,
            'accounts_amount' => '',
            'accounts_amount_words' => '',
            'accounts_date' => '',
            'accounts_signature' => null,
            'recommendations' => [],
        ];
    }

    protected function currentDraft(Employee $employee): ?LoanApplication
    {
        return LoanApplication::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'draft')
            ->where('channel', 'employee')
            ->whereHas('policy', fn ($q) => $q->where('loan_type', 'motorcycle_loan'))
            ->latest('id')
            ->first();
    }

    protected function usablePolicy(int $policyId): LoanPolicy
    {
        $policy = LoanPolicy::query()
            ->where('id', $policyId)
            ->where('loan_type', 'motorcycle_loan')
            ->where('is_active', true)
            ->first();

        if (! $policy) {
            throw new InvalidArgumentException('মোটরসাইকেল লোনের মেয়াদ নির্বাচন করুন।');
        }

        return $policy;
    }

    /**
     * @param  list<string>  $path
     */
    protected function currentStep(LoanApplication $application, array $path): ?string
    {
        return match ($application->status) {
            'draft' => 'applicant',
            'in_review' => in_array($application->workflow_stage, $path, true) ? (string) $application->workflow_stage : ($path[1] ?? 'applicant'),
            'pending' => in_array($application->workflow_stage, $path, true) ? (string) $application->workflow_stage : 'accounts',
            'approved' => 'disburse',
            'disbursed' => null,
            default => null,
        };
    }

    protected function stepState(string $key, ?string $current, string $status, bool $doneByRecommendation): string
    {
        if ($status === 'rejected' && $key === 'accounts') {
            return 'rejected';
        }
        if ($current === null || $status === 'disbursed') {
            return 'done';
        }
        if ($key === $current) {
            return 'current';
        }

        return $doneByRecommendation || $this->stepIsBefore($key, $current) ? 'done' : 'upcoming';
    }

    protected function stepIsBefore(string $key, string $current): bool
    {
        $order = ['applicant', 'bm', 'rm', 'zm', 'department_head', 'director', 'accounts', 'ed', 'disburse'];
        $left = array_search($key, $order, true);
        $right = array_search($current, $order, true);

        return $left !== false && $right !== false && $left < $right;
    }

    /**
     * @return list<string>
     */
    protected function holdersFor(string $stage, Employee $employee): array
    {
        $names = match ($stage) {
            'applicant' => [$this->personLabel($employee)],
            'bm' => $this->branchManagerNames($employee),
            'rm' => array_filter([$this->activePersonLabel($employee->branch?->regionalOffice?->regionalManager)]),
            'zm' => array_filter([$this->activePersonLabel($employee->branch?->regionalOffice?->zone?->zoneManager)]),
            'department_head' => array_filter([$this->activePersonLabel($employee->department?->headEmployee)]),
            'director' => $this->usersInRoles(['Director (Microfinance)', 'Assistant Director (Microfinance)']),
            'ed' => $this->currentExecutiveDirectorLabels(),
            'accounts', 'disburse' => ['হিসাব বিভাগ'],
            default => [],
        };

        $names = array_values(array_unique(array_filter($names)));

        return $names === [] ? ['এখনো কাউকে পাওয়া যায়নি'] : $names;
    }

    /**
     * @return list<string>
     */
    protected function branchManagerNames(Employee $employee): array
    {
        if (! $employee->current_branch_id) {
            return [];
        }

        $fromDesk = Employee::query()
            ->where('current_branch_id', $employee->current_branch_id)
            ->where('status', 'active')
            ->whereHas('designation', function ($query) {
                $query->where('name', 'like', '%Branch Manager%')
                    ->where('name', 'not like', '%Assistant%');
            })
            ->get(['id', 'name_en', 'name_bn', 'pin']);

        $fromRole = User::query()
            ->where('active_status', true)
            ->where(function ($query) {
                $query->whereHas('roles', fn ($roles) => $roles->where('name', 'Branch Manager'))
                    ->orWhereHas('role', fn ($role) => $role->where('name', 'Branch Manager'));
            })
            ->whereHas('employee', fn ($query) => $query
                ->where('current_branch_id', $employee->current_branch_id)
                ->where('status', 'active'))
            ->with('employee:id,name_en,name_bn,pin,status')
            ->get()
            ->map(fn (User $user) => $user->employee);

        return $fromDesk->concat($fromRole)
            ->filter()
            ->map(fn (Employee $person) => $this->personLabel($person))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $roles
     * @return list<string>
     */
    protected function usersInRoles(array $roles): array
    {
        return User::query()
            ->where('active_status', true)
            ->where(function ($query) use ($roles) {
                $query->whereHas('roles', fn ($related) => $related->whereIn('name', $roles))
                    ->orWhereHas('role', fn ($related) => $related->whereIn('name', $roles));
            })
            ->whereHas('employee', fn ($query) => $query->where('status', 'active'))
            ->with('employee:id,name_en,name_bn,pin,status')
            ->limit(6)
            ->get()
            ->map(function (User $user) {
                return $this->activePersonLabel($user->employee);
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * The one active Executive Director. Former employees who still have the role are left out.
     *
     * @return list<string>
     */
    protected function currentExecutiveDirectorLabels(): array
    {
        $employee = Employee::query()
            ->where('status', 'active')
            ->whereHas('designation', function ($query) {
                $query->where('name', 'like', '%Executive Director%')
                    ->where('name', 'not like', '%Assistant%');
            })
            ->whereHas('user', fn ($query) => $query->where('active_status', true))
            ->orderByDesc('id')
            ->first(['id', 'name_en', 'name_bn', 'pin', 'status']);

        $label = $this->activePersonLabel($employee);

        return $label ? [$label] : [];
    }

    protected function activePersonLabel(?Employee $employee): ?string
    {
        if (! $employee || $employee->status !== 'active') {
            return null;
        }

        return $this->personLabel($employee);
    }

    protected function personLabel(?Employee $employee): ?string
    {
        if (! $employee) {
            return null;
        }

        $name = trim((string) ($employee->name_bn ?: $employee->name_en));
        if ($name === '') {
            return null;
        }

        $pin = trim((string) $employee->pin);

        return $pin !== '' ? $name.' ('.$pin.')' : $name;
    }

    /**
     * @return list<array{key: string, label: string, state: string, holders: list<string>, actor: string|null, at: string|null, note: string|null}>
     */
    protected function plainLoanTimeline(LoanApplication $application): array
    {
        $employee = $application->employee;
        $applicant = $employee ? $this->personLabel($employee) : 'আবেদনকারী';
        $status = $application->status;
        $accountsDone = in_array($status, ['approved', 'disbursed'], true);
        $disbursed = $status === 'disbursed';

        return [
            [
                'key' => 'applicant',
                'label' => $application->channel === 'employee' ? 'আবেদনকারী' : 'আবেদন তৈরি',
                'state' => $status === 'draft' ? 'current' : 'done',
                'holders' => $status === 'draft' ? array_filter([$applicant]) : [],
                'actor' => $status === 'draft' ? null : $applicant,
                'at' => null,
                'note' => null,
            ],
            [
                'key' => 'accounts',
                'label' => 'হিসাব বিভাগ — অনুমোদন',
                'state' => $status === 'rejected' ? 'rejected' : ($status === 'pending' ? 'current' : ($accountsDone ? 'done' : 'upcoming')),
                'holders' => $status === 'pending' ? ['হিসাব বিভাগ'] : [],
                'actor' => $accountsDone ? $application->approver?->name : null,
                'at' => $application->approved_at?->format('d M Y, h:i A'),
                'note' => $status === 'rejected' ? $application->rejection_reason : null,
            ],
            [
                'key' => 'disburse',
                'label' => 'প্রদান (Disburse)',
                'state' => $disbursed ? 'done' : ($status === 'approved' ? 'current' : 'upcoming'),
                'holders' => $status === 'approved' ? ['হিসাব বিভাগ'] : [],
                'actor' => null,
                'at' => $application->disbursed_at?->format('d M Y, h:i A'),
                'note' => null,
            ],
        ];
    }

    protected function clean(mixed $value, int $max): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)) ?? '');

        return mb_substr($text, 0, $max);
    }
}
