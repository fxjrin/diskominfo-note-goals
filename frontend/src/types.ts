export type TaskStatus = "pending" | "done";

export interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  weight: number;
  position: number;
}

export interface PeriodInput {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  weight: number;
}

export interface PeriodSummary extends Period {
  total: number;
  done: number;
  progress: number;
  contribution: number;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  year: number;
  progress: number;
  periods: Period[];
  summary: { total: number; done: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  goalId: number;
  periodId: number;
  title: string;
  dueDate: string;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalDetail extends Omit<Goal, "periods"> {
  tasks: Task[];
  periods: PeriodSummary[];
}

export interface GoalInput {
  title: string;
  description?: string | null;
  year: number;
  periods?: PeriodInput[];
}

export interface TaskInput {
  title: string;
  periodId: number;
  dueDate: string;
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

export function weightTotal(periods: PeriodInput[]): number {
  return Math.round(periods.reduce((sum, p) => sum + p.weight, 0) * 100) / 100;
}

export function periodError(periods: PeriodInput[], year: number): string | null {
  if (periods.length === 0) return "Tambahkan minimal satu periode";
  for (const p of periods) {
    if (!p.name.trim()) return "Setiap periode harus punya nama";
    if (!p.startDate || !p.endDate) return `Pilih tanggal untuk "${p.name}"`;
    if (p.startDate > p.endDate) return `Tanggal mulai "${p.name}" melewati tanggal selesainya`;
    if (!p.startDate.startsWith(`${year}-`) || !p.endDate.startsWith(`${year}-`)) {
      return `Periode "${p.name}" harus di dalam tahun ${year}`;
    }
  }
  const total = weightTotal(periods);
  if (total <= 0) return "Isi bobot minimal satu periode";
  if (total > 100.01) return `Total bobot ${total}%, maksimal 100%`;
  return null;
}

// Short human description of a goal's period setup for list cards
export function periodsLabel(periods: Period[]): string {
  if (periods.length === 0) return "Belum ada periode";
  const names = periods.map((p) => p.name);
  const isQuarters = names.join(",") === "Q1,Q2,Q3,Q4";
  const equal = periods.every((p) => Math.abs(p.weight - periods[0].weight) < 0.01);
  if (isQuarters && equal) return "4 kuartal, bobot sama";
  if (periods.length > 4) return `${periods.length} periode`;
  return periods.map((p) => `${p.name} ${p.weight}%`).join(", ");
}

export function goalStatus(progress: number, total: number): { label: string; tone: "done" | "active" | "idle" } {
  if (total > 0 && progress >= 100) return { label: "Tercapai", tone: "done" };
  if (progress > 0) return { label: "Berjalan", tone: "active" };
  return { label: "Belum mulai", tone: "idle" };
}
