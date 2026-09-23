import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";

export class AuthController {
  constructor(private readonly service: AuthService = new AuthService()) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body as { username: string; password: string };
    const { token, user } = await this.service.login(username, password);
    res.json({ data: { token, user } });
  };

  me = async (_req: Request, res: Response): Promise<void> => {
    res.json({ data: currentUser(res) });
  };
}
