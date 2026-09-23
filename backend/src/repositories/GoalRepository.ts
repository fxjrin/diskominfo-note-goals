import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { SqlParam } from "../database/Database.js";
import { Goal, type CreateGoalInput, type GoalRow, type UpdateGoalInput } from "../models/Goal.js";
import { BaseRepository } from "./BaseRepository.js";

interface CountRow extends RowDataPacket {
  total: number;
  done: number;
}

const COLUMNS = "id, user_id, title, description, year, progress, created_at, updated_at";

export class GoalRepository extends BaseRepository {
  constructor() {
    super();
  }

  async findAllByUser(userId: number, year?: number): Promise<Goal[]> {
    const params: SqlParam[] = [userId];
    let where = "WHERE user_id = ?";
    if (year !== undefined) {
      where += " AND year = ?";
      params.push(year);
    }
    const rows = await this.rows<GoalRow>(
      `SELECT ${COLUMNS} FROM goals ${where} ORDER BY year DESC, created_at DESC`,
      params,
    );
    return rows.map(Goal.fromRow);
  }

  async findById(id: number, conn?: PoolConnection, forUpdate = false): Promise<Goal | null> {
    const lock = forUpdate ? "FOR UPDATE" : "";
    const rows = await this.rows<GoalRow>(`SELECT ${COLUMNS} FROM goals WHERE id = ? ${lock}`, [id], conn);
    return rows[0] ? Goal.fromRow(rows[0]) : null;
  }

  async create(userId: number, input: CreateGoalInput): Promise<number> {
    const result = await this.run(
      "INSERT INTO goals (user_id, title, description, year) VALUES (?, ?, ?, ?)",
      [userId, input.title, input.description ?? null, input.year],
    );
    return result.insertId;
  }

  async update(id: number, input: UpdateGoalInput): Promise<boolean> {
    const sets: string[] = [];
    const params: SqlParam[] = [];
    if (input.title !== undefined) {
      sets.push("title = ?");
      params.push(input.title);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.year !== undefined) {
      sets.push("year = ?");
      params.push(input.year);
    }
    if (sets.length === 0) {
      return true;
    }
    params.push(id);
    const result = await this.run(`UPDATE goals SET ${sets.join(", ")} WHERE id = ?`, params);
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.run("DELETE FROM goals WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }

  async countTasks(goalId: number, conn?: PoolConnection): Promise<{ total: number; done: number }> {
    const rows = await this.rows<CountRow>(
      "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done FROM tasks WHERE goal_id = ?",
      [goalId],
      conn,
    );
    return { total: Number(rows[0]?.total ?? 0), done: Number(rows[0]?.done ?? 0) };
  }

  async saveProgress(goalId: number, progress: number, conn?: PoolConnection): Promise<void> {
    await this.run("UPDATE goals SET progress = ? WHERE id = ?", [progress, goalId], conn);
  }
}
