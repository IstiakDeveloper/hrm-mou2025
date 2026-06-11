import * as React from "react";
import {
  format,
  isAfter,
  isBefore,
  isMatch,
  isValid,
  parse,
  startOfDay,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Bangladesh-style: day–month–year (e.g. 13-05-2026). */
const DISPLAY_FORMAT = "dd-MM-yyyy" as const;

const PARSE_FORMATS = ["dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd"] as const;

function tryParseDateString(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const fmt of PARSE_FORMATS) {
    if (!isMatch(trimmed, fmt)) continue;
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

interface DatePickerProps {
  selected?: Date | null;
  onSelect: (date: Date | null) => void;
  placeholderText?: string;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
  className?: string;
}

export function DatePicker({
  selected,
  onSelect,
  placeholderText = "DD-MM-YYYY",
  minDate,
  maxDate,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() =>
    selected ? format(selected, DISPLAY_FORMAT) : ""
  );
  const [invalid, setInvalid] = React.useState(false);

  React.useEffect(() => {
    if (selected) {
      setInputValue(format(selected, DISPLAY_FORMAT));
    } else {
      setInputValue("");
    }
    setInvalid(false);
  }, [selected]);

  const isInRange = React.useCallback(
    (d: Date) => {
      const day = startOfDay(d);
      if (minDate && isBefore(day, startOfDay(minDate))) return false;
      if (maxDate && isAfter(day, startOfDay(maxDate))) return false;
      return true;
    },
    [minDate, maxDate]
  );

  const commitInput = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onSelect(null);
      setInvalid(false);
      return;
    }
    const parsed = tryParseDateString(trimmed);
    if (!parsed || !isInRange(parsed)) {
      setInvalid(true);
      if (selected) {
        setInputValue(format(selected, DISPLAY_FORMAT));
      } else {
        setInputValue("");
      }
      return;
    }
    setInvalid(false);
    onSelect(parsed);
    setInputValue(format(parsed, DISPLAY_FORMAT));
  }, [inputValue, isInRange, onSelect, selected]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      onSelect(null);
      setInputValue("");
      setOpen(false);
      return;
    }
    if (!isInRange(date)) return;
    onSelect(date);
    setInputValue(format(date, DISPLAY_FORMAT));
    setInvalid(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <Input
          id={id}
          value={inputValue}
          placeholder={placeholderText}
          aria-invalid={invalid}
          className={cn("pr-10 h-8.5 text-xs bg-white", invalid && "border-destructive", className)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInvalid(false);
          }}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="absolute right-0 top-0 h-8.5 w-8.5 shrink-0 px-0 text-muted-foreground hover:text-foreground"
            aria-label="Open calendar"
            onMouseDown={(e) => e.preventDefault()}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-[min(19rem,calc(100vw-1rem))] p-0"
        align="start"
        collisionPadding={8}
      >
        <Calendar
          mode="single"
          selected={selected || undefined}
          onSelect={handleCalendarSelect}
          initialFocus
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}
