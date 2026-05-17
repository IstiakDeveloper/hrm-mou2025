<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryHead;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureLine;
use App\Services\SalaryStructureCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryStructureController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        return redirect()->route('salary-structures.manual', $request->only(['payscale_id', 'salary_grade_id', 'salary_step_id']));
    }

    public function manual(Request $request)
    {
        $payscales = Payscale::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $payscaleId = $request->integer('payscale_id') ?: null;
        $gradeId = $request->integer('salary_grade_id') ?: null;
        $stepId = $request->integer('salary_step_id') ?: null;

        $grades = SalaryGrade::query()
            ->when($payscaleId, fn ($q) => $q->where('payscale_id', $payscaleId))
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'payscale_id', 'name']);

        $steps = SalaryStep::query()
            ->when($gradeId, fn ($q) => $q->where('salary_grade_id', $gradeId))
            ->where('is_active', true)
            ->orderBy('step_number')
            ->get(['id', 'salary_grade_id', 'step_number', 'basic_salary']);

        $additionHeads = SalaryHead::query()
            ->where('is_active', true)
            ->where('type', 'earning')
            ->where('is_basic_head', false)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $deductionHeads = SalaryHead::query()
            ->where('is_active', true)
            ->where('type', 'deduction')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $structure = null;
        $lineMap = [];
        $basicSalary = 0.0;
        $stepBasicSalary = 0.0;
        $totals = ['total_addition' => 0, 'total_deduction' => 0, 'net_payable' => 0];

        if ($payscaleId && $gradeId && $stepId) {
            $step = SalaryStep::query()->where('id', $stepId)->where('salary_grade_id', $gradeId)->first();
            if (! $step) {
                throw ValidationException::withMessages(['salary_step_id' => 'Invalid step for selected grade.']);
            }

            $stepBasicSalary = (float) $step->basic_salary;
            $basicSalary = $stepBasicSalary;

            $structure = SalaryStructure::query()
                ->where('payscale_id', $payscaleId)
                ->where('salary_grade_id', $gradeId)
                ->where('salary_step_id', $stepId)
                ->first();

            if ($structure) {
                $structure->load('lines');
                if ($structure->basic_salary !== null) {
                    $basicSalary = (float) $structure->basic_salary;
                }
                foreach ($structure->lines as $line) {
                    $lineMap[$line->salary_head_id] = [
                        'amount_type' => $line->amount_type ?? 'fixed',
                        'amount' => (string) $line->value,
                    ];
                }
                $totals = [
                    'total_addition' => (float) $structure->total_addition,
                    'total_deduction' => (float) $structure->total_deduction,
                    'net_payable' => (float) $structure->net_payable,
                ];
            }
        }

        $mapHeadRow = function (SalaryHead $head) use ($lineMap) {
            $saved = $lineMap[$head->id] ?? null;

            return [
                'salary_head_id' => $head->id,
                'short_name' => $head->short_name ?? $head->name,
                'name' => $head->name,
                'amount_type' => $saved['amount_type'] ?? $head->default_amount_type,
                'amount' => $saved['amount'] ?? (string) $head->default_amount,
            ];
        };

        $savedStructures = SalaryStructure::query()
            ->withCount('lines')
            ->with([
                'payscale:id,name',
                'grade:id,name',
                'step:id,step_number,basic_salary',
            ])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (SalaryStructure $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'payscale_id' => $s->payscale_id,
                'salary_grade_id' => $s->salary_grade_id,
                'salary_step_id' => $s->salary_step_id,
                'basic_salary' => $s->basic_salary !== null ? (float) $s->basic_salary : (float) ($s->step?->basic_salary ?? 0),
                'net_payable' => (float) $s->net_payable,
                'lines_count' => (int) $s->lines_count,
                'updated_at' => $s->updated_at?->format('d-m-Y H:i'),
            ])
            ->values()
            ->all();

        return Inertia::render('payroll/salary-structures/manual', [
            'filters' => [
                'payscale_id' => $payscaleId ? (string) $payscaleId : '',
                'salary_grade_id' => $gradeId ? (string) $gradeId : '',
                'salary_step_id' => $stepId ? (string) $stepId : '',
            ],
            'payscales' => $payscales,
            'grades' => $grades,
            'steps' => $steps,
            'additionRows' => $additionHeads->map($mapHeadRow)->values()->all(),
            'deductionRows' => $deductionHeads->map($mapHeadRow)->values()->all(),
            'basicSalary' => $basicSalary,
            'stepBasicSalary' => $stepBasicSalary,
            'totals' => $totals,
            'hasStructure' => (bool) $structure,
            'structureId' => $structure?->id,
            'savedStructures' => $savedStructures,
        ]);
    }

    public function saveManual(Request $request)
    {
        $validated = $request->validate([
            'payscale_id' => 'required|exists:payscales,id',
            'salary_grade_id' => 'required|exists:salary_grades,id',
            'salary_step_id' => 'required|exists:salary_steps,id',
            'basic_salary' => 'required|numeric|min:0',
            'lines' => 'required|array',
            'lines.*.salary_head_id' => 'required|exists:salary_heads,id',
            'lines.*.amount_type' => 'required|in:percentage,fixed',
            'lines.*.amount' => 'required|numeric|min:0',
        ]);

        $gradeOk = SalaryGrade::where('id', $validated['salary_grade_id'])
            ->where('payscale_id', $validated['payscale_id'])
            ->exists();
        if (! $gradeOk) {
            throw ValidationException::withMessages(['salary_grade_id' => 'Grade does not belong to selected payscale.']);
        }

        $step = SalaryStep::query()
            ->where('id', $validated['salary_step_id'])
            ->where('salary_grade_id', $validated['salary_grade_id'])
            ->firstOrFail();

        $basicSalary = (float) $validated['basic_salary'];

        $headIds = collect($validated['lines'])->pluck('salary_head_id');
        if ($headIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['lines' => 'Duplicate salary heads in structure.']);
        }

        $heads = SalaryHead::query()->whereIn('id', $headIds)->get()->keyBy('id');

        DB::transaction(function () use ($validated, $step, $basicSalary, $heads) {
            $grade = SalaryGrade::findOrFail($validated['salary_grade_id']);
            $label = sprintf(
                '%s / %s / Step %d',
                Payscale::find($validated['payscale_id'])?->name ?? 'Scale',
                $grade->name ?? 'Grade',
                $step->step_number
            );

            $structure = SalaryStructure::query()->updateOrCreate(
                [
                    'payscale_id' => $validated['payscale_id'],
                    'salary_grade_id' => $validated['salary_grade_id'],
                    'salary_step_id' => $validated['salary_step_id'],
                ],
                [
                    'name' => $label,
                    'basic_salary' => $basicSalary,
                    'is_active' => true,
                ]
            );

            $structure->lines()->delete();

            $lineModels = [];
            $sort = 0;
            foreach ($validated['lines'] as $line) {
                $head = $heads->get($line['salary_head_id']);
                if (! $head || $head->is_basic_head) {
                    continue;
                }

                $lineModels[] = SalaryStructureLine::create([
                    'salary_structure_id' => $structure->id,
                    'salary_head_id' => $line['salary_head_id'],
                    'amount_type' => $line['amount_type'],
                    'calculation_type' => $line['amount_type'] === 'percentage' ? 'percent_of_basic' : 'fixed',
                    'value' => $line['amount'],
                    'sort_order' => $sort++,
                ]);
            }

            $totals = SalaryStructureCalculator::totalsFromLines($lineModels, $basicSalary);

            $structure->update($totals);
        });

        return redirect()
            ->route('salary-structures.manual', [
                'payscale_id' => $validated['payscale_id'],
                'salary_grade_id' => $validated['salary_grade_id'],
                'salary_step_id' => $validated['salary_step_id'],
            ])
            ->with('success', 'Salary structure saved successfully.');
    }

    public function destroy(SalaryStructure $salary_structure)
    {
        $params = [
            'payscale_id' => $salary_structure->payscale_id,
            'salary_grade_id' => $salary_structure->salary_grade_id,
            'salary_step_id' => $salary_structure->salary_step_id,
        ];
        $salary_structure->delete();

        return redirect()->route('salary-structures.manual', $params)
            ->with('success', 'Salary structure removed.');
    }
}
