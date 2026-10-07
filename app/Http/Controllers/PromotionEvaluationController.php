<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EvaluationTemplate;
use App\Models\PromotionEvaluation;
use App\Models\User;
use App\Services\PromotionEvaluationWorkflowService;
use App\Services\OrganogramAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class PromotionEvaluationController extends Controller
{
    public function __construct(private readonly PromotionEvaluationWorkflowService $workflowService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = PromotionEvaluation::with([
            'employee:id,pin,name_en,name_bn,designation_id,current_branch_id',
            'employee.designation:id,name',
            'employee.branch:id,name',
            'initiator:id,name',
            'signatures.user.employee.designation',
        ]);

        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $branchId = $user->employee?->current_branch_id ?? $user->branch_id;
        
        // Super Admin sees all evaluations across the organisation
        if ($user->isSuperAdmin()) {
            // No scoping applied for Super Admin
        } elseif ($user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true)) {
            if (!$user->employee && !$user->branch_id) {
                return redirect()->back()->with('error', 'Only Branch Managers with an assigned branch can access this.');
            }
            $query->where('branch_id', $branchId);
        } elseif ($user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true)) {
            $regOfficeId = $user->employee?->branch?->regional_office_id;
            if (!$regOfficeId) {
                return redirect()->back()->with('error', 'Only Regional Managers with a linked regional office profile can access this.');
            }
            $query->where('regional_office_id', $regOfficeId);
        } elseif ($user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true)) {
            $zoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            if (!$zoneId) {
                return redirect()->back()->with('error', 'Only Zonal Managers with a linked zone profile can access this.');
            }
            $query->where('zone_id', $zoneId);
        }
        
        // HR & ED can see all
        
        $baseQuery = clone $query;
        $metrics = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->whereNotIn('status', ['approved', 'rejected'])->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'high_performers' => (clone $baseQuery)->whereIn('calculated_grade', ['excellent', 'very_good'])->count(),
        ];

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
        if (!in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }
        
        $evaluations = $query->latest()->paginate($perPage)->withQueryString();
        
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
            $ev->sent_back_reason = $sentBackSig?->comments;
            $ev->current_stage_label = $this->workflowService->getStageLabel($ev->status);
            
            return $ev;
        });

        return Inertia::render('sections/human-resources/evaluations/promotion/index', [
            'evaluations' => $evaluations,
            'metrics' => $metrics,
            'filters' => $request->only(['search', 'status', 'form_type', 'per_page']),
            'canCreate' => $user->isSuperAdmin() || $user->hasPermission('promotion-evaluations.create'),
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

        if (!$isLineManager && !$user->isSuperAdmin()) {
            return redirect()->route('promotions.evaluations.index')->with('error', 'Only Branch Managers, Regional Managers, Zonal Managers, or Directors can create a promotion evaluation.');
        }

        if (!$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়ন শুরু করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if (!$user->isSuperAdmin() && $isLineManager && !$user->employee) {
            return redirect()->route('promotions.evaluations.index')->with('error', 'Your user account must be linked to an employee profile to create an evaluation.');
        }

        $userLevel = $this->workflowService->getUserHierarchyLevel($user);
        $branchId = $user->employee?->current_branch_id ?? $user->branch_id;
        $employeesQuery = Employee::query()->where('status', 'active')->with(['designation', 'branch.regionalOffice.zone', 'salaryGrade', 'transfers']);
        
        // 1. Exclude the creator themselves
        if ($user->employee_id) {
            $employeesQuery->where('id', '!=', $user->employee_id);
        }

        // 2. Geographic scoping
        if ($userLevel === 3) { // Branch Manager
            $employeesQuery->where('current_branch_id', $branchId);
        } elseif ($userLevel === 2) { // Regional Manager
            $rmRoId = $user->employee?->branch?->regional_office_id;
            $employeesQuery->whereHas('branch', function($q) use ($rmRoId) {
                $q->where('regional_office_id', $rmRoId);
            });
        } elseif ($userLevel === 1) { // Zonal Manager
            $zmZoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            $employeesQuery->whereHas('branch.regionalOffice', function($q) use ($zmZoneId) {
                $q->where('zone_id', $zmZoneId);
            });
        }

        $employees = $employeesQuery->get(['id', 'pin', 'name_en', 'name_bn', 'designation_id', 'current_branch_id', 'salary_grade_id', 'joining_date', 'last_promotion_date', 'educational_qualification'])
            ->filter(function ($emp) use ($userLevel, $user) {
                // Cannot evaluate oneself
                if ($user->employee_id && (int) $emp->id === (int) $user->employee_id) {
                    return false;
                }
                // Cannot evaluate superior or peer (candidate tier must be strictly subordinate)
                if ($userLevel > 0) {
                    $candTier = \App\Support\BranchOrganogram::resolveTier($emp->designation?->name);
                    $candLevel = (int) ($candTier['level'] ?? 999);
                    if ($candLevel <= $userLevel) {
                        return false;
                    }
                }
                return true;
            })
            ->values()
            ->map(function ($emp) {
                $latestTransfer = $emp->transfers->sortByDesc('effective_date')->first();
                $stationDate = $latestTransfer?->effective_date ?? $emp->joining_date;
                $currentStationDate = $stationDate ? $stationDate->format('d/m/Y') : null;

                $baseDate = $stationDate;
                $serviceLength = null;
                if ($baseDate) {
                    $diff = $baseDate->diff(now());
                    $diffYears = (int) $diff->y;
                    $diffMonths = (int) $diff->m;

                    $toBn = function ($num) {
                        $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                        $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                        return str_replace($en, $bn, (string) $num);
                    };

                    if ($diffYears > 0 && $diffMonths > 0) {
                        $serviceLength = "{$toBn($diffYears)} বছর {$toBn($diffMonths)} মাস";
                    } elseif ($diffYears > 0) {
                        $serviceLength = "{$toBn($diffYears)} বছর";
                    } elseif ($diffMonths > 0) {
                        $serviceLength = "{$toBn($diffMonths)} মাস";
                    } else {
                        $serviceLength = "১ মাস";
                    }
                }

                return [
                    'id' => $emp->id,
                    'pin' => $emp->pin,
                    'name_en' => $emp->name_en,
                    'name_bn' => $emp->name_bn,
                    'designation_id' => $emp->designation_id,
                    'designation' => $emp->designation ? [
                        'id' => $emp->designation->id,
                        'name' => $emp->designation->name,
                        'title' => $emp->designation->name,
                    ] : null,
                    'branch' => $emp->branch ? [
                        'id' => $emp->branch->id,
                        'name' => $emp->branch->name,
                        'regional_office' => $emp->branch->regionalOffice?->name,
                        'zone' => $emp->branch->regionalOffice?->zone?->name,
                    ] : null,
                    'joining_date' => $emp->joining_date ? $emp->joining_date->format('d/m/Y') : null,
                    'last_promotion_date' => $emp->last_promotion_date ? $emp->last_promotion_date->format('d/m/Y') : null,
                    'current_station_joining_date' => $currentStationDate,
                    'service_length_current_post' => $serviceLength,
                    'educational_qualification' => $emp->educational_qualification,
                ];
            });

        $templates = EvaluationTemplate::with(['sections.criteria' => function ($q) {
            $q->where('is_active', true)->orderBy('order');
        }])->where('is_active', true)->get();

        return Inertia::render('sections/human-resources/evaluations/promotion/create', [
            'employees' => $employees,
            'templates' => $templates,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়ন সংরক্ষণ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'current_station_joining_date' => 'nullable|string',
            'service_length_current_post' => 'nullable|string',
            'education_at_joining' => 'nullable|string',
            'education_current' => 'nullable|string',
            'closing_month' => 'nullable|string',
            'members_count' => 'nullable|integer',
            'borrowers_count' => 'nullable|integer',
            'loan_balance' => 'nullable|numeric',
            'savings_balance' => 'nullable|numeric',
            'overdue_borrowers' => 'nullable|integer',
            'overdue_amount' => 'nullable|numeric',
            'otr_pct' => 'nullable|numeric',
            'par_pct' => 'nullable|numeric',
            'has_cashier' => 'nullable|boolean',
            'total_score' => 'required|numeric',
            'calculated_grade' => 'required|string',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'recommendation_status' => 'required|string|in:recommended,consider_later,not_suitable',
            'consider_after_months' => 'nullable|required_if:recommendation_status,consider_later|integer',
            'scores' => 'required|array|min:1', // individual section scores
        ]);

        // 1. Strictly forbid self-evaluation
        if ($user->employee_id && (int) $validated['employee_id'] === (int) $user->employee_id) {
            return redirect()->back()->withErrors([
                'employee_id' => 'আপনি নিজের পদোন্নতি মূল্যায়ন করতে পারবেন না।'
            ])->withInput();
        }

        $employee = Employee::with('branch.regionalOffice', 'designation')->findOrFail($validated['employee_id']);

        // 2. Strictly forbid evaluating superior or peer rank
        $userLevel = $this->workflowService->getUserHierarchyLevel($user);
        if ($userLevel > 0) {
            $candTier = \App\Support\BranchOrganogram::resolveTier($employee->designation?->name);
            $candLevel = (int) ($candTier['level'] ?? 999);
            if ($candLevel <= $userLevel) {
                return redirect()->back()->withErrors([
                    'employee_id' => 'আপনি শুধুমাত্র আপনার অধীনস্থ (নিচের পদবীর) কর্মীদের পদোন্নতি মূল্যায়ন তৈরি করতে পারবেন।'
                ])->withInput();
            }
        }

        $formType = $this->workflowService->determineFormType($employee);

        $currentStationDate = null;
        if (!empty($validated['current_station_joining_date'])) {
            try {
                $currentStationDate = Carbon::createFromFormat('d/m/Y', $validated['current_station_joining_date'])->format('Y-m-d');
            } catch (\Throwable $e) {
                try {
                    $currentStationDate = Carbon::parse($validated['current_station_joining_date'])->format('Y-m-d');
                } catch (\Throwable $e2) {
                    $currentStationDate = null;
                }
            }
        }

        $evaluation = PromotionEvaluation::create([
            'employee_id' => $employee->id,
            'initiator_id' => Auth::id(),
            'branch_id' => $employee->current_branch_id,
            'regional_office_id' => $employee->branch->regional_office_id ?? null,
            'zone_id' => $employee->branch->regionalOffice->zone_id ?? null,
            'form_type' => $formType,
            
            'current_station_joining_date' => $currentStationDate,
            'service_length_current_post' => $validated['service_length_current_post'] ?? null,
            'education_at_joining' => $validated['education_at_joining'] ?? null,
            'education_current' => $validated['education_current'] ?? null,

            'closing_month' => $validated['closing_month'] ?? null,
            'members_count' => $validated['members_count'] ?? null,
            'borrowers_count' => $validated['borrowers_count'] ?? null,
            'loan_balance' => $validated['loan_balance'] ?? null,
            'savings_balance' => $validated['savings_balance'] ?? null,
            'overdue_borrowers' => $validated['overdue_borrowers'] ?? null,
            'overdue_amount' => $validated['overdue_amount'] ?? null,
            'otr_pct' => $validated['otr_pct'] ?? null,
            'par_pct' => $validated['par_pct'] ?? null,
            'has_cashier' => $validated['has_cashier'] ?? null,
            
            'total_score' => $validated['total_score'],
            'calculated_grade' => $validated['calculated_grade'],
            
            'strengths' => $validated['strengths'] ?? null,
            'weaknesses' => $validated['weaknesses'] ?? null,
            'training_need' => $validated['training_need'] ?? null,
            'recommendation_status' => $validated['recommendation_status'],
            'consider_after_months' => $validated['consider_after_months'] ?? null,
            
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
            'comments' => 'Initial Evaluation Drafted',
            'signed_at' => now(),
        ]);

        return redirect()->route('promotions.evaluations.show', $evaluation)->with('success', 'Promotion evaluation draft created successfully.');
    }

    public function show(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'initiator.employee.designation',
            'scores',
            'signatures.user.employee.designation'
        ]);

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = !$hasSigned && $this->workflowService->canUserReview($user, $evaluation);
        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $canEdit = ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id)
            || ($canReview && !in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        $canDelete = (($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id) || $user->isSuperAdmin());
        $canSubmit = $evaluation->status === 'draft' && ((int) $evaluation->initiator_id === (int) $user->id);
        $canApprove = $canReview && !in_array($evaluation->status, ['draft', 'approved', 'rejected']);
        $canSendBack = $canReview && !in_array($evaluation->status, ['draft', 'approved', 'rejected']);

        return Inertia::render('sections/human-resources/evaluations/promotion/show', [
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

    public function edit(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = (!$hasSigned && $this->workflowService->canUserReview($user, $evaluation)) || $user->isSuperAdmin();
        $canEdit = ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id)
            || ($canReview && !in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        if (!$canEdit) {
            return redirect()->route('promotions.evaluations.show', $evaluation)
                ->with('error', 'You cannot edit this evaluation at this stage.');
        }

        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'initiator.employee.designation',
            'scores',
            'signatures.user.employee.designation'
        ]);

        $sentBackSig = $evaluation->signatures->where('action', 'sent_back')->last();

        $templates = EvaluationTemplate::with(['sections.criteria' => function ($q) {
            $q->where('is_active', true)->orderBy('order');
        }])->where('is_active', true)->get();

        return Inertia::render('sections/human-resources/evaluations/promotion/edit', [
            'evaluation' => $evaluation,
            'isReviewerEdit' => $evaluation->status !== 'draft',
            'returnComment' => $sentBackSig?->comments,
            'userHasSignature' => $user->hasSignature(),
            'templates' => $templates,
        ]);
    }

    public function update(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        $hasSigned = $evaluation->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = (!$hasSigned && $this->workflowService->canUserReview($user, $evaluation)) || $user->isSuperAdmin();
        $canEdit = ($evaluation->status === 'draft' && (int) $evaluation->initiator_id === (int) $user->id)
            || ($canReview && !in_array($evaluation->status, ['approved', 'rejected']))
            || $user->isSuperAdmin();

        if (!$canEdit) {
            return redirect()->route('promotions.evaluations.show', $evaluation)
                ->with('error', 'You cannot edit this evaluation at this stage.');
        }

        $validated = $request->validate([
            'current_station_joining_date' => 'nullable|string',
            'service_length_current_post' => 'nullable|string',
            'education_at_joining' => 'nullable|string',
            'education_current' => 'nullable|string',
            'closing_month' => 'nullable|string',
            'members_count' => 'nullable|integer',
            'borrowers_count' => 'nullable|integer',
            'loan_balance' => 'nullable|numeric',
            'savings_balance' => 'nullable|numeric',
            'overdue_borrowers' => 'nullable|integer',
            'overdue_amount' => 'nullable|numeric',
            'otr_pct' => 'nullable|numeric',
            'par_pct' => 'nullable|numeric',
            'has_cashier' => 'nullable|boolean',
            'total_score' => 'required|numeric',
            'calculated_grade' => 'required|string',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'training_need' => 'nullable|string',
            'recommendation_status' => 'required|string|in:recommended,consider_later,not_suitable',
            'consider_after_months' => 'nullable|required_if:recommendation_status,consider_later|integer',
            'hr_financial_irregularity' => 'nullable|boolean',
            'hr_disciplinary_action' => 'nullable|boolean',
            'hr_audit_objection' => 'nullable|boolean',
            'hr_leave_without_pay' => 'nullable|boolean',
            'hr_acr_satisfactory' => 'nullable|boolean',
            'scores' => 'required|array|min:1',
            'submit_now' => 'nullable|boolean',
            'approve_now' => 'nullable|boolean',
            'comments' => 'nullable|string',
        ]);

        $isSubmitting = !empty($validated['submit_now']);
        $isApproving = !empty($validated['approve_now']);

        if (($isSubmitting || $isApproving) && !$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়ন জমা বা অনুমোদন করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($evaluation, $validated, $user, $isSubmitting, $isApproving, $request) {
            $newStatus = $evaluation->status;
            if ($isSubmitting) {
                $newStatus = 'submitted_to_rm';
            } elseif ($isApproving) {
                $newStatus = $this->workflowService->determineNextStatus($evaluation, $evaluation->status);
            }

            $currentStationDate = null;
            if (!empty($validated['current_station_joining_date'])) {
                try {
                    $currentStationDate = Carbon::createFromFormat('d/m/Y', $validated['current_station_joining_date'])->format('Y-m-d');
                } catch (\Throwable $e) {
                    try {
                        $currentStationDate = Carbon::parse($validated['current_station_joining_date'])->format('Y-m-d');
                    } catch (\Throwable $e2) {
                        $currentStationDate = null;
                    }
                }
            }

            $originalStatus = $evaluation->status;

            $updateData = [
                'current_station_joining_date' => $currentStationDate,
                'service_length_current_post' => $validated['service_length_current_post'] ?? null,
                'education_at_joining' => $validated['education_at_joining'] ?? null,
                'education_current' => $validated['education_current'] ?? null,
                'closing_month' => $validated['closing_month'] ?? null,
                'members_count' => $validated['members_count'] ?? null,
                'borrowers_count' => $validated['borrowers_count'] ?? null,
                'loan_balance' => $validated['loan_balance'] ?? null,
                'savings_balance' => $validated['savings_balance'] ?? null,
                'overdue_borrowers' => $validated['overdue_borrowers'] ?? null,
                'overdue_amount' => $validated['overdue_amount'] ?? null,
                'otr_pct' => $validated['otr_pct'] ?? null,
                'par_pct' => $validated['par_pct'] ?? null,
                'has_cashier' => $validated['has_cashier'] ?? null,
                'total_score' => $validated['total_score'],
                'calculated_grade' => $validated['calculated_grade'],
                'strengths' => $validated['strengths'] ?? null,
                'weaknesses' => $validated['weaknesses'] ?? null,
                'training_need' => $validated['training_need'] ?? null,
                'recommendation_status' => $validated['recommendation_status'],
                'consider_after_months' => $validated['consider_after_months'] ?? null,
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
            if (array_key_exists('hr_acr_satisfactory', $validated)) {
                $updateData['hr_acr_satisfactory'] = $validated['hr_acr_satisfactory'];
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
                $evaluation->signatures()->create([
                    'user_id' => $user->id,
                    'stage' => 'initiator',
                    'action' => 'submitted',
                    'comments' => 'Evaluation submitted to Regional Manager',
                    'signed_at' => now(),
                ]);
            } elseif ($isApproving) {
                $stage = $this->workflowService->determineStageRole($originalStatus);
                $comment = !empty($request->input('comments')) ? $request->input('comments') : 'সুপারিশ ও স্বাক্ষরসহ সংশোধনপূর্বক অনুমোদন করা হলো।';
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
            $msg = 'মূল্যায়নটি সফলভাবে আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।';
        } elseif ($isApproving) {
            $msg = 'মূল্যায়নটি সফলভাবে সংশোধনপূর্বক অনুমোদন ও পরবর্তী স্তরে অগ্রবর্তী করা হয়েছে।';
        }

        return redirect()->route('promotions.evaluations.show', $evaluation)->with('success', $msg);
    }

    public function destroy(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        $canDelete = $user->isSuperAdmin() || ($evaluation->status === 'draft' && $evaluation->initiator_id === $user->id);
        if (!$canDelete) {
            return redirect()->back()->with('error', 'You cannot delete this evaluation once it has been submitted.');
        }

        $evaluation->scores()->delete();
        $evaluation->signatures()->delete();
        $evaluation->delete();

        return redirect()->route('promotions.evaluations.index')->with('success', 'Promotion evaluation deleted successfully.');
    }

    public function print(PromotionEvaluation $evaluation)
    {
        $evaluation->load([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'branch.regionalOffice.zone',
            'regionalOffice.zone',
            'zone',
            'initiator.employee.designation',
            'scores',
            'signatures.user.employee.designation'
        ]);

        return Inertia::render('sections/human-resources/evaluations/promotion/print', [
            'evaluation' => $evaluation,
        ]);
    }

    public function forward(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        if (!$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়ন অনুমোদন বা অগ্রবর্তী করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if ($evaluation->status === 'draft') {
            if ((int) $evaluation->initiator_id !== (int) $user->id) {
                return redirect()->back()->with('error', 'শুধুমাত্র মূল্যায়নটির স্রষ্টা (Creator) এটি দাখিল করতে পারবেন।');
            }
        } else {
            if (!$this->workflowService->canUserReview($user, $evaluation)) {
                return redirect()->back()->with('error', 'আপনার এই স্তরে মূল্যায়ন পর্যালোচনা বা অনুমোদন করার অনুমতি নেই।');
            }
        }

        if ($evaluation->status === 'submitted_to_hr') {
            $validated = $request->validate([
                'hr_financial_irregularity' => 'nullable|boolean',
                'hr_disciplinary_action' => 'nullable|boolean',
                'hr_audit_objection' => 'nullable|boolean',
                'hr_leave_without_pay' => 'nullable|boolean',
                'hr_acr_satisfactory' => 'nullable|boolean',
                'comments' => 'nullable|string',
            ]);
            $defaultComment = 'ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করা হলো এবং চূড়ান্ত সিদ্ধান্তের জন্য নির্বাহী পরিচালক বরাবর অগ্রবর্তী করা হলো।';
            $comments = !empty(trim((string)$request->input('comments', ''))) ? $request->input('comments') : $defaultComment;
            $this->workflowService->hrVerify($evaluation, $user, $validated, $comments);
            return redirect()->back()->with('success', 'মূল্যায়নটির ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করে নির্বাহী পরিচালক (ED) বরাবর অগ্রবর্তী করা হয়েছে।');
        }

        if ($evaluation->status === 'submitted_to_ed') {
            $isApproved = $request->input('recommendation_status') !== 'rejected' && $request->boolean('is_approved', true);
            $defaultComment = $isApproved ? 'নির্বাহী পরিচালক কর্তৃক চূড়ান্ত অনুমোদন প্রদান করা হলো।' : 'আবেদনটি নামঞ্জুর করা হলো।';
            $comments = !empty(trim((string)$request->input('comments', ''))) ? $request->input('comments') : $defaultComment;
            $this->workflowService->edApprove($evaluation, $user, $comments, $isApproved);
            return redirect()->back()->with('success', $isApproved ? 'পদোন্নতি মূল্যায়নটি সফলভাবে চূড়ান্ত অনুমোদন দেওয়া হয়েছে।' : 'পদোন্নতি মূল্যায়নটি নামঞ্জুর করা হয়েছে।');
        }

        $request->validate([
            'comments' => 'nullable|string',
            'recommendation_status' => 'nullable|string',
            'consider_after_months' => 'nullable|integer',
        ]);

        $defaultComment = $evaluation->status === 'draft' 
            ? 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।' 
            : 'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।';

        $comments = !empty(trim((string)$request->input('comments', ''))) ? $request->input('comments') : $defaultComment;

        $this->workflowService->forward(
            $evaluation, 
            $user, 
            $comments,
            $request->recommendation_status,
            $request->consider_after_months
        );

        $msg = $evaluation->status === 'submitted_to_rm'
            ? 'মূল্যায়নটি সফলভাবে আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।'
            : 'মূল্যায়নটি সফলভাবে অনুমোদন ও পরবর্তী স্তরে অগ্রবর্তী করা হয়েছে।';

        return redirect()->back()->with('success', $msg);
    }

    public function sendBack(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        if (!$this->workflowService->canUserReview($user, $evaluation)) {
            return redirect()->back()->with('error', 'আপনার এই মূল্যায়নটি সংশোধনের জন্য ফেরত পাঠানোর অনুমতি নেই।');
        }

        $request->validate([
            'comments' => 'required|string',
        ]);

        $this->workflowService->sendBack($evaluation, $user, $request->comments);

        return redirect()->back()->with('success', 'মূল্যায়নটি সফলভাবে সংশোধনের জন্য স্রষ্টার (Creator) নিকট ফেরত পাঠানো হয়েছে।');
    }

    public function hrVerify(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        if (!$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়ন যাচাই করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        $validated = $request->validate([
            'hr_financial_irregularity' => 'nullable|boolean',
            'hr_disciplinary_action' => 'nullable|boolean',
            'hr_audit_objection' => 'nullable|boolean',
            'hr_leave_without_pay' => 'nullable|boolean',
            'hr_acr_satisfactory' => 'nullable|boolean',
            'comments' => 'nullable|string',
        ]);

        $defaultComment = 'ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করা হলো এবং চূড়ান্ত সিদ্ধান্তের জন্য নির্বাহী পরিচালক বরাবর অগ্রবর্তী করা হলো।';
        $comments = !empty(trim((string)$request->input('comments', ''))) ? $request->input('comments') : $defaultComment;

        $this->workflowService->hrVerify($evaluation, $user, $validated, $comments);

        return redirect()->back()->with('success', 'মূল্যায়নটির ব্যক্তিগত ফাইল পর্যবেক্ষণপূর্বক এইচআর যাচাই সম্পন্ন করে নির্বাহী পরিচালক (ED) বরাবর অগ্রবর্তী করা হয়েছে।');
    }

    public function edApprove(Request $request, PromotionEvaluation $evaluation)
    {
        $user = $request->user();

        if (!$user->hasSignature()) {
            return redirect()->route('settings.profile.edit')->with('error', 'পদোন্নতি মূল্যায়নে চূড়ান্ত সিদ্ধান্ত প্রদানের পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।');
        }

        if ($evaluation->status !== 'submitted_to_ed') {
            return redirect()->back()->with('error', 'এই মূল্যায়নটি বর্তমানে নির্বাহী পরিচালকের অনুমোদনের স্তরে নেই।');
        }

        if (!$this->workflowService->canUserReview($user, $evaluation)) {
            return redirect()->back()->with('error', 'আপনার এই স্তরে মূল্যায়ন পর্যালোচনা বা অনুমোদন করার অনুমতি নেই।');
        }

        $request->validate([
            'comments' => 'nullable|string',
            'is_approved' => 'required|boolean',
        ]);

        $defaultComment = $request->boolean('is_approved') ? 'নির্বাহী পরিচালক কর্তৃক চূড়ান্ত অনুমোদন প্রদান করা হলো।' : 'আবেদনটি নামঞ্জুর করা হলো।';
        $comments = !empty(trim((string)$request->input('comments', ''))) ? $request->input('comments') : $defaultComment;

        $this->workflowService->edApprove($evaluation, $user, $comments, $request->boolean('is_approved'));

        return redirect()->back()->with('success', $request->boolean('is_approved') ? 'পদোন্নতি মূল্যায়নটি সফলভাবে চূড়ান্ত অনুমোদন দেওয়া হয়েছে।' : 'পদোন্নতি মূল্যায়নটি নামঞ্জুর করা হয়েছে।');
    }
}
