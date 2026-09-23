import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, formatRange, fromIso, toIso } from "@/lib/dates";

interface DatePickerProps {
  value: string | null;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
}

export function DatePicker({ value, onChange, min, max, placeholder = "Pilih tanggal", size = "default", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromIso(value) : undefined;
  const year = (value ?? min ?? max)?.slice(0, 4);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size={size} className={`justify-start font-normal ${className ?? ""}`}>
            <CalendarIcon className="size-4 text-muted-foreground" />
            {value ? formatDate(value) : <span className="text-muted-foreground">{placeholder}</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={localeId}
          selected={selected}
          defaultMonth={selected ?? (min ? fromIso(min) : undefined)}
          startMonth={year ? new Date(Number(year), 0) : undefined}
          endMonth={year ? new Date(Number(year), 11) : undefined}
          disabled={[...(min ? [{ before: fromIso(min) }] : []), ...(max ? [{ after: fromIso(max) }] : [])]}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIso(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  start: string;
  end: string;
  year: number;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ start, end, year, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // The picker always starts a fresh selection: first click = start, second = end.
  // Showing the stored range as selected would make the first click extend it and close the picker.
  const [draft, setDraft] = useState<DateRange | undefined>();
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(undefined);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className={`justify-start font-normal ${className ?? ""}`}>
            <CalendarIcon className="size-4 text-muted-foreground" />
            {start && end ? formatRange(start, end) : <span className="text-muted-foreground">Pilih rentang tanggal</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={localeId}
          numberOfMonths={2}
          selected={draft}
          defaultMonth={start ? fromIso(start) : new Date(year, 0)}
          startMonth={new Date(year, 0)}
          endMonth={new Date(year, 11)}
          onSelect={(range) => {
            setDraft(range);
            if (range?.from && range.to) {
              onChange(toIso(range.from), toIso(range.to));
              setOpen(false);
              setDraft(undefined);
            }
          }}
        />
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">Klik tanggal mulai, lalu tanggal selesai.</p>
      </PopoverContent>
    </Popover>
  );
}
