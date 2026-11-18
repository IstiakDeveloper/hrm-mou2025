<?php

namespace App\Support;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SecurityFundProfileGuard
{
    /** Profile forms may preserve legacy metadata, but may not create or edit fund money. */
    public static function check(Request $request): void
    {
        $payload = $request->input('collateral');
        if (! is_array($payload)) {
            return;
        }
        $employee = $request->route('employee');
        $id = $employee instanceof Employee ? $employee->id : (is_numeric($employee) ? (int) $employee : null);
        $original = $id ? DB::table('employee_collaterals')->where('employee_id', $id)->first() : null;
        foreach (['security_amount', 'collateral_interest', 'collateral_date'] as $field) {
            if (! array_key_exists($field, $payload)) {
                if ($original) {
                    $payload[$field] = $original->{$field};
                }

                continue;
            }
            $before = $original?->{$field};
            $after = $payload[$field];
            $same = $field === 'collateral_date'
                ? (string) $before === (string) $after
                : (is_numeric($before) || is_numeric($after) ? (float) $before === (float) $after : (string) $before === (string) $after);
            if (! $same) {
                throw ValidationException::withMessages(['collateral.'.$field => 'Manage Security Fund deposits and interest in Staff Fund → Security Fund after saving the employee.']);
            }
        }
        $request->merge(['collateral' => $payload]);
    }
}
