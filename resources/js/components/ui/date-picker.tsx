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
import { DISPLAY_DATE_FMT } from "@/lib/display-date";

const PARSE_FORMATS = [DISPLAY_DATE_FMT, "dd-MM-yyyy", "yyyy-MM-dd"] as const;

/** 05081999 → 05/08/1999 while typing. */
function maskDdMmYyyy(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function compactDigitsToDisplayDate(digits: string): string | null {
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function tryParseDateString(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = compactDigitsToDisplayDate(trimmed.replace(/\D/g, ""));
  const candidates = compact && compact !== trimmed ? [trimmed, compact] : [trimmed];

  for (const candidate of candidates) {
    for (const fmt of PARSE_FORMATS) {
      if (!isMatch(candidate, fmt)) continue;
      const parsed = parse(candidate, fmt, new Date());
      if (!isValid(parsed)) continue;
      if (format(parsed, fmt) !== candidate) continue;
      return parsed;
    }
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
  disabled?: boolean;
  /** Use inside Dialog/Modal — avoids focus trap conflicts */
  nested?: boolean;
}

export function DatePicker({
  selected,
  onSelect,
  placeholderText = "DD/MM/YYYY",
  minDate,
  maxDate,
  id,
  className,
  disabled,
  nested = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() =>
    selected ? format(selected, DISPLAY_DATE_FMT) : ""
  );
  const [invalid, setInvalid] = React.useState(false);

  React.useEffect(() => {
    if (selected) {
      setInputValue(format(selected, DISPLAY_DATE_FMT));
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
        setInputValue(format(selected, DISPLAY_DATE_FMT));
      } else {
        setInputValue("");
      }
      return;
    }
    setInvalid(false);
    onSelect(parsed);
    setInputValue(format(parsed, DISPLAY_DATE_FMT));
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
    setInputValue(format(date, DISPLAY_DATE_FMT));
    setInvalid(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={!nested}>
      <div className="relative w-full">
        <Input
          id={id}
          lang="en-GB"
          autoComplete="off"
          inputMode="numeric"
          maxLength={10}
          value={inputValue}
          placeholder={placeholderText}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn("pr-10 h-8.5 text-xs bg-white", invalid && "border-destructive", className)}
          onChange={(e) => {
            const masked = maskDdMmYyyy(e.target.value);
            setInputValue(masked);
            setInvalid(false);
            if (!masked) {
              if (selected) onSelect(null);
              return;
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(masked)) {
              const parsed = tryParseDateString(masked);
              if (parsed && isInRange(parsed)) {
                onSelect(parsed);
              }
            }
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
            disabled={disabled}
            className="absolute right-0 top-0 h-8.5 w-8.5 shrink-0 px-0 text-muted-foreground hover:text-foreground"
            aria-label="Open calendar"
            onMouseDown={(e) => e.preventDefault()}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className={cn('w-[min(19rem,calc(100vw-1rem))] p-0', nested && 'z-[300]')}
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
