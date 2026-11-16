<?php

namespace App\Http\Concerns;

use App\Models\Employee;
use Illuminate\Validation\Rule;

trait EmployedEmployeeUniqueIdentifiers
{
    /**
     * @return \Illuminate\Validation\Rules\Unique
     */
    protected function uniqueAmongEmployed(string $column, ?int $ignoreEmployeeId = null)
    {
        $rule = Rule::unique('employees', $column)->where(
            fn ($q) => $q->whereIn('status', Employee::statusesReservingUniqueIdentifiers())
        );
        if ($ignoreEmployeeId !== null) {
            $rule->ignore($ignoreEmployeeId);
        }

        return $rule;
    }
}
