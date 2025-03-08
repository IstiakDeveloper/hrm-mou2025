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
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('holiday/index', [
            'holidays' => $holidays,
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
        $year = $request->year ?? Carbon::now()->year;
        $month = $request->month ?? Carbon::now()->month;

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $holidays = Holiday::whereBetween('date', [$startDate, $endDate])
            ->orWhere(function ($query) use ($month) {
                $query->where('is_recurring', true)
                    ->whereMonth('date', $month);
            })
            ->get();

        $calendarData = [];
        $currentDate = $startDate->copy();

        while ($currentDate <= $endDate) {
            $day = $currentDate->day;
            $dayHolidays = $holidays->filter(function ($holiday) use ($currentDate) {
                if ($holiday->is_recurring) {
                    return $holiday->date->month == $currentDate->month &&
                        $holiday->date->day == $currentDate->day;
                } else {
                    return $holiday->date->format('Y-m-d') == $currentDate->format('Y-m-d');
                }
            });

            $calendarData[] = [
                'date' => $currentDate->format('Y-m-d'),
                'day' => $day,
                'isWeekend' => in_array($currentDate->dayOfWeek, [0, 6]), // 0 = Sunday, 6 = Saturday
                'holidays' => $dayHolidays->values()->all(),
            ];

            $currentDate->addDay();
        }

        return Inertia::render('holiday/calendar', [
            'calendarData' => $calendarData,
            'year' => $year,
            'month' => $month,
            'years' => range(Carbon::now()->year - 1, Carbon::now()->year + 2),
            'months' => array_map(function ($m) {
                return [
                    'value' => $m,
                    'label' => Carbon::create(null, $m)->format('F'),
                ];
            }, range(1, 12)),
        ]);
    }
}
