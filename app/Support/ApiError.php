<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

final class ApiError
{
    /**
     * @param  array<string, mixed>|null  $details
     */
    public static function make(
        string $code,
        string $message,
        int $status,
        ?array $details = null,
        bool $retryable = false,
    ): JsonResponse {
        return response()->json([
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
                'retryable' => $retryable,
            ],
        ], $status);
    }
}
