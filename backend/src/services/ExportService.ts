import { GoalService, type GoalDetail } from "./GoalService.js";

const HEADER = [
  "Goal",
  "Tahun",
  "Progres Goal (%)",
  "Periode",
  "Mulai",
  "Selesai",
  "Bobot (%)",
  "Progres Periode (%)",
  "Task",
  "Tanggal Task",
  "Status",
  "Diselesaikan Pada",
];

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function stamp(value: Date | null): string {
  return value ? value.toISOString().slice(0, 19).replace("T", " ") : "";
}

export class ExportService {
  constructor(private readonly goals: GoalService = new GoalService()) {}

  async goalCsv(userId: number, goalId: number): Promise<{ filename: string; csv: string }> {
    const detail = await this.goals.detail(userId, goalId);
    const slug = detail.goal.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "goal";
    return { filename: `${slug}-${detail.goal.year}.csv`, csv: ExportService.toCsv([detail]) };
  }

  async yearCsv(userId: number, year?: number): Promise<{ filename: string; csv: string }> {
    const goals = await this.goals.list(userId, year);
    const details = await Promise.all(goals.map((goal) => this.goals.detail(userId, goal.id)));
    return { filename: `goals-${year ?? "semua"}.csv`, csv: ExportService.toCsv(details) };
  }

  // One row per task; periods without tasks still get a row so the export shows the full plan.
  static toCsv(details: GoalDetail[]): string {
    const lines = [HEADER.map(cell).join(",")];
    for (const { goal, tasks, periods } of details) {
      for (const period of periods) {
        const base = [
          goal.title,
          goal.year,
          goal.progress,
          period.name,
          period.startDate,
          period.endDate,
          period.weight,
          period.progress,
        ];
        const scoped = tasks.filter((task) => task.periodId === period.id);
        if (scoped.length === 0) {
          lines.push([...base, "", "", "", ""].map(cell).join(","));
          continue;
        }
        for (const task of scoped) {
          lines.push(
            [...base, task.title, task.dueDate, task.isDone ? "Selesai" : "Belum", stamp(task.completedAt)]
              .map(cell)
              .join(","),
          );
        }
      }
    }
    return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel opens UTF-8 correctly
  }
}
