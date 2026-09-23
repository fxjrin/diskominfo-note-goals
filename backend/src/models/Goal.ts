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

export class Goal {
  constructor(
    readonly id: number,
    readonly userId: number,
    readonly title: string,
    readonly description: string | null,
    readonly year: number,
    readonly progress: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromRow(row: GoalRow): Goal {
    return new Goal(
      row.id,
      row.user_id,
      row.title,
      row.description,
      row.year,
      Number(row.progress),
      row.created_at,
      row.updated_at,
    );
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      year: this.year,
      progress: this.progress,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  year: number;
}

export type UpdateGoalInput = Partial<CreateGoalInput>;
