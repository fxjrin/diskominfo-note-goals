import type { RowDataPacket } from "mysql2/promise";

export interface GoalRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  year: number;
  progress: number;
  created_at: Date;
  updated_at: Date;
}

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

export function defaultPeriods(year: number): PeriodInput[] {
  const ends = ["03-31", "06-30", "09-30", "12-31"];
  const starts = ["01-01", "04-01", "07-01", "10-01"];
  return starts.map((start, index) => ({
    name: `Q${index + 1}`,
    startDate: `${year}-${start}`,
    endDate: `${year}-${ends[index]}`,
    weight: 25,
  }));
}

export class Goal {
  constructor(
    readonly id: number,
    readonly userId: number,
    readonly title: string,
    readonly description: string | null,
    readonly year: number,
    readonly progress: number,
    readonly periods: Period[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromRow(row: GoalRow, periods: Period[]): Goal {
    return new Goal(
      row.id,
      row.user_id,
      row.title,
      row.description,
      row.year,
      Number(row.progress),
      periods,
      row.created_at,
      row.updated_at,
    );
  }

  period(id: number): Period | undefined {
    return this.periods.find((period) => period.id === id);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      year: this.year,
      progress: this.progress,
      periods: this.periods,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  year: number;
  periods?: PeriodInput[];
}

export type UpdateGoalInput = Partial<CreateGoalInput>;
