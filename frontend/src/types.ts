export type TaskStatus = "pending" | "done";

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  year: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  goalId: number;
  title: string;
  month: number;
  quarter: number;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuarterSummary {
  quarter: number;
  label: string;
  months: number[];
  weight: number;
  total: number;
  done: number;
  progress: number;
  contribution: number;
}

export interface GoalDetail extends Goal {
  tasks: Task[];
  summary: { total: number; done: number };
  quarters: QuarterSummary[];
}

export interface GoalInput {
  title: string;
  description?: string | null;
  year: number;
}

export interface TaskInput {
  title: string;
  month: number;
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
