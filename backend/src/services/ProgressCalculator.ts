import type { Task } from "../models/Task.js";

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

export class ProgressCalculator {
  static readonly QUARTERS = 4;
  static readonly QUARTER_WEIGHT = 100 / ProgressCalculator.QUARTERS;

  static percentage(done: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    const raw = (done / total) * 100;
    return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
  }

  static quarters(tasks: Task[]): QuarterSummary[] {
    return Array.from({ length: ProgressCalculator.QUARTERS }, (_, index) => {
      const quarter = index + 1;
      const months = [quarter * 3 - 2, quarter * 3 - 1, quarter * 3];
      const scoped = tasks.filter((task) => task.quarter === quarter);
      const done = scoped.filter((task) => task.isDone).length;
      const progress = ProgressCalculator.percentage(done, scoped.length);
      return {
        quarter,
        label: `Q${quarter}`,
        months,
        weight: ProgressCalculator.QUARTER_WEIGHT,
        total: scoped.length,
        done,
        progress,
        contribution: Math.round((progress / ProgressCalculator.QUARTERS) * 100) / 100,
      };
    });
  }
}
