<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\LoanCommittee;
use App\Models\LoanCommitteeMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanCommitteeController extends Controller
{
    use ProvidesPayrollFilters;

    public function index()
    {
        $committees = LoanCommittee::query()
            ->withCount('members')
            ->with(['members.employee:id,pin,name_en', 'members.branch:id,name,branch_code', 'members.department:id,name', 'members.designation:id,name', 'members.project:id,name'])
            ->orderByDesc('establishment_date')
            ->get()
            ->map(fn (LoanCommittee $c) => [
                'id' => $c->id,
                'committee_name' => $c->committee_name,
                'establishment_date' => $c->establishment_date?->format('d-M-Y'),
                'total_member' => $c->members_count,
                'is_active' => $c->is_active,
                'inactive_date' => $c->inactive_date?->format('d-M-Y'),
                'members' => $c->members->map(fn (LoanCommitteeMember $m) => [
                    'id' => $m->id,
                    'member_type' => strtoupper($m->member_type),
                    'branch' => $m->branch
                        ? trim($m->branch->branch_code.' - '.$m->branch->name)
                        : null,
                    'employee_name' => $m->employee
                        ? trim(($m->employee->pin ?? '').' — '.($m->employee->name_en ?? ''))
                        : $m->display_name,
                    'project' => $m->project?->name,
                    'department' => $m->department?->name,
                    'designation' => $m->designation?->name,
                ])->values(),
            ]);

        return Inertia::render('employee-loan/committees/index', [
            'committees' => $committees,
        ]);
    }

    public function create()
    {
        return Inertia::render('employee-loan/committees/form', [
            ...$this->payrollFilterOptions(),
            'committee' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateCommittee($request);

        DB::transaction(function () use ($validated, $request) {
            $committee = LoanCommittee::query()->create([
                'committee_name' => $validated['committee_name'],
                'establishment_date' => $validated['establishment_date'],
                'is_active' => $request->boolean('is_active', true),
                'inactive_date' => $validated['inactive_date'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $this->syncMembers($committee, $validated['members'] ?? []);
        });

        return redirect()->route('loan-committees.index')->with('success', 'Loan committee created.');
    }

    public function edit(LoanCommittee $loan_committee)
    {
        $loan_committee->load('members');

        return Inertia::render('employee-loan/committees/form', [
            ...$this->payrollFilterOptions(),
            'committee' => [
                'id' => $loan_committee->id,
                'committee_name' => $loan_committee->committee_name,
                'establishment_date' => $loan_committee->establishment_date?->format('Y-m-d'),
                'is_active' => $loan_committee->is_active,
                'inactive_date' => $loan_committee->inactive_date?->format('Y-m-d'),
                'members' => $loan_committee->members->map(fn (LoanCommitteeMember $m) => [
                    'member_type' => $m->member_type,
                    'employee_id' => $m->employee_id ? (string) $m->employee_id : '',
                    'branch_id' => $m->branch_id ? (string) $m->branch_id : '',
                    'department_id' => $m->department_id ? (string) $m->department_id : '',
                    'designation_id' => $m->designation_id ? (string) $m->designation_id : '',
                    'project_id' => $m->project_id ? (string) $m->project_id : '',
                    'display_name' => $m->display_name ?? '',
                ])->values(),
            ],
        ]);
    }

    public function update(Request $request, LoanCommittee $loan_committee)
    {
        $validated = $this->validateCommittee($request);

        DB::transaction(function () use ($loan_committee, $validated, $request) {
            $loan_committee->update([
                'committee_name' => $validated['committee_name'],
                'establishment_date' => $validated['establishment_date'],
                'is_active' => $request->boolean('is_active', true),
                'inactive_date' => $validated['inactive_date'] ?? null,
            ]);

            $loan_committee->members()->delete();
            $this->syncMembers($loan_committee, $validated['members'] ?? []);
        });

        return redirect()->route('loan-committees.index')->with('success', 'Loan committee updated.');
    }

    public function destroy(LoanCommittee $loan_committee)
    {
        if ($loan_committee->applications()->exists()) {
            throw ValidationException::withMessages([
                'committee' => 'Cannot delete committee linked to loan applications.',
            ]);
        }

        $loan_committee->delete();

        return redirect()->route('loan-committees.index')->with('success', 'Loan committee deleted.');
    }

    /**
     * @param  list<array<string, mixed>>  $members
     */
    protected function syncMembers(LoanCommittee $committee, array $members): void
    {
        foreach ($members as $i => $row) {
            $employee = ! empty($row['employee_id'])
                ? Employee::query()->with(['branch', 'department', 'designation', 'project'])->find($row['employee_id'])
                : null;

            LoanCommitteeMember::query()->create([
                'loan_committee_id' => $committee->id,
                'member_type' => $row['member_type'] ?? 'internal',
                'employee_id' => $employee?->id,
                'branch_id' => $employee?->current_branch_id ?? ($row['branch_id'] ?? null),
                'department_id' => $employee?->department_id ?? ($row['department_id'] ?? null),
                'designation_id' => $employee?->designation_id ?? ($row['designation_id'] ?? null),
                'project_id' => $employee?->project_id ?? ($row['project_id'] ?? null),
                'display_name' => $row['display_name'] ?? null,
                'sort_order' => $i + 1,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateCommittee(Request $request): array
    {
        return $request->validate([
            'committee_name' => 'required|string|max:255',
            'establishment_date' => 'required|date',
            'inactive_date' => 'nullable|date|after_or_equal:establishment_date',
            'is_active' => 'boolean',
            'members' => 'nullable|array',
            'members.*.member_type' => 'required|in:internal,external',
            'members.*.employee_id' => 'nullable|integer|exists:employees,id',
            'members.*.display_name' => 'nullable|string|max:255',
        ]);
    }
}
