<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\CorrectsWorkflowComments;
use App\Http\Controllers\Concerns\ResetsAppraisalWorkflow;
use App\Models\ConfirmationEvaluation;
use App\Models\ConfirmationEvaluationSignature;
use App\Models\Employee;
use App\Services\Appraisal\AppraisalEmployeeLookup;
use App\Services\Appraisal\AppraisalListQuery;
use App\Services\Appraisal\AppraisalTemplateCache;
use App\Services\ConfirmationEvaluationWorkflowService;
use App\Services\OrganogramAccessService;
use App\Support\AppraisalRequiredFields;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ConfirmationEvaluationController extends Controller
{
    use CorrectsWorkflowComments;
    use ResetsAppraisalWorkflow;

    public function __construct(private readonly ConfirmationEvaluationWorkflowService $workflowService) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $query = ConfirmationEvaluation::with(array_merge([
            'employee:id,pin,name_en,name_bn,designation_id,current_branch_id',
            'employee.designation:id,name',
            'employee.branch:id,name',
        ], AppraisalListQuery::listSignatures($user, 'confirmation_evaluation_id')));

        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $branchId = $user->employee?->current_branch_id ?? $user->branch_id;

        if ($user->isSuperAdmin()) {
            // Super Admin sees all
        } elseif ($user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true)) {
            if (! $user->employee && ! $user->branch_id) {
                return redirect()->back()->with('error', 'Only Branch Managers with an assigned branch can access this.');
            }
            $query->where('branch_id', $branchId);
        } elseif ($user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true)) {
            $regOfficeId = $user->employee?->branch?->regional_office_id;
            if (! $regOfficeId) {
                return redirect()->back()->with('error', 'Only Regional Managers with a linked regional office profile can access this.');
            }
            $query->where('regional_office_id', $regOfficeId);
        } elseif ($user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true)) {
            $zoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            if (! $zoneId) {
                return redirect()->back()->with('error', 'Only Zonal Managers with a linked zone profile can access this.');
            }
            $query->where('zone_id', $zoneId);
        }

        $metrics = AppraisalListQuery::summarize(clone $query, [
            'pending' => "status NOT IN ('approved', 'rejected')",
            'approved' => "status = 'approved'",
            'recommended' => "recommendation_status = 'recommended'",
        ]);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('pin', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('form_type') && $request->input('form_type') !== 'all') {
            $query->where('form_type', $request->input('form_type'));
        }

        $perPage = (int) $request->input('per_page', 15);
        if (! in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }

        $evaluations = $query->latest()->paginate($perPage)->withQueryString();

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

        return Inertia::render('sections/human-resources/evaluations/confirmation/index', [
            'evaluations' => $evaluations,
            'metrics' => $metrics,
            'filters' => $request->only(['search', 'status', 'form_type', 'per_page']),
            'canCreate' => $user->isSuperAdmin() || $user->hasPermission('confirmation-evaluations.create') || $user->hasPermission('confirmations.create'),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'currentUserId' => $user->id,
            'userHasSignature' => $user->hasSignature(),
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        $isLineManager = $user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_director') || in_array('Director (Microfinance)', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_assistant_director') || in_array('Assistant Director (Microfinance)', $roleNames, true) ||
                         in_array('Director Finance and Accounts', $roleNames, true) || in_array('Director Finance and Account', $roleNames, true);

        if (! $isLineManager && ! $user->isSuperAdmin()) {
            return redirect()->route('confirmation.evaluations.index')->with('error', 'Only Branch Managers, Regional Managers, Zonal Managers, or Directors can create a confirmation evaluation.');
        }

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'স্থায়ীকরণ মূল্যায়ন শুরু করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if (! $user->isSuperAdmin() && $isLineManager && ! $user->employee) {
            return redirect()->route('confirmation.evaluations.index')->with('error', 'Your user account must be linked to an employee profile to create an evaluation.');
        }

        return Inertia::render('sections/human-resources/evaluations/confirmation/create', [
            'employeeLookupUrl' => route('confirmation.evaluations.employees.lookup'),
            'templates' => AppraisalTemplateCache::load('confirmation'),
        ]);
    }

    public function lookupEmployees(Request $request)
    {
        $rows = app(AppraisalEmployeeLookup::class)->search(
            $request->user(),
            'confirmation',
            (string) $request->query('q', ''),
            (int) $request->query('limit', 20),
        );

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'স্থায়ীকরণ মূল্যায়ন সংরক্ষণ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if (! $request->filled('extend_months') && $request->filled('extend_probation_months')) {
            $request->merge(['extend_months' => $request->input('extend_probation_months')]);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'joining_date' => 'nullable|string',
            'probation_end_date' => 'nullable|string',
            'education_at_joining' => 'nullable|string',
            'education_current' => 'nullable|string',
            'closing_month' => 'nullable|string',

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

            // Scores & Summary
            'total_score' => 'required|numeric',
            'calculated_grade' => 'required|string',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'other_remarks' => 'nullable|string',
            'recommendation_status' => 'required|string|in:recommended,extend_probation,not_suitable',
            'extend_months' => 'nullable|required_if:recommendation_status,extend_probation|integer',
            'scores' => 'required|array|min:1',
        ]);

        if ($user->employee_id && (int) $validated['employee_id'] === (int) $user->employee_id) {
            return redirect()->back()->withErrors([
                'employee_id' => 'আপনি নিজের স্থায়ীকরণ মূল্যায়ন করতে পারবেন না।',
            ])->withInput();
        }

        $employee = Employee::with('branch.regionalOffice', 'designation')->findOrFail($validated['employee_id']);

        $userLevel = $this->workflowService->getUserHierarchyLevel($user);
        if ($userLevel > 0) {
            $candTier = \App\Support\BranchOrganogram::resolveTier($employee->designation?->name);
            $candLevel = (int) ($candTier['level'] ?? 999);
            if ($candLevel <= $userLevel) {
                return redirect()->back()->withErrors([
                    'employee_id' => 'আপনি শুধুমাত্র আপনার অধীনস্থ (নিচের পদবীর) কর্মীদের স্থায়ীকরণ মূল্যায়ন তৈরি করতে পারবেন।',
                ])->withInput();
            }
        }

        $formType = $this->workflowService->determineFormType($employee);

        if (! $request->filled('extend_months') && $request->filled('extend_probation_months')) {
            $request->merge(['extend_months' => $request->input('extend_probation_months')]);
        }
        AppraisalRequiredFields::assertInitiator($request, 'confirmation', $formType);

        $joiningDate = null;
        if (! empty($validated['joining_date'])) {
            try {
                $joiningDate = Carbon::createFromFormat('d/m/Y', $validated['joining_date'])->format('Y-m-d');
            } catch (\Throwable $e) {
                $joiningDate = Carbon::parse($validated['joining_date'])->format('Y-m-d');
            }
        }

        $probationEndDate = null;
        if (! empty($validated['probation_end_date'])) {
            try {
                $probationEndDate = Carbon::createFromFormat('d/m/Y', $validated['probation_end_date'])->format('Y-m-d');
            } catch (\Throwable $e) {
                $probationEndDate = Carbon::parse($validated['probation_end_date'])->format('Y-m-d');
            }
        }

        $evaluation = ConfirmationEvaluation::create([
            'employee_id' => $employee->id,
            'initiator_id' => Auth::id(),
            'branch_id' => $employee->current_branch_id,
            'regional_office_id' => $employee->branch->regional_office_id ?? null,
            'zone_id' => $employee->branch->regionalOffice->zone_id ?? null,
            'form_type' => $formType,

            'joining_date' => $joiningDate,
            'probation_end_date' => $probationEndDate,
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
            'other_remarks' => $validated['other_remarks'] ?? null,
            'recommendation_status' => $validated['recommendation_status'],
            'extend_months' => $validated['extend_months'] ?? null,

            'status' => 'draft',
        ]);

        foreach ($validated['scores'] as $score) {
            $evaluation->scores()->create([
                'section_key' => $score['section_key'],
                'section_name' => $score['section_name'],
                'criteria_key' => $score['criteria_key'],
                'criteria_name' => $score['criteria_name'],
                'max_score' => $score['max_score'],
                'obtained_score' => $score['obtained_score'],
            ]);
        }

        $evaluation->signatures()->create([
            'user_id' => Auth::id(),
            'stage' => 'initiator',
            'action' => 'drafted',
            'comments' => 'Initial Confirmation Evaluation Drafted',
            'signed_at' => now(),
        ]);

        return redirect()->route('confirmation.evaluations.show', $evaluation)->with('success', 'Confirmation evaluation draft created successfully.');
    }

    public function show(Request $request, ConfirmationEvaluation $evaluation)
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
            $evaluation->employee->educational_qualification = $evaluation->employee->resolveEducationalQualification();
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

        return Inertia::render('sections/human-resources/evaluations/confirmation/show', [
            'evaluation' => $evaluation,
            'isSuperAdmin' => $user->isSuperAdmin(),
            'currentUserId' => $user->id,
            'userHasSignature' => $user->hasSignature(),
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

    public function edit(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = (! $hasSigned && $this->workflowService->canUserReview($user, $evaluation)) || $user->isSuperAdmin();
        $canEdit = (($evaluation->status === 'draft' || $isStuckAtRm) && $isInitiator)
            || ($canReview && ! in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        if (! $canEdit) {
            return redirect()->route('confirmation.evaluations.show', $evaluation)
                ->with('error', 'You cannot edit this evaluation at this stage.');
        }

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
            $evaluation->employee->educational_qualification = $evaluation->employee->resolveEducationalQualification();
        }

        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $templates = AppraisalTemplateCache::load('confirmation');

        return Inertia::render('sections/human-resources/evaluations/confirmation/edit', [
            'evaluation' => $evaluation,
            'templates' => $templates,
            'isReviewerEdit' => $evaluation->status !== 'draft',
            'returnComment' => $sentBackSig?->comments,
            'userHasSignature' => $user->hasSignature(),
        ]);
    }

    public function update(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        if (! $request->filled('extend_months') && $request->filled('extend_probation_months')) {
            $request->merge(['extend_months' => $request->input('extend_probation_months')]);
        }

        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = (! $hasSigned && $this->workflowService->canUserReview($user, $evaluation)) || $user->isSuperAdmin();
        $canEdit = (($evaluation->status === 'draft' || $isStuckAtRm) && $isInitiator)
            || ($canReview && ! in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        if (! $canEdit) {
            return redirect()->route('confirmation.evaluations.show', $evaluation)
                ->with('error', 'You cannot edit this evaluation at this stage.');
        }

        $validated = $request->validate([
            'joining_date' => 'nullable|string',
            'probation_end_date' => 'nullable|string',
            'education_at_joining' => 'nullable|string',
            'education_current' => 'nullable|string',
            'closing_month' => 'nullable|string',
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
            'total_score' => 'required|numeric',
            'calculated_grade' => 'required|string',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'other_remarks' => 'nullable|string',
            'recommendation_status' => 'required|string|in:recommended,extend_probation,not_suitable',
            'extend_months' => 'nullable|required_if:recommendation_status,extend_probation|integer',
            'hr_financial_irregularity' => 'nullable|boolean',
            'hr_disciplinary_action' => 'nullable|boolean',
            'hr_audit_objection' => 'nullable|boolean',
            'hr_leave_without_pay' => 'nullable|boolean',
            'scores' => 'required|array|min:1',
            'submit_now' => 'nullable|boolean',
            'approve_now' => 'nullable|boolean',
            'comments' => 'nullable|string',
        ]);

        $isSubmitting = ! empty($validated['submit_now']);
        $isApproving = ! empty($validated['approve_now']);

        if (! $request->filled('extend_months') && $request->filled('extend_probation_months')) {
            $request->merge(['extend_months' => $request->input('extend_probation_months')]);
        }
        AppraisalRequiredFields::assertInitiator($request, 'confirmation', $evaluation->form_type);
        if ($isApproving) {
            $actor = match ($evaluation->status) {
                'submitted_to_hr' => 'hr',
                'submitted_to_ed' => 'ed',
                default => 'reviewer',
            };
            AppraisalRequiredFields::assertActor($request, 'confirmation', $actor);
        }

        if (($isSubmitting || $isApproving) && ! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'মূল্যায়ন জমা বা অনুমোদন করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।');
        }

        DB::transaction(function () use ($evaluation, $validated, $user, $isSubmitting, $isApproving, $request) {
            $newStatus = $evaluation->status;
            if ($isSubmitting) {
                $newStatus = $this->workflowService->determineNextStatus($evaluation, 'draft');
            } elseif ($isApproving) {
                $newStatus = $this->workflowService->determineNextStatus($evaluation, $evaluation->status);
            }

            $originalStatus = $evaluation->status;

            $joiningDate = null;
            if (! empty($validated['joining_date'])) {
                try {
                    $joiningDate = Carbon::createFromFormat('d/m/Y', $validated['joining_date'])->format('Y-m-d');
                } catch (\Throwable $e) {
                    $joiningDate = Carbon::parse($validated['joining_date'])->format('Y-m-d');
                }
            }

            $probationEndDate = null;
            if (! empty($validated['probation_end_date'])) {
                try {
                    $probationEndDate = Carbon::createFromFormat('d/m/Y', $validated['probation_end_date'])->format('Y-m-d');
                } catch (\Throwable $e) {
                    $probationEndDate = Carbon::parse($validated['probation_end_date'])->format('Y-m-d');
                }
            }

            $updateData = [
                'joining_date' => $joiningDate,
                'probation_end_date' => $probationEndDate,
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
                'other_remarks' => $validated['other_remarks'] ?? null,
                'recommendation_status' => $validated['recommendation_status'],
                'extend_months' => $validated['extend_months'] ?? null,
                'status' => $newStatus,
            ];

            if (array_key_exists('hr_financial_irregularity', $validated)) {
                $updateData['hr_financial_irregularity'] = $validated['hr_financial_irregularity'];
            }
            if (array_key_exists('hr_disciplinary_action', $validated)) {
                $updateData['hr_disciplinary_action'] = $validated['hr_disciplinary_action'];
            }
            if (array_key_exists('hr_audit_objection', $validated)) {
                $updateData['hr_audit_objection'] = $validated['hr_audit_objection'];
            }
            if (array_key_exists('hr_leave_without_pay', $validated)) {
                $updateData['hr_leave_without_pay'] = $validated['hr_leave_without_pay'];
            }

            $evaluation->update($updateData);

            // Sync scores
            $evaluation->scores()->delete();
            foreach ($validated['scores'] as $score) {
                $evaluation->scores()->create([
                    'section_key' => $score['section_key'],
                    'section_name' => $score['section_name'],
                    'criteria_key' => $score['criteria_key'],
                    'criteria_name' => $score['criteria_name'],
                    'max_score' => $score['max_score'],
                    'obtained_score' => $score['obtained_score'],
                ]);
            }

            if ($isSubmitting) {
                $comments = ! empty($validated['comments'])
                    ? $validated['comments']
                    : match ($newStatus) {
                        'submitted_to_director' => 'Evaluation submitted to Director (Microfinance)',
                        'submitted_to_director_fa' => 'Evaluation submitted to Director (Finance & Accounts)',
                        'submitted_to_hr' => 'Evaluation submitted to HR Department',
                        'submitted_to_zm' => 'Evaluation submitted to Zonal Manager',
                        default => 'Evaluation submitted to Regional Manager',
                    };
                $evaluation->signatures()->create([
                    'user_id' => $user->id,
                    'stage' => 'initiator',
                    'action' => 'submitted',
                    'comments' => $comments,
                    'signed_at' => now(),
                ]);
            } elseif ($isApproving) {
                $stage = $this->workflowService->determineStageRole($originalStatus);
                $comment = ! empty($request->input('comments')) ? $request->input('comments') : 'সুপারিশ ও স্বাক্ষরসহ সংশোধনপূর্বক অনুমোদন করা হলো।';
                $evaluation->signatures()->create([
                    'user_id' => $user->id,
                    'stage' => $stage,
                    'action' => 'forwarded',
                    'comments' => $comment,
                    'signed_at' => now(),
                ]);
            }
        });

        if ($isSubmitting) {
            $this->workflowService->notifyStakeholders($evaluation, 'submitted');
        } elseif ($isApproving) {
            $this->workflowService->notifyStakeholders($evaluation, 'forwarded');
        }

        $msg = 'মূল্যায়নের পরিবর্তনসমূহ সফলভাবে সংরক্ষণ করা হয়েছে।';
        if ($isSubmitting) {
            $stageLabel = $this->workflowService->getStageLabel($newStatus, 'bn');
            $msg = "মূল্যায়নটি সফলভাবে দাখিল করা হয়েছে ({$stageLabel})।";
        } elseif ($isApproving) {
            $msg = 'মূল্যায়নটি সফলভাবে সংশোধনপূর্বক অনুমোদন ও পরবর্তী স্তরে অগ্রবর্তী করা হয়েছে।';
        }

        return redirect()->route('confirmation.evaluations.show', $evaluation)->with('success', $msg);
    }

    public function resetWorkflow(Request $request, ConfirmationEvaluation $evaluation)
    {
        return $this->resetAppraisalWorkflow($request, $evaluation);
    }

    public function destroy(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        $canDelete = $user->isSuperAdmin() || ($evaluation->status === 'draft' && $evaluation->initiator_id === $user->id);
        if (! $canDelete) {
            return redirect()->back()->with('error', 'You cannot delete this evaluation once it has been submitted.');
        }

        \App\Support\ConfirmedPassword::validate($request);

        $evaluation->scores()->delete();
        $evaluation->signatures()->delete();
        $evaluation->delete();

        return redirect()->route('confirmation.evaluations.index')->with('success', 'Confirmation evaluation deleted successfully.');
    }

    public function print(ConfirmationEvaluation $evaluation)
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
            $evaluation->employee->educational_qualification = $evaluation->employee->resolveEducationalQualification();
        }

        return Inertia::render('sections/human-resources/evaluations/confirmation/print', [
            'evaluation' => $evaluation,
        ]);
    }

    public function forward(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'স্থায়ীকরণ মূল্যায়ন অনুমোদন বা অগ্রবর্তী করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        $isInitiator = (int) $evaluation->initiator_id === (int) $user->id;
        $isStuckAtRm = $this->workflowService->initiatorMayResubmitPastRm($user, $evaluation);

        if ($evaluation->status === 'draft' || $isStuckAtRm) {
            if (! $isInitiator) {
                return redirect()->back()->with('error', 'শুধুমাত্র মূল্যায়নটির স্রষ্টা (Creator) এটি দাখিল করতে পারবেন।');
            }
        } else {
            if (! $this->workflowService->canUserReview($user, $evaluation)) {
                return redirect()->back()->with('error', 'আপনার এই স্তরে মূল্যায়ন পর্যালোচনা বা অনুমোদন করার অনুমতি নেই।');
            }
        }

        if ($evaluation->status === 'draft' || $isStuckAtRm) {
            AppraisalRequiredFields::assertStored('confirmation', $evaluation);
        } elseif ($evaluation->status === 'submitted_to_hr') {
            AppraisalRequiredFields::assertActor($request, 'confirmation', 'hr');
        } elseif ($evaluation->status === 'submitted_to_ed') {
            AppraisalRequiredFields::assertActor($request, 'confirmation', 'ed');
        } else {
            AppraisalRequiredFields::assertActor($request, 'confirmation', 'reviewer');
        }

        if ($evaluation->status === 'submitted_to_hr') {
            $validated = $request->validate([
                'hr_financial_irregularity' => 'required|boolean',
                'hr_disciplinary_action' => 'required|boolean',
                'hr_audit_objection' => 'required|boolean',
                'hr_leave_without_pay' => 'required|boolean',
                'comments' => 'required|string',
            ]);
            $this->workflowService->hrVerify($evaluation, $user, $validated, trim((string) $request->input('comments')));

            return redirect()->back()->with('success', 'মূল্যায়নটির ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করে নির্বাহী পরিচালক (ED) বরাবর অগ্রবর্তী করা হয়েছে।');
        }

        if ($evaluation->status === 'submitted_to_ed') {
            $isApproved = $request->boolean('is_approved');
            $this->workflowService->edApprove($evaluation, $user, trim((string) $request->input('comments')), $isApproved);

            return redirect()->back()->with('success', $isApproved ? 'স্থায়ীকরণ মূল্যায়নটি সফলভাবে চূড়ান্ত অনুমোদন দেওয়া হয়েছে।' : 'স্থায়ীকরণ মূল্যায়নটি নামঞ্জুর করা হয়েছে।');
        }

        $isSubmitStage = $evaluation->status === 'draft' || $isStuckAtRm;
        $request->validate([
            'comments' => $isSubmitStage ? 'nullable|string' : 'required|string',
            'recommendation_status' => $isSubmitStage ? 'nullable|string' : 'required|string',
            'extend_months' => 'nullable|integer',
        ]);

        $nextStatus = $this->workflowService->determineNextStatus($evaluation, $isStuckAtRm ? 'draft' : $evaluation->status);
        $comments = $isSubmitStage
            ? (trim((string) $request->input('comments', '')) !== ''
                ? trim((string) $request->input('comments'))
                : match ($nextStatus) {
                    'submitted_to_director' => 'মূল্যায়নটি পরিচালক (মাইক্রোফাইন্যান্স) বরাবর দাখিল করা হয়েছে।',
                    'submitted_to_director_fa' => 'মূল্যায়নটি পরিচালক (অর্থ ও হিসাব) বরাবর দাখিল করা হয়েছে।',
                    'submitted_to_hr' => 'মূল্যায়নটি মানবসম্পদ বিভাগ (HR) বরাবর দাখিল করা হয়েছে।',
                    'submitted_to_zm' => 'মূল্যায়নটি জোনাল ম্যানেজার (ZM) বরাবর দাখিল করা হয়েছে।',
                    default => 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।',
                })
            : trim((string) $request->input('comments'));

        if ($isStuckAtRm) {
            $this->workflowService->resubmitPastRm($evaluation, $user, $comments);
        } else {
            $this->workflowService->forward(
                $evaluation,
                $user,
                $comments,
                $request->recommendation_status,
                $request->extend_months
            );
        }

        $nextStageLabel = $this->workflowService->getStageLabel($evaluation->fresh()->status, 'bn');
        $msg = $evaluation->fresh()->status === 'approved'
            ? 'স্থায়ীকরণ মূল্যায়নটি সফলভাবে চূড়ান্ত অনুমোদন দেওয়া হয়েছে।'
            : "মূল্যায়নটি সফলভাবে পরবর্তী স্তরে ({$nextStageLabel}) অগ্রবর্তী করা হয়েছে।";

        return redirect()->back()->with('success', $msg);
    }

    public function sendBack(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        if (! $this->workflowService->canUserReview($user, $evaluation)) {
            return redirect()->back()->with('error', 'আপনার এই মূল্যায়নটি সংশোধনের জন্য ফেরত পাঠানোর অনুমতি নেই।');
        }

        $request->validate([
            'comments' => 'required|string',
        ]);

        $this->workflowService->sendBack($evaluation, $user, $request->comments);

        return redirect()->back()->with('success', 'মূল্যায়নটি সফলভাবে সংশোধনের জন্য স্রষ্টার (Creator) নিকট ফেরত পাঠানো হয়েছে।');
    }

    public function hrVerify(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'স্থায়ীকরণ মূল্যায়ন যাচাই করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        AppraisalRequiredFields::assertActor($request, 'confirmation', 'hr');

        $validated = $request->validate([
            'hr_financial_irregularity' => 'required|boolean',
            'hr_disciplinary_action' => 'required|boolean',
            'hr_audit_objection' => 'required|boolean',
            'hr_leave_without_pay' => 'required|boolean',
            'comments' => 'required|string',
        ]);

        $this->workflowService->hrVerify($evaluation, $user, $validated, trim((string) $request->input('comments')));

        return redirect()->back()->with('success', 'মূল্যায়নটির ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করে নির্বাহী পরিচালক (ED) বরাবর অগ্রবর্তী করা হয়েছে।');
    }

    public function edApprove(Request $request, ConfirmationEvaluation $evaluation)
    {
        $user = $request->user();

        if (! $user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'স্থায়ীকরণ মূল্যায়নে চূড়ান্ত সিদ্ধান্ত প্রদানের পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if ($evaluation->status !== 'submitted_to_ed') {
            return redirect()->back()->with('error', 'এই মূল্যায়নটি বর্তমানে নির্বাহী পরিচালকের অনুমোদনের স্তরে নেই।');
        }

        if (! $this->workflowService->canUserReview($user, $evaluation)) {
            return redirect()->back()->with('error', 'আপনার এই স্তরে মূল্যায়ন পর্যালোচনা বা অনুমোদন করার অনুমতি নেই।');
        }

        AppraisalRequiredFields::assertActor($request, 'confirmation', 'ed');

        $request->validate([
            'comments' => 'required|string',
            'is_approved' => 'required|boolean',
        ]);

        $this->workflowService->edApprove($evaluation, $user, trim((string) $request->input('comments')), $request->boolean('is_approved'));

        return redirect()->back()->with('success', $request->boolean('is_approved') ? 'স্থায়ীকরণ মূল্যায়নটি সফলভাবে চূড়ান্ত অনুমোদন দেওয়া হয়েছে।' : 'স্থায়ীকরণ মূল্যায়নটি নামঞ্জুর করা হয়েছে।');
    }

    public function correctComment(Request $request, ConfirmationEvaluation $evaluation, ConfirmationEvaluationSignature $signature)
    {
        return $this->correctSignatureComment($request, $signature, (int) $evaluation->id, 'confirmation_evaluation_id');
    }
}
