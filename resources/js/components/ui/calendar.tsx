import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showYearNavigation?: boolean;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showYearNavigation = false,
  selected,
  onSelect,
  defaultMonth,
  ...props
}: CalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState<Date>(defaultMonth || today)

  // Generate year options (120 years back from current year)
  const currentYear = today.getFullYear()
  const years = React.useMemo(() =>
    Array.from({ length: 120 }, (_, i) => currentYear - i),
    [currentYear]
  )

  // Generate month options
  const months = React.useMemo(() => [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ], [])

  // Update current month when selected date changes
  React.useEffect(() => {
    if (selected && !Array.isArray(selected)) {
      setCurrentMonth(selected)
    }
  }, [selected])

  // Update current month when month changes
  React.useEffect(() => {
    if (props.onMonthChange) {
      props.onMonthChange(currentMonth)
    }
  }, [currentMonth, props])

  // Custom components for navigation
  const CustomCaption = React.useCallback(({ displayMonth }: { displayMonth: Date }) => {
    return (
      <div className="flex justify-center pt-1 relative items-center w-full">
        <div className="flex flex-col items-center w-full">
          {/* Navigation buttons row */}
          <div className="flex justify-between w-full px-1 mb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newDate = new Date(displayMonth)
                  newDate.setFullYear(displayMonth.getFullYear() - 10)
                  setCurrentMonth(newDate)
                }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
                title="Go back 10 years"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(displayMonth)
                  newDate.setMonth(displayMonth.getMonth() - 1)
                  setCurrentMonth(newDate)
                }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newDate = new Date(displayMonth)
                  newDate.setMonth(displayMonth.getMonth() + 1)
                  setCurrentMonth(newDate)
                }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(displayMonth)
                  newDate.setFullYear(displayMonth.getFullYear() + 10)
                  setCurrentMonth(newDate)
                }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
                title="Go forward 10 years"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Year/Month selectors row */}
          <div className="flex gap-1 justify-center">
            <Select
              value={displayMonth.getFullYear().toString()}
              onValueChange={(value) => {
                const newDate = new Date(displayMonth)
                newDate.setFullYear(parseInt(value))
                setCurrentMonth(newDate)
              }}
            >
              <SelectTrigger className="h-7 w-20 text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.slice(0, 30).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(displayMonth.getMonth() + 1).toString()}
              onValueChange={(value) => {
                const newDate = new Date(displayMonth)
                newDate.setMonth(parseInt(value) - 1)
                setCurrentMonth(newDate)
              }}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }, [buttonVariants, months, years])

  const defaultNav = {
    IconLeft: (props: any) => <ChevronLeft className="h-4 w-4" {...props} />,
    IconRight: (props: any) => <ChevronRight className="h-4 w-4" {...props} />,
  }

  return (
    <DayPicker
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 mx-auto", className)}
      classNames={{
        months: "flex justify-center",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: showYearNavigation ? "hidden" : "text-sm font-medium",
        nav: showYearNavigation ? "hidden" : "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2 justify-center",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        ...(showYearNavigation ? { Caption: CustomCaption } : defaultNav),
        ...props.components
      }}
      selected={selected}
      onSelect={onSelect}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
