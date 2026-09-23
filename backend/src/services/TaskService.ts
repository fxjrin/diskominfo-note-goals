import type { PoolConnection } from "mysql2/promise";
import { NotFoundError } from "../errors/HttpError.js";
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from "../models/Task.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { GoalService } from "./GoalService.js";

export interface TaskMutationResult {
  task: Task | null;
  goalId: number;
  progress: number;
}

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository = new TaskRepository(),
    private readonly goals: GoalService = new GoalService(),
  ) {}

  async listByGoal(userId: number, goalId: number): Promise<Task[]> {
    await this.goals.getOwned(userId, goalId);
    return this.tasks.findByGoal(goalId);
  }

  private async getOwned(userId: number, id: number, conn: PoolConnection): Promise<Task> {
    const task = await this.tasks.findById(id, conn);
    if (!task || task.userId !== userId) {
      throw new NotFoundError("Task", id);
    }
    return task;
  }

  create(userId: number, goalId: number, input: CreateTaskInput): Promise<TaskMutationResult> {
    return this.goals.transaction(async (conn) => {
      await this.goals.getOwned(userId, goalId, conn, true);
      const id = await this.tasks.create(goalId, input, conn);
      const progress = await this.goals.recalculateProgress(goalId, conn);
      const task = await this.tasks.findById(id, conn);
      return { task, goalId, progress };
    });
  }

  update(userId: number, id: number, input: UpdateTaskInput): Promise<TaskMutationResult> {
    return this.goals.transaction(async (conn) => {
      const existing = await this.getOwned(userId, id, conn);
      await this.goals.getOwned(userId, existing.goalId, conn, true);
      await this.tasks.update(id, input, conn);
      const progress = await this.goals.recalculateProgress(existing.goalId, conn);
      const task = await this.tasks.findById(id, conn);
      return { task, goalId: existing.goalId, progress };
    });
  }

  setStatus(userId: number, id: number, status: TaskStatus): Promise<TaskMutationResult> {
    return this.update(userId, id, { status });
  }

  remove(userId: number, id: number): Promise<TaskMutationResult> {
    return this.goals.transaction(async (conn) => {
      const existing = await this.getOwned(userId, id, conn);
      await this.goals.getOwned(userId, existing.goalId, conn, true);
      await this.tasks.delete(id, conn);
      const progress = await this.goals.recalculateProgress(existing.goalId, conn);
      return { task: null, goalId: existing.goalId, progress };
    });
  }
}
