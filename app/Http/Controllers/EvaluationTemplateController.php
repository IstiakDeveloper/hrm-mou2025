<?php

namespace App\Http\Controllers;

use App\Models\EvaluationCriterion;
use App\Models\EvaluationSection;
use App\Models\EvaluationTemplate;
use App\Services\OrganogramAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvaluationTemplateController extends Controller
{
    private function canUserManage(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;

        return $user->isSuperAdmin();
    }

    public function index(Request $request)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিনের (Super Admin) মূল্যায়ন রুব্রিক্স ও নম্বর বণ্টনে প্রবেশাধিকার রয়েছে।');
        }

        $templates = EvaluationTemplate::with(['sections.criteria' => function ($q) {
            $q->orderBy('order');
        }])->orderBy('id')->get();

        return Inertia::render('sections/human-resources/evaluations/promotion/templates/index', [
            'templates' => $templates,
            'canManage' => true,
        ]);
    }

    public function updateTemplate(Request $request, EvaluationTemplate $template)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন মূল্যায়ন ফরমের তথ্য পরিবর্তন করতে পারবেন।');
        }

        $validated = $request->validate([
            'title_bn' => 'required|string',
            'title_en' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $template->update($validated);

        return redirect()->back()->with('success', 'মূল্যায়ন ফরমের বিবরণ সফলভাবে আপডেট করা হয়েছে।');
    }

    public function storeSection(Request $request, EvaluationTemplate $template)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন নতুন সেকশন যোগ করতে পারবেন।');
        }

        $validated = $request->validate([
            'section_key' => 'required|string|max:10',
            'name_bn' => 'required|string',
            'name_en' => 'required|string',
            'max_marks' => 'required|numeric|min:1',
        ]);

        $maxOrder = $template->sections()->max('order') ?? 0;

        $template->sections()->create([
            'section_key' => strtoupper($validated['section_key']),
            'name_bn' => $validated['name_bn'],
            'name_en' => $validated['name_en'],
            'max_marks' => $validated['max_marks'],
            'order' => $maxOrder + 1,
        ]);

        return redirect()->back()->with('success', 'নতুন সেকশন সফলভাবে তৈরি হয়েছে।');
    }

    public function updateSection(Request $request, EvaluationSection $section)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন সেকশন তথ্য পরিবর্তন করতে পারবেন।');
        }

        $validated = $request->validate([
            'name_bn' => 'required|string',
            'name_en' => 'required|string',
            'max_marks' => 'required|numeric|min:1',
        ]);

        $section->update($validated);

        return redirect()->back()->with('success', 'সেকশন তথ্য সফলভাবে আপডেট করা হয়েছে।');
    }

    public function destroySection(Request $request, EvaluationSection $section)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন সেকশন মুছে ফেলতে পারবেন।');
        }

        $section->delete();

        return redirect()->back()->with('success', 'সেকশনটি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function updateCriterion(Request $request, EvaluationCriterion $criterion)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন মূল্যায়নের মানদণ্ড পরিবর্তন করতে পারবেন।');
        }

        $validated = $request->validate([
            'name_bn' => 'required|string',
            'name_en' => 'required|string',
            'max_score' => 'required|numeric|min:0.5',
            'is_active' => 'boolean',
        ]);

        $criterion->update($validated);

        return redirect()->back()->with('success', 'মানদণ্ডটি সফলভাবে আপডেট করা হয়েছে।');
    }

    public function storeCriterion(Request $request, EvaluationSection $section)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন নতুন মানদণ্ড যুক্ত করতে পারবেন।');
        }

        $validated = $request->validate([
            'criteria_key' => 'required|string',
            'name_bn' => 'required|string',
            'name_en' => 'required|string',
            'max_score' => 'required|numeric|min:0.5',
        ]);

        $maxOrder = $section->criteria()->max('order') ?? 0;

        $section->criteria()->create([
            'criteria_key' => $validated['criteria_key'],
            'name_bn' => $validated['name_bn'],
            'name_en' => $validated['name_en'],
            'max_score' => $validated['max_score'],
            'order' => $maxOrder + 1,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'নতুন মানদণ্ড সফলভাবে যুক্ত করা হয়েছে।');
    }

    public function destroyCriterion(Request $request, EvaluationCriterion $criterion)
    {
        if (!$this->canUserManage($request)) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন মূল্যায়নের মানদণ্ড মুছে ফেলতে পারবেন।');
        }

        $criterion->delete();

        return redirect()->back()->with('success', 'মানদণ্ডটি সফলভাবে মুছে ফেলা হয়েছে।');
    }
}
