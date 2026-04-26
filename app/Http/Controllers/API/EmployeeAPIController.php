<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class EmployeeAPIController extends Controller
{
    /**
     * Sync employee data from external source
     */
    public function syncEmployees(Request $request)
    {
        // Validate the API key
        if ($request->header('Authorization') !== 'Bearer ' . config('app.zkteco_api_key')) {
            Log::warning('Employee sync: Invalid API key used');
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        // Validate the request data
        $validator = Validator::make($request->all(), [
            'employees' => 'required|array',
            'employees.*.employee_id' => 'required|string',
            'employees.*.pin' => 'nullable|string',
            'employees.*.biometric_id' => 'nullable|string',
            'employees.*.first_name' => 'nullable|string',
            'employees.*.last_name' => 'nullable|string',
            'employees.*.name_en' => 'nullable|string',
            'employees.*.name_bn' => 'nullable|string',
            'employees.*.email' => 'nullable|email',
            'employees.*.phone' => 'nullable|string',
            'employees.*.department' => 'nullable|string',
            'employees.*.designation' => 'nullable|string',
            'employees.*.branch' => 'nullable|string',
            'employees.*.joining_date' => 'nullable|date',
            'employees.*.confirmation_date' => 'nullable|date',
            'employees.*.status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            Log::error('Employee sync: Invalid data format', [
                'errors' => $validator->errors()->toArray()
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Invalid data format',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Process employee records
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = 0;
        $details = [];

        DB::beginTransaction();

        try {
            foreach ($request->employees as $employeeData) {
                try {
                    $result = $this->processEmployeeRecord($employeeData);

                    if ($result['status'] === 'created') {
                        $created++;
                        $details[] = [
                            'employee_id' => $employeeData['employee_id'],
                            'status' => 'created',
                            'message' => 'Employee created successfully'
                        ];
                    } elseif ($result['status'] === 'updated') {
                        $updated++;
                        $details[] = [
                            'employee_id' => $employeeData['employee_id'],
                            'status' => 'updated',
                            'message' => 'Employee updated successfully'
                        ];
                    } else {
                        $skipped++;
                        $details[] = [
                            'employee_id' => $employeeData['employee_id'],
                            'status' => 'skipped',
                            'message' => $result['message'] ?? 'Employee skipped'
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Employee sync: Error processing record', [
                        'employee_id' => $employeeData['employee_id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);

                    $errors++;
                    $details[] = [
                        'employee_id' => $employeeData['employee_id'] ?? 'unknown',
                        'status' => 'error',
                        'message' => 'Error: ' . $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Employee data processed successfully',
                'summary' => [
                    'created' => $created,
                    'updated' => $updated,
                    'skipped' => $skipped,
                    'errors' => $errors,
                    'total' => count($request->employees)
                ],
                'details' => $details
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Employee sync: Transaction failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Failed to process employee data: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process a single employee record
     */
    private function processEmployeeRecord($data)
    {
        // Check if department exists or create it
        $department = null;
        if (!empty($data['department'])) {
            $department = Department::firstOrCreate(
                ['name' => $data['department']],
                ['status' => 'active']
            );
        }

        // Check if designation exists or create it
        $designation = null;
        if (!empty($data['designation'])) {
            $designation = Designation::firstOrCreate(
                ['name' => $data['designation']],
                ['status' => 'active']
            );
        }

        // Check if branch exists or create it
        $branch = null;
        if (!empty($data['branch'])) {
            $branch = Branch::firstOrCreate(
                ['name' => $data['branch']],
                ['status' => 'active']
            );
        }

        // Find existing employee or create new one
        $pin = $data['pin'] ?? $data['employee_id'];
        $employee = Employee::where('pin', $pin)->orWhere('employee_id', $data['employee_id'])->first();

        $nameEn = $data['name_en'] ?? $data['first_name'] ?? null;
        $nameBn = $data['name_bn'] ?? null;

        if ($employee) {
            // Update existing employee
            $employee->pin = $pin;
            $employee->biometric_id = $data['biometric_id'] ?? $employee->biometric_id;
            if ($nameEn) {
                $employee->name_en = $nameEn;
                $employee->first_name = $nameEn; // legacy required column
            }
            if ($nameBn) {
                $employee->name_bn = $nameBn;
            }
            $employee->last_name = $data['last_name'] ?? $employee->last_name;
            $employee->email = $data['email'] ?? $employee->email;
            $employee->phone = $data['phone'] ?? $employee->phone;
            $employee->department_id = $department ? $department->id : $employee->department_id;
            $employee->designation_id = $designation ? $designation->id : $employee->designation_id;
            $employee->joining_designation_id = $designation ? $designation->id : $employee->joining_designation_id;
            $employee->last_designation_id = $designation ? $designation->id : $employee->last_designation_id;
            $employee->current_branch_id = $branch ? $branch->id : $employee->current_branch_id;

            if (isset($data['joining_date'])) {
                $employee->joining_date = $data['joining_date'];
            }
            if (isset($data['confirmation_date'])) {
                $employee->confirmation_date = $data['confirmation_date'];
            }

            if (isset($data['status'])) {
                $employee->status = $data['status'];
            }

            $employee->save();

            return [
                'status' => 'updated',
                'employee' => $employee
            ];
        } else {
            // Create new employee
            $employeeData = [
                'employee_id' => $data['employee_id'],
                'pin' => $pin,
                'biometric_id' => $data['biometric_id'] ?? null,
                'name_en' => $nameEn,
                'name_bn' => $nameBn,
                'first_name' => $nameEn ?? $data['employee_id'],
                'last_name' => $data['last_name'] ?? '',
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'department_id' => $department ? $department->id : null,
                'designation_id' => $designation ? $designation->id : null,
                'joining_designation_id' => $designation ? $designation->id : null,
                'last_designation_id' => $designation ? $designation->id : null,
                'current_branch_id' => $branch ? $branch->id : null,
                'status' => $data['status'] ?? 'active',
            ];

            if (isset($data['joining_date'])) {
                $employeeData['joining_date'] = $data['joining_date'];
            }
            if (isset($data['confirmation_date'])) {
                $employeeData['confirmation_date'] = $data['confirmation_date'];
            }

            $employee = Employee::create($employeeData);

            return [
                'status' => 'created',
                'employee' => $employee
            ];
        }
    }
}
