"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  onUpdate: (values: { range: DateRange }) => void;
  initialDateFrom?: Date | string;
  initialDateTo?: Date | string;
  align?: "start" | "center" | "end";
  disabled?: (date: Date) => boolean;
}

export function DateRangePicker({
  onUpdate,
  initialDateFrom,
  initialDateTo,
  align = "end",
  disabled,
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const from = initialDateFrom
      ? typeof initialDateFrom === "string"
        ? new Date(initialDateFrom)
        : initialDateFrom
      : undefined;
    const to = initialDateTo
      ? typeof initialDateTo === "string"
        ? new Date(initialDateTo)
        : initialDateTo
      : undefined;

    if (from && !isNaN(from.getTime())) {
      return { from, to: to && !isNaN(to.getTime()) ? to : undefined };
    }
    return undefined;
  });

  const [isOpen, setIsOpen] = React.useState(false);

  // Sync with parent state changes
  React.useEffect(() => {
    const from = initialDateFrom
      ? typeof initialDateFrom === "string"
        ? new Date(initialDateFrom)
        : initialDateFrom
      : undefined;
    const to = initialDateTo
      ? typeof initialDateTo === "string"
        ? new Date(initialDateTo)
        : initialDateTo
      : undefined;

    if (from && !isNaN(from.getTime())) {
      setDateRange({ from, to: to && !isNaN(to.getTime()) ? to : undefined });
    } else {
      setDateRange(undefined);
    }
  }, [initialDateFrom, initialDateTo]);

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    // Only call onUpdate when range is complete (both from and to are set)
    if (range?.from && range?.to) {
      setIsOpen(false);
      onUpdate({ range: { from: range.from, to: range.to } });
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Custom Range";
    if (!dateRange?.to) return format(dateRange.from, "MMM dd, yyyy");
    return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 justify-start text-left",
            dateRange?.from && dateRange?.to
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 border-transparent"
              : "text-slate-600 hover:bg-slate-100 border-slate-200"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} sideOffset={4}>
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleRangeSelect}
          disabled={disabled}
          numberOfMonths={2}
          className="rounded-lg border shadow-sm"
        />
      </PopoverContent>
    </Popover>
  );
}

