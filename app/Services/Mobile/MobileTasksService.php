<?php

namespace App\Services\Mobile;

use App\Models\User;

class MobileTasksService
{
    public function __construct(
        private readonly MobileLeaveService $leave,
        private readonly MobileMovementService $movement,
    ) {}

    /**
     * Unified actionable inbox for field MVP modules currently on mobile.
     *
     * @return array<string, mixed>
     */
    public function inbox(User $user): array
    {
        $mine = [];
        $reviews = [];

        if ($user->employee_id) {
            foreach ($this->leave->listMine($user, 'pending')['data'] as $row) {
                $mine[] = [
                    'module' => 'leave',
                    'id' => $row['id'],
                    'title' => ($row['leave_type_name'] ?? 'Leave').' application',
                    'subtitle' => ($row['start_date'] ?? '').' → '.($row['end_date'] ?? ''),
                    'status' => $row['status'],
                    'deep_link' => '/leave/applications/'.$row['id'],
                ];
            }

            foreach ($this->movement->listMine($user, 'active')['data'] as $row) {
                $mine[] = [
                    'module' => 'movement',
                    'id' => $row['id'],
                    'title' => 'Active movement',
                    'subtitle' => ($row['destination'] ?? '').' · '.($row['purpose'] ?? ''),
                    'status' => $row['status'],
                    'deep_link' => '/movements/'.$row['id'],
                ];
            }
        }

        if ($user->hasPermission('leave-applications.approve') || $user->isSuperAdmin()) {
            foreach ($this->leave->listPendingForReview($user)['data'] as $row) {
                $reviews[] = [
                    'module' => 'leave',
                    'id' => $row['id'],
                    'title' => ($row['employee_name'] ?? 'Employee').' — '.($row['leave_type_name'] ?? 'Leave'),
                    'subtitle' => ($row['start_date'] ?? '').' → '.($row['end_date'] ?? ''),
                    'status' => $row['status'],
                    'deep_link' => '/leave/applications/'.$row['id'],
                ];
            }
        }

        if ($user->hasPermission('movements.view') || $user->isSuperAdmin()) {
            foreach ($this->movement->listTeam($user, 'active')['data'] as $row) {
                $reviews[] = [
                    'module' => 'movement',
                    'id' => $row['id'],
                    'title' => ($row['employee_name'] ?? 'Employee').' movement',
                    'subtitle' => ($row['destination'] ?? ''),
                    'status' => $row['status'],
                    'deep_link' => '/movements/'.$row['id'],
                ];
            }
        }

        return [
            'mine' => $mine,
            'reviews' => $reviews,
            'counts' => [
                'mine' => count($mine),
                'reviews' => count($reviews),
            ],
        ];
    }
}
