import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth.js";
import { GoalService } from "../services/GoalService.js";

export class GoalController {
  constructor(private readonly service: GoalService = new GoalService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const { year } = res.locals.query as { year?: number };
    const goals = await this.service.list(currentUser(res).id, year);
    res.json({ data: goals.map((goal) => ({ ...goal.toJSON(), summary: goal.summary })) });
  };

  detail = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const detail = await this.service.detail(currentUser(res).id, id);
    res.json({
      data: {
        ...detail.goal.toJSON(),
        tasks: detail.tasks,
        summary: detail.summary,
        periods: detail.periods,
      },
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const goal = await this.service.create(currentUser(res).id, req.body);
    res.status(201).json({ data: goal });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const goal = await this.service.update(currentUser(res).id, id, req.body);
    res.json({ data: goal });
  };

  remove = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    await this.service.remove(currentUser(res).id, id);
    res.status(204).end();
  };
}
