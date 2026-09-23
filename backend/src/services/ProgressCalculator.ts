import type { Period } from "../models/Goal.js";

export interface PeriodCount {
  periodId: number;
  total: number;
  done: number;
}

export interface PeriodSummary extends Period {
  total: number;
  done: number;
  progress: number;
  contribution: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class ProgressCalculator {
  static percentage(done: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, round2((done / total) * 100)));
  }

  // Each period contributes weight x (done / total); a period without tasks
  // contributes nothing, so an empty period holds the goal below its weight.
  static periods(periods: Period[], counts: PeriodCount[]): PeriodSummary[] {
    return periods.map((period) => {
      const count = counts.find((c) => c.periodId === period.id) ?? { periodId: period.id, total: 0, done: 0 };
      const progress = ProgressCalculator.percentage(count.done, count.total);
      return {
        ...period,
        total: count.total,
        done: count.done,
        progress,
        contribution: round2((period.weight * progress) / 100),
      };
    });
  }

  static overall(periods: Period[], counts: PeriodCount[]): number {
    const total = ProgressCalculator.periods(periods, counts).reduce((sum, p) => sum + p.contribution, 0);
    return Math.min(100, Math.max(0, round2(total)));
  }
}
