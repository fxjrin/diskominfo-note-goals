import type { RowDataPacket } from "mysql2/promise";

export type TaskStatus = "pending" | "done";

export interface TaskRow extends RowDataPacket {
  id: number;
  goal_id: number;
  period_id: number;
  user_id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class Task {
  constructor(
    readonly id: number,
    readonly goalId: number,
    readonly periodId: number,
    readonly userId: number,
    readonly title: string,
    readonly dueDate: string,
    readonly status: TaskStatus,
    readonly completedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromRow(row: TaskRow): Task {
    return new Task(
      row.id,
      row.goal_id,
      row.period_id,
      row.user_id,
      row.title,
      row.due_date,
      row.status,
      row.completed_at,
      row.created_at,
      row.updated_at,
    );
  }

  get isDone(): boolean {
    return this.status === "done";
  }

  toJSON() {
    return {
      id: this.id,
      goalId: this.goalId,
      periodId: this.periodId,
      title: this.title,
      dueDate: this.dueDate,
      status: this.status,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateTaskInput {
  title: string;
  periodId: number;
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  periodId?: number;
  dueDate?: string;
  status?: TaskStatus;
}
