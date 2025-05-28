import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend } from 'date-fns';

interface Holiday {
  id: number;
  title: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
  applicable_branches: string | null;
}

interface CalendarDay {
  date: string;
  day: number;
  isWeekend: boolean;
  holidays: Holiday[];
}

interface Month {
  value: number;
  label: string;
}

interface CalendarProps {
  calendarData: CalendarDay[];
  year: number;
  month: number;
  years: number[];
  months: Month[];
}

export default function HolidayCalendar({ calendarData, year, month, years, months }: CalendarProps) {
  const [selectedYear, setSelectedYear] = useState(year.toString());
  const [selectedMonth, setSelectedMonth] = useState(month.toString());
  const [isLoading, setIsLoading] = useState(false);

  // Update state when props change
  useEffect(() => {
    setSelectedYear(year.toString());
    setSelectedMonth(month.toString());
  }, [year, month]);

  const navigateToDate = (newYear: number, newMonth: number) => {
    setIsLoading(true);

    // Use window.location for proper Laravel route handling
    const url = new URL(window.location.origin + '/holidays/calendar');
    url.searchParams.set('year', newYear.toString());
    url.searchParams.set('month', newMonth.toString());

    router.get(url.pathname + url.search, {}, {
      preserveState: false,
      preserveScroll: true,
      onFinish: () => setIsLoading(false)
    });
  };

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    navigateToDate(parseInt(newYear), parseInt(selectedMonth));
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    navigateToDate(parseInt(selectedYear), parseInt(newMonth));
  };

  const navigateToPreviousMonth = () => {
    let newYear = parseInt(selectedYear);
    let newMonth = parseInt(selectedMonth) - 1;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedYear(newYear.toString());
    setSelectedMonth(newMonth.toString());
    navigateToDate(newYear, newMonth);
  };

  const navigateToNextMonth = () => {
    let newYear = parseInt(selectedYear);
    let newMonth = parseInt(selectedMonth) + 1;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedYear(newYear.toString());
    setSelectedMonth(newMonth.toString());
    navigateToDate(newYear, newMonth);
  };

  const navigateToToday = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    setSelectedYear(currentYear.toString());
    setSelectedMonth(currentMonth.toString());
    navigateToDate(currentYear, currentMonth);
  };

  // Create calendar data
  const calendarStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
  const monthStart = calendarStart;
  const monthEnd = endOfMonth(monthStart);

  // Create holiday map for quick lookup
  const holidayMap: Record<string, Holiday[]> = {};
  calendarData.forEach(day => {
    holidayMap[day.date] = day.holidays;
  });

  // Days of the week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate calendar grid
  const firstDayOfMonth = monthStart.getDay();
  const daysFromPreviousMonth = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(-i);
    return date;
  }).reverse();

  const totalDaysToShow = Math.ceil((daysInMonth.length + firstDayOfMonth) / 7) * 7;
  const daysFromNextMonth = Array.from(
    { length: totalDaysToShow - (daysInMonth.length + firstDayOfMonth) },
    (_, i) => {
      const date = new Date(monthEnd);
      date.setDate(monthEnd.getDate() + i + 1);
      return date;
    }
  );

  const allCalendarDays = [...daysFromPreviousMonth, ...daysInMonth, ...daysFromNextMonth];
  const calendarWeeks: Date[][] = [];
  for (let i = 0; i < allCalendarDays.length; i += 7) {
    calendarWeeks.push(allCalendarDays.slice(i, i + 7));
  }

  const currentMonthName = months.find(m => m.value === parseInt(selectedMonth))?.label || '';
  const totalHolidays = calendarData.reduce((sum, day) => sum + day.holidays.length, 0);

  return (
    <Layout>
      <Head title={`Holiday Calendar - ${currentMonthName} ${selectedYear}`} />

      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Holiday Calendar</h1>
            <p className="text-gray-600">
              {totalHolidays} holidays in {currentMonthName} {selectedYear}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => router.get('/holidays')}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List View
            </Button>
            <Button
              variant="outline"
              onClick={navigateToToday}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Today
            </Button>
            <Button
              onClick={() => router.get('/holidays/create')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          </div>
        </div>

        {/* Calendar Card */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Calendar View</CardTitle>
                  <CardDescription className="text-gray-600">
                    {currentMonthName} {selectedYear}
                  </CardDescription>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToPreviousMonth}
                  disabled={isLoading}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={handleMonthChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((monthOption) => (
                        <SelectItem key={monthOption.value} value={monthOption.value.toString()}>
                          {monthOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedYear}
                    onValueChange={handleYearChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((yearOption) => (
                        <SelectItem key={yearOption} value={yearOption.toString()}>
                          {yearOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToNextMonth}
                  disabled={isLoading}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading calendar data...
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-hidden rounded-b-lg">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {daysOfWeekShort.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      "px-4 py-4 text-center font-semibold text-sm border-r last:border-r-0",
                      i === 0 || i === 6 ? "text-red-600" : "text-gray-700"
                    )}
                  >
                    <div className="hidden sm:block">{daysOfWeek[i]}</div>
                    <div className="sm:hidden">{day}</div>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarWeeks.map((week, weekIndex) => (
                  <React.Fragment key={weekIndex}>
                    {week.map((date, dayIndex) => {
                      const dateString = format(date, 'yyyy-MM-dd');
                      const holidays = holidayMap[dateString] || [];
                      const isCurrentMonth = isSameMonth(date, monthStart);
                      const isCurrentDay = isToday(date);
                      const isWeekendDay = isWeekend(date);

                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={cn(
                            "min-h-32 lg:min-h-36 p-3 border-r last:border-r-0 border-b last:border-b-0 relative transition-colors hover:bg-gray-50",
                            !isCurrentMonth && "bg-gray-50/70 text-gray-400",
                            isWeekendDay && isCurrentMonth && "bg-red-50/30",
                            holidays.length > 0 && isCurrentMonth && "bg-blue-50/40"
                          )}
                        >
                          {/* Date Number */}
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-full transition-colors",
                              isCurrentDay && "bg-blue-600 text-white shadow-md",
                              holidays.length > 0 && isCurrentMonth && !isCurrentDay && "bg-blue-100 text-blue-800",
                              !isCurrentMonth && "text-gray-400",
                              isCurrentMonth && !isCurrentDay && holidays.length === 0 && "hover:bg-gray-100"
                            )}>
                              {date.getDate()}
                            </span>

                            {holidays.length > 0 && isCurrentMonth && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {holidays.length}
                              </Badge>
                            )}
                          </div>

                          {/* Holiday List */}
                          {isCurrentMonth && holidays.length > 0 && (
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {holidays.slice(0, 3).map((holiday) => (
                                <TooltipProvider key={holiday.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "py-1.5 px-2 rounded-md text-xs font-medium truncate cursor-pointer transition-colors",
                                          holiday.is_recurring
                                            ? "bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200"
                                            : "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                                        )}
                                      >
                                        <div className="flex items-center gap-1">
                                          <span className="truncate">{holiday.title}</span>
                                          {holiday.is_recurring && (
                                            <Badge variant="outline" className="text-[0.6rem] py-0 h-4 bg-purple-50 border-purple-300">
                                              R
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div>
                                        <div className="font-semibold text-sm">{holiday.title}</div>
                                        {holiday.description && (
                                          <div className="text-xs mt-1 text-gray-600">{holiday.description}</div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          {holiday.is_recurring ? "Recurring holiday" : "One-time holiday"}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}

                              {holidays.length > 3 && (
                                <div className="text-xs text-gray-500 px-2 py-1">
                                  +{holidays.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-6 border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <h3 className="font-semibold text-gray-900">Legend:</h3>
              <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                  <span className="text-gray-700">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                  <span className="text-gray-700">One-time Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200"></div>
                  <span className="text-gray-700">Recurring Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
                  <span className="text-gray-700">Weekend</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[0.6rem] py-0 h-4 bg-purple-50 border-purple-300">
                    R
                  </Badge>
                  <span className="text-gray-700">Recurring</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
