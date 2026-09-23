import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth.js";
import { ExportService } from "../services/ExportService.js";

function send(res: Response, filename: string, csv: string): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

export class ExportController {
  constructor(private readonly service: ExportService = new ExportService()) {}

  goal = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const { filename, csv } = await this.service.goalCsv(currentUser(res).id, id);
    send(res, filename, csv);
  };

  year = async (_req: Request, res: Response): Promise<void> => {
    const { year } = res.locals.query as { year?: number };
    const { filename, csv } = await this.service.yearCsv(currentUser(res).id, year);
    send(res, filename, csv);
  };
}
