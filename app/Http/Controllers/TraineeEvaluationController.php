<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\TraineeEvaluation;
use App\Models\User;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use App\Services\TraineeWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TraineeEvaluationController extends Controller
{
    public function __construct(
        protected TraineeWorkflowService $workflowService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = TraineeEvaluation::query()
            ->with(['employee.designation', 'employee.branch', 'initiator.employee', 'branch', 'regionalOffice', 'zone', 'signatures.user.employee']);

        // Scope by User Role / Hierarchy
        $branchId = $user->employee?->current_branch_id ?? $user->employee?->branch_id;
        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        if ($user->isSuperAdmin() || OrganogramAccessService::isExecutiveDirector($user) || in_array('Executive Director', $roleNames, true)) {
            // Unrestricted
        } elseif ($this->workflowService->isBranchManager($user) || in_array('Branch Manager', $roleNames, true)) {
            $query->where(function ($q) use ($branchId, $user) {
                if ($branchId) {
                    $q->where('branch_id', $branchId);
                }
                $q->orWhere('initiator_id', $user->id);
            });
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
            $query->where(function ($q) use ($search) {
                $q->where('candidate_name', 'like', "%{$search}%")
                  ->orWhere('designation_name', 'like', "%{$search}%")
                  ->orWhere('pin', 'like', "%{$search}%")
                  ->orWhere('branch_name', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        if (!in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }

        $evaluations = $query->latest()->paginate($perPage)->withQueryString();

        // Calculate summary counts
        $baseQuery = clone $query;
        $metrics = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->whereNotIn('status', ['draft', 'approved', 'rejected'])->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'recommended' => (clone $baseQuery)->where('recommendation_type', 'recommend_appointment')->count(),
        ];

        // Attach reviewer eligibility
        $evaluations->getCollection()->transform(function ($ev) use ($user) {
            $hasSigned = $ev->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
            $canReview = !$hasSigned && $this->workflowService->canUserReview($user, $ev);
            $sentBackSig = $ev->signatures->where('action', 'sent_back')->last();

            $ev->can_approve = $canReview && !in_array($ev->status, ['draft', 'approved', 'rejected']);
            $ev->can_edit = ($ev->status === 'draft' && (int) $ev->initiator_id === (int) $user->id) || ($canReview && !in_array($ev->status, ['approved', 'rejected'])) || $user->isSuperAdmin();
            $ev->can_send_back = $canReview && !in_array($ev->status, ['draft', 'approved', 'rejected']);
            $ev->can_delete = ($ev->status === 'draft' && (int) $ev->initiator_id === (int) $user->id) || $user->isSuperAdmin();
            $ev->can_submit = $ev->status === 'draft' && ((int) $ev->initiator_id === (int) $user->id);
            $ev->has_user_signed = $hasSigned;
            $ev->sent_back_reason = ($ev->status === 'draft' && $sentBackSig) ? $sentBackSig->comments : null;

            return $ev;
        });

        // Current user digital signature verification
        $userSignature = $user->signature ?? $user->employee?->signature;

        $roleNames = \App\Services\OrganogramAccessService::mergedRoleNames($user);
        $isLineManager = $user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_director') || in_array('Director (Microfinance)', $roleNames, true) ||
                         $user->hasDirectPermission('organogram.microfinance_assistant_director') || in_array('Assistant Director (Microfinance)', $roleNames, true) ||
                         in_array('Director Finance and Accounts', $roleNames, true) || in_array('Director Finance and Account', $roleNames, true);

        return Inertia::render('sections/human-resources/evaluations/trainee/index', [
            'evaluations' => $evaluations,
            'filters' => $request->only(['status', 'form_type', 'branch_id', 'zone_id', 'search']),
            'metrics' => $metrics,
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'zones' => Zone::select('id', 'name')->orderBy('name')->get(),
            'canCreate' => $user->isSuperAdmin() || $isLineManager || $user->hasPermission('trainee-evaluations.create'),
            'userHasSignature' => !empty($userSignature),
            'currentUserId' => $user->id,
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $userSignature = $user->signature ?? $user->employee?->signature;

        // Fetch optional employees for search/selection helper
        $employees = Employee::query()
            ->where('status', 'active')
            ->with(['designation', 'branch.regionalOffice.zone'])
            ->select('id', 'name_en', 'name_bn', 'pin', 'designation_id', 'current_branch_id', 'joining_date')
            ->orderBy('name_en')
            ->limit(100)
            ->get()
            ->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name_en' => $emp->name_en,
                    'name_bn' => $emp->name_bn,
                    'pin' => $emp->pin,
                    'designation' => $emp->designation ? [
                        'id' => $emp->designation->id,
                        'name' => $emp->designation->name,
                        'title' => $emp->designation->title,
                    ] : null,
                    'branch' => $emp->branch ? [
                        'id' => $emp->branch->id,
                        'name' => $emp->branch->name,
                        'regional_office_id' => $emp->branch->regional_office_id,
                        'regional_office' => $emp->branch->regionalOffice ? [
                            'id' => $emp->branch->regionalOffice->id,
                            'name' => $emp->branch->regionalOffice->name,
                            'zone_id' => $emp->branch->regionalOffice->zone_id,
                            'zone' => $emp->branch->regionalOffice->zone ? [
                                'id' => $emp->branch->regionalOffice->zone->id,
                                'name' => $emp->branch->regionalOffice->zone->name,
                            ] : null,
                        ] : null,
                    ] : null,
                    'joining_date' => $emp->joining_date?->format('Y-m-d'),
                ];
            });

        $currentUserBranch = $user->employee?->branch;

        return Inertia::render('sections/human-resources/evaluations/trainee/create', [
            'employees' => $employees,
            'branches' => Branch::with('regionalOffice.zone')->select('id', 'name', 'regional_office_id')->orderBy('name')->get(),
            'regionalOffices' => RegionalOffice::select('id', 'name', 'zone_id')->orderBy('name')->get(),
            'zones' => Zone::select('id', 'name')->orderBy('name')->get(),
            'currentUserBranch' => $currentUserBranch,
            'userHasSignature' => !empty($userSignature),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'form_type' => 'required|in:officer_abm,accountant,bm_and_above',
            'candidate_name' => 'required|string|max:255',
            'designation_name' => 'required|string|max:255',
            'pin' => 'nullable|string|max:100',
            'branch_name' => 'nullable|string|max:255',
            'regional_office_name' => 'nullable|string|max:255',
            'zone_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'regional_office_id' => 'nullable|exists:regional_offices,id',
            'zone_id' => 'nullable|exists:zones,id',
            
            'evaluation_month' => 'nullable|string|max:100',
            'training_joining_date' => 'nullable|date',
            'training_completion_date' => 'nullable|date',
            
            'total_score' => 'required|numeric|min:0|max:100',
            'calculated_grade' => 'required|in:excellent,very_good,good,not_satisfactory',
            'other_remarks' => 'nullable|string',
            
            'recommendation_type' => 'nullable|in:recommend_appointment,extend_probation,not_satisfactory',
            'extension_days' => 'nullable|integer|min:1',
            'supervisor_remarks' => 'nullable|string',
            
            'scores' => 'required|array|min:1',
            'scores.*.sl_no' => 'required|integer',
            'scores.*.criteria_key' => 'required|string',
            'scores.*.criteria_name' => 'required|string',
            'scores.*.max_score' => 'required|numeric|min:1',
            'scores.*.score' => 'required|numeric|min:0',
            
            'ratings' => 'required|array|min:1',
            'ratings.*.sl_no' => 'required|integer',
            'ratings.*.indicator_key' => 'required|string',
            'ratings.*.indicator_name' => 'required|string',
            'ratings.*.rating' => 'nullable|in:excellent,good,satisfactory,needs_improvement,poor',
        ]);

        $evaluation = DB::transaction(function () use ($validated, $user) {
            $eval = TraineeEvaluation::create([
                'employee_id' => $validated['employee_id'] ?? null,
                'initiator_id' => $user->id,
                'branch_id' => $validated['branch_id'] ?? null,
                'regional_office_id' => $validated['regional_office_id'] ?? null,
                'zone_id' => $validated['zone_id'] ?? null,
                'form_type' => $validated['form_type'],
                
                'candidate_name' => $validated['candidate_name'],
                'designation_name' => $validated['designation_name'],
                'pin' => $validated['pin'] ?? null,
                'branch_name' => $validated['branch_name'] ?? null,
                'regional_office_name' => $validated['regional_office_name'] ?? null,
                'zone_name' => $validated['zone_name'] ?? null,
                
                'evaluation_month' => $validated['evaluation_month'] ?? null,
                'training_joining_date' => $validated['training_joining_date'] ?? null,
                'training_completion_date' => $validated['training_completion_date'] ?? null,
                
                'total_score' => $validated['total_score'],
                'calculated_grade' => $validated['calculated_grade'],
                'other_remarks' => $validated['other_remarks'] ?? null,
                
                'recommendation_type' => $validated['recommendation_type'] ?? 'recommend_appointment',
                'extension_days' => $validated['extension_days'] ?? null,
                'supervisor_remarks' => $validated['supervisor_remarks'] ?? null,
                
                'status' => 'draft',
            ]);

            // Save criteria rubric scores
            foreach ($validated['scores'] as $score) {
                $eval->scores()->create([
                    'sl_no' => $score['sl_no'],
                    'criteria_key' => $score['criteria_key'],
                    'criteria_name' => $score['criteria_name'],
                    'max_score' => $score['max_score'],
                    'score' => $score['score'],
                ]);
            }

            // Save qualitative indicator ratings
            foreach ($validated['ratings'] as $rating) {
                $eval->ratings()->create([
                    'sl_no' => $rating['sl_no'],
                    'indicator_key' => $rating['indicator_key'],
                    'indicator_name' => $rating['indicator_name'],
                    'rating' => $rating['rating'] ?? null,
                ]);
            }

            // Record initial signature by creator
            $eval->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'initiator',
                'action' => 'submitted',
                'comments' => $validated['supervisor_remarks'] ?? 'খসড়া তৈরি ও ১ম তত্ত্বাবধায়ক কর্তৃক মূল্যায়ন সম্পন্ন।',
                'signed_at' => now(),
            ]);

            return $eval;
        });

        return redirect()->route('trainee-evaluations.show', $evaluation->id)
            ->with('success', 'প্রশিক্ষণার্থী মূল্যায়ন ফরম সফলভাবে সংরক্ষিত হয়েছে।');
    }

    public function show(TraineeEvaluation $evaluation, Request $request): Response
    {
        $evaluation->load([
            'employee.designation',
            'employee.branch',
            'initiator.employee.designation',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'scores',
            'ratings',
            'signatures.user.employee.designation',
        ]);

        $user = $request->user();
        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = !$hasSigned && $this->workflowService->canUserReview($user, $evaluation);
        $userSignature = $user->signature ?? $user->employee?->signature;
        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $canEdit = ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id) || ($canReview && !in_array($evaluation->status, ['approved', 'rejected'])) || $user->isSuperAdmin();
        $canDelete = ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id) || $user->isSuperAdmin();
        $canSubmit = $evaluation->status === 'draft' && ((int) $evaluation->initiator_id === (int) $user->id);
        $canApprove = $canReview && !in_array($evaluation->status, ['draft', 'approved', 'rejected']);
        $canSendBack = $canReview && !in_array($evaluation->status, ['draft', 'approved', 'rejected']);

        return Inertia::render('sections/human-resources/evaluations/trainee/show', [
            'evaluation' => $evaluation,
            'isSuperAdmin' => $user->isSuperAdmin(),
            'currentUserId' => $user->id,
            'userHasSignature' => !empty($userSignature),
            'canEdit' => $canEdit,
            'canDelete' => $canDelete,
            'canSubmit' => $canSubmit,
            'canApprove' => $canApprove,
            'canSendBack' => $canSendBack,
            'hasUserSigned' => $hasSigned,
            'sentBackReason' => ($evaluation->status === 'draft' && $sentBackSig) ? $sentBackSig->comments : null,
            'currentStageLabel' => $this->workflowService->getNextStageRole($evaluation->status, $evaluation->form_type),
        ]);
    }

    public function edit(TraineeEvaluation $evaluation, Request $request): Response
    {
        $evaluation->load(['scores', 'ratings', 'signatures.user', 'employee.designation', 'employee.branch']);

        return Inertia::render('sections/human-resources/evaluations/trainee/edit', [
            'evaluation' => $evaluation,
            'branches' => Branch::with('regionalOffice.zone')->select('id', 'name', 'regional_office_id')->orderBy('name')->get(),
            'regionalOffices' => RegionalOffice::select('id', 'name', 'zone_id')->orderBy('name')->get(),
            'zones' => Zone::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, TraineeEvaluation $evaluation)
    {
        $validated = $request->validate([
            'candidate_name' => 'required|string|max:255',
            'designation_name' => 'required|string|max:255',
            'pin' => 'nullable|string|max:100',
            'branch_name' => 'nullable|string|max:255',
            'regional_office_name' => 'nullable|string|max:255',
            'zone_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'regional_office_id' => 'nullable|exists:regional_offices,id',
            'zone_id' => 'nullable|exists:zones,id',
            
            'evaluation_month' => 'nullable|string|max:100',
            'training_joining_date' => 'nullable|date',
            'training_completion_date' => 'nullable|date',
            
            'total_score' => 'required|numeric|min:0|max:100',
            'calculated_grade' => 'required|in:excellent,very_good,good,not_satisfactory',
            'other_remarks' => 'nullable|string',
            
            'recommendation_type' => 'nullable|in:recommend_appointment,extend_probation,not_satisfactory',
            'extension_days' => 'nullable|integer|min:1',
            'supervisor_remarks' => 'nullable|string',
            
            'scores' => 'required|array|min:1',
            'scores.*.id' => 'nullable|integer',
            'scores.*.sl_no' => 'required|integer',
            'scores.*.criteria_key' => 'required|string',
            'scores.*.criteria_name' => 'required|string',
            'scores.*.max_score' => 'required|numeric|min:1',
            'scores.*.score' => 'required|numeric|min:0',
            
            'ratings' => 'required|array|min:1',
            'ratings.*.id' => 'nullable|integer',
            'ratings.*.sl_no' => 'required|integer',
            'ratings.*.indicator_key' => 'required|string',
            'ratings.*.indicator_name' => 'required|string',
            'ratings.*.rating' => 'nullable|in:excellent,good,satisfactory,needs_improvement,poor',
        ]);

        DB::transaction(function () use ($evaluation, $validated) {
            $evaluation->update([
                'candidate_name' => $validated['candidate_name'],
                'designation_name' => $validated['designation_name'],
                'pin' => $validated['pin'] ?? null,
                'branch_name' => $validated['branch_name'] ?? null,
                'regional_office_name' => $validated['regional_office_name'] ?? null,
                'zone_name' => $validated['zone_name'] ?? null,
                'branch_id' => $validated['branch_id'] ?? $evaluation->branch_id,
                'regional_office_id' => $validated['regional_office_id'] ?? $evaluation->regional_office_id,
                'zone_id' => $validated['zone_id'] ?? $evaluation->zone_id,
                
                'evaluation_month' => $validated['evaluation_month'] ?? null,
                'training_joining_date' => $validated['training_joining_date'] ?? null,
                'training_completion_date' => $validated['training_completion_date'] ?? null,
                
                'total_score' => $validated['total_score'],
                'calculated_grade' => $validated['calculated_grade'],
                'other_remarks' => $validated['other_remarks'] ?? null,
                
                'recommendation_type' => $validated['recommendation_type'] ?? $evaluation->recommendation_type,
                'extension_days' => $validated['extension_days'] ?? null,
                'supervisor_remarks' => $validated['supervisor_remarks'] ?? $evaluation->supervisor_remarks,
            ]);

            // Sync scores
            foreach ($validated['scores'] as $score) {
                $evaluation->scores()->updateOrCreate(
                    ['criteria_key' => $score['criteria_key']],
                    [
                        'sl_no' => $score['sl_no'],
                        'criteria_name' => $score['criteria_name'],
                        'max_score' => $score['max_score'],
                        'score' => $score['score'],
                    ]
                );
            }

            // Sync ratings
            foreach ($validated['ratings'] as $rating) {
                $evaluation->ratings()->updateOrCreate(
                    ['indicator_key' => $rating['indicator_key']],
                    [
                        'sl_no' => $rating['sl_no'],
                        'indicator_name' => $rating['indicator_name'],
                        'rating' => $rating['rating'] ?? null,
                    ]
                );
            }
        });

        return redirect()->route('trainee-evaluations.show', $evaluation->id)
            ->with('success', 'প্রশিক্ষণার্থী মূল্যায়ন সফলভাবে আপডেট করা হয়েছে।');
    }

    public function forward(Request $request, TraineeEvaluation $evaluation)
    {
        $request->validate([
            'comments' => 'required|string|max:1000',
            'recommendation_type' => 'nullable|in:recommend_appointment,extend_probation,not_satisfactory',
            'extension_days' => 'nullable|integer',
        ]);

        $this->workflowService->forward(
            $evaluation,
            $request->user(),
            $request->comments,
            $request->recommendation_type,
            $request->extension_days ? (int) $request->extension_days : null
        );

        return back()->with('success', 'মূল্যায়ন পরবর্তী স্তরে সফলভাবে অগ্রবর্তী করা হয়েছে।');
    }

    public function sendBack(Request $request, TraineeEvaluation $evaluation)
    {
        $request->validate([
            'comments' => 'required|string|max:1000',
        ]);

        $this->workflowService->sendBack(
            $evaluation,
            $request->user(),
            $request->comments
        );

        return back()->with('success', 'মূল্যায়ন সংশোধনের জন্য প্রস্তুতকারীর নিকট ফেরত পাঠানো হয়েছে।');
    }

    public function hrVerify(Request $request, TraineeEvaluation $evaluation)
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000',
        ]);

        $this->workflowService->forward(
            $evaluation,
            $request->user(),
            $request->comments ?? 'ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করা হলো এবং চূড়ান্ত সিদ্ধান্তের জন্য নির্বাহী পরিচালক বরাবর অগ্রবর্তী করা হলো।'
        );

        return back()->with('success', 'এইচআর যাচাই সম্পন্ন হয়েছে এবং ইডি মহোদয়ের অনুমোদনের জন্য অগ্রবর্তী করা হয়েছে।');
    }

    public function edApprove(Request $request, TraineeEvaluation $evaluation)
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000',
            'is_approved' => 'required|boolean',
        ]);

        $this->workflowService->edApprove(
            $evaluation,
            $request->user(),
            $request->comments ?? ($request->is_approved ? 'অনুমোদন প্রদান করা হলো।' : 'নামঞ্জুর করা হলো।'),
            (bool) $request->is_approved
        );

        return back()->with('success', $request->is_approved ? 'মূল্যায়ন চূড়ান্ত অনুমোদন সম্পন্ন হয়েছে।' : 'মূল্যায়ন নামঞ্জুর করা হয়েছে।');
    }

    public function quickApprove(Request $request, TraineeEvaluation $evaluation)
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000',
        ]);

        $this->workflowService->forward(
            $evaluation,
            $request->user(),
            $request->comments ?? 'পর্যালোচনাপূর্বক অনুমোদন ও পরবর্তী স্তরে অগ্রবর্তী করা হলো।'
        );

        return back()->with('success', 'মূল্যায়ন সফলভাবে অনুমোদন ও অগ্রবর্তী করা হয়েছে।');
    }

    public function print(TraineeEvaluation $evaluation): Response
    {
        $evaluation->load([
            'employee.designation',
            'employee.branch',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'scores',
            'ratings',
            'signatures.user.employee.designation',
        ]);

        return Inertia::render('sections/human-resources/evaluations/trainee/print', [
            'evaluation' => $evaluation,
        ]);
    }

    public function destroy(TraineeEvaluation $evaluation)
    {
        $evaluation->delete();

        return redirect()->route('trainee-evaluations.index')
            ->with('success', 'মূল্যায়ন রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।');
    }
}
