import type { PoolConnection } from "mysql2/promise";
import { Database } from "../database/Database.js";
import { HttpError, NotFoundError } from "../errors/HttpError.js";
import { Goal, type CreateGoalInput, type PeriodInput, type UpdateGoalInput } from "../models/Goal.js";
import type { Task } from "../models/Task.js";
import { GoalRepository, type TaskSummary } from "../repositories/GoalRepository.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { ProgressCalculator, type PeriodSummary } from "./ProgressCalculator.js";

export interface GoalDetail {
  goal: Goal;
  tasks: Task[];
  summary: TaskSummary;
  periods: PeriodSummary[];
}

export class GoalService {
  constructor(
    private readonly goals: GoalRepository = new GoalRepository(),
    private readonly tasks: TaskRepository = new TaskRepository(),
    private readonly db: Database = Database.get(),
  ) {}

  async list(userId: number, year?: number): Promise<Array<Goal & { summary: TaskSummary }>> {
    const goals = await this.goals.findAllByUser(userId, year);
    const summaries = await this.goals.taskSummaryFor(goals.map((goal) => goal.id));
    return goals.map((goal) => Object.assign(goal, { summary: summaries.get(goal.id) ?? { total: 0, done: 0 } }));
  }

  // A goal owned by someone else is reported as missing so ids cannot be probed.
  async getOwned(userId: number, id: number, conn?: PoolConnection, forUpdate = false): Promise<Goal> {
    const goal = await this.goals.findById(id, conn, forUpdate);
    if (!goal || goal.userId !== userId) {
      throw new NotFoundError("Goal", id);
    }
    return goal;
  }

  async detail(userId: number, id: number): Promise<GoalDetail> {
    const goal = await this.getOwned(userId, id);
    const tasks = await this.tasks.findByGoal(id);
    const counts = await this.goals.countTasksByPeriod(id);
    const done = tasks.filter((task) => task.isDone).length;
    return {
      goal,
      tasks,
      summary: { total: tasks.length, done },
      periods: ProgressCalculator.periods(goal.periods, counts),
    };
  }

  create(userId: number, input: CreateGoalInput): Promise<Goal> {
    if (input.periods) {
      this.assertPeriodsInYear(input.periods, input.year);
    }
    return this.transaction(async (conn) => {
      const id = await this.goals.create(userId, input, conn);
      return this.getOwned(userId, id, conn);
    });
  }

  update(userId: number, id: number, input: UpdateGoalInput): Promise<Goal> {
    return this.transaction(async (conn) => {
      const goal = await this.getOwned(userId, id, conn, true);
      const year = input.year ?? goal.year;
      if (input.periods) {
        this.assertPeriodsInYear(input.periods, year);
        await this.syncPeriods(goal, input.periods, conn);
      } else if (input.year !== undefined && input.year !== goal.year) {
        this.assertPeriodsInYear(goal.periods, input.year);
      }
      await this.goals.updateFields(id, input, conn);
      await this.recalculateProgress(id, conn);
      return this.getOwned(userId, id, conn);
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.getOwned(userId, id);
    await this.goals.delete(id);
  }

  // Caller holds the goal row lock (getOwned with forUpdate) so concurrent task
  // updates cannot interleave and leave a stale percentage behind.
  async recalculateProgress(goalId: number, conn: PoolConnection): Promise<number> {
    const goal = await this.goals.findById(goalId, conn);
    if (!goal) {
      throw new NotFoundError("Goal", goalId);
    }
    const counts = await this.goals.countTasksByPeriod(goalId, conn);
    const progress = ProgressCalculator.overall(goal.periods, counts);
    await this.goals.saveProgress(goalId, progress, conn);
    return progress;
  }

  transaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  private assertPeriodsInYear(periods: Array<Pick<PeriodInput, "name" | "startDate" | "endDate">>, year: number): void {
    for (const period of periods) {
      if (!period.startDate.startsWith(`${year}-`) || !period.endDate.startsWith(`${year}-`)) {
        throw new HttpError(422, `Periode "${period.name}" harus berada di dalam tahun ${year}`);
      }
    }
  }

  // Keeps period ids stable so tasks stay attached; refuses to drop or shrink a
  // period in a way that would leave tasks without a valid period or date.
  private async syncPeriods(goal: Goal, incoming: PeriodInput[], conn: PoolConnection): Promise<void> {
    const counts = await this.goals.countTasksByPeriod(goal.id, conn);
    const keptIds = new Set(incoming.map((p) => p.id).filter((id): id is number => id !== undefined));
    for (const existing of goal.periods) {
      if (!keptIds.has(existing.id)) {
        const count = counts.find((c) => c.periodId === existing.id);
        if (count && count.total > 0) {
          throw new HttpError(422, `Hapus atau pindahkan ${count.total} task di "${existing.name}" sebelum menghapus periode itu`);
        }
        await this.goals.deletePeriod(existing.id, conn);
      }
    }
    for (const [index, period] of incoming.entries()) {
      if (period.id === undefined) {
        await this.goals.insertPeriod(goal.id, period, index, conn);
        continue;
      }
      if (!goal.period(period.id)) {
        throw new HttpError(422, `Periode dengan id ${period.id} tidak ada di goal ini`);
      }
      const outside = await this.goals.countTasksOutside(period.id, period.startDate, period.endDate, conn);
      if (outside > 0) {
        throw new HttpError(422, `${outside} task di "${period.name}" berada di luar tanggal baru. Ubah tanggal task itu dulu`);
      }
      await this.goals.updatePeriod(period.id, period, index, conn);
    }
  }
}
