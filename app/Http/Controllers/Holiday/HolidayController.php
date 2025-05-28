<?php

namespace App\Http\Controllers\Holiday;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HolidayController extends Controller
{
    /**
     * Display a listing of holidays.
     */
    public function index(Request $request)
    {
        $year = $request->year ?? Carbon::now()->year;

        $holidays = Holiday::when($request->year, function ($query, $year) {
            $query->whereYear('date', $year);
        })
            ->when($request->search, function ($query, $search) {
                $query->where('title', 'like', "%{$search}%");
            })
            ->orderBy('date')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('holiday/index', [
            'holidays' => [
                'data' => $holidays->items(),
                'meta' => [
                    'current_page' => $holidays->currentPage(),
                    'from' => $holidays->firstItem(),
                    'last_page' => $holidays->lastPage(),
                    'links' => $holidays->linkCollection()->toArray(),
                    'path' => $holidays->path(),
                    'per_page' => $holidays->perPage(),
                    'to' => $holidays->lastItem(),
                    'total' => $holidays->total(),
                ],
                'links' => [
                    'first' => $holidays->url(1),
                    'last' => $holidays->url($holidays->lastPage()),
                    'prev' => $holidays->previousPageUrl(),
                    'next' => $holidays->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['year', 'search']),
            'year' => $year,
            'years' => range(Carbon::now()->year - 1, Carbon::now()->year + 2),
        ]);
    }

    /**
     * Show form to create a new holiday.
     */
    public function create()
    {
        $branches = Branch::all();

        return Inertia::render('holiday/create', [
            'branches' => $branches,
        ]);
    }

    /**
     * Store a newly created holiday.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'is_recurring' => 'boolean',
            'applicable_branches' => 'nullable|array',
            'applicable_branches.*' => 'exists:branches,id',
        ]);

        $data = $request->all();

        // Convert applicable branches to JSON
        if (isset($data['applicable_branches'])) {
            $data['applicable_branches'] = json_encode($data['applicable_branches']);
        }

        Holiday::create($data);

        return redirect()->route('holidays.index')
            ->with('success', 'Holiday created successfully.');
    }

    /**
     * Show form to edit a holiday.
     */
    public function edit(Holiday $holiday)
    {
        $holiday->applicable_branches = json_decode($holiday->applicable_branches);
        $branches = Branch::all();

        return Inertia::render('holiday/edit', [
            'holiday' => $holiday,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified holiday.
     */
    public function update(Request $request, Holiday $holiday)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'is_recurring' => 'boolean',
            'applicable_branches' => 'nullable|array',
            'applicable_branches.*' => 'exists:branches,id',
        ]);

        $data = $request->all();

        // Convert applicable branches to JSON
        if (isset($data['applicable_branches'])) {
            $data['applicable_branches'] = json_encode($data['applicable_branches']);
        }

        $holiday->update($data);

        return redirect()->route('holidays.index')
            ->with('success', 'Holiday updated successfully.');
    }

    /**
     * Delete the specified holiday.
     */
    public function destroy(Holiday $holiday)
    {
        $holiday->delete();

        return redirect()->route('holidays.index')
            ->with('success', 'Holiday deleted successfully.');
    }

    /**
     * Display calendar view of holidays.
     */
    public function calendar(Request $request)
    {
        // Validate and get year/month
        $year = $request->input('year', Carbon::now()->year);
        $month = $request->input('month', Carbon::now()->month);

        // Ensure valid year and month
        $year = max(2020, min(2030, (int) $year));
        $month = max(1, min(12, (int) $month));

        // Create date range for the month
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Get holidays for the month
        $holidays = Holiday::where(function ($query) use ($startDate, $endDate, $month) {
            // Get holidays that fall within this month
            $query->whereBetween('date', [$startDate, $endDate])
                // OR get recurring holidays for this month (any year)
                ->orWhere(function ($subQuery) use ($month) {
                    $subQuery->where('is_recurring', true)
                        ->whereMonth('date', $month);
                });
        })
            ->orderBy('date')
            ->get();

        // Build calendar data
        $calendarData = [];
        $currentDate = $startDate->copy();

        while ($currentDate <= $endDate) {
            // Filter holidays for this specific date
            $dayHolidays = $holidays->filter(function ($holiday) use ($currentDate) {
                $holidayDate = Carbon::parse($holiday->date);

                if ($holiday->is_recurring) {
                    // For recurring holidays, match month and day
                    return $holidayDate->month == $currentDate->month &&
                        $holidayDate->day == $currentDate->day;
                } else {
                    // For one-time holidays, match exact date
                    return $holidayDate->isSameDay($currentDate);
                }
            });

            $calendarData[] = [
                'date' => $currentDate->format('Y-m-d'),
                'day' => $currentDate->day,
                'isWeekend' => $currentDate->isWeekend(),
                'holidays' => $dayHolidays->values()->map(function ($holiday) {
                    return [
                        'id' => $holiday->id,
                        'title' => $holiday->title,
                        'date' => $holiday->date->format('Y-m-d'),
                        'description' => $holiday->description,
                        'is_recurring' => $holiday->is_recurring,
                        'applicable_branches' => $holiday->applicable_branches,
                    ];
                })->toArray(),
            ];

            $currentDate->addDay();
        }

        // Generate year range
        $currentYear = Carbon::now()->year;
        $years = range($currentYear - 2, $currentYear + 3);

        // Generate months
        $months = collect(range(1, 12))->map(function ($monthNum) {
            return [
                'value' => $monthNum,
                'label' => Carbon::create(null, $monthNum)->format('F'),
            ];
        })->toArray();

        return Inertia::render('holiday/calendar', [
            'calendarData' => $calendarData,
            'year' => (int) $year,
            'month' => (int) $month,
            'years' => $years,
            'months' => $months,
            'totalHolidays' => $holidays->count(),
            'currentDate' => Carbon::now()->format('Y-m-d'),
        ]);
    }
}
