import type { PoolConnection } from "mysql2/promise";
import { Database } from "../database/Database.js";
import { NotFoundError } from "../errors/HttpError.js";
import { Goal, type CreateGoalInput, type UpdateGoalInput } from "../models/Goal.js";
import type { Task } from "../models/Task.js";
import { GoalRepository } from "../repositories/GoalRepository.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { ProgressCalculator, type QuarterSummary } from "./ProgressCalculator.js";

export interface GoalDetail {
  goal: Goal;
  tasks: Task[];
  summary: { total: number; done: number };
  quarters: QuarterSummary[];
}

export class GoalService {
  constructor(
    private readonly goals: GoalRepository = new GoalRepository(),
    private readonly tasks: TaskRepository = new TaskRepository(),
    private readonly db: Database = Database.get(),
  ) {}

  list(userId: number, year?: number): Promise<Goal[]> {
    return this.goals.findAllByUser(userId, year);
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
    const done = tasks.filter((task) => task.isDone).length;
    return {
      goal,
      tasks,
      summary: { total: tasks.length, done },
      quarters: ProgressCalculator.quarters(tasks),
    };
  }

  async create(userId: number, input: CreateGoalInput): Promise<Goal> {
    const id = await this.goals.create(userId, input);
    return this.getOwned(userId, id);
  }

  async update(userId: number, id: number, input: UpdateGoalInput): Promise<Goal> {
    await this.getOwned(userId, id);
    await this.goals.update(id, input);
    return this.getOwned(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.getOwned(userId, id);
    await this.goals.delete(id);
  }

  // Locks the goal row so concurrent task updates cannot interleave and
  // leave a stale percentage behind.
  async recalculateProgress(goalId: number, conn: PoolConnection): Promise<number> {
    const { total, done } = await this.goals.countTasks(goalId, conn);
    const progress = ProgressCalculator.percentage(done, total);
    await this.goals.saveProgress(goalId, progress, conn);
    return progress;
  }

  transaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }
}
