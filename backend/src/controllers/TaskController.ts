import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth.js";
import { TaskService } from "../services/TaskService.js";

export class TaskController {
  constructor(private readonly service: TaskService = new TaskService()) {}

  listByGoal = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const tasks = await this.service.listByGoal(currentUser(res).id, id);
    res.json({ data: tasks });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const result = await this.service.create(currentUser(res).id, id, req.body);
    res.status(201).json({ data: result.task, goal: { id: result.goalId, progress: result.progress } });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const result = await this.service.update(currentUser(res).id, id, req.body);
    res.json({ data: result.task, goal: { id: result.goalId, progress: result.progress } });
  };

  setStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const result = await this.service.setStatus(currentUser(res).id, id, req.body.status);
    res.json({ data: result.task, goal: { id: result.goalId, progress: result.progress } });
  };

  remove = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const result = await this.service.remove(currentUser(res).id, id);
    res.json({ data: null, goal: { id: result.goalId, progress: result.progress } });
  };
}
