<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MonthlyListFilters
{
    /** Apply the application month and remember this list's filters for return navigation. */
    public static function apply(Request $request, Builder $query, string $route, array $keys): void
    {
        $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $month = $request->query('month') ?: now()->format('Y-m');
        $request->query->set('month', $month);

        $start = Carbon::createFromFormat('!Y-m', $month);
        $column = $query->getModel()->qualifyColumn('created_at');
        $query->where($column, '>=', $start->toDateTimeString())
            ->where($column, '<', $start->copy()->addMonth()->toDateTimeString());

        $request->session()->put('monthly_lists.'.$route, $request->only([
            ...$keys, 'month', 'page',
        ]));
    }

    public static function returnUrl(Request $request, string $route): string
    {
        return route($route, $request->session()->get('monthly_lists.'.$route, [
            'month' => now()->format('Y-m'),
        ]));
    }
}
