import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    List,
    Plus,
    RefreshCw,
    Sparkles,
    CalendarRange,
} from 'lucide-react';
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default function HolidayCalendar({ calendarData, year, month, years, months }: CalendarProps) {
    const [selectedYear, setSelectedYear] = useState(year.toString());
    const [selectedMonth, setSelectedMonth] = useState(month.toString());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedYear(year.toString());
        setSelectedMonth(month.toString());
    }, [year, month]);

    const navigateToDate = (newYear: number, newMonth: number) => {
        setIsLoading(true);
        const url = new URL(window.location.origin + '/holidays/calendar');
        url.searchParams.set('year', newYear.toString());
        url.searchParams.set('month', newMonth.toString());
        router.get(url.pathname + url.search, {}, {
            preserveState: false,
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
        });
    };

    const handleYearChange = (newYear: string) => {
        setSelectedYear(newYear);
        navigateToDate(parseInt(newYear, 10), parseInt(selectedMonth, 10));
    };

    const handleMonthChange = (newMonth: string) => {
        setSelectedMonth(newMonth);
        navigateToDate(parseInt(selectedYear, 10), parseInt(newMonth, 10));
    };

    const navigateToPreviousMonth = () => {
        let y = parseInt(selectedYear, 10);
        let m = parseInt(selectedMonth, 10) - 1;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        setSelectedYear(y.toString());
        setSelectedMonth(m.toString());
        navigateToDate(y, m);
    };

    const navigateToNextMonth = () => {
        let y = parseInt(selectedYear, 10);
        let m = parseInt(selectedMonth, 10) + 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        setSelectedYear(y.toString());
        setSelectedMonth(m.toString());
        navigateToDate(y, m);
    };

    const navigateToToday = () => {
        const t = new Date();
        const cy = t.getFullYear();
        const cm = t.getMonth() + 1;
        setSelectedYear(cy.toString());
        setSelectedMonth(cm.toString());
        navigateToDate(cy, cm);
    };

    const monthStart = startOfMonth(new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10) - 1));
    const monthEnd = endOfMonth(monthStart);

    const holidayMap: Record<string, Holiday[]> = {};
    calendarData.forEach((day) => {
        holidayMap[day.date] = day.holidays;
    });

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
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
        },
    );

    const allCalendarDays = [...daysFromPreviousMonth, ...daysInMonth, ...daysFromNextMonth];
    const calendarWeeks: Date[][] = [];
    for (let i = 0; i < allCalendarDays.length; i += 7) {
        calendarWeeks.push(allCalendarDays.slice(i, i + 7));
    }

    const currentMonthName = months.find((m) => m.value === parseInt(selectedMonth, 10))?.label || '';
    const totalHolidays = calendarData.reduce((sum, day) => sum + day.holidays.length, 0);

    return (
        <Layout>
            <Head title={`Holiday Calendar — ${currentMonthName} ${selectedYear}`} />

            <div className="mx-auto max-w-4xl px-3 pb-6 pt-2 md:px-4 md:pt-3">
                {/* Page intro */}
                <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                            <CalendarRange className="h-3 w-3" />
                            Schedule
                        </div>
                        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Holiday calendar</h1>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
                            <span className="font-medium text-zinc-700">{totalHolidays}</span> marked days in{' '}
                            <span className="text-zinc-700">{currentMonthName}</span> {selectedYear}. Weekends are tinted;
                            tooltips show details.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full border-zinc-200 bg-white px-4 text-xs font-medium shadow-sm"
                            onClick={() => router.get('/holidays')}
                        >
                            <List className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                            List view
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full border-zinc-200 bg-white px-4 text-xs font-medium shadow-sm"
                            onClick={navigateToToday}
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                            Today
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-9 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700"
                            onClick={() => router.get('/holidays/create')}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add holiday
                        </Button>
                    </div>
                </header>

                {/* Calendar surface */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(15,23,42,0.18)]">
                    {/* Month toolbar */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-4 py-3.5 text-white md:px-5 md:py-4">
                        <div
                            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
                            aria-hidden
                        />
                        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                                    <CalendarDays className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">Month</p>
                                    <p className="text-lg font-semibold tracking-tight md:text-xl">
                                        {currentMonthName} <span className="font-normal text-emerald-200">{selectedYear}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center rounded-xl bg-black/20 p-0.5 ring-1 ring-white/10 backdrop-blur-sm">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isLoading}
                                        className="h-8 w-8 rounded-lg text-white hover:bg-white/15"
                                        onClick={navigateToPreviousMonth}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isLoading}
                                        className="h-8 w-8 rounded-lg text-white hover:bg-white/15"
                                        onClick={navigateToNextMonth}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Select value={selectedMonth} onValueChange={handleMonthChange} disabled={isLoading}>
                                    <SelectTrigger className="h-9 w-[8.5rem] rounded-xl border-0 bg-white/15 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm [&>svg]:text-emerald-200">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((mo) => (
                                            <SelectItem key={mo.value} value={mo.value.toString()}>
                                                {mo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedYear} onValueChange={handleYearChange} disabled={isLoading}>
                                    <SelectTrigger className="h-9 w-[5.25rem] rounded-xl border-0 bg-white/15 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm [&>svg]:text-emerald-200">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((yo) => (
                                            <SelectItem key={yo} value={yo.toString()}>
                                                {yo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="relative mt-2 flex items-center gap-2 text-xs text-emerald-100">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Updating…
                            </div>
                        )}
                    </div>

                    {/* Weekday strip */}
                    <div className="grid grid-cols-7 gap-1.5 border-b border-zinc-100 bg-zinc-50/90 px-2 py-2 md:px-3">
                        {WEEKDAYS.map((d, i) => (
                            <div
                                key={d}
                                className={cn(
                                    'text-center text-[11px] font-semibold uppercase tracking-wider md:text-xs',
                                    i === 0 || i === 6 ? 'text-rose-500' : 'text-zinc-500',
                                )}
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    <TooltipProvider delayDuration={200}>
                        {/* Day tiles — gap layout, no heavy cell borders */}
                        <div className="grid grid-cols-7 gap-1.5 bg-zinc-100/50 p-2 md:gap-2 md:p-3">
                            {calendarWeeks.map((week, weekIndex) => (
                                <React.Fragment key={weekIndex}>
                                    {week.map((date, dayIndex) => {
                                        const dateString = format(date, 'yyyy-MM-dd');
                                        const holidays = holidayMap[dateString] || [];
                                        const inMonth = isSameMonth(date, monthStart);
                                        const today = isToday(date);
                                        const weekend = isWeekend(date);

                                        return (
                                            <div
                                                key={`${weekIndex}-${dayIndex}`}
                                                className={cn(
                                                    'group flex min-h-[3.25rem] sm:min-h-[4.5rem] md:min-h-[5.25rem] flex-col rounded-xl border p-1 sm:p-1.5 md:p-2 shadow-xs transition-all duration-150',
                                                    inMonth
                                                        ? 'border-zinc-200/80 bg-white hover:border-emerald-200/80 hover:shadow-md'
                                                        : 'border-transparent bg-zinc-50/80 text-zinc-400',
                                                    weekend && inMonth && 'bg-rose-50/40',
                                                    today &&
                                                        inMonth &&
                                                        'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-100/50',
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-0.5">
                                                    <span
                                                        className={cn(
                                                            'flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-[10px] sm:text-xs font-semibold tabular-nums',
                                                            today && inMonth && 'bg-emerald-600 text-white shadow-xs',
                                                            !today &&
                                                                inMonth &&
                                                                holidays.length > 0 &&
                                                                'bg-emerald-100 text-emerald-900',
                                                            !today && inMonth && holidays.length === 0 && 'text-zinc-700',
                                                            !inMonth && 'font-medium text-zinc-400',
                                                        )}
                                                    >
                                                        {date.getDate()}
                                                    </span>
                                                    {inMonth && holidays.length > 1 && (
                                                        <span className="rounded-md bg-zinc-900/90 px-1 py-0.5 text-[9px] font-bold tabular-nums text-white">
                                                            {holidays.length}
                                                        </span>
                                                    )}
                                                </div>

                                                {inMonth && holidays.length > 0 && (
                                                    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                                                        {holidays.slice(0, 2).map((h) => (
                                                            <Tooltip key={h.id}>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            'w-full truncate rounded-lg border-l-[3px] py-1 pl-1.5 pr-1 text-left text-[10px] font-medium leading-tight transition-colors md:text-[11px]',
                                                                            h.is_recurring
                                                                                ? 'border-teal-500 bg-teal-50/90 text-teal-950 hover:bg-teal-100'
                                                                                : 'border-emerald-500 bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100',
                                                                        )}
                                                                    >
                                                                        <span className="flex items-center gap-0.5">
                                                                            {h.is_recurring && (
                                                                                <Sparkles className="h-2.5 w-2.5 shrink-0 text-teal-600" />
                                                                            )}
                                                                            <span className="truncate">{h.title}</span>
                                                                        </span>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-xs border-zinc-200">
                                                                    <p className="font-semibold text-zinc-900">{h.title}</p>
                                                                    {h.description && (
                                                                        <p className="mt-1 text-xs text-zinc-600">{h.description}</p>
                                                                    )}
                                                                    <p className="mt-1.5 text-[11px] text-zinc-500">
                                                                        {h.is_recurring ? 'Repeats each year' : 'One-time holiday'}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                        {holidays.length > 2 && (
                                                            <p className="truncate pl-0.5 text-[9px] font-medium text-zinc-500">
                                                                +{holidays.length - 2} more
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </TooltipProvider>

                    {/* Legend */}
                    <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 bg-white px-3 py-2.5 md:px-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Legend</span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                            Today
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <span className="h-3 w-1 rounded-sm bg-emerald-500" />
                            Holiday
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <span className="h-3 w-1 rounded-sm bg-teal-500" />
                            Recurring
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <span className="h-2.5 w-2.5 rounded bg-rose-100 ring-1 ring-rose-200/80" />
                            Weekend
                        </span>
                    </footer>
                </div>
            </div>
        </Layout>
    );
}
