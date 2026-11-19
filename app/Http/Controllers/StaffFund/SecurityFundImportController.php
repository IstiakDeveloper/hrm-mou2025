<?php

namespace App\Http\Controllers\StaffFund;

use App\Http\Controllers\Controller;
use App\Services\SecurityFundExcelImportService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Shuchkin\SimpleXLSXGen;
use Throwable;

class SecurityFundImportController extends Controller
{
    public function index(Request $request)
    {
        $id = $request->session()->get('security_fund_last_import_id');
        $result = is_string($id) && Str::isUuid($id) && Storage::disk('local')->exists($this->path($request, $id))
            ? $this->result($request, $id) : null;

        return $this->page($request, $result);
    }

    public function template()
    {
        $xlsx = SimpleXLSXGen::fromArray([['PIN', 'Name', 'Deposit Date', 'Amount']], 'Deposits');
        $xlsx->addSheet([
            ['Security Fund Import Instructions'],
            ['Fill the first worksheet; keep the headers PIN, Name, Deposit Date, Amount.'],
            ['Use employee PIN only. Format PIN as Text to preserve leading zeros.'],
            ['Name is for reference; matching uses PIN and the employee name is not changed.'],
            ['Date: YYYY-MM-DD, DD/MM/YYYY, or a native Excel date. Future/invalid dates fail.'],
            ['Amount: positive, at most two decimal places. Maximum 2,000 rows / 10 MB.'],
            ['Duplicate date/amount for the same employee is skipped; money is not added twice.'],
            ['New accounts need Staff Fund create permission; existing accounts need edit permission.'],
            ['Interest remains 6% yearly, one-year eligibility, full months and whole-taka rounding.'],
        ], 'Instructions');

        return $this->xlsx($xlsx, 'security-fund-import-template.xlsx');
    }

    public function store(Request $request, SecurityFundExcelImportService $importer)
    {
        $request->validate(['file' => 'required|file|max:10240|extensions:xlsx'], [
            'file.required' => 'Select an Excel (.xlsx) file before importing.',
            'file.uploaded' => 'The file could not be uploaded. Check the file size and try again.',
            'file.max' => 'The Excel file must be no larger than 10 MB.',
            'file.extensions' => 'Only .xlsx files are supported. Save the workbook as Excel (.xlsx) and upload it again.',
        ]);
        $upload = $request->file('file');
        $id = (string) Str::uuid();
        $path = $this->path($request, $id);
        $disk = Storage::disk('local');
        if (! $disk->put($path, json_encode(['state' => 'processing', 'user_id' => $request->user()->id]))) {
            throw ValidationException::withMessages(['file' => 'Import results could not be saved. No deposits were imported; please try again.']);
        }
        try {
            $result = $importer->import($upload->getRealPath(), mb_substr($upload->getClientOriginalName(), 0, 200), $request->user());
        } catch (ValidationException $exception) {
            $disk->delete($path);
            throw $exception;
        } catch (Throwable $exception) {
            $disk->delete($path);
            \Illuminate\Support\Facades\Log::error('Security Fund Excel import stopped', ['reference' => $id, 'user_id' => $request->user()->id, 'exception' => $exception]);
            throw ValidationException::withMessages(['file' => 'Import stopped before a result could be saved. Some rows may have been recorded; retries skip existing deposits. Reference: '.$id]);
        }
        $result += ['id' => $id, 'user_id' => $request->user()->id, 'state' => 'complete'];
        if (! $disk->put($path, json_encode($result, JSON_THROW_ON_ERROR))) {
            report(new \RuntimeException('Security Fund import result could not be saved for '.$id));
            throw ValidationException::withMessages(['file' => 'Deposits were processed but the results could not be saved. Reuploading skips already recorded deposits.']);
        }

        $request->session()->put('security_fund_last_import_id', $id);
        if ($request->expectsJson()) {
            unset($result['user_id']);

            return response()->json(['result' => $result, 'result_url' => route('security-fund.import.results', ['id' => $id, 'section' => 'staff-fund'])], 201);
        }

        return redirect()->route('security-fund.import.results', ['id' => $id, 'section' => 'staff-fund']);
    }

    public function results(Request $request, string $id)
    {
        return $this->page($request, $this->result($request, $id));
    }

    private function page(Request $request, ?array $result = null)
    {
        $status = $request->input('status', ($result['failed'] ?? 0) > 0 ? 'failed' : 'all');
        if (! in_array($status, ['all', 'failed', 'imported', 'skipped'], true)) {
            $status = 'all';
        }
        $rows = $result['rows'] ?? [];
        if ($status !== 'all') {
            $rows = array_values(array_filter($rows, fn ($row) => $row['status'] === $status));
        }
        $page = max(1, $request->integer('page', 1));
        $summary = $result;
        if ($summary !== null) {
            unset($summary['rows'], $summary['user_id']);
        }

        return Inertia::render('staff-fund/security-fund/import', [
            'result' => $summary, 'status' => $status,
            'rows' => new LengthAwarePaginator(array_slice($rows, ($page - 1) * 50, 50), count($rows), 50, $page, ['path' => $request->url(), 'query' => $request->query()]),
            'canCreate' => $request->user()->hasPermission('staff-fund.create'),
            'canEdit' => $request->user()->hasPermission('staff-fund.edit'),
        ]);
    }

    public function failures(Request $request, string $id)
    {
        $result = $this->result($request, $id);
        $sheet = [['PIN', 'Name', 'Deposit Date', 'Amount', 'Failed Reason']];
        foreach ($result['rows'] as $row) {
            if ($row['status'] === 'failed') {
                // Raw strings preserve PIN zeroes and prevent spreadsheet formulas/formatting from uploaded text.
                $sheet[] = array_map(fn ($value) => "\0".(string) $value, [$row['pin'], $row['name'], $row['deposit_date'], $row['amount'], $row['message']]);
            }
        }

        return $this->xlsx(SimpleXLSXGen::fromArray($sheet, 'Failed rows'), 'security-fund-failed-rows.xlsx');
    }

    private function result(Request $request, string $id): array
    {
        abort_unless(Str::isUuid($id), 404);
        $disk = Storage::disk('local');
        $path = $this->path($request, $id);
        abort_unless($disk->exists($path), 404);
        $result = json_decode($disk->get($path), true);
        abort_unless(is_array($result) && ($result['state'] ?? '') === 'complete' && (int) $result['user_id'] === (int) $request->user()->id, 404);

        return $result;
    }

    private function path(Request $request, string $id): string
    {
        return 'security-fund/import-results/'.$request->user()->id.'/'.$id.'.json';
    }

    private function xlsx(SimpleXLSXGen $xlsx, string $filename)
    {
        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
