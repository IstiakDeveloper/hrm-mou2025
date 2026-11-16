<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\CorrectsWorkflowComments;
use App\Models\Employee;
use App\Models\ResignationApplication;
use App\Models\ResignationApplicationSignature;
use App\Services\OrganogramAccessService;
use App\Services\ResignationWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ResignationApplicationController extends Controller
{
    use CorrectsWorkflowComments;

    public function __construct(private readonly ResignationWorkflowService $workflowService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $branchId = $user->employee?->current_branch_id ?? $user->branch_id;

        $query = ResignationApplication::with([
            'employee:id,pin,name_en,name_bn,designation_id,current_branch_id',
            'employee.designation:id,name',
            'employee.branch:id,name',
            'signatures.user:id,name',
        ]);

        // Scoping based on hierarchy / permissions
        $isLineManagerOrAdmin = $user->isSuperAdmin()
            || OrganogramAccessService::isExecutiveDirector($user)
            || in_array('Executive Director', $roleNames, true)
            || in_array('HR Manager', $roleNames, true)
            || in_array('HR Admin', $roleNames, true)
            || in_array('Assistant Director (HR)', $roleNames, true)
            || OrganogramAccessService::isMicrofinanceDirector($user)
            || OrganogramAccessService::isFinanceAndAccountsDepartmentHead($user)
            || in_array('Director (Microfinance)', $roleNames, true);

        if (! $isLineManagerOrAdmin) {
            if ($user->hasDirectPermission('branch_manager') || in_array('Branch Manager', $roleNames, true)) {
                $query->where(function ($q) use ($branchId, $user) {
                    $q->where('branch_id', $branchId);
                    if ($user->employee_id) {
                        $q->orWhere('employee_id', $user->employee_id);
                    }
                });
            } elseif ($user->hasDirectPermission('organogram.regional_manager') || in_array('Regional Manager', $roleNames, true)) {
                $regOfficeId = $user->employee?->branch?->regional_office_id;
                $query->where(function ($q) use ($regOfficeId, $user) {
                    if ($regOfficeId) {
                        $q->where('regional_office_id', $regOfficeId);
                    }
                    if ($user->employee_id) {
                        $q->orWhere('employee_id', $user->employee_id);
                    }
                });
            } elseif ($user->hasDirectPermission('organogram.zonal_manager') || in_array('Zonal Manager', $roleNames, true)) {
                $zoneId = $user->employee?->branch?->regionalOffice?->zone_id;
                $query->where(function ($q) use ($zoneId, $user) {
                    if ($zoneId) {
                        $q->where('zone_id', $zoneId);
                    }
                    if ($user->employee_id) {
                        $q->orWhere('employee_id', $user->employee_id);
                    }
                });
            } else {
                // Regular employee can only see their own application
                if ($user->employee_id) {
                    $query->where('employee_id', $user->employee_id);
                } else {
                    $query->where('initiator_id', $user->id);
                }
            }
        }

        // Metrics
        $totalCount = (clone $query)->count();
        $pendingCount = (clone $query)->whereNotIn('status', ['approved', 'rejected', 'draft'])->count();
        $approvedCount = (clone $query)->where('status', 'approved')->count();
        $rejectedCount = (clone $query)->where('status', 'rejected')->count();

        // Search
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($eq) use ($search) {
                        $eq->where('pin', 'like', "%{$search}%")
                            ->orWhere('name_en', 'like', "%{$search}%")
                            ->orWhere('name_bn', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $perPage = (int) $request->input('per_page', 15);
        if (! in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }

        $applications = $query->latest()->paginate($perPage)->withQueryString();

        $applications->getCollection()->transform(function (ResignationApplication $app) use ($user) {
            $hasSigned = $app->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
            $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $app);
            $sentBackSig = $app->signatures->where('action', 'sent_back')->last();
            $isInitiator = (int) $app->initiator_id === (int) $user->id || ((int) $app->employee_id === (int) $user->employee_id);

            $app->can_review = $canReview;
            $app->can_approve = $canReview && $app->status === 'submitted_to_ed';
            $app->can_edit = in_array($app->status, ['draft', 'sent_back'], true) && ($isInitiator || $user->isSuperAdmin());
            $app->can_delete = $app->status === 'draft' && ($isInitiator || $user->isSuperAdmin());
            $app->has_user_signed = $hasSigned;
            $app->sent_back_reason = $sentBackSig?->comments;
            $app->current_stage_label = $this->workflowService->getStageLabel($app->status);
            $app->reason_category_label = ResignationApplication::reasonCategoryLabels()[$app->reason_category] ?? $app->reason_category;

            return $app;
        });

        return Inertia::render('sections/human-resources/resignation/index', [
            'applications' => $applications,
            'metrics' => [
                'total' => $totalCount,
                'pending' => $pendingCount,
                'approved' => $approvedCount,
                'rejected' => $rejectedCount,
            ],
            'filters' => $request->only(['search', 'status', 'per_page']),
            'canCreate' => true,
            'isSuperAdmin' => $user->isSuperAdmin(),
            'currentUserId' => $user->id,
            'userHasSignature' => $user->hasSignature(),
            'reasonCategories' => ResignationApplication::reasonCategoryLabels(),
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();

        // If employee already has a draft or sent_back application, redirect them to edit it
        if ($user->employee_id) {
            $existingDraft = ResignationApplication::where('employee_id', $user->employee_id)
                ->whereIn('status', ['draft', 'sent_back'])
                ->first();

            if ($existingDraft) {
                return redirect()->route('resignation-applications.edit', $existingDraft->id)
                    ->with('info', 'আপনার পূর্বে সংরক্ষিত খসড়া আবেদনটি লোড করা হয়েছে।');
            }
        }

        $user->loadMissing(['employee.designation', 'employee.branch.regionalOffice.zone', 'employee.department']);
        $employee = $user->employee;

        // Active employees list if HR / Admin wants to file on behalf of someone
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $isHrOrAdmin = $user->isSuperAdmin()
            || in_array('HR Manager', $roleNames, true)
            || in_array('HR Admin', $roleNames, true)
            || in_array('Assistant Director (HR)', $roleNames, true);

        $selectableEmployees = [];
        if ($isHrOrAdmin) {
            $selectableEmployees = Employee::query()
                ->where('status', 'active')
                ->with(['designation:id,name', 'branch:id,name', 'department:id,name'])
                ->select(['id', 'pin', 'name_en', 'name_bn', 'designation_id', 'current_branch_id', 'department_id', 'joining_date', 'mobile_phone'])
                ->orderBy('pin')
                ->limit(500)
                ->get();
        }

        return Inertia::render('sections/human-resources/resignation/create', [
            'currentEmployee' => $employee,
            'isHrOrAdmin' => $isHrOrAdmin,
            'selectableEmployees' => $selectableEmployees,
            'reasonCategories' => ResignationApplication::reasonCategoryLabels(),
            'userHasSignature' => $user->hasSignature(),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isSubmitting = ! empty($request->input('submit_now'));

        // If submitting for review, digital signature is required
        if ($isSubmitting && ! $user->hasSignature()) {
            return back()->with('error', 'আবেদন পর্যালোচনার জন্য দাখিল করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রোফাইল সেটিংসে স্বাক্ষর আপলোড করুন।');
        }

        $rules = [
            'employee_id' => 'required|exists:employees,id',
            'application_date' => 'required|date',
            'reason_category' => 'required|string',
            'reason_detail' => 'nullable|string',
            'joining_date' => $isSubmitting ? 'required|date' : 'nullable|date',
            'notice_date' => 'nullable|date',
            'last_working_date' => $isSubmitting ? 'required|date' : 'nullable|date',
            'effective_date' => $isSubmitting ? 'required|date' : 'nullable|date',
            'applicant_mobile' => $isSubmitting ? 'required|string|max:30' : 'nullable|string|max:30',
            'submit_now' => 'nullable|boolean',
        ];

        $messages = [
            'employee_id.required' => 'কর্মী নির্বাচন করা আবশ্যক।',
            'employee_id.exists' => 'নির্বাচিত কর্মী ডাটাবেজে পাওয়া যায়নি।',
            'application_date.required' => 'আবেদনের তারিখ উল্লেখ করা আবশ্যক।',
            'reason_category.required' => 'অব্যাহতির কারণ নির্বাচন করা আবশ্যক।',
            'joining_date.required' => 'সংস্থায় যোগদানের তারিখ আবশ্যক।',
            'last_working_date.required' => 'সংস্থায় শেষ কর্মদিবসের তারিখ প্রদান করা আবশ্যক।',
            'effective_date.required' => 'অব্যাহতি কার্যকরের তারিখ প্রদান করা আবশ্যক।',
            'applicant_mobile.required' => 'যোগাযোগের মোবাইল নম্বর প্রদান করা আবশ্যক।',
        ];

        $validated = $request->validate($rules, $messages);

        $employee = Employee::with(['branch.regionalOffice.zone', 'department', 'designation'])->findOrFail($validated['employee_id']);

        // Check if there is already an active/pending resignation for this employee
        $existing = ResignationApplication::where('employee_id', $employee->id)
            ->whereNotIn('status', ['approved', 'rejected'])
            ->first();

        if ($existing) {
            // If the existing application is in draft or sent_back, update it!
            if (in_array($existing->status, ['draft', 'sent_back'], true)) {
                $existing->update([
                    'application_date' => $validated['application_date'],
                    'joining_date' => $validated['joining_date'] ?? $existing->joining_date,
                    'reason_category' => $validated['reason_category'],
                    'reason_detail' => $validated['reason_detail'] ?? null,
                    'notice_date' => $validated['notice_date'] ?? $existing->notice_date,
                    'last_working_date' => $validated['last_working_date'] ?? $existing->last_working_date,
                    'effective_date' => $validated['effective_date'] ?? $existing->effective_date,
                    'applicant_mobile' => $validated['applicant_mobile'] ?? $existing->applicant_mobile,
                ]);

                if ($isSubmitting) {
                    $this->workflowService->forward($existing, $user, 'চাকরি হতে অব্যাহতির আবেদন দাখিল করা হলো।', $existing->effective_date);
                    return redirect()->route('resignation-applications.show', $existing->id)
                        ->with('success', 'চাকরি হতে অব্যাহতির আবেদন সফলভাবে দাখিল করা হয়েছে এবং পর্যালোচনার জন্য পাঠানো হয়েছে।');
                }

                return redirect()->route('resignation-applications.show', $existing->id)
                    ->with('success', 'অব্যাহতির আবেদন খসড়া (Draft) হিসেবে সফলভাবে হালনাগাদ করা হয়েছে।');
            }

            return back()->with('error', 'এই কর্মীর একটি অব্যাহতির আবেদন ইতিমধ্যে পর্যালোচনায় রয়েছে (আবেদন নং: '.$existing->application_no.')।');
        }

        // Generate application no
        $yearMonth = now()->format('Ym');
        $seq = ResignationApplication::where('application_no', 'like', "RES-{$yearMonth}-%")->count() + 1;
        $applicationNo = sprintf('RES-%s-%04d', $yearMonth, $seq);

        $application = DB::transaction(function () use ($validated, $employee, $user, $applicationNo, $isSubmitting) {
            $branchId = $employee->current_branch_id;
            $roId = $employee->branch?->regional_office_id;
            $zoneId = $employee->branch?->regionalOffice?->zone_id;
            $deptId = $employee->department_id;
            $desigId = $employee->designation_id;

            $app = ResignationApplication::create([
                'application_no' => $applicationNo,
                'employee_id' => $employee->id,
                'initiator_id' => $user->id,
                'branch_id' => $branchId,
                'regional_office_id' => $roId,
                'zone_id' => $zoneId,
                'department_id' => $deptId,
                'designation_id' => $desigId,
                'application_date' => $validated['application_date'],
                'joining_date' => $validated['joining_date'] ?? $employee->joining_date,
                'reason_category' => $validated['reason_category'],
                'reason_detail' => $validated['reason_detail'] ?? null,
                'notice_date' => $validated['notice_date'] ?? $validated['application_date'],
                'last_working_date' => $validated['last_working_date'] ?? null,
                'effective_date' => $validated['effective_date'] ?? null,
                'applicant_mobile' => $validated['applicant_mobile'] ?? $employee->mobile_phone ?? '',
                'status' => 'draft',
            ]);

            // If submit now, create applicant signature and forward
            if ($isSubmitting) {
                $this->workflowService->forward($app, $user, 'চাকরি হতে অব্যাহতির আবেদন দাখিল করা হলো।', $validated['effective_date']);
            }

            return $app;
        });

        $message = $isSubmitting
            ? 'চাকরি হতে অব্যাহতির আবেদন সফলভাবে দাখিল করা হয়েছে এবং পর্যালোচনার জন্য পাঠানো হয়েছে।'
            : 'অব্যাহতির আবেদন খসড়া (Draft) হিসেবে সফলভাবে সংরক্ষিত হয়েছে।';

        return redirect()->route('resignation-applications.show', $application->id)->with('success', $message);
    }

    public function show(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();

        $resignationApplication->loadMissing([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'employee.department',
            'initiator',
            'separation',
            'signatures.user.employee.designation',
        ]);

        $hasSigned = $resignationApplication->signatures->where('user_id', $user->id)->whereIn('action', ['forwarded', 'submitted', 'approved'])->isNotEmpty();
        $canReview = ! $hasSigned && $this->workflowService->canUserReview($user, $resignationApplication);
        $isInitiator = (int) $resignationApplication->initiator_id === (int) $user->id
            || ((int) $resignationApplication->employee_id === (int) $user->employee_id);

        return Inertia::render('sections/human-resources/resignation/show', [
            'application' => $resignationApplication,
            'canReview' => $canReview,
            'canApprove' => $canReview && $resignationApplication->status === 'submitted_to_ed',
            'canEdit' => in_array($resignationApplication->status, ['draft', 'sent_back'], true) && ($isInitiator || $user->isSuperAdmin()),
            'canDelete' => $resignationApplication->status === 'draft' && ($isInitiator || $user->isSuperAdmin()),
            'hasUserSigned' => $hasSigned,
            'userHasSignature' => $user->hasSignature(),
            'currentStageLabel' => $this->workflowService->getStageLabel($resignationApplication->status),
            'reasonCategoryLabels' => ResignationApplication::reasonCategoryLabels(),
            'currentUserId' => $user->id,
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function edit(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();
        $isInitiator = (int) $resignationApplication->initiator_id === (int) $user->id
            || ((int) $resignationApplication->employee_id === (int) $user->employee_id);

        if (! in_array($resignationApplication->status, ['draft', 'sent_back'], true) || (! $isInitiator && ! $user->isSuperAdmin())) {
            return redirect()->route('resignation-applications.show', $resignationApplication->id)
                ->with('error', 'শুধুমাত্র খসড়া বা প্রেরিত আবেদন সংশোধন করা যাবে।');
        }

        $resignationApplication->loadMissing(['employee.designation', 'employee.branch', 'employee.department']);

        return Inertia::render('sections/human-resources/resignation/edit', [
            'application' => $resignationApplication,
            'reasonCategories' => ResignationApplication::reasonCategoryLabels(),
        ]);
    }

    public function update(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();
        $isInitiator = (int) $resignationApplication->initiator_id === (int) $user->id
            || ((int) $resignationApplication->employee_id === (int) $user->employee_id);

        if (! in_array($resignationApplication->status, ['draft', 'sent_back'], true) || (! $isInitiator && ! $user->isSuperAdmin())) {
            return redirect()->route('resignation-applications.show', $resignationApplication->id)
                ->with('error', 'শুধুমাত্র খসড়া বা প্রেরিত আবেদন সংশোধন করা যাবে।');
        }

        $isSubmitting = ! empty($request->input('submit_now'));

        if ($isSubmitting && ! $user->hasSignature()) {
            return back()->with('error', 'আবেদন পর্যালোচনার জন্য দাখিল করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।');
        }

        $rules = [
            'reason_category' => 'required|string',
            'reason_detail' => 'nullable|string',
            'notice_date' => 'nullable|date',
            'last_working_date' => $isSubmitting ? 'required|date' : 'nullable|date',
            'effective_date' => $isSubmitting ? 'required|date' : 'nullable|date',
            'applicant_mobile' => $isSubmitting ? 'required|string|max:30' : 'nullable|string|max:30',
            'submit_now' => 'nullable|boolean',
        ];

        $messages = [
            'reason_category.required' => 'অব্যাহতির কারণ নির্বাচন করা আবশ্যক।',
            'last_working_date.required' => 'সংস্থায় শেষ কর্মদিবসের তারিখ প্রদান করা আবশ্যক।',
            'effective_date.required' => 'অব্যাহতি কার্যকরের তারিখ প্রদান করা আবশ্যক।',
            'applicant_mobile.required' => 'যোগাযোগের মোবাইল নম্বর প্রদান করা আবশ্যক।',
        ];

        $validated = $request->validate($rules, $messages);

        $resignationApplication->update([
            'reason_category' => $validated['reason_category'],
            'reason_detail' => $validated['reason_detail'] ?? null,
            'notice_date' => $validated['notice_date'] ?? $resignationApplication->application_date,
            'last_working_date' => $validated['last_working_date'] ?? $resignationApplication->last_working_date,
            'effective_date' => $validated['effective_date'] ?? $resignationApplication->effective_date,
            'applicant_mobile' => $validated['applicant_mobile'] ?? $resignationApplication->applicant_mobile,
        ]);

        if ($isSubmitting) {
            $this->workflowService->forward($resignationApplication, $user, 'সংশোধিত অব্যাহতির আবেদন দাখিল করা হলো।', $resignationApplication->effective_date);
            return redirect()->route('resignation-applications.show', $resignationApplication->id)->with('success', 'আবেদনটি সফলভাবে দাখিল করা হয়েছে এবং পর্যালোচনার জন্য পাঠানো হয়েছে।');
        }

        return redirect()->route('resignation-applications.show', $resignationApplication->id)->with('success', 'খসড়া আবেদনটি সফলভাবে হালনাগাদ করা হয়েছে।');
    }

    public function destroy(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();
        $isOwner = (int) $resignationApplication->initiator_id === (int) $user->id
            || ((int) $resignationApplication->employee_id === (int) $user->employee_id);

        // Once submitted, applications CANNOT be deleted by anyone
        if ($resignationApplication->status !== 'draft') {
            return back()->with('error', 'আবেদনটি ইতিমধ্যে দাখিল করা হয়েছে। দাখিলকৃত বা পর্যালোচনায় থাকা আবেদন মুছে ফেলা যাবে না।');
        }

        if (! $isOwner && ! $user->isSuperAdmin()) {
            return back()->with('error', 'আপনি এই খসড়া আবেদনটি মুছে ফেলার অনুমতিপ্রাপ্ত নন।');
        }

        $resignationApplication->signatures()->delete();
        $resignationApplication->delete();

        return redirect()->route('resignation-applications.index')->with('success', 'খসড়া আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function forward(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();

        if (! $user->hasSignature()) {
            return back()->with('error', 'অনুমোদন প্রক্রিয়া সম্পন্ন করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করা আবশ্যক।');
        }

        if (! $this->workflowService->canUserReview($user, $resignationApplication)) {
            return back()->with('error', 'আপনি এই আবেদনটি পর্যালোচনা বা অগ্রায়নের অনুমতিপ্রাপ্ত নন।');
        }

        $validated = $request->validate([
            'comments' => 'required|string|max:3000',
            'recommended_date' => 'nullable|date',
        ]);

        $this->workflowService->forward(
            $resignationApplication,
            $user,
            $validated['comments'],
            $validated['recommended_date'] ?? null
        );

        return back()->with('success', 'আবেদনটি সফলভাবে পরবর্তী পর্যালোচকের নিকট অগ্রায়ন করা হয়েছে।');
    }

    public function sendBack(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();

        if (! $this->workflowService->canUserReview($user, $resignationApplication)) {
            return back()->with('error', 'আপনি এই আবেদনটি ফেরত পাঠানোর অনুমতিপ্রাপ্ত নন।');
        }

        $validated = $request->validate([
            'comments' => 'required|string|max:3000',
        ]);

        $this->workflowService->sendBack($resignationApplication, $user, $validated['comments']);

        return back()->with('success', 'আবেদনটি সংশোধনের জন্য ফেরত পাঠানো হয়েছে।');
    }

    public function edApprove(Request $request, ResignationApplication $resignationApplication)
    {
        $user = $request->user();

        if (! $this->workflowService->isExecutiveDirector($user) && ! $user->isSuperAdmin()) {
            return back()->with('error', 'শুধুমাত্র নির্বাহী পরিচালক চূড়ান্ত অনুমোদন বা বাতিল করতে পারেন।');
        }

        if (! $user->hasSignature()) {
            return back()->with('error', 'আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করা আবশ্যক।');
        }

        $validated = $request->validate([
            'is_approved' => 'required|boolean',
            'comments' => 'required|string|max:3000',
            'effective_date' => 'nullable|date',
        ]);

        $this->workflowService->edApprove(
            $resignationApplication,
            $user,
            $validated['comments'],
            (bool) $validated['is_approved'],
            $validated['effective_date'] ?? null
        );

        $msg = $validated['is_approved']
            ? 'চাকরি হতে অব্যাহতির আবেদন চূড়ান্তভাবে অনুমোদিত হয়েছে এবং সেপারেশন প্রক্রিয়ায় যুক্ত হয়েছে।'
            : 'চাকরি হতে অব্যাহতির আবেদন বাতিল (Reject) করা হয়েছে।';

        return back()->with('success', $msg);
    }

    public function print(Request $request, ResignationApplication $resignationApplication)
    {
        $resignationApplication->loadMissing([
            'employee.designation',
            'employee.branch.regionalOffice.zone',
            'employee.department',
            'initiator',
            'signatures.user.employee.designation',
        ]);

        return Inertia::render('sections/human-resources/resignation/print', [
            'application' => $resignationApplication,
            'reasonCategoryLabels' => ResignationApplication::reasonCategoryLabels(),
        ]);
    }

    public function correctComment(Request $request, ResignationApplication $resignationApplication, ResignationApplicationSignature $signature)
    {
        return $this->correctSignatureComment(
            $request,
            $signature,
            $resignationApplication->id,
            'resignation_application_id'
        );
    }
}

