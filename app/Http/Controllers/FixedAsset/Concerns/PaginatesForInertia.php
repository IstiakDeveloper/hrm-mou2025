<?php

namespace App\Http\Controllers\FixedAsset\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

trait PaginatesForInertia
{
    /**
     * @return array{data: mixed, meta: array<string, mixed>, links: array<string, mixed>}
     */
    protected function inertiaPagination(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'links' => $paginator->linkCollection()->toArray(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ];
    }

    protected function resolvePerPage(mixed $perPage, int $default = 25): int
    {
        $perPage = (int) $perPage;

        return in_array($perPage, [10, 25, 50, 100, 200, 500], true) ? $perPage : $default;
    }
}
