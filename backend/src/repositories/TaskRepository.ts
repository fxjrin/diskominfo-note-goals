import type { PoolConnection } from "mysql2/promise";
import type { SqlParam } from "../database/Database.js";
import { Task, type CreateTaskInput, type TaskRow, type UpdateTaskInput } from "../models/Task.js";
import { BaseRepository } from "./BaseRepository.js";

// user_id is joined in so ownership can be checked without a second query
const SELECT = `SELECT t.id, t.goal_id, g.user_id, t.title, t.month, t.status, t.completed_at, t.created_at, t.updated_at
  FROM tasks t JOIN goals g ON g.id = t.goal_id`;

export class TaskRepository extends BaseRepository {
  constructor() {
    super();
  }

  async findByGoal(goalId: number, conn?: PoolConnection): Promise<Task[]> {
    const rows = await this.rows<TaskRow>(
      `${SELECT} WHERE t.goal_id = ? ORDER BY t.month ASC, t.created_at ASC`,
      [goalId],
      conn,
    );
    return rows.map(Task.fromRow);
  }

  async findById(id: number, conn?: PoolConnection): Promise<Task | null> {
    const rows = await this.rows<TaskRow>(`${SELECT} WHERE t.id = ?`, [id], conn);
    return rows[0] ? Task.fromRow(rows[0]) : null;
  }

  async create(goalId: number, input: CreateTaskInput, conn: PoolConnection): Promise<number> {
    const result = await this.run(
      "INSERT INTO tasks (goal_id, title, month) VALUES (?, ?, ?)",
      [goalId, input.title, input.month],
      conn,
    );
    return result.insertId;
  }

  async update(id: number, input: UpdateTaskInput, conn: PoolConnection): Promise<void> {
    const sets: string[] = [];
    const params: SqlParam[] = [];
    if (input.title !== undefined) {
      sets.push("title = ?");
      params.push(input.title);
    }
    if (input.month !== undefined) {
      sets.push("month = ?");
      params.push(input.month);
    }
    if (input.status !== undefined) {
      sets.push("status = ?", "completed_at = ?");
      params.push(input.status, input.status === "done" ? new Date() : null);
    }
    if (sets.length === 0) {
      return;
    }
    params.push(id);
    await this.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, params, conn);
  }

  async delete(id: number, conn: PoolConnection): Promise<void> {
    await this.run("DELETE FROM tasks WHERE id = ?", [id], conn);
  }
}
