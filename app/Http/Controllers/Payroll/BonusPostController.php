<?php

namespace App\Http\Controllers\Payroll;

use App\Models\PayrollRun;
use Illuminate\Http\Request;

/**
 * Bonus finalize/review — same payroll run data as salary post, bonus-only routes and UI.
 */
class BonusPostController extends SalaryPostController
{
    public function index(Request $request)
    {
        $request->merge(['salary_type' => 'bonus']);

        return parent::index($request);
    }

    public function show(Request $request, PayrollRun $payroll_run)
    {
        return parent::show($request, $payroll_run);
    }

    public function updatePayslips(Request $request, PayrollRun $payroll_run)
    {
        return parent::updatePayslips($request, $payroll_run);
    }

    public function post(Request $request, PayrollRun $payroll_run)
    {
        return parent::post($request, $payroll_run);
    }
}
