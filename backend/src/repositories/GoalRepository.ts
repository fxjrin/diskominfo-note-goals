import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { SqlParam } from "../database/Database.js";
import {
  Goal,
  defaultPeriods,
  type CreateGoalInput,
  type GoalRow,
  type Period,
  type PeriodInput,
  type UpdateGoalInput,
} from "../models/Goal.js";
import { BaseRepository } from "./BaseRepository.js";

interface PeriodRow extends RowDataPacket {
  id: number;
  goal_id: number;
  name: string;
  start_date: string;
  end_date: string;
  weight: number;
  position: number;
}

export interface PeriodCount {
  periodId: number;
  total: number;
  done: number;
}

interface PeriodCountRow extends RowDataPacket {
  period_id: number;
  total: number;
  done: number;
}

interface GoalCountRow extends RowDataPacket {
  goal_id: number;
  total: number;
  done: number;
}

export interface TaskSummary {
  total: number;
  done: number;
}

const COLUMNS = "id, user_id, title, description, year, progress, created_at, updated_at";
const PERIOD_COLUMNS = "id, goal_id, name, start_date, end_date, weight, position";

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
    if (rows.length === 0) {
      return [];
    }
    const periods = await this.periodsFor(rows.map((row) => row.id));
    return rows.map((row) => Goal.fromRow(row, periods.get(row.id) ?? []));
  }

  async findById(id: number, conn?: PoolConnection, forUpdate = false): Promise<Goal | null> {
    const lock = forUpdate ? "FOR UPDATE" : "";
    const rows = await this.rows<GoalRow>(`SELECT ${COLUMNS} FROM goals WHERE id = ? ${lock}`, [id], conn);
    if (!rows[0]) {
      return null;
    }
    const periods = await this.periodsFor([id], conn);
    return Goal.fromRow(rows[0], periods.get(id) ?? []);
  }

  async create(userId: number, input: CreateGoalInput, conn: PoolConnection): Promise<number> {
    const result = await this.run(
      "INSERT INTO goals (user_id, title, description, year) VALUES (?, ?, ?, ?)",
      [userId, input.title, input.description ?? null, input.year],
      conn,
    );
    const periods = input.periods ?? defaultPeriods(input.year);
    for (const [index, period] of periods.entries()) {
      await this.insertPeriod(result.insertId, period, index, conn);
    }
    return result.insertId;
  }

  async updateFields(id: number, input: UpdateGoalInput, conn: PoolConnection): Promise<void> {
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
      return;
    }
    params.push(id);
    await this.run(`UPDATE goals SET ${sets.join(", ")} WHERE id = ?`, params, conn);
  }

  async insertPeriod(goalId: number, period: PeriodInput, position: number, conn: PoolConnection): Promise<number> {
    const result = await this.run(
      "INSERT INTO goal_periods (goal_id, name, start_date, end_date, weight, position) VALUES (?, ?, ?, ?, ?, ?)",
      [goalId, period.name, period.startDate, period.endDate, period.weight, position],
      conn,
    );
    return result.insertId;
  }

  async updatePeriod(id: number, period: PeriodInput, position: number, conn: PoolConnection): Promise<void> {
    await this.run(
      "UPDATE goal_periods SET name = ?, start_date = ?, end_date = ?, weight = ?, position = ? WHERE id = ?",
      [period.name, period.startDate, period.endDate, period.weight, position, id],
      conn,
    );
  }

  async deletePeriod(id: number, conn: PoolConnection): Promise<void> {
    await this.run("DELETE FROM goal_periods WHERE id = ?", [id], conn);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.run("DELETE FROM goals WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }

  async countTasksByPeriod(goalId: number, conn?: PoolConnection): Promise<PeriodCount[]> {
    const rows = await this.rows<PeriodCountRow>(
      `SELECT period_id, COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done
       FROM tasks WHERE goal_id = ? GROUP BY period_id`,
      [goalId],
      conn,
    );
    return rows.map((row) => ({ periodId: row.period_id, total: Number(row.total), done: Number(row.done) }));
  }

  async countTasksOutside(periodId: number, startDate: string, endDate: string, conn: PoolConnection): Promise<number> {
    const rows = await this.rows<RowDataPacket>(
      "SELECT COUNT(*) AS total FROM tasks WHERE period_id = ? AND (due_date < ? OR due_date > ?)",
      [periodId, startDate, endDate],
      conn,
    );
    return Number(rows[0]?.total ?? 0);
  }

  async taskSummaryFor(goalIds: number[]): Promise<Map<number, TaskSummary>> {
    const summary = new Map<number, TaskSummary>();
    if (goalIds.length === 0) {
      return summary;
    }
    const placeholders = goalIds.map(() => "?").join(", ");
    const rows = await this.rows<GoalCountRow>(
      `SELECT goal_id, COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done
       FROM tasks WHERE goal_id IN (${placeholders}) GROUP BY goal_id`,
      goalIds,
    );
    for (const row of rows) {
      summary.set(row.goal_id, { total: Number(row.total), done: Number(row.done) });
    }
    return summary;
  }

  async saveProgress(goalId: number, progress: number, conn?: PoolConnection): Promise<void> {
    await this.run("UPDATE goals SET progress = ? WHERE id = ?", [progress, goalId], conn);
  }

  private async periodsFor(goalIds: number[], conn?: PoolConnection): Promise<Map<number, Period[]>> {
    const placeholders = goalIds.map(() => "?").join(", ");
    const rows = await this.rows<PeriodRow>(
      `SELECT ${PERIOD_COLUMNS} FROM goal_periods WHERE goal_id IN (${placeholders}) ORDER BY position, start_date, id`,
      goalIds,
      conn,
    );
    const grouped = new Map<number, Period[]>();
    for (const row of rows) {
      const list = grouped.get(row.goal_id) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        weight: Number(row.weight),
        position: row.position,
      });
      grouped.set(row.goal_id, list);
    }
    return grouped;
  }
}
