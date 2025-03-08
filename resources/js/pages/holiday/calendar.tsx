import React, { useState } from 'react';
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
  Plus
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

  const handleFilterChange = () => {
    router.get(route('holidays.calendar'), {
      year: selectedYear,
      month: selectedMonth
    }, { preserveState: true });
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

    router.get(route('holidays.calendar'), {
      year: newYear,
      month: newMonth
    }, { preserveState: true });
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

    router.get(route('holidays.calendar'), {
      year: newYear,
      month: newMonth
    }, { preserveState: true });
  };

  // Create a proper date array for the calendar
  const calendarStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
  const monthStart = calendarStart;
  const monthEnd = endOfMonth(monthStart);

  // Create a map of holidays by date string for quick lookup
  const holidayMap: Record<string, Holiday[]> = {};
  calendarData.forEach(day => {
    holidayMap[day.date] = day.holidays;
  });

  // Get days of the week (starting with Sunday)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Determine the first day of the month's weekday (0-6, where 0 is Sunday)
  const firstDayOfMonth = monthStart.getDay();

  // Calculate days from previous month to show
  const daysFromPreviousMonth = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(-i);
    return date;
  }).reverse();

  // Calculate how many days from next month we need to show to complete the grid
  const totalDaysToShow = Math.ceil((daysInMonth.length + firstDayOfMonth) / 7) * 7;
  const daysFromNextMonth = Array.from(
    { length: totalDaysToShow - (daysInMonth.length + firstDayOfMonth) },
    (_, i) => {
      const date = new Date(monthEnd);
      date.setDate(monthEnd.getDate() + i + 1);
      return date;
    }
  );

  // Combine all days for the calendar view
  const allCalendarDays = [...daysFromPreviousMonth, ...daysInMonth, ...daysFromNextMonth];

  // Group calendar days into weeks
  const calendarWeeks: Date[][] = [];
  for (let i = 0; i < allCalendarDays.length; i += 7) {
    calendarWeeks.push(allCalendarDays.slice(i, i + 7));
  }

  const currentMonthName = months.find(m => m.value === parseInt(selectedMonth))?.label || '';

  return (
    <Layout>
      <Head title="Holiday Calendar" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="mt-1 text-gray-500">
              View and manage company holidays in calendar format
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.get(route('holidays.index'))}>
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
            <Button onClick={() => router.get(route('holidays.create'))}>
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          </div>
        </div>

        {/* Month/Year Navigation */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Calendar View
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateToPreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex space-x-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={(value) => {
                      setSelectedMonth(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Select month" />
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
                    onValueChange={(value) => {
                      setSelectedYear(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue placeholder="Select year" />
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
                  size="icon"
                  onClick={navigateToNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {currentMonthName} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border">
              {/* Calendar header - days of week */}
              <div className="grid grid-cols-7 bg-muted/50">
                {daysOfWeek.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      "px-2 py-3 text-center text-sm font-medium border-b",
                      i === 0 || i === 6 ? "text-rose-500" : "text-foreground"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 divide-x divide-y">
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
                            "min-h-32 p-2 relative",
                            !isCurrentMonth && "bg-muted/40 text-muted-foreground",
                            isWeekendDay && isCurrentMonth && "bg-muted/20",
                            holidays.length > 0 && isCurrentMonth && "bg-blue-50/50"
                          )}
                        >
                          <div className={cn(
                            "text-right mb-1 flex justify-end",
                          )}>
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 text-center text-sm font-medium rounded-full",
                              isCurrentDay && "bg-primary text-primary-foreground",
                              holidays.length > 0 && isCurrentMonth && !isCurrentDay && "bg-blue-100 text-blue-800",
                              !isCurrentMonth && "text-muted-foreground"
                            )}>
                              {date.getDate()}
                            </span>
                          </div>

                          {/* Holiday items */}
                          {isCurrentMonth && (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {holidays.map((holiday) => (
                                <TooltipProvider key={holiday.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "py-1 px-2 rounded text-xs font-medium truncate",
                                          holiday.is_recurring
                                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                                            : "bg-blue-100 text-blue-800 border border-blue-200"
                                        )}
                                      >
                                        {holiday.title}
                                        {holiday.is_recurring && (
                                          <Badge variant="outline" className="ml-1 text-[0.6rem] py-0 h-3 bg-purple-50">
                                            R
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        <div className="font-medium">{holiday.title}</div>
                                        {holiday.description && (
                                          <div className="text-sm mt-1">{holiday.description}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {holiday.is_recurring ? "Recurring holiday" : "One-time holiday"}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
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
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-muted-foreground bg-muted/20 p-4 rounded-md">
          <div className="font-medium mr-2">Legend:</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-2"></div>
              <span>Holiday Date</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200 mr-2"></div>
              <span>One-time Holiday</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200 mr-2"></div>
              <span>Recurring Holiday</span>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="text-[0.6rem] py-0 h-3 bg-purple-50 mr-2">
                R
              </Badge>
              <span>Recurring Indicator</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
