"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "relative",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center items-center h-7",
        caption_label: "text-sm font-medium select-none",
        nav: "absolute inset-x-0 top-3 flex items-center justify-between px-1 z-10",
        button_previous: cn(
          "size-7 flex items-center justify-center rounded-md border border-input bg-background",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        button_next: cn(
          "size-7 flex items-center justify-center rounded-md border border-input bg-background",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-center text-[0.75rem] font-normal text-muted-foreground",
        weeks: "mt-2 flex flex-col gap-1",
        week: "flex",
        day: "relative w-8 h-8 p-0 text-center",
        day_button: cn(
          "w-full h-full rounded-md text-sm font-normal transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:border [&>button]:border-primary [&>button]:font-semibold",
        outside: "opacity-40",
        disabled: "opacity-30 pointer-events-none",
        range_start: "[&>button]:rounded-r-none",
        range_end: "[&>button]:rounded-l-none",
        range_middle: "bg-accent [&>button]:rounded-none [&>button]:hover:bg-accent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft size={14} />
          ) : (
            <ChevronRight size={14} />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
