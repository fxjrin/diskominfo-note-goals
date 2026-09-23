import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PeriodInput } from "@/types";

export function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromIso(iso: string): Date {
  return parseISO(iso);
}

export function formatDate(iso: string, pattern = "d MMM yyyy"): string {
  return format(parseISO(iso), pattern, { locale: localeId });
}

export function formatRange(start: string, end: string): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${formatDate(start, "d")} - ${formatDate(end, "d MMM yyyy")}`
    : `${formatDate(start, "d MMM")} - ${formatDate(end, "d MMM yyyy")}`;
}

const MONTH_END = ["31", "28", "31", "30", "31", "30", "31", "31", "30", "31", "30", "31"];

function leap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function endOfMonth(year: number, month: number): string {
  const day = month === 2 && leap(year) ? "29" : MONTH_END[month - 1];
  return `${year}-${String(month).padStart(2, "0")}-${day}`;
}

function startOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export type PresetKey = "quarters" | "semesters" | "months" | "year";

export const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: "quarters", label: "4 kuartal" },
  { key: "semesters", label: "2 semester" },
  { key: "months", label: "12 bulan" },
  { key: "year", label: "1 periode setahun" },
];

export function presetPeriods(key: PresetKey, year: number): PeriodInput[] {
  switch (key) {
    case "quarters":
      return [1, 2, 3, 4].map((q) => ({
        name: `Q${q}`,
        startDate: startOfMonth(year, q * 3 - 2),
        endDate: endOfMonth(year, q * 3),
        weight: 25,
      }));
    case "semesters":
      return [1, 2].map((s) => ({
        name: `Semester ${s}`,
        startDate: startOfMonth(year, s * 6 - 5),
        endDate: endOfMonth(year, s * 6),
        weight: 50,
      }));
    case "months":
      return Array.from({ length: 12 }, (_, i) => ({
        name: format(new Date(year, i, 1), "MMMM", { locale: localeId }),
        startDate: startOfMonth(year, i + 1),
        endDate: endOfMonth(year, i + 1),
        weight: i === 11 ? 8.37 : 8.33,
      }));
    case "year":
      return [{ name: `Tahun ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31`, weight: 100 }];
  }
}

// Next free slot after the last period, or the start of the year when empty
export function nextPeriodDraft(periods: PeriodInput[], year: number): PeriodInput {
  const last = [...periods].sort((a, b) => a.endDate.localeCompare(b.endDate)).at(-1);
  const start = last ? fromIso(last.endDate) : new Date(year, 0, 0);
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const clampedStart = startDate.getFullYear() === year ? startDate : new Date(year, 11, 31);
  return { name: `Periode ${periods.length + 1}`, startDate: toIso(clampedStart), endDate: `${year}-12-31`, weight: 0 };
}
