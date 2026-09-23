import type { RowDataPacket } from "mysql2/promise";

export type TaskStatus = "pending" | "done";

export interface TaskRow extends RowDataPacket {
  id: number;
  goal_id: number;
  user_id: number;
  title: string;
  month: number;
  status: TaskStatus;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class Task {
  constructor(
    readonly id: number,
    readonly goalId: number,
    readonly userId: number,
    readonly title: string,
    readonly month: number,
    readonly status: TaskStatus,
    readonly completedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromRow(row: TaskRow): Task {
    return new Task(
      row.id,
      row.goal_id,
      row.user_id,
      row.title,
      row.month,
      row.status,
      row.completed_at,
      row.created_at,
      row.updated_at,
    );
  }

  get isDone(): boolean {
    return this.status === "done";
  }

  get quarter(): number {
    return Math.ceil(this.month / 3);
  }

  toJSON() {
    return {
      id: this.id,
      goalId: this.goalId,
      title: this.title,
      month: this.month,
      quarter: this.quarter,
      status: this.status,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateTaskInput {
  title: string;
  month: number;
}

export interface UpdateTaskInput {
  title?: string;
  month?: number;
  status?: TaskStatus;
}
