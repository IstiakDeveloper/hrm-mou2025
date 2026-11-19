<?php

namespace App\Http\Controllers\StaffFund;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeSecurityFundAccount as Account;
use App\Models\EmployeeSecurityFundTransaction as Transaction;
use App\Services\EmployeeSecurityFundService;
use App\Services\OrganogramAccessService;
use App\Support\BangladeshDate;
use App\Support\SecurityFundMoney as Money;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Mpdf\Mpdf;
use Shuchkin\SimpleXLSXGen;

class SecurityFundController extends Controller
{
    public function __construct(protected EmployeeSecurityFundService $fund) {}

    private function employees(Request $request)
    {
        $query = Employee::query();
        OrganogramAccessService::constrainVisibleEmployees($query, $request->user());

        return $query;
    }

    private function authorizeAccount(Request $request, Account $account): void
    {
        abort_unless($this->employees($request)->whereKey($account->employee_id)->exists(), 403);
    }

    private function asOf(Request $request, string $field = 'as_of'): string
    {
        $data = $request->validate([$field => 'nullable|date_format:Y-m-d|after_or_equal:1900-01-01|before_or_equal:'.BangladeshDate::todayString()]);

        return $data[$field] ?? BangladeshDate::todayString();
    }

    private function rows(Request $request, string $asOf): array
    {
        $query = Account::query()->whereIn('employee_id', $this->employees($request)->select('id'))
            ->with([
                'employee:id,pin,name_en,name_bn,status,current_branch_id,department_id,dropout_date,resignation_date',
                'employee.branch:id,name', 'employee.department:id,name',
                'employee.separations' => fn ($query) => $query->where('status', 'completed')->select('id', 'employee_id', 'status', 'separation_date'),
                'transactions:id,account_id,type,transaction_date,principal_credit,principal_debit,interest_credit,interest_debit,accrual_amount,reversal_of_id',
            ])
            ->where('opened_on', '<=', $asOf);
        if ($request->filled('account_id')) {
            $query->whereKey($request->integer('account_id'));
        }
        if ($request->filled('search')) {
            $search = mb_substr(trim($request->string('search')->toString()), 0, 100);
            $query->whereHas('employee', fn ($q) => $q->where(fn ($q) => $q->where('pin', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%")->orWhere('name_bn', 'like', "%{$search}%")));
        }
        foreach (['branch_id' => 'current_branch_id', 'department_id' => 'department_id', 'employee_status' => 'status'] as $input => $column) {
            if ($request->filled($input)) {
                $query->whereHas('employee', fn ($q) => $q->where($column, $request->input($input)));
            }
        }
        if (in_array($request->input('status'), ['open', 'closed'], true)) {
            $query->where('status', $request->input('status'));
        }

        return $query->orderBy('employee_id')->get()->map(function (Account $account) use ($asOf) {
            $row = [
                'id' => $account->id, 'employee_id' => $account->employee_id,
                'pin' => $account->employee->pin, 'name' => $account->employee->name_en ?: $account->employee->name_bn,
                'branch' => $account->employee->branch?->name, 'department' => $account->employee->department?->name,
                'opened_on' => $account->opened_on->toDateString(),
                'ledger_version' => $account->transactions->max('id'),
            ];
            try {
                $snapshot = $this->fund->accountSnapshot($account, $asOf);
                // Calculation details belong to the individual ledger/posting audit, not every list row.
                unset($snapshot['segments']);

                return array_merge($row, $snapshot);
            } catch (ValidationException $exception) {
                return array_merge($row, ['status' => $account->status, 'review_required' => collect($exception->errors())->flatten()->first()]);
            }
        })->all();
    }

    private function summary(array $rows): array
    {
        $totals = ['principal' => 0, 'posted_interest' => 0, 'unposted_interest' => 0, 'interest' => 0, 'total' => 0];
        foreach ($rows as $row) {
            foreach ($totals as $key => $value) {
                $totals[$key] += Money::paisa($row[$key] ?? 0);
            }
        }

        return array_map(fn ($value) => Money::decimal($value), $totals) + [
            'account_count' => count($rows), 'review_count' => count(array_filter($rows, fn ($row) => isset($row['review_required']))),
        ];
    }

    public function index(Request $request)
    {
        $asOf = $this->asOf($request);
        $rows = $this->rows($request, $asOf);
        $page = max(1, $request->integer('page', 1));

        return Inertia::render('staff-fund/security-fund/index', [
            'accounts' => new LengthAwarePaginator(array_slice($rows, ($page - 1) * 30, 30), count($rows), 30, $page, ['path' => $request->url(), 'query' => $request->query()]),
            'summary' => $this->summary($rows), 'asOf' => $asOf,
            'filters' => $request->only('search', 'status', 'branch_id', 'department_id', 'employee_status'),
            'canCreate' => $request->user()->hasPermission('staff-fund.create'),
            'canEdit' => $request->user()->hasPermission('staff-fund.edit'),
            'canExport' => $request->user()->hasPermission('reports.export'),
            'branches' => \App\Models\Branch::whereIn('id', $this->employees($request)->select('current_branch_id'))->orderBy('name')->get(['id', 'name']),
            'departments' => \App\Models\Department::whereIn('id', $this->employees($request)->select('department_id'))->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function lookup(Request $request)
    {
        $request->validate(['search' => 'nullable|string|max:100']);
        $search = trim((string) $request->input('search', ''));
        $rows = $this->employees($request)->where('status', 'active')
            ->whereDoesntHave('securityFundAccount')->whereDoesntHave('separationFinalPayments', fn ($q) => $q->where('status', 'paid')->whereNotNull('security_fund_account_id'))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q->where('pin', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%")->orWhere('name_bn', 'like', "%{$search}%")->orWhere('employee_id', 'like', "%{$search}%")))
            ->with(['branch:id,name', 'designation:id,name'])->orderBy('pin')->limit(30)->get();

        return response()->json($rows->map(fn (Employee $employee) => [
            'id' => $employee->id, 'pin' => $employee->pin, 'name' => $employee->name_en ?: $employee->name_bn,
            'branch' => $employee->branch?->name, 'designation' => $employee->designation?->name,
        ]));
    }

    private function depositData(Request $request): array
    {
        return $request->validate([
            'amount' => 'required|decimal:0,2|gt:0|max:99999999.99',
            'transaction_date' => 'required|date_format:Y-m-d|after_or_equal:1900-01-01|before_or_equal:'.BangladeshDate::todayString(),
            'reference_no' => 'required|string|max:120', 'notes' => 'required|string|max:2000',
            'idempotency_key' => 'required|uuid',
        ]);
    }

    public function store(Request $request)
    {
        $request->validate(['employee_id' => 'required|integer']);
        $data = $this->depositData($request);
        $employee = $this->employees($request)->findOrFail($request->integer('employee_id'));
        $account = $this->fund->create($employee, $data, $request->user()->id);

        return redirect()->route('security-fund.ledger', ['account' => $account, 'section' => 'staff-fund'])->with('success', 'Security Fund account created.');
    }

    public function ledger(Request $request, Account $account)
    {
        $this->authorizeAccount($request, $account);

        return $this->renderLedger($request, $account, false);
    }

    public function selfLedger(Request $request)
    {
        abort_unless($request->user()->canAccessSection('staff-fund') || $request->user()->isSuperAdmin(), 403);
        $employee = $request->user()->employee;
        abort_unless($employee, 403);
        $account = $employee->securityFundAccount;
        if (! $account) {
            return Inertia::render('staff-fund/security-fund/ledger', ['account' => null, 'snapshot' => null, 'transactions' => [], 'canEdit' => false, 'canExport' => false, 'asOf' => $this->asOf($request), 'selfService' => true]);
        }

        return $this->renderLedger($request, $account, true);
    }

    private function renderLedger(Request $request, Account $account, bool $selfService)
    {
        $asOf = $this->asOf($request);
        $account->load([
            'employee.branch',
            'transactions' => fn ($query) => $query->with('creator:id,name')->where('transaction_date', '<=', $asOf)->orderBy('transaction_date')->orderBy('id'),
        ]);

        return Inertia::render('staff-fund/security-fund/ledger', [
            'account' => ['id' => $account->id, 'status' => $account->status, 'pin' => $account->employee->pin, 'name' => $account->employee->name_en ?: $account->employee->name_bn, 'branch' => $account->employee->branch?->name],
            'snapshot' => $this->fund->accountSnapshot($account, $asOf),
            'transactions' => $account->transactions,
            'asOf' => $asOf, 'selfService' => $selfService,
            'canEdit' => ! $selfService && $request->user()->hasPermission('staff-fund.edit'),
            'canExport' => ! $selfService && $request->user()->hasPermission('reports.export'),
        ]);
    }

    public function deposit(Request $request, Account $account)
    {
        $this->authorizeAccount($request, $account);
        $this->fund->deposit($account, $this->depositData($request), $request->user()->id);

        return back()->with('success', 'Security deposit recorded.');
    }

    public function refund(Request $request, Account $account)
    {
        $this->authorizeAccount($request, $account);
        $data = $request->validate([
            'principal' => 'required|decimal:0,2|min:0|max:99999999.99', 'interest' => 'required|decimal:0,2|min:0|max:99999999.99',
            'transaction_date' => 'required|date_format:Y-m-d|before_or_equal:'.BangladeshDate::todayString(),
            'reference_no' => 'required|string|max:120', 'notes' => 'required|string|max:2000', 'idempotency_key' => 'required|uuid',
        ]);
        $this->fund->refund($account, $data, $request->user()->id);

        return back()->with('success', 'Principal and interest refund recorded separately.');
    }

    public function reverse(Request $request, Account $account, Transaction $transaction)
    {
        $this->authorizeAccount($request, $account);
        $data = $request->validate(['reason' => 'required|string|min:5|max:2000']);
        $this->fund->reverse($account, $transaction, $data['reason'], $request->user()->id);

        return back()->with('success', 'Reversal recorded; original transaction preserved.');
    }

    private function previewData(Request $request): array
    {
        $date = $this->asOf($request, 'cutoff_date');
        $rows = array_values(array_filter($this->rows($request, $date), fn ($row) => $row['status'] === 'open'));

        return [
            'cutoffDate' => $date, 'rows' => $rows, 'summary' => $this->summary($rows),
            'fingerprint' => hash('sha256', json_encode($rows)),
            'canEdit' => $request->user()->hasPermission('staff-fund.edit'),
        ];
    }

    public function interest(Request $request)
    {
        return Inertia::render('staff-fund/security-fund/interest', $this->previewData($request));
    }

    public function preview(Request $request)
    {
        return response()->json($this->previewData($request));
    }

    public function post(Request $request)
    {
        $data = $request->validate(['fingerprint' => 'required|string|size:64', 'idempotency_key' => 'required|uuid']);
        DB::transaction(function () use ($request, $data) {
            $ids = Account::where('status', 'open')->whereIn('employee_id', $this->employees($request)->select('id'))->orderBy('employee_id')->pluck('employee_id');
            Employee::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
            Account::whereIn('employee_id', $ids)->orderBy('employee_id')->lockForUpdate()->get();
            $preview = $this->previewData($request);
            if (! hash_equals($data['fingerprint'], $preview['fingerprint'])) {
                throw ValidationException::withMessages(['fingerprint' => 'The fund changed. Preview again before posting.']);
            }
            foreach ($preview['rows'] as $row) {
                if (isset($row['review_required'])) {
                    continue;
                }
                $this->fund->postInterest(Account::findOrFail($row['id']), $preview['cutoffDate'], 'batch-'.$data['idempotency_key'].'-'.$row['id'], $request->user()->id);
            }
        });

        return back()->with('success', 'Security Fund interest posted for verified accounts. Accounts awaiting date verification were skipped. Previously posted interest was excluded.');
    }

    public function report(Request $request, string $format)
    {
        abort_unless(in_array($format, ['print', 'pdf', 'excel'], true), 404);
        if ($format !== 'print') {
            abort_unless($request->user()->hasPermission('reports.export'), 403);
        }
        $asOf = $this->asOf($request);
        $rows = $this->rows($request, $asOf);
        $ledger = null;
        if ($request->filled('account_id')) {
            $account = Account::findOrFail($request->integer('account_id'));
            $this->authorizeAccount($request, $account);
            $ledger = $account->transactions()->whereDate('transaction_date', '<=', $asOf)->orderBy('transaction_date')->orderBy('id')->get();
        }
        $data = ['rows' => $rows, 'summary' => $this->summary($rows), 'asOf' => $asOf, 'ledger' => $ledger, 'filters' => $request->only('search', 'status', 'employee_status', 'branch_id', 'department_id')];
        if ($format === 'excel') {
            $sheet = [['Security Fund — 6% annual simple interest'], ['As of', $asOf], ['PIN', 'Employee', 'Branch', 'Principal', 'Posted interest', 'Accrued interest', 'Interest payable', 'Total', 'Status / review']];
            foreach ($rows as $row) {
                $sheet[] = [$this->spreadsheetText($row['pin']), $this->spreadsheetText($row['name']), $this->spreadsheetText($row['branch']), $row['principal'] ?? '', $row['posted_interest'] ?? '', $row['unposted_interest'] ?? '', $row['interest'] ?? '', $row['total'] ?? '', $this->spreadsheetText($row['review_required'] ?? $row['status'])];
            }
            $sheet[] = ['Total', '', '', $data['summary']['principal'], $data['summary']['posted_interest'], $data['summary']['unposted_interest'], $data['summary']['interest'], $data['summary']['total'], ''];

            $xlsx = SimpleXLSXGen::fromArray($sheet, 'Register');
            if ($ledger !== null) {
                $ledgerSheet = [['Date', 'Type', 'Principal credit', 'Principal debit', 'Interest credit', 'Interest debit', 'Reference', 'Notes']];
                foreach ($ledger as $transaction) {
                    $ledgerSheet[] = [$transaction->transaction_date->toDateString(), $transaction->type, $transaction->principal_credit, $transaction->principal_debit, $transaction->interest_credit, $transaction->interest_debit, $this->spreadsheetText($transaction->reference_no), $this->spreadsheetText($transaction->notes)];
                }
                $xlsx->addSheet($ledgerSheet, 'Ledger');
            }

            return response($xlsx->__toString(), 200, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition' => 'attachment; filename="security-fund.xlsx"']);
        }
        if ($format === 'pdf') {
            $tempDir = storage_path('app/private/security-fund/pdf-temp');
            \Illuminate\Support\Facades\File::ensureDirectoryExists($tempDir);
            $pdf = new Mpdf([
                'mode' => 'utf-8', 'format' => 'A4', 'orientation' => 'P', 'default_font' => 'dejavusans',
                'default_font_size' => 7,
                'margin_left' => 8, 'margin_right' => 8, 'margin_top' => 8, 'margin_bottom' => 12,
                'tempDir' => $tempDir, 'simpleTables' => true, 'packTableData' => true,
            ]);
            $pdf->SetTitle('Security Fund Register');
            $pdf->WriteHTML(view('staff-fund.security-fund-report', $data + ['pdfMode' => true])->render());

            return response($pdf->Output('', 'S'), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="security-fund.pdf"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        return view('staff-fund.security-fund-report', $data);
    }

    private function spreadsheetText(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
