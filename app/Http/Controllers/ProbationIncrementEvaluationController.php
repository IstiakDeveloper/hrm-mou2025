<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResetsAppraisalWorkflow;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\ProbationIncrementEvaluation;
use App\Models\Zone;
use App\Services\Appraisal\AppraisalEmployeeLookup;
use App\Services\Appraisal\AppraisalListQuery;
use App\Services\Appraisal\AppraisalTemplateCache;
use App\Services\OrganogramAccessService;
use App\Services\ProbationIncrementWorkflowService;
use App\Support\AppraisalRequiredFields;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProbationIncrementEvaluationController extends Controller
{
    use ResetsAppraisalWorkflow;

    protected ProbationIncrementWorkflowService $workflowService;

    public function __construct(ProbationIncrementWorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();

        $query = ProbationIncrementEvaluation::query()
            ->with(array_merge([
                'employee:id,pin,name_en,name_bn,designation_id,current_branch_id',
                'employee.designation:id,name',
                'employee.branch:id,name',
                'branch:id,name',
            ], AppraisalListQuery::listSignatures($user, 'probation_increment_evaluation_id')));

        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $branchId = $user->employee?->current_branch_id ?? $user->employee?->branch_id ?? $user->branch_id;

        // Scoping for non-super admins:
        if ($isSuperAdmin) {
            // Super Admin sees all
        } elseif ($user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true)) {
            $query->where('branch_id', $branchId);
        } elseif ($user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true)) {
            $regOfficeId = $user->employee?->branch?->regional_office_id;
            if ($regOfficeId) {
                $query->where('regional_office_id', $regOfficeId);
            }
        } elseif ($user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true)) {
            $zoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            if ($zoneId) {
                $query->where('zone_id', $zoneId);
            }
        }

        // Filters
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('form_type') && $request->input('form_type') !== 'all') {
            $query->where('form_type', $request->form_type);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('zone_id')) {
            $query->where('zone_id', $request->zone_id);
        }
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('name_en', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%")
                    ->orWhere('pin', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        if (! in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }

        $metrics = AppraisalListQuery::summarize(clone $query, [
            'pending' => "status NOT IN ('draft', 'approved', 'rejected')",
            'approved' => "status = 'approved'",
            'recommended' => "recommendation_status = 'recommend_increment'",
        ]);

        $evaluations = $query->latest()->paginate($perPage)->withQueryString();

        // Attach reviewer eligibility
        $evaluations->getCollection()->transform(function ($ev) use ($user) {
            $hasSigned = $ev->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
            $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $ev);
            $sentBackSig = $ev->signatures->where('action', 'sent_back')->last();

            $isInitiator = (int) $ev->initiator_id === (int) $user->id;
            $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $ev);

            $ev->can_approve = $canReview && ! in_array($ev->status, ['draft', 'approved', 'rejected']);
            $ev->can_edit = (($ev->status === 'draft' || $isStuckAtRm) && $isInitiator) || ($canReview && ! in_array($ev->status, ['approved', 'rejected'])) || $user->isSuperAdmin();
            $ev->can_send_back = $canReview && ! in_array($ev->status, ['draft', 'approved', 'rejected']);
            $ev->can_delete = ($ev->status === 'draft' && $isInitiator) || $user->isSuperAdmin();
            $ev->can_submit = ($ev->status === 'draft' || $isStuckAtRm) && $isInitiator;
            $ev->has_user_signed = $hasSigned;
            $ev->sent_back_reason = $sentBackSig?->comments;
            $ev->current_stage_label = $this->workflowService->getStageLabel($ev->status);
            $ev->unsetRelation('signatures');
            AppraisalListQuery::hideNarratives($ev);

            return $ev;
        });

        $isLineManager = $user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_director') || in_array('Director (Microfinance)', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_assistant_director') || in_array('Assistant Director (Microfinance)', $roleNames, true) ||
                         in_array('Director Finance and Accounts', $roleNames, true) || in_array('Director Finance and Account', $roleNames, true);

        return Inertia::render('sections/human-resources/evaluations/probation-increment/index', [
            'evaluations' => $evaluations,
            'filters' => $request->only(['status', 'form_type', 'branch_id', 'zone_id', 'search', 'per_page']),
            'metrics' => $metrics,
            'counts' => $metrics,
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'zones' => Zone::select('id', 'name')->orderBy('name')->get(),
            'canCreate' => $isSuperAdmin || $isLineManager || $user->hasPermission('probation-increment-evaluations.create'),
            'isSuperAdmin' => $isSuperAdmin,
            'currentUserId' => $user->id,
            'userHasSignature' => $user->hasSignature(),
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();
        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        $isLineManager = $user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_director') || in_array('Director (Microfinance)', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_assistant_director') || in_array('Assistant Director (Microfinance)', $roleNames, true) ||
                         in_array('Director Finance and Accounts', $roleNames, true) || in_array('Director Finance and Account', $roleNames, true) ||
                         $user->hasPermission('probation-increment-evaluations.create');

        if (! $isLineManager && ! $isSuperAdmin) {
            return redirect()->route('probation-increment-evaluations.index')->with('error', 'Only Branch Managers, Regional Managers, Zonal Managers, or Directors can create an increment evaluation.');
        }

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'শিক্ষানবিশ ইনক্রিমেন্ট মূল্যায়ন শুরু করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if (! $isSuperAdmin && $isLineManager && ! $user->employee) {
            return redirect()->route('probation-increment-evaluations.index')->with('error', 'Your user account must be linked to an employee profile to create an evaluation.');
        }

        return Inertia::render('sections/human-resources/evaluations/probation-increment/create', [
            'employeeLookupUrl' => route('probation-increment-evaluations.employees.lookup'),
            'templates' => AppraisalTemplateCache::load('probation_increment'),
            'isSuperAdmin' => $isSuperAdmin,
        ]);
    }

    public function lookupEmployees(Request $request)
    {
        $rows = app(AppraisalEmployeeLookup::class)->search(
            $request->user(),
            'probation_increment',
            (string) $request->query('q', ''),
            (int) $request->query('limit', 20),
        );

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'শিক্ষানবিশ ইনক্রিমেন্ট মূল্যায়ন সংরক্ষণ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if ($user->employee_id && (int) $request->input('employee_id') === (int) $user->employee_id) {
            return redirect()->back()->withErrors([
                'employee_id' => 'আপনি নিজের শিক্ষানবিশ মূল্যায়ন করতে পারবেন না।',
            ])->withInput();
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'form_type' => 'required|in:officer_abm,accountant,bm_and_above',
            'joining_date' => 'nullable|string',
            'probation_3m_completion_date' => 'nullable|string',
            'education_at_joining' => 'nullable|string|max:255',
            'education_current' => 'nullable|string|max:255',
            'closing_month' => 'required|string|max:50',

            // Achievement stats
            'joining_members_count' => 'nullable|integer',
            'closing_members_count' => 'nullable|integer',
            'diff_members_count' => 'nullable|integer',
            'joining_borrowers_count' => 'nullable|integer',
            'closing_borrowers_count' => 'nullable|integer',
            'diff_borrowers_count' => 'nullable|integer',
            'joining_loan_balance' => 'nullable|numeric',
            'closing_loan_balance' => 'nullable|numeric',
            'diff_loan_balance' => 'nullable|numeric',
            'joining_savings_balance' => 'nullable|numeric',
            'closing_savings_balance' => 'nullable|numeric',
            'diff_savings_balance' => 'nullable|numeric',
            'joining_overdue_borrowers' => 'nullable|integer',
            'closing_overdue_borrowers' => 'nullable|integer',
            'diff_overdue_borrowers' => 'nullable|integer',
            'joining_overdue_amount' => 'nullable|numeric',
            'closing_overdue_amount' => 'nullable|numeric',
            'diff_overdue_amount' => 'nullable|numeric',
            'joining_otr_pct' => 'nullable|numeric',
            'closing_otr_pct' => 'nullable|numeric',
            'diff_otr_pct' => 'nullable|numeric',
            'joining_par_pct' => 'nullable|numeric',
            'closing_par_pct' => 'nullable|numeric',
            'diff_par_pct' => 'nullable|numeric',
            'has_cashier' => 'nullable|boolean',

            // Qualitative & Recommendations
            'total_score' => 'required|numeric|min:0|max:100',
            'calculated_grade' => 'nullable|string|max:50',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'other_remarks' => 'nullable|string',
            'initiator_remarks' => 'nullable|string',
            'recommendation_status' => 'nullable|in:recommend_increment,defer_increment,not_suitable',
            'supervisor_recommendation' => 'nullable|in:recommend_increment,defer_increment,not_suitable',

            // Scores array
            'scores' => 'required|array',
            'scores.*.section_key' => 'required|string',
            'scores.*.section_name' => 'required|string',
            'scores.*.criteria_key' => 'required|string',
            'scores.*.criteria_name' => 'required|string',
            'scores.*.max_score' => 'required|numeric',
            'scores.*.obtained_score' => 'required|numeric|min:0',

            'submit_now' => 'nullable|boolean',
        ]);

        $employee = Employee::with('branch.regionalOffice.zone', 'designation')->findOrFail($validated['employee_id']);

        $userLevel = $this->workflowService->getUserHierarchyLevel($user);
        if ($userLevel > 0) {
            $candTier = \App\Support\BranchOrganogram::resolveTier($employee->designation?->name);
            $candLevel = (int) ($candTier['level'] ?? 999);
            if ($candLevel <= $userLevel) {
                return redirect()->back()->withErrors([
                    'employee_id' => 'আপনি শুধুমাত্র আপনার অধীনস্থ (নিচের পদবীর) কর্মীদের শিক্ষানবিশ মূল্যায়ন তৈরি করতে পারবেন।',
                ])->withInput();
            }
        }

        $parseDate = function ($dateVal) {
            if (empty($dateVal)) {
                return null;
            }
            try {
                if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $dateVal)) {
                    return \Illuminate\Support\Carbon::createFromFormat('d/m/Y', $dateVal)->format('Y-m-d');
                }

                return \Illuminate\Support\Carbon::parse($dateVal)->format('Y-m-d');
            } catch (\Throwable $e) {
                return null;
            }
        };

        $formType = $validated['form_type'];
        AppraisalRequiredFields::assertInitiator($request, 'probation', $formType);
        $joiningDate = $parseDate($validated['joining_date'] ?? null) ?? $employee->joining_date?->format('Y-m-d');
        $probationDate = $parseDate($validated['probation_3m_completion_date'] ?? null) ?? ($joiningDate ? date('Y-m-d', strtotime($joiningDate.' +3 months')) : null);
        $branchId = $employee->current_branch_id ?? $employee->branch_id;
        $regionalOfficeId = $employee->branch?->regional_office_id;
        $zoneId = $employee->branch?->regionalOffice?->zone_id;
        $recStatus = $validated['recommendation_status'] ?? $validated['supervisor_recommendation'] ?? 'recommend_increment';
        $remarks = $validated['other_remarks'] ?? $validated['initiator_remarks'] ?? null;

        $evaluation = DB::transaction(function () use ($validated, $employee, $user, $formType, $joiningDate, $probationDate, $branchId, $regionalOfficeId, $zoneId, $recStatus, $remarks) {
            $eval = ProbationIncrementEvaluation::create([
                'employee_id' => $employee->id,
                'initiator_id' => $user->id,
                'branch_id' => $branchId,
                'regional_office_id' => $regionalOfficeId,
                'zone_id' => $zoneId,
                'form_type' => $formType,

                'joining_date' => $joiningDate,
                'probation_3m_completion_date' => $probationDate,
                'education_at_joining' => $validated['education_at_joining'] ?? null,
                'education_current' => $validated['education_current'] ?? null,
                'closing_month' => $validated['closing_month'] ?? null,

                'joining_members_count' => $validated['joining_members_count'] ?? null,
                'closing_members_count' => $validated['closing_members_count'] ?? null,
                'diff_members_count' => $validated['diff_members_count'] ?? (isset($validated['closing_members_count']) || isset($validated['joining_members_count']) ? ((int) ($validated['closing_members_count'] ?? 0) - (int) ($validated['joining_members_count'] ?? 0)) : null),

                'joining_borrowers_count' => $validated['joining_borrowers_count'] ?? null,
                'closing_borrowers_count' => $validated['closing_borrowers_count'] ?? null,
                'diff_borrowers_count' => $validated['diff_borrowers_count'] ?? (isset($validated['closing_borrowers_count']) || isset($validated['joining_borrowers_count']) ? ((int) ($validated['closing_borrowers_count'] ?? 0) - (int) ($validated['joining_borrowers_count'] ?? 0)) : null),

                'joining_loan_balance' => $validated['joining_loan_balance'] ?? null,
                'closing_loan_balance' => $validated['closing_loan_balance'] ?? null,
                'diff_loan_balance' => $validated['diff_loan_balance'] ?? (isset($validated['closing_loan_balance']) || isset($validated['joining_loan_balance']) ? ((float) ($validated['closing_loan_balance'] ?? 0) - (float) ($validated['joining_loan_balance'] ?? 0)) : null),

                'joining_savings_balance' => $validated['joining_savings_balance'] ?? null,
                'closing_savings_balance' => $validated['closing_savings_balance'] ?? null,
                'diff_savings_balance' => $validated['diff_savings_balance'] ?? (isset($validated['closing_savings_balance']) || isset($validated['joining_savings_balance']) ? ((float) ($validated['closing_savings_balance'] ?? 0) - (float) ($validated['joining_savings_balance'] ?? 0)) : null),

                'joining_overdue_borrowers' => $validated['joining_overdue_borrowers'] ?? null,
                'closing_overdue_borrowers' => $validated['closing_overdue_borrowers'] ?? null,
                'diff_overdue_borrowers' => $validated['diff_overdue_borrowers'] ?? (isset($validated['closing_overdue_borrowers']) || isset($validated['joining_overdue_borrowers']) ? ((int) ($validated['closing_overdue_borrowers'] ?? 0) - (int) ($validated['joining_overdue_borrowers'] ?? 0)) : null),

                'joining_overdue_amount' => $validated['joining_overdue_amount'] ?? null,
                'closing_overdue_amount' => $validated['closing_overdue_amount'] ?? null,
                'diff_overdue_amount' => $validated['diff_overdue_amount'] ?? (isset($validated['closing_overdue_amount']) || isset($validated['joining_overdue_amount']) ? ((float) ($validated['closing_overdue_amount'] ?? 0) - (float) ($validated['joining_overdue_amount'] ?? 0)) : null),

                'joining_otr_pct' => $validated['joining_otr_pct'] ?? null,
                'closing_otr_pct' => $validated['closing_otr_pct'] ?? null,
                'diff_otr_pct' => $validated['diff_otr_pct'] ?? (isset($validated['closing_otr_pct']) || isset($validated['joining_otr_pct']) ? ((float) ($validated['closing_otr_pct'] ?? 0) - (float) ($validated['joining_otr_pct'] ?? 0)) : null),

                'joining_par_pct' => $validated['joining_par_pct'] ?? null,
                'closing_par_pct' => $validated['closing_par_pct'] ?? null,
                'diff_par_pct' => $validated['diff_par_pct'] ?? (isset($validated['closing_par_pct']) || isset($validated['joining_par_pct']) ? ((float) ($validated['closing_par_pct'] ?? 0) - (float) ($validated['joining_par_pct'] ?? 0)) : null),

                'has_cashier' => $validated['has_cashier'] ?? null,

                'total_score' => $validated['total_score'],
                'calculated_grade' => $validated['calculated_grade'],

                'strengths' => $validated['strengths'] ?? null,
                'weaknesses' => $validated['weaknesses'] ?? null,
                'training_need' => $validated['training_need'] ?? null,
                'other_remarks' => $remarks,
                'recommendation_status' => $recStatus,

                'status' => 'draft',
            ]);

            // Save individual criterion scores
            foreach ($validated['scores'] as $score) {
                $eval->scores()->create([
                    'section_key' => $score['section_key'],
                    'section_name' => $score['section_name'],
                    'criteria_key' => $score['criteria_key'],
                    'criteria_name' => $score['criteria_name'],
                    'max_score' => $score['max_score'],
                    'obtained_score' => $score['obtained_score'],
                ]);
            }

            // Save initiator signature
            $eval->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'initiator',
                'action' => ! empty($validated['submit_now']) ? 'submitted' : 'drafted',
                'comments' => $remarks ?: 'Initial appraisal created',
                'signed_at' => now(),
            ]);

            if (! empty($validated['submit_now'])) {
                $nextStatus = $this->workflowService->determineNextStatus($eval, 'draft');
                $eval->status = $nextStatus;
                $eval->save();
            }

            return $eval;
        });

        if (! empty($validated['submit_now'])) {
            $this->workflowService->notifyStakeholders($evaluation, 'submitted', $remarks);
        }

        return redirect()->route('probation-increment-evaluations.show', $evaluation->id)
            ->with('success', ! empty($validated['submit_now'])
                ? 'শিক্ষানবিশ ইনক্রিমেন্ট মূল্যায়ন সফলভাবে দাখিল করা হয়েছে।'
                : 'শিক্ষানবিশ ইনক্রিমেন্ট মূল্যায়ন খসড়া সফলভাবে সংরক্ষিত হয়েছে।');
    }

    public function show(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();

        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'employee.educations',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'initiator.employee.designation',
            'scores',
            ...AppraisalListQuery::signerWith(),
        ]);

        if ($evaluation->employee && empty($evaluation->employee->educational_qualification)) {
            $evaluation->employee->educational_qualification = method_exists($evaluation->employee, 'resolveEducationalQualification')
                ? $evaluation->employee->resolveEducationalQualification()
                : null;
        }

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $evaluation);
        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        $canEdit = (($evaluation->status === 'draft' || $isStuckAtRm) && $isInitiator)
            || ($canReview && ! in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        $canDelete = (($evaluation->status === 'draft' && $isInitiator) || $user->isSuperAdmin());
        $canSubmit = ($evaluation->status === 'draft' || $isStuckAtRm) && $isInitiator;
        $canApprove = $canReview && ! in_array($evaluation->status, ['draft', 'approved', 'rejected']);
        $canSendBack = $canReview && ! in_array($evaluation->status, ['draft', 'approved', 'rejected']);

        return Inertia::render('sections/human-resources/evaluations/probation-increment/show', [
            'evaluation' => $evaluation,
            'isSuperAdmin' => $user->isSuperAdmin(),
            'currentUserId' => $user->id,
            'userHasSignature' => method_exists($user, 'hasSignature') ? $user->hasSignature() : true,
            'canEdit' => $canEdit,
            'canDelete' => $canDelete,
            'canSubmit' => $canSubmit,
            'canApprove' => $canApprove,
            'canSendBack' => $canSendBack,
            'hasUserSigned' => $hasSigned,
            'sentBackReason' => $sentBackSig?->comments,
            'currentStageLabel' => $this->workflowService->getStageLabel($evaluation->status),
        ]);
    }

    public function edit(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $evaluation);
        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        if (! $isSuperAdmin && ! ($isInitiator && ($evaluation->status === 'draft' || $isStuckAtRm)) && ! $canReview) {
            abort(403, 'আপনার এই মূল্যায়ন সম্পাদনা করার অনুমতি নেই।');
        }

        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'employee.educations',
            'scores',
            ...AppraisalListQuery::signerWith(),
        ]);

        if ($evaluation->employee && empty($evaluation->employee->educational_qualification)) {
            $evaluation->employee->educational_qualification = method_exists($evaluation->employee, 'resolveEducationalQualification')
                ? $evaluation->employee->resolveEducationalQualification()
                : null;
        }

        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $templates = AppraisalTemplateCache::load('probation_increment');

        return Inertia::render('sections/human-resources/evaluations/probation-increment/edit', [
            'evaluation' => $evaluation,
            'templates' => $templates,
            'isSuperAdmin' => $isSuperAdmin,
            'isReviewerEdit' => ! $isInitiator && $canReview,
            'sentBackReason' => $sentBackSig?->comments,
        ]);
    }

    public function print(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'employee.educations',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'initiator.employee.designation',
            'scores',
            ...AppraisalListQuery::signerWith(),
        ]);

        if ($evaluation->employee && empty($evaluation->employee->educational_qualification)) {
            $evaluation->employee->educational_qualification = method_exists($evaluation->employee, 'resolveEducationalQualification')
                ? $evaluation->employee->resolveEducationalQualification()
                : null;
        }

        return Inertia::render('sections/human-resources/evaluations/probation-increment/print', [
            'evaluation' => $evaluation,
        ]);
    }

    public function update(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $evaluation);
        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        if (! $isSuperAdmin && ! ($isInitiator && ($evaluation->status === 'draft' || $isStuckAtRm)) && ! $canReview) {
            abort(403, 'আপনার এই মূল্যায়ন সম্পাদনা করার অনুমতি নেই।');
        }

        $validated = $request->validate([
            'joining_date' => 'nullable|string',
            'probation_3m_completion_date' => 'nullable|string',
            'education_at_joining' => 'nullable|string|max:255',
            'education_current' => 'nullable|string|max:255',
            'closing_month' => 'required|string|max:50',

            // Stats
            'joining_members_count' => 'nullable|integer',
            'closing_members_count' => 'nullable|integer',
            'diff_members_count' => 'nullable|integer',
            'joining_borrowers_count' => 'nullable|integer',
            'closing_borrowers_count' => 'nullable|integer',
            'diff_borrowers_count' => 'nullable|integer',
            'joining_loan_balance' => 'nullable|numeric',
            'closing_loan_balance' => 'nullable|numeric',
            'diff_loan_balance' => 'nullable|numeric',
            'joining_savings_balance' => 'nullable|numeric',
            'closing_savings_balance' => 'nullable|numeric',
            'diff_savings_balance' => 'nullable|numeric',
            'joining_overdue_borrowers' => 'nullable|integer',
            'closing_overdue_borrowers' => 'nullable|integer',
            'diff_overdue_borrowers' => 'nullable|integer',
            'joining_overdue_amount' => 'nullable|numeric',
            'closing_overdue_amount' => 'nullable|numeric',
            'diff_overdue_amount' => 'nullable|numeric',
            'joining_otr_pct' => 'nullable|numeric',
            'closing_otr_pct' => 'nullable|numeric',
            'diff_otr_pct' => 'nullable|numeric',
            'joining_par_pct' => 'nullable|numeric',
            'closing_par_pct' => 'nullable|numeric',
            'diff_par_pct' => 'nullable|numeric',
            'has_cashier' => 'nullable|boolean',

            'total_score' => 'required|numeric|min:0|max:100',
            'calculated_grade' => 'nullable|string|max:50',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'other_remarks' => 'nullable|string',
            'initiator_remarks' => 'nullable|string',
            'recommendation_status' => 'nullable|in:recommend_increment,defer_increment,not_suitable',
            'supervisor_recommendation' => 'nullable|in:recommend_increment,defer_increment,not_suitable',

            'scores' => 'required|array',
            'scores.*.section_key' => 'required|string',
            'scores.*.section_name' => 'required|string',
            'scores.*.criteria_key' => 'required|string',
            'scores.*.criteria_name' => 'required|string',
            'scores.*.max_score' => 'required|numeric',
            'scores.*.obtained_score' => 'required|numeric|min:0',

            'submit_now' => 'nullable|boolean',
        ]);

        if (! empty($validated['submit_now']) && ! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'মূল্যায়ন জমা দেওয়ার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।');
        }

        $parseDate = function ($dateVal) {
            if (empty($dateVal)) {
                return null;
            }
            try {
                if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $dateVal)) {
                    return \Illuminate\Support\Carbon::createFromFormat('d/m/Y', $dateVal)->format('Y-m-d');
                }

                return \Illuminate\Support\Carbon::parse($dateVal)->format('Y-m-d');
            } catch (\Throwable $e) {
                return null;
            }
        };

        AppraisalRequiredFields::assertInitiator($request, 'probation', $evaluation->form_type);

        $recStatus = $validated['recommendation_status'] ?? $validated['supervisor_recommendation'] ?? $evaluation->recommendation_status;
        $remarks = $validated['other_remarks'] ?? $validated['initiator_remarks'] ?? $evaluation->other_remarks;

        DB::transaction(function () use ($evaluation, $validated, $user, $parseDate, $recStatus, $remarks) {
            $updateData = [
                'joining_date' => $parseDate($validated['joining_date'] ?? null) ?? $evaluation->joining_date,
                'probation_3m_completion_date' => $parseDate($validated['probation_3m_completion_date'] ?? null) ?? $evaluation->probation_3m_completion_date,
                'education_at_joining' => $validated['education_at_joining'] ?? null,
                'education_current' => $validated['education_current'] ?? null,
                'closing_month' => $validated['closing_month'] ?? null,
                'joining_members_count' => $validated['joining_members_count'] ?? null,
                'closing_members_count' => $validated['closing_members_count'] ?? null,
                'diff_members_count' => $validated['diff_members_count'] ?? (isset($validated['closing_members_count']) || isset($validated['joining_members_count']) ? ((int) ($validated['closing_members_count'] ?? 0) - (int) ($validated['joining_members_count'] ?? 0)) : null),
                'joining_borrowers_count' => $validated['joining_borrowers_count'] ?? null,
                'closing_borrowers_count' => $validated['closing_borrowers_count'] ?? null,
                'diff_borrowers_count' => $validated['diff_borrowers_count'] ?? (isset($validated['closing_borrowers_count']) || isset($validated['joining_borrowers_count']) ? ((int) ($validated['closing_borrowers_count'] ?? 0) - (int) ($validated['joining_borrowers_count'] ?? 0)) : null),
                'joining_loan_balance' => $validated['joining_loan_balance'] ?? null,
                'closing_loan_balance' => $validated['closing_loan_balance'] ?? null,
                'diff_loan_balance' => $validated['diff_loan_balance'] ?? (isset($validated['closing_loan_balance']) || isset($validated['joining_loan_balance']) ? ((float) ($validated['closing_loan_balance'] ?? 0) - (float) ($validated['joining_loan_balance'] ?? 0)) : null),
                'joining_savings_balance' => $validated['joining_savings_balance'] ?? null,
                'closing_savings_balance' => $validated['closing_savings_balance'] ?? null,
                'diff_savings_balance' => $validated['diff_savings_balance'] ?? (isset($validated['closing_savings_balance']) || isset($validated['joining_savings_balance']) ? ((float) ($validated['closing_savings_balance'] ?? 0) - (float) ($validated['joining_savings_balance'] ?? 0)) : null),
                'joining_overdue_borrowers' => $validated['joining_overdue_borrowers'] ?? null,
                'closing_overdue_borrowers' => $validated['closing_overdue_borrowers'] ?? null,
                'diff_overdue_borrowers' => $validated['diff_overdue_borrowers'] ?? (isset($validated['closing_overdue_borrowers']) || isset($validated['joining_overdue_borrowers']) ? ((int) ($validated['closing_overdue_borrowers'] ?? 0) - (int) ($validated['joining_overdue_borrowers'] ?? 0)) : null),
                'joining_overdue_amount' => $validated['joining_overdue_amount'] ?? null,
                'closing_overdue_amount' => $validated['closing_overdue_amount'] ?? null,
                'diff_overdue_amount' => $validated['diff_overdue_amount'] ?? (isset($validated['closing_overdue_amount']) || isset($validated['joining_overdue_amount']) ? ((float) ($validated['closing_overdue_amount'] ?? 0) - (float) ($validated['joining_overdue_amount'] ?? 0)) : null),
                'joining_otr_pct' => $validated['joining_otr_pct'] ?? null,
                'closing_otr_pct' => $validated['closing_otr_pct'] ?? null,
                'diff_otr_pct' => $validated['diff_otr_pct'] ?? (isset($validated['closing_otr_pct']) || isset($validated['joining_otr_pct']) ? ((float) ($validated['closing_otr_pct'] ?? 0) - (float) ($validated['joining_otr_pct'] ?? 0)) : null),
                'joining_par_pct' => $validated['joining_par_pct'] ?? null,
                'closing_par_pct' => $validated['closing_par_pct'] ?? null,
                'diff_par_pct' => $validated['diff_par_pct'] ?? (isset($validated['closing_par_pct']) || isset($validated['joining_par_pct']) ? ((float) ($validated['closing_par_pct'] ?? 0) - (float) ($validated['joining_par_pct'] ?? 0)) : null),
                'has_cashier' => $validated['has_cashier'] ?? null,
                'total_score' => $validated['total_score'],
                'calculated_grade' => $validated['calculated_grade'],
                'strengths' => $validated['strengths'] ?? null,
                'weaknesses' => $validated['weaknesses'] ?? null,
                'training_need' => $validated['training_need'] ?? null,
                'other_remarks' => $remarks,
                'recommendation_status' => $recStatus,
            ];

            if (! empty($validated['submit_now']) && ($evaluation->status === 'draft' || $isStuckAtRm)) {
                $nextStatus = $this->workflowService->determineNextStatus($evaluation, 'draft');
                $updateData['status'] = $nextStatus;
                $evaluation->signatures()->create([
                    'user_id' => $user->id,
                    'stage' => 'initiator',
                    'action' => 'submitted',
                    'comments' => $remarks ?: 'Resubmitted by creator',
                    'signed_at' => now(),
                ]);
            }

            $evaluation->update($updateData);

            // Sync scores
            foreach ($validated['scores'] as $score) {
                $evaluation->scores()->updateOrCreate(
                    ['criteria_key' => $score['criteria_key']],
                    [
                        'section_key' => $score['section_key'],
                        'section_name' => $score['section_name'],
                        'criteria_name' => $score['criteria_name'],
                        'max_score' => $score['max_score'],
                        'obtained_score' => $score['obtained_score'],
                    ]
                );
            }
        });

        if (! empty($validated['submit_now'])) {
            $this->workflowService->notifyStakeholders($evaluation, 'submitted', $remarks);
        }

        return redirect()->route('probation-increment-evaluations.show', $evaluation->id)
            ->with('success', 'মূল্যায়ন সফলভাবে হালনাগাদ করা হয়েছে।');
    }

    public function resetWorkflow(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        return $this->resetAppraisalWorkflow($request, $evaluation);
    }

    public function destroy(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        if (! $user->isSuperAdmin() && ! ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id)) {
            abort(403, 'আপনার এটি মুছে ফেলার অনুমতি নেই।');
        }

        \App\Support\ConfirmedPassword::validate($request);

        $evaluation->delete();

        return redirect()->route('probation-increment-evaluations.index')
            ->with('success', 'মূল্যায়ন রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function forward(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        if (! $this->workflowService->canUserReview($user, $evaluation) && ! $isStuckAtRm) {
            abort(403, 'আপনার এই মূল্যায়নে স্বাক্ষর বা ফরোয়ার্ড করার অনুমতি নেই।');
        }

        if ($evaluation->status === 'draft' || $isStuckAtRm) {
            AppraisalRequiredFields::assertStored('probation', $evaluation);
        } else {
            AppraisalRequiredFields::assertActor($request, 'probation', 'reviewer');
        }

        $isSubmitStage = $evaluation->status === 'draft' || $isStuckAtRm;
        $validated = $request->validate([
            'comments' => $isSubmitStage ? 'nullable|string|max:1000' : 'required|string|max:1000',
            'recommendation_status' => 'nullable|in:recommend_increment,defer_increment,not_suitable',
            'supervisor_recommendation' => 'nullable|in:recommend_increment,defer_increment,not_suitable',
        ]);

        $nextStatus = $this->workflowService->determineNextStatus($evaluation, $isStuckAtRm ? 'draft' : $evaluation->status);
        $comments = $isSubmitStage
            ? (trim((string) ($validated['comments'] ?? '')) !== ''
                ? trim((string) $validated['comments'])
                : ($nextStatus === 'submitted_to_zm'
                    ? 'মূল্যায়নটি জোনাল ম্যানেজার (ZM) বরাবর দাখিল করা হয়েছে।'
                    : 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।'))
            : trim((string) $validated['comments']);

        if ($isStuckAtRm) {
            $this->workflowService->resubmitPastRm($evaluation, $user, $comments);

            return back()->with('success', 'সফলভাবে স্বাক্ষর করে পরবর্তী স্তরে ফরোয়ার্ড করা হয়েছে।');
        }

        $this->workflowService->forward(
            $evaluation,
            $user,
            $comments,
            $validated['recommendation_status'] ?? $validated['supervisor_recommendation'] ?? null
        );

        return back()->with('success', 'সফলভাবে স্বাক্ষর করে পরবর্তী স্তরে ফরোয়ার্ড করা হয়েছে।');
    }

    public function sendBack(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        if (! $this->workflowService->canUserReview($user, $evaluation)) {
            abort(403, 'আপনার এই মূল্যায়ন ফেরত পাঠানোর অনুমতি নেই।');
        }

        $validated = $request->validate([
            'comments' => 'required|string|max:1000',
        ]);

        $this->workflowService->sendBack($evaluation, $user, $validated['comments']);

        return back()->with('success', 'সংশোধনের জন্য প্রস্তুতকারীর নিকট ফেরত পাঠানো হয়েছে।');
    }

    public function hrVerify(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        if (! $this->workflowService->canUserReview($user, $evaluation) || $evaluation->status !== 'submitted_to_hr') {
            abort(403, 'আপনার এই পর্যায়ে যাচাই করার অনুমতি নেই।');
        }

        AppraisalRequiredFields::assertActor($request, 'probation', 'hr');

        $validated = $request->validate([
            'comments' => 'required|string|max:1000',
            'hr_financial_irregularity' => 'required|boolean',
            'hr_disciplinary_action' => 'required|boolean',
            'hr_audit_objection' => 'required|boolean',
            'hr_leave_without_pay' => 'required|boolean',
        ]);

        $this->workflowService->hrVerify($evaluation, $user, $validated, $validated['comments']);

        return back()->with('success', 'মানবসম্পদ বিভাগ কর্তৃক সফলভাবে যাচাই ও ফরোয়ার্ড করা হয়েছে।');
    }

    public function edApprove(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        if (! $this->workflowService->canUserReview($user, $evaluation) || $evaluation->status !== 'submitted_to_ed') {
            abort(403, 'আপনার চূড়ান্ত অনুমোদনের অনুমতি নেই।');
        }

        AppraisalRequiredFields::assertActor($request, 'probation', 'ed');

        $validated = $request->validate([
            'comments' => 'required|string|max:1000',
            'is_approved' => 'required|boolean',
        ]);

        $this->workflowService->edApprove($evaluation, $user, $validated['comments'], $validated['is_approved']);

        return back()->with('success', $validated['is_approved'] ? 'মূল্যায়ন চূড়ান্তভাবে অনুমোদিত হয়েছে।' : 'মূল্যায়নটি বাতিল করা হয়েছে।');
    }

    public function quickApprove(Request $request, ProbationIncrementEvaluation $evaluation)
    {
        $user = $request->user();
        if (! $this->workflowService->canUserReview($user, $evaluation)) {
            abort(403, 'আপনার অনুমোদনের অনুমতি নেই।');
        }

        if ($evaluation->status === 'submitted_to_hr') {
            AppraisalRequiredFields::assertActor($request, 'probation', 'hr');
            $this->workflowService->hrVerify($evaluation, $user, $request->only([
                'hr_financial_irregularity',
                'hr_disciplinary_action',
                'hr_audit_objection',
                'hr_leave_without_pay',
            ]), trim((string) $request->input('comments')));
        } elseif ($evaluation->status === 'submitted_to_ed') {
            AppraisalRequiredFields::assertActor($request, 'probation', 'ed');
            $this->workflowService->edApprove($evaluation, $user, trim((string) $request->input('comments')), $request->boolean('is_approved'));
        } elseif ($evaluation->status === 'draft') {
            AppraisalRequiredFields::assertStored('probation', $evaluation);
            $this->workflowService->forward($evaluation, $user, trim((string) $request->input('comments', '')) ?: 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।');
        } else {
            AppraisalRequiredFields::assertActor($request, 'probation', 'reviewer');
            $this->workflowService->forward(
                $evaluation,
                $user,
                trim((string) $request->input('comments')),
                $request->input('recommendation_status') ?? $request->input('supervisor_recommendation')
            );
        }

        return back()->with('success', 'দ্রুত অনুমোদন / ফরোয়ার্ড সম্পন্ন হয়েছে।');
    }
}
