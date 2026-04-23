import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Show year/month dropdowns in the caption. */
  showYearNavigation?: boolean
  /** Unused legacy prop kept for backward compatibility with existing usages. */
  showManualInput?: boolean
  /** Legacy alias: adds a `before` matcher to `disabled`. */
  minDate?: Date
  /** Legacy alias: adds an `after` matcher to `disabled`. */
  maxDate?: Date
}

/**
 * Calendar component built on top of react-day-picker v9.
 *
 * Notes:
 * - react-day-picker v9 uses a new classNames API (months, month, month_caption,
 *   caption_label, nav, button_previous, button_next, month_grid, weekdays,
 *   weekday, week, day, day_button, selected, today, outside, disabled, hidden,
 *   range_start, range_middle, range_end).
 * - Legacy props (`minDate`, `maxDate`, `showYearNavigation`, `showManualInput`,
 *   `initialFocus`) are supported for backward compatibility.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showYearNavigation = false,
  showManualInput: _showManualInput,
  minDate,
  maxDate,
  disabled,
  captionLayout,
  startMonth,
  endMonth,
  initialFocus,
  autoFocus,
  components,
  ...props
}: CalendarProps) {
  const disabledWithRange = React.useMemo<Matcher | Matcher[] | undefined>(() => {
    const extra: Matcher[] = []
    if (minDate) extra.push({ before: minDate })
    if (maxDate) extra.push({ after: maxDate })
    if (extra.length === 0) return disabled
    if (disabled == null) return extra.length === 1 ? extra[0] : extra
    const base = Array.isArray(disabled) ? disabled : [disabled]
    return [...base, ...extra]
  }, [minDate, maxDate, disabled])

  const effectiveCaptionLayout = captionLayout ?? (showYearNavigation ? "dropdown" : "label")

  const today = new Date()
  const effectiveStartMonth =
    startMonth ?? (showYearNavigation ? new Date(today.getFullYear() - 120, 0, 1) : undefined)
  const effectiveEndMonth =
    endMonth ?? (showYearNavigation ? new Date(today.getFullYear() + 10, 11, 31) : undefined)

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 sm:p-3 w-full max-w-full", className)}
      captionLayout={effectiveCaptionLayout}
      startMonth={effectiveStartMonth}
      endMonth={effectiveEndMonth}
      autoFocus={autoFocus ?? initialFocus}
      disabled={disabledWithRange}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4 w-full",
        month: "flex flex-col gap-3 w-full min-w-0",
        month_caption: "flex justify-center pt-1 relative items-center h-9 px-10",
        caption_label: "text-sm font-medium",
        dropdowns: "flex items-center gap-2 text-sm font-medium flex-wrap justify-center",
        dropdown:
          "appearance-none bg-transparent rounded-md border px-2 py-1 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
        dropdown_root: "relative inline-flex items-center",
        nav: "flex items-center absolute inset-x-1 top-1 justify-between z-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-75 hover:opacity-100 pointer-events-auto"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-75 hover:opacity-100 pointer-events-auto"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-[repeat(7,minmax(2rem,1fr))] w-full",
        weekday:
          "text-muted-foreground font-normal text-[0.7rem] sm:text-[0.8rem] flex items-center justify-center py-1 min-w-0",
        week: "grid grid-cols-[repeat(7,minmax(2rem,1fr))] w-full mt-1 sm:mt-2",
        day: cn(
          "aspect-square text-center text-xs sm:text-sm p-0 relative min-w-0",
          "[&:has([aria-selected])]:bg-accent",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "w-full h-full p-0 font-normal aria-selected:opacity-100 rounded-md"
        ),
        range_start: "day-range-start rounded-l-md",
        range_end: "day-range-end rounded-r-md",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />
        },
        ...(components ?? {}),
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
